const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Counter = require('../models/Counter');
const QueueOfficer = require('../models/QueueOfficer');
const TransactionMonitoring = require('../models/TransactionMonitoring');
const logEvent = require('../utils/logEvent');
const { notifyForEntryLane } = require('../utils/pushNotifications');

const DEFAULT_OFFICER_ACCESS = [
  'dashboard',
  'queue-dashboard',
  'queue-officer',
  'queue-officer-serving-desk',
  'queue-officer-portal',
];

function normalizeOfficerAccess(accessModules = []) {
  const values = new Set(accessModules.filter(Boolean));
  if (
    values.has('queue-officer-serving-desk') ||
    values.has('queue-officer-portal') ||
    values.has('queue-number-initialization')
  ) {
    values.add('queue-officer');
  } else {
    values.delete('queue-officer');
  }

  return Array.from(values);
}

function statusRank(status) {
  switch (status) {
    case 'CALL':
      return 0;
    case 'Waiting to Call':
      return 1;
    case 'Queued':
      return 2;
    case 'CLIENT MISSING':
      return 3;
    case 'On Hold':
      return 4;
    case 'Skipped':
      return 5;
    default:
      return 6;
  }
}

function sortPortalEntries(entries = []) {
  return [...entries].sort((left, right) => {
    const rankDifference = statusRank(left.clientCallStatus) - statusRank(right.clientCallStatus);
    if (rankDifference !== 0) {
      return rankDifference;
    }

    return new Date(left.createdAt) - new Date(right.createdAt);
  });
}

function formatQueueNumber(value) {
  return String(value).padStart(2, '0');
}

async function resolvePortalOfficer(req, officerId) {
  if (req.officer) {
    return req.officer;
  }

  if (!req.admin) {
    return null;
  }

  if (!officerId) {
    return null;
  }

  return QueueOfficer.findById(officerId);
}

function belongsToOfficer(entry, officer) {
  if (!entry || !officer) {
    return false;
  }

  if (entry.queueOfficerId) {
    return String(entry.queueOfficerId) === String(officer._id);
  }

  return entry.screeningOfficer === officer.name;
}

// A queue officer may also act on a number that a Queue Number Officer threw to
// their counter, even though it is not yet bound to a specific officer.
function canOfficerHandle(entry, officer) {
  if (belongsToOfficer(entry, officer)) {
    return true;
  }

  return Boolean(
    entry &&
      officer &&
      entry.thrown &&
      !entry.queueOfficerId &&
      entry.eccCnc === officer.assignedTransaction
  );
}

async function nextQueueNumberForTransaction(assignedTransaction, clientStatus) {
  const isPriority = typeof clientStatus === 'string'
    && ['priority', 'senior', 'pwd'].some((kw) => clientStatus.toLowerCase().includes(kw));

  const entries = await TransactionMonitoring.find(
    { eccCnc: assignedTransaction },
    { clientCardNo: 1, clientStatus: 1 }
  ).lean();

  // Separate counters for regular and priority so they don't share the sequence.
  const relevantEntries = entries.filter((entry) => {
    const entryIsPriority = typeof entry.clientStatus === 'string'
      && ['priority', 'senior', 'pwd'].some((kw) => entry.clientStatus.toLowerCase().includes(kw));
    return entryIsPriority === isPriority;
  });

  const nextNumber = relevantEntries.reduce((highest, entry) => {
    const match = String(entry.clientCardNo || '').match(/(\d+)/g);
    const current = match?.length ? Number(match[match.length - 1]) : 0;
    return Math.max(highest, current);
  }, 0) + 1;

  return formatQueueNumber(nextNumber);
}

async function nextEmployeeId() {
  const counter = await Counter.findOneAndUpdate(
    { key: 'queueOfficerEmployeeId' },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );

  return `EMB-QMS2026-${String(counter.value).padStart(3, '0')}`;
}

async function listQueueOfficers(_req, res) {
  const officers = await QueueOfficer.find().sort({ createdAt: -1 });
  return res.json({ officers });
}

async function listPublicQueueOfficerSummary(_req, res) {
  try {
    const officers = await QueueOfficer.find(
      { accountStatus: 'Active', status: 'Available', isOnline: true },
      { name: 1, assignedTransaction: 1, status: 1, isOnline: 1 }
    )
      .sort({ name: 1 })
      .lean();

    return res.json({ officers });
  } catch (error) {
    console.error('List public queue officer summary error:', error);
    return res.status(500).json({ message: 'Failed to load public queue officer summary.' });
  }
}

