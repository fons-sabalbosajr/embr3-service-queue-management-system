const {
  hasPushConfig,
  upsertSubscription,
  removeSubscription,
} = require('../utils/pushNotifications');

async function getPublicPushConfig(_req, res) {
  return res.json({
    enabled: hasPushConfig(),
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
  });
}

async function subscribeClient(req, res) {
  try {
    const { subscription, trackedEntryId, trackedTicket, trackedTransaction, trackedLane } = req.body || {};
    const record = await upsertSubscription({
      subscription,
      trackedEntryId,
      trackedTicket,
      trackedTransaction,
      trackedLane,
    });

    return res.status(201).json({
      subscription: {
        endpoint: record.endpoint,
        trackedEntryId: record.trackedEntryId,
        trackedTicket: record.trackedTicket,
        trackedTransaction: record.trackedTransaction,
        trackedLane: record.trackedLane,
        active: record.active,
      },
    });
  } catch (error) {
    console.error('Subscribe client push error:', error);
    return res.status(400).json({ message: error.message || 'Failed to save push subscription.' });
  }
}

async function unsubscribeClient(req, res) {
  try {
    const { endpoint } = req.body || {};
    await removeSubscription(endpoint);
    return res.json({ message: 'Push subscription removed.' });
  } catch (error) {
    console.error('Unsubscribe client push error:', error);
    return res.status(500).json({ message: 'Failed to remove push subscription.' });
  }
}

module.exports = {
  getPublicPushConfig,
  subscribeClient,
  unsubscribeClient,
};