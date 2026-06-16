const webpush = require('web-push');
const ClientPushSubscription = require('../models/ClientPushSubscription');
const TransactionMonitoring = require('../models/TransactionMonitoring');

const ACTIVE_PUBLIC_STATUSES = ['Queued', 'Waiting to Call', 'CALL', 'CLIENT MISSING'];

function hasPushConfig() {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT
  );
}

function configureWebPush() {
  if (!hasPushConfig()) {
    return false;
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  return true;
}

configureWebPush();

function normalizeQueueText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isPriorityClient(clientStatus) {
  const status = normalizeQueueText(clientStatus);
  return status.includes('priority') || status.includes('senior') || status.includes('pwd');
}

function queueStatusRank(status) {
  switch (status) {
    case 'CALL':
      return 0;
    case 'Waiting to Call':
      return 1;
    case 'Queued':
      return 2;
    case 'CLIENT MISSING':
      return 3;
    default:
      return 4;
  }
}

function sortQueueItems(items = []) {
  return [...items].sort((left, right) => {
    const rankDifference = queueStatusRank(left.clientCallStatus) - queueStatusRank(right.clientCallStatus);
    if (rankDifference !== 0) {
      return rankDifference;
    }

    return new Date(left.createdAt) - new Date(right.createdAt);
  });
}

function parseTicketNumber(value) {
  const digits = String(value || '').match(/(\d+)/g);
  if (!digits?.length) {
    return '';
  }

  return digits[digits.length - 1].slice(-2).padStart(2, '0');
}

function laneLabel(lane) {
  return lane === 'priority' ? 'Priority' : 'Regular';
}

async function getTransactionLaneQueue(entry) {
  if (!entry?.eccCnc) {
    return [];
  }

  const entries = await TransactionMonitoring.find(
    {
      eccCnc: entry.eccCnc,
      clientCallStatus: { $in: ACTIVE_PUBLIC_STATUSES },
    },
    {
      clientCardNo: 1,
      clientStatus: 1,
      screeningOfficer: 1,
      eccCnc: 1,
      clientCallStatus: 1,
      createdAt: 1,
    }
  ).lean();

  const targetIsPriority = isPriorityClient(entry.clientStatus);
  return sortQueueItems(entries.filter((item) => isPriorityClient(item.clientStatus) === targetIsPriority));
}

function buildNotificationPayload(entry, stage) {
  const ticket = parseTicketNumber(entry.clientCardNo) || '--';
  const lane = isPriorityClient(entry.clientStatus) ? 'priority' : 'regular';
  const sentAt = Date.now();
  const expiresAt = sentAt + 15000;
  const body = stage === 'serving'
    ? `${entry.eccCnc} • ${laneLabel(lane)} • Queue #${ticket} is now serving.`
    : `${entry.eccCnc} • ${laneLabel(lane)} • Queue #${ticket} is next in line.`;

  return {
    title: stage === 'serving' ? 'Your queue number is now serving' : 'You are next in line',
    body,
    tag: `sqms-${stage}-${String(entry._id)}`,
    url: '/check-my-queue',
    vibrate: [250, 120, 250, 120, 320],
    ticket,
    trackedEntryId: String(entry._id),
    transaction: entry.eccCnc,
    lane,
    stage,
    sentAt,
    expiresAt,
  };
}

async function upsertSubscription({ subscription, trackedEntryId, trackedTicket, trackedTransaction, trackedLane }) {
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    throw new Error('A valid push subscription is required.');
  }

  return ClientPushSubscription.findOneAndUpdate(
    { endpoint: subscription.endpoint },
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      trackedEntryId: trackedEntryId || null,
      trackedTicket: parseTicketNumber(trackedTicket),
      trackedTransaction: String(trackedTransaction || '').trim(),
      trackedLane: trackedLane === 'priority' ? 'priority' : 'regular',
      active: Boolean(trackedEntryId),
      lastSeenAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function removeSubscription(endpoint) {
  if (!endpoint) {
    return false;
  }

  const result = await ClientPushSubscription.deleteOne({ endpoint });
  return result.deletedCount > 0;
}

async function sendNotificationToSubscription(record, payload) {
  if (!hasPushConfig()) {
    return { skipped: true, reason: 'missing-vapid-config' };
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: record.endpoint,
        keys: record.keys,
      },
      JSON.stringify(payload),
      {
        TTL: 15,
        urgency: 'high',
        topic: payload.tag,
      }
    );

    record.lastNotifiedStage = payload.stage;
    record.lastSeenAt = new Date();
    await record.save();
    return { sent: true };
  } catch (error) {
    if (error.statusCode === 404 || error.statusCode === 410) {
      await record.deleteOne();
      return { removed: true };
    }

    return { failed: true, error };
  }
}

async function notifyEntryStage(entry, stage) {
  if (!entry?._id) {
    return [];
  }

  const records = await ClientPushSubscription.find({
    trackedEntryId: entry._id,
    active: true,
    $or: [
      { lastNotifiedStage: { $ne: stage } },
      { lastNotifiedStage: { $exists: false } },
    ],
  });

  if (!records.length) {
    return [];
  }

  const payload = buildNotificationPayload(entry, stage);
  const results = [];
  for (const record of records) {
    results.push(await sendNotificationToSubscription(record, payload));
  }
  return results;
}

async function notifyQueueProgress({ servingEntry = null, nextEntry = null }) {
  if (servingEntry) {
    await notifyEntryStage(servingEntry, 'serving');
  }

  if (nextEntry) {
    await notifyEntryStage(nextEntry, 'next');
  }
}

async function notifyForEntryLane(entry) {
  if (!entry?._id) {
    return;
  }

  const queue = await getTransactionLaneQueue(entry);
  const servingEntry = queue.find((item) => item.clientCallStatus === 'CALL') || null;
  const nextEntry = queue.find((item) => item.clientCallStatus !== 'CALL') || null;
  await notifyQueueProgress({ servingEntry, nextEntry });
}

module.exports = {
  hasPushConfig,
  configureWebPush,
  parseTicketNumber,
  upsertSubscription,
  removeSubscription,
  notifyQueueProgress,
  notifyForEntryLane,
};