async function createQueueOfficer(req, res) {
  try {
    const {
      name,
      username,
      password,
      position,
      designation,
      assignedTransaction,
      status = 'Available',
      accountStatus = 'Active',
      accessModules = DEFAULT_OFFICER_ACCESS,
    } = req.body;

    if (!name || !username || !password || !position || !designation || !assignedTransaction) {
      return res.status(400).json({
        message:
          'Name, username, password, position, designation, and assigned transaction are required.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    const existingOfficer = await QueueOfficer.findOne({ username: username.toLowerCase() });
    if (existingOfficer) {
      return res.status(409).json({ message: 'Queue officer username already exists.' });
    }

    const officer = await QueueOfficer.create({
      employeeId: await nextEmployeeId(),
      name,
      username: username.toLowerCase(),
      password: await bcrypt.hash(password, 12),
      position,
      designation,
      assignedTransaction,
      status,
      accountStatus,
      accessModules: normalizeOfficerAccess(accessModules),
    });

    await logEvent({
      actor: req.admin?.name || 'Administrator',
      action: `Created queue officer ${officer.employeeId}`,
      scope: 'Queue Assigned Officers',
      severity: 'Notice',
      source: 'Settings',
      details: `${officer.name} assigned to ${officer.assignedTransaction}.`,
    });

    return res.status(201).json({ officer });
  } catch (error) {
    console.error('Create queue officer error:', error);
    return res.status(500).json({ message: 'Failed to create queue officer.' });
  }
}

async function updateQueueOfficer(req, res) {
  try {
    const { id } = req.params;
    const {
      name,
      username,
      password,
      position,
      designation,
      assignedTransaction,
      status,
      accountStatus,
      accessModules,
    } = req.body;

    const officer = await QueueOfficer.findById(id);
    if (!officer) {
      return res.status(404).json({ message: 'Queue officer not found.' });
    }

    if (username && username.toLowerCase() !== officer.username) {
      const existingOfficer = await QueueOfficer.findOne({ username: username.toLowerCase() });
      if (existingOfficer) {
        return res.status(409).json({ message: 'Queue officer username already exists.' });
      }
      officer.username = username.toLowerCase();
    }

    officer.name = name ?? officer.name;
    officer.position = position ?? officer.position;
    officer.designation = designation ?? officer.designation;
    officer.assignedTransaction =
      assignedTransaction ?? officer.assignedTransaction;
    officer.status = status ?? officer.status;
    officer.accountStatus = accountStatus ?? officer.accountStatus;

    if (Array.isArray(accessModules)) {
      officer.accessModules = normalizeOfficerAccess(accessModules);
    }

    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters.' });
      }
      officer.password = await bcrypt.hash(password, 12);
    }

    await officer.save();

    await logEvent({
      actor: req.admin?.name || 'Administrator',
      action: `Updated queue officer ${officer.employeeId}`,
      scope: 'Queue Assigned Officers',
      severity: 'Notice',
      source: 'Settings',
      details: `${officer.name} set to ${officer.status}.`,
    });

    return res.json({ officer });
  } catch (error) {
    console.error('Update queue officer error:', error);
    return res.status(500).json({ message: 'Failed to update queue officer.' });
  }
}

async function updateQueueOfficerAccess(req, res) {
  try {
    const { id } = req.params;
    const { accountStatus, accessModules = [] } = req.body;
    const officer = await QueueOfficer.findById(id);

    if (!officer) {
      return res.status(404).json({ message: 'Queue officer not found.' });
    }

    officer.accountStatus = accountStatus ?? officer.accountStatus;
    officer.accessModules = normalizeOfficerAccess(accessModules);
    await officer.save();

    await logEvent({
      actor: req.admin?.name || 'Administrator',
      action: `Updated queue officer access ${officer.employeeId}`,
      scope: 'Queue Assigned Officers',
      severity: 'Notice',
      source: 'Settings',
      details: `${officer.name} access updated.`,
    });

    return res.json({ officer });
  } catch (error) {
    console.error('Update queue officer access error:', error);
    return res.status(500).json({ message: 'Failed to update queue officer access.' });
  }
}

async function listPortalEntries(req, res) {
  try {
    const officer = await resolvePortalOfficer(req, req.query.officerId);
    if (!officer) {
      return res.status(400).json({ message: 'Select an assigned officer first.' });
    }

    const entries = await TransactionMonitoring.find({
      $or: [
        { queueOfficerId: String(officer._id) },
        { queueOfficerId: '', screeningOfficer: officer.name },
        { queueOfficerId: '', thrown: true, eccCnc: officer.assignedTransaction },
      ],
      clientCallStatus: { $nin: ['Done', 'Assisted', 'Done/Assisted'] },
    }).lean();

    return res.json({
      entries: sortPortalEntries(entries),
      assignedTransaction: officer.assignedTransaction,
    });
  } catch (error) {
    console.error('List portal entries error:', error);
    return res.status(500).json({ message: 'Failed to load queue portal entries.' });
  }
}

async function createPortalEntry(req, res) {
  try {
    const officer = await resolvePortalOfficer(req, req.body.officerId);
    if (!officer) {
      return res.status(400).json({ message: 'Select an assigned officer first.' });
    }

    const {
      clientName,
      clientStatus,
      generalInquiry,
      inquiry,
      specificInquiry,
      companyOrApplicationNo,
      clientCallStatus = 'Waiting to Call',
    } = req.body;

    if (!clientName || !clientStatus || !generalInquiry || !inquiry) {
      return res.status(400).json({ message: 'Client name, general inquiry, inquiry, and client type are required.' });
    }

    const now = new Date();
    // Admin/developer may pass a clientCardNo override; officers always get an auto-generated number.
    const overrideCardNo = req.admin && req.body.clientCardNo ? String(req.body.clientCardNo).trim() : null;
    const queueNumber = overrideCardNo || await nextQueueNumberForTransaction(generalInquiry, clientStatus);
    const entry = await TransactionMonitoring.create({
      queueOfficerId: String(officer._id),
      clientName,
      clientCardNo: queueNumber,
      clientStatus,
      screeningOfficer: officer.name,
      eccCnc: generalInquiry,
      transactionStatus: inquiry,
      specificInquiry: specificInquiry || '',
      companyOrApplicationNo: companyOrApplicationNo || '',
      receiptDate: now.toLocaleDateString(),
      receiptTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      clientCallStatus,
    });

    await logEvent({
      actor: officer.name,
      action: `Queued client ${entry.clientCardNo}`,
      scope: 'My Queue Portal',
      severity: 'Notice',
      source: 'Queue Officer',
      details: `${entry.clientName} queued for ${officer.assignedTransaction}.`,
    });

    return res.status(201).json({ entry });
  } catch (error) {
    console.error('Create portal entry error:', error);
    return res.status(500).json({ message: 'Failed to queue client.' });
  }
}

async function updatePortalEntry(req, res) {
  try {
    const officer = await resolvePortalOfficer(req, req.body.officerId);
    if (!officer) {
      return res.status(400).json({ message: 'Select an assigned officer first.' });
    }

    const { id } = req.params;
    const entry = await TransactionMonitoring.findById(id);
    if (!entry) {
      return res.status(404).json({ message: 'Queue entry not found.' });
    }

    if (!canOfficerHandle(entry, officer)) {
      return res.status(403).json({ message: 'You can only edit entries for the selected officer.' });
    }

    const {
      clientName,
      clientStatus,
      generalInquiry,
      inquiry,
      specificInquiry,
      companyOrApplicationNo,
      clientCallStatus,
    } = req.body;
    entry.clientName = clientName ?? entry.clientName;
    entry.clientStatus = clientStatus ?? entry.clientStatus;
    entry.eccCnc = generalInquiry ?? entry.eccCnc;
    entry.transactionStatus = inquiry ?? entry.transactionStatus;
    entry.specificInquiry = specificInquiry ?? entry.specificInquiry;
    entry.companyOrApplicationNo = companyOrApplicationNo ?? entry.companyOrApplicationNo;
    entry.clientCallStatus = clientCallStatus ?? entry.clientCallStatus;
    entry.screeningOfficer = officer.name;
    entry.queueOfficerId = String(officer._id);
    // Once an officer fills in a thrown number it becomes a regular bound entry.
    entry.thrown = false;
    // Admin/developer may force-correct the queue number on edit.
    if (req.admin && req.body.clientCardNo) {
      entry.clientCardNo = String(req.body.clientCardNo).trim();
    }
    await entry.save();

    return res.json({ entry });
  } catch (error) {
    console.error('Update portal entry error:', error);
    return res.status(500).json({ message: 'Failed to update queue entry.' });
  }
}

async function callPortalEntry(req, res) {
  try {
    const officer = await resolvePortalOfficer(req, req.body.officerId);
    if (!officer) {
      return res.status(400).json({ message: 'Select an assigned officer first.' });
    }

    const { id } = req.params;
    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid queue entry id.' });
    }
    const entry = await TransactionMonitoring.findById(id);

    if (!entry) {
      return res.status(404).json({ message: 'Queue entry not found.' });
    }

    if (!canOfficerHandle(entry, officer)) {
      return res.status(403).json({ message: 'You can only call entries created from your portal.' });
    }

    // Determine whether the entry being called is a priority lane client.
    const callingPriority = ['priority', 'senior', 'pwd'].some((kw) =>
      String(entry.clientStatus || '').toLowerCase().includes(kw)
    );

    // Only reset CALL status for entries that belong to THIS officer AND are in
    // the SAME lane (regular or priority). This allows a regular 01 and a
    // priority 01 to be active simultaneously for the same officer.
    const laneFilter = callingPriority
      ? { clientStatus: { $regex: /priority|senior|pwd/i } }
      : { clientStatus: { $not: /priority|senior|pwd/i } };

    await TransactionMonitoring.updateMany(
      {
        _id: { $ne: entry._id },
        $or: [
          { queueOfficerId: String(officer._id) },
          { queueOfficerId: '', screeningOfficer: officer.name },
        ],
        clientCallStatus: 'CALL',
        ...laneFilter,
      },
      { $set: { clientCallStatus: 'Waiting to Call' } }
    );

    entry.clientCallStatus = 'CALL';
    entry.screeningOfficer = officer.name;
    if (!entry.queueOfficerId) entry.queueOfficerId = String(officer._id);
    entry.thrown = false;
    await entry.save();

    await logEvent({
      actor: officer.name,
      action: `Called number ${entry.clientCardNo}`,
      scope: 'My Queue Portal',
      severity: 'Notice',
      source: 'Queue Officer',
      details: `${entry.clientName} called for ${officer.assignedTransaction}.`,
    });

    await notifyForEntryLane(entry);

    return res.json({ entry });
  } catch (error) {
    console.error('Call portal entry error:', error);
    return res.status(500).json({ message: 'Failed to call queue number.' });
  }
}

async function updatePortalEntryStatus(req, res) {
  try {
    const officer = await resolvePortalOfficer(req, req.body.officerId);
    if (!officer) {
      return res.status(400).json({ message: 'Select an assigned officer first.' });
    }

    const { id } = req.params;
    const { clientCallStatus, receiptDate, receiptTime, companyOrApplicationNo } = req.body;
    // Done and Assisted are terminal states — they remove the entry from the
    // active queue list but keep it in Transaction Monitoring history.
    const allowedStatuses = ['Waiting to Call', 'On Hold', 'Skipped', 'CLIENT MISSING', 'Done', 'Assisted', 'Done/Assisted'];

    if (!allowedStatuses.includes(clientCallStatus)) {
      return res.status(400).json({ message: 'Invalid portal queue status.' });
    }

    const entry = await TransactionMonitoring.findById(id);
    if (!entry) {
      return res.status(404).json({ message: 'Queue entry not found.' });
    }

    if (!canOfficerHandle(entry, officer)) {
      return res.status(403).json({ message: 'You can only update entries created from your portal.' });
    }

    entry.clientCallStatus = clientCallStatus;
    if (!entry.queueOfficerId) entry.queueOfficerId = String(officer._id);
    if (!entry.screeningOfficer) entry.screeningOfficer = officer.name;
    entry.thrown = false;
    // Persist optional completion-data fields supplied by the completion modal.
    if (receiptDate !== undefined) entry.receiptDate = receiptDate;
    if (receiptTime !== undefined) entry.receiptTime = receiptTime;
    if (companyOrApplicationNo !== undefined) entry.companyOrApplicationNo = companyOrApplicationNo;
    await entry.save();

    const isTerminal = clientCallStatus === 'Done' || clientCallStatus === 'Assisted' || clientCallStatus === 'Done/Assisted';
    await logEvent({
      actor: officer.name,
      action: `${clientCallStatus}: ${entry.clientCardNo}`,
      scope: 'My Queue Portal',
      severity: isTerminal ? 'Notice' : 'Info',
      source: 'Queue Officer',
      details: `${entry.clientName} (${entry.clientStatus}) marked as ${clientCallStatus} for ${officer.assignedTransaction}. Inquiry: ${entry.eccCnc} — ${entry.transactionStatus}.`,
    });

    await notifyForEntryLane(entry);

    return res.json({ entry });
  } catch (error) {
    console.error('Update portal entry status error:', error);
    return res.status(500).json({ message: 'Failed to update queue status.' });
  }
}

async function deleteQueueOfficer(req, res) {
  try {
    const { id } = req.params;
    const officer = await QueueOfficer.findById(id);

    if (!officer) {
      return res.status(404).json({ message: 'Queue officer not found.' });
    }

    await officer.deleteOne();

    await logEvent({
      actor: req.admin?.name || 'Administrator',
      action: `Deleted queue officer ${officer.employeeId}`,
      scope: 'Queue Assigned Officers',
      severity: 'Warning',
      source: 'Settings',
      details: `${officer.name} removed from assignments.`,
    });

    return res.json({ message: 'Queue officer deleted successfully.' });
  } catch (error) {
    console.error('Delete queue officer error:', error);
    return res.status(500).json({ message: 'Failed to delete queue officer.' });
  }
}

async function deletePortalEntry(req, res) {
  try {
    // Developer / admin access only — regular queue officers may not force-delete entries.
    if (!req.admin) {
      return res.status(403).json({ message: 'Developer access required to delete queue entries.' });
    }

    const officer = await resolvePortalOfficer(req, req.query.officerId);
    if (!officer) {
      return res.status(400).json({ message: 'Select an assigned officer first.' });
    }

    const { id } = req.params;
    const entry = await TransactionMonitoring.findById(id);
    if (!entry) {
      return res.status(404).json({ message: 'Queue entry not found.' });
    }

    await entry.deleteOne();

    // Renumber remaining same-officer, same-inquiry, same-lane (regular/priority)
    // active entries so there are no gaps after deletion.
    const deletedIsPriority = ['priority', 'senior', 'pwd'].some((kw) =>
      String(entry.clientStatus || '').toLowerCase().includes(kw)
    );
    const remaining = await TransactionMonitoring
      .find({
        $or: [
          { queueOfficerId: String(officer._id) },
          { queueOfficerId: '', screeningOfficer: officer.name },
        ],
        eccCnc: entry.eccCnc,
        clientCallStatus: { $nin: ['Done', 'Assisted'] },
      })
      .sort({ createdAt: 1 })
      .lean();
    const sameType = remaining.filter((e) => {
      const isPri = ['priority', 'senior', 'pwd'].some((kw) =>
        String(e.clientStatus || '').toLowerCase().includes(kw)
      );
      return isPri === deletedIsPriority;
    });
    if (sameType.length) {
      await TransactionMonitoring.bulkWrite(
        sameType.map((e, idx) => ({
          updateOne: {
            filter: { _id: e._id },
            update: { $set: { clientCardNo: String(idx + 1).padStart(2, '0') } },
          },
        }))
      );
    }

    await logEvent({
      actor: req.admin.name,
      action: `Force-deleted queue entry ${entry.clientCardNo}`,
      scope: 'My Queue Portal',
      severity: 'Warning',
      source: 'Queue Officer',
      details: `${entry.clientName} removed from queue by developer override.`,
    });

    return res.json({ message: 'Queue entry deleted.' });
  } catch (error) {
    console.error('Delete portal entry error:', error);
    return res.status(500).json({ message: 'Failed to delete queue entry.' });
  }
}

// ── Queue Number Officer (QNO) — number initialization ─────────────────────

// Lists the gray "ready" numbers generated by the Queue Number Officer that are
// still in the Initialized state (both un-thrown and already thrown).
async function listInitializedNumbers(_req, res) {
  try {
    const numbers = await TransactionMonitoring.find({
      clientCallStatus: 'Initialized',
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ numbers });
  } catch (error) {
    console.error('List initialized numbers error:', error);
    return res.status(500).json({ message: 'Failed to load initialized numbers.' });
  }
}

// Generates a new ready (gray) queue number for a given inquiry type.
async function createInitializedNumber(req, res) {
  try {
    const { inquiryType, clientStatus = 'Regular' } = req.body;

    if (!inquiryType) {
      return res.status(400).json({ message: 'Inquiry type is required.' });
    }

    const queueNumber = await nextQueueNumberForTransaction(inquiryType, clientStatus);
    const entry = await TransactionMonitoring.create({
      queueOfficerId: '',
      clientName: '',
      clientCardNo: queueNumber,
      clientStatus,
      screeningOfficer: '',
      eccCnc: inquiryType,
      transactionStatus: '',
      specificInquiry: '',
      companyOrApplicationNo: '',
      clientCallStatus: 'Initialized',
      thrown: false,
    });

    await logEvent({
      actor: req.officer?.name || req.admin?.name || 'Queue Number Officer',
      action: `Initialized number ${entry.clientCardNo}`,
      scope: 'Queue No. Initialization',
      severity: 'Info',
      source: 'Queue Number Officer',
      details: `Ready number ${entry.clientCardNo} generated for ${inquiryType}.`,
    });

    return res.status(201).json({ number: entry });
  } catch (error) {
    console.error('Create initialized number error:', error);
    return res.status(500).json({ message: 'Failed to initialize queue number.' });
  }
}

// Throws a ready number to the queue officer assigned to its inquiry type.
async function throwInitializedNumber(req, res) {
  try {
    const { id } = req.params;
    const entry = await TransactionMonitoring.findById(id);

    if (!entry || entry.clientCallStatus !== 'Initialized') {
      return res.status(404).json({ message: 'Ready number not found.' });
    }

    if (entry.thrown) {
      return res.status(409).json({ message: 'This number has already been thrown.' });
    }

    entry.thrown = true;
    await entry.save();

    await logEvent({
      actor: req.officer?.name || req.admin?.name || 'Queue Number Officer',
      action: `Threw number ${entry.clientCardNo}`,
      scope: 'Queue No. Initialization',
      severity: 'Notice',
      source: 'Queue Number Officer',
      details: `Number ${entry.clientCardNo} thrown to the ${entry.eccCnc} queue officer.`,
    });

    return res.json({ number: entry });
  } catch (error) {
    console.error('Throw initialized number error:', error);
    return res.status(500).json({ message: 'Failed to throw queue number.' });
  }
}

// Removes a ready number before it is served (QNO housekeeping).
async function deleteInitializedNumber(req, res) {
  try {
    const { id } = req.params;
    const entry = await TransactionMonitoring.findById(id);

    if (!entry || entry.clientCallStatus !== 'Initialized') {
      return res.status(404).json({ message: 'Ready number not found.' });
    }

    await entry.deleteOne();

    await logEvent({
      actor: req.officer?.name || req.admin?.name || 'Queue Number Officer',
      action: `Removed ready number ${entry.clientCardNo}`,
      scope: 'Queue No. Initialization',
      severity: 'Warning',
      source: 'Queue Number Officer',
      details: `Ready number ${entry.clientCardNo} (${entry.eccCnc}) removed.`,
    });

    return res.json({ message: 'Ready number removed.' });
  } catch (error) {
    console.error('Delete initialized number error:', error);
    return res.status(500).json({ message: 'Failed to remove queue number.' });
  }
}

module.exports = {
  listQueueOfficers,
  listPublicQueueOfficerSummary,
  createQueueOfficer,
  updateQueueOfficer,
  updateQueueOfficerAccess,
  deleteQueueOfficer,
  listPortalEntries,
  listPortalTransactionHistory,
  createPortalEntry,
  updatePortalEntry,
  callPortalEntry,
  updatePortalEntryStatus,
  deletePortalEntry,
  listInitializedNumbers,
  createInitializedNumber,
  throwInitializedNumber,
  deleteInitializedNumber,
};

async function listPortalTransactionHistory(req, res) {
  try {
    const officer = await resolvePortalOfficer(req, req.query.officerId);
    if (!officer) {
      return res.status(400).json({ message: 'Select an assigned officer first.' });
    }
    const entries = await TransactionMonitoring.find({
      $or: [
        { queueOfficerId: String(officer._id) },
        { queueOfficerId: '', screeningOfficer: officer.name },
      ],
      clientCallStatus: { $in: ['Done', 'Assisted'] },
    })
      .sort({ updatedAt: -1 })
      .lean();
    return res.json({ entries, assignedTransaction: officer.assignedTransaction });
  } catch (error) {
    console.error('List portal transaction history error:', error);
    return res.status(500).json({ message: 'Failed to load transaction history.' });
  }
}