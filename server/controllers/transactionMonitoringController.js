const TransactionMonitoring = require('../models/TransactionMonitoring');
const BackupSnapshot = require('../models/BackupSnapshot');
const logEvent = require('../utils/logEvent');

function reportDateLabel(now = new Date()) {
  return now.toLocaleDateString('en-CA');
}

function normalizeStatus(value) {
  if (value === 'Done' || value === 'Assisted' || value === 'Done/Assisted') {
    return 'Done/Assisted';
  }
  return value;
}

function buildArchiveSummary(transactions = []) {
  const completedStatuses = new Set(['Done', 'Assisted', 'Done/Assisted']);
  const completedTransactions = transactions.filter((item) => completedStatuses.has(item.clientCallStatus)).length;
  return {
    totalTransactions: transactions.length,
    completedTransactions,
    activeTransactions: transactions.length - completedTransactions,
  };
}

function buildReportRows(transactions = []) {
  return transactions.map((item) => ({
    ...item,
    clientCallStatus: normalizeStatus(item.clientCallStatus),
  }));
}

async function getDailyResetStatus(_req, res) {
  try {
    const [latestBackup, liveQueueCount] = await Promise.all([
      BackupSnapshot.findOne({ archiveType: 'daily-queue-reset' })
        .sort({ createdAt: -1 })
        .select('label createdBy reportDate archiveSummary createdAt resetExecutedAt resetDeletedCount')
        .lean(),
      TransactionMonitoring.countDocuments(),
    ]);

    return res.json({ latestBackup, liveQueueCount });
  } catch (error) {
    console.error('Daily reset status error:', error);
    return res.status(500).json({ message: 'Failed to load daily reset status.' });
  }
}

async function listDailyResetArchives(_req, res) {
  try {
    const archives = await BackupSnapshot.find({ archiveType: 'daily-queue-reset' })
      .sort({ createdAt: -1 })
      .select('label createdBy reportDate archiveSummary createdAt resetExecutedAt resetDeletedCount')
      .lean()

    return res.json({ archives })
  } catch (error) {
    console.error('Daily reset archives error:', error)
    return res.status(500).json({ message: 'Failed to load daily reset archives.' })
  }
}

async function getDailyResetArchiveDetail(req, res) {
  try {
    const { backupId } = req.params
    const archive = await BackupSnapshot.findById(backupId)
      .select('label createdBy reportDate archiveSummary createdAt resetExecutedAt resetDeletedCount reportRows archivedTransactions')
      .lean()

    if (!archive || archive.archiveType && archive.archiveType !== 'daily-queue-reset') {
      return res.status(404).json({ message: 'Daily queue archive not found.' })
    }

    return res.json({ archive })
  } catch (error) {
    console.error('Daily reset archive detail error:', error)
    return res.status(500).json({ message: 'Failed to load daily reset archive detail.' })
  }
}

async function prepareDailyResetArchive(req, res) {
  try {
    const transactions = await TransactionMonitoring.find().sort({ createdAt: 1 }).lean();
    if (!transactions.length) {
      return res.status(400).json({ message: 'No live queue transactions available to archive.' });
    }

    const now = new Date();
    const summary = buildArchiveSummary(transactions);
    const reportRows = buildReportRows(transactions);
    const dateLabel = reportDateLabel(now);
    const { override = false } = req.body || {}

    const existingSameDayBackup = await BackupSnapshot.findOne({
      archiveType: 'daily-queue-reset',
      reportDate: dateLabel,
    })
      .sort({ createdAt: -1 })
      .select('label createdBy reportDate archiveSummary createdAt resetExecutedAt resetDeletedCount')
      .lean()

    if (existingSameDayBackup && !override) {
      return res.status(409).json({
        message: `A daily reset archive already exists for ${dateLabel}. Override it only if you intend to prepare another secured snapshot for the same day.`,
        existingBackup: existingSameDayBackup,
      })
    }

    const backup = await BackupSnapshot.create({
      label: `Daily Queue Reset ${dateLabel} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`,
      createdBy: req.admin?.email || req.admin?.name || 'Administrator',
      databaseName: 'transaction-monitoring',
      archiveType: 'daily-queue-reset',
      reportDate: dateLabel,
      collectionCount: 1,
      documentCount: transactions.length,
      collections: [{ name: 'transactionmonitorings', count: transactions.length }],
      archiveSummary: summary,
      reportRows,
      archivedTransactions: transactions,
    });

    await logEvent({
      actor: req.admin?.name || 'Administrator',
      action: 'Prepared daily queue reset backup',
      scope: 'Daily Queue Reset',
      severity: 'Notice',
      source: 'Settings',
      details: `${transactions.length} queue transactions archived for ${dateLabel}.`,
    });

    return res.status(201).json({
      backup,
      reportRows,
      reportFilename: `daily-queue-report-${dateLabel}`,
    });
  } catch (error) {
    console.error('Prepare daily reset archive error:', error);
    return res.status(500).json({ message: 'Failed to prepare daily queue backup.' });
  }
}

async function getDailyResetReport(req, res) {
  try {
    const { backupId } = req.params;
    const backup = await BackupSnapshot.findById(backupId).lean();

    if (!backup || backup.archiveType !== 'daily-queue-reset') {
      return res.status(404).json({ message: 'Daily queue backup not found.' });
    }

    return res.json({
      reportRows: backup.reportRows || [],
      reportFilename: `daily-queue-report-${backup.reportDate || 'archive'}`,
    });
  } catch (error) {
    console.error('Daily reset report error:', error);
    return res.status(500).json({ message: 'Failed to load daily reset report.' });
  }
}

async function executeDailyReset(req, res) {
  try {
    const { backupId } = req.body;
    if (!backupId) {
      return res.status(400).json({ message: 'Backup id is required.' });
    }

    const backup = await BackupSnapshot.findById(backupId);
    if (!backup || backup.archiveType !== 'daily-queue-reset') {
      return res.status(404).json({ message: 'Daily queue backup not found.' });
    }

    if (backup.resetExecutedAt) {
      return res.status(409).json({ message: 'This daily queue reset backup has already been executed.' });
    }

    const deleteResult = await TransactionMonitoring.deleteMany({});
    backup.resetExecutedAt = new Date();
    backup.resetDeletedCount = deleteResult.deletedCount || 0;
    await backup.save();

    await logEvent({
      actor: req.admin?.name || 'Administrator',
      action: 'Executed daily queue reset',
      scope: 'Daily Queue Reset',
      severity: 'Warning',
      source: 'Settings',
      details: `${backup.resetDeletedCount} live queue transactions cleared for next-day reset.`,
    });

    return res.json({
      message: 'Daily queue reset executed successfully.',
      deletedCount: backup.resetDeletedCount,
      backup,
    });
  } catch (error) {
    console.error('Execute daily reset error:', error);
    return res.status(500).json({ message: 'Failed to execute daily queue reset.' });
  }
}

async function getPublicQueueSummary(_req, res) {
  try {
    const queueItems = await TransactionMonitoring.find(
      { clientCallStatus: { $in: ['Queued', 'Waiting to Call', 'CALL', 'CLIENT MISSING'] } },
      {
        clientName: 1,
        clientCardNo: 1,
        clientStatus: 1,
        screeningOfficer: 1,
        transactionStatus: 1,
        specificInquiry: 1,
        eccCnc: 1,
        clientCallStatus: 1,
        createdAt: 1,
      }
    )
      .sort({ createdAt: 1 })
      .lean();

    return res.json({ queueItems });
  } catch (error) {
    console.error('Get public queue summary error:', error);
    return res.status(500).json({ message: 'Failed to load public queue summary.' });
  }
}

async function listTransactions(_req, res) {
  const transactions = await TransactionMonitoring.find().sort({ createdAt: -1 });
  return res.json({ transactions });
}

async function createTransaction(req, res) {
  try {
    const transaction = await TransactionMonitoring.create(req.body);

    await logEvent({
      actor: req.admin?.name || 'Administrator',
      action: `Created transaction ${transaction.clientCardNo}`,
      scope: 'Transaction Monitoring Config',
      severity: 'Notice',
      source: 'Settings',
      details: `${transaction.clientCardNo} registered for ${transaction.transactionStatus}.`,
    });

    return res.status(201).json({ transaction });
  } catch (error) {
    console.error('Create transaction error:', error);
    return res.status(500).json({ message: 'Failed to create transaction.' });
  }
}

async function updateTransaction(req, res) {
  try {
    const { id } = req.params;
    const transaction = await TransactionMonitoring.findById(id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    Object.assign(transaction, req.body);
    await transaction.save();

    await logEvent({
      actor: req.admin?.name || 'Administrator',
      action: `Updated transaction ${transaction.clientCardNo}`,
      scope: 'Transaction Monitoring Config',
      severity: 'Notice',
      source: 'Settings',
      details: `${transaction.clientCardNo} updated to ${transaction.clientCallStatus}.`,
    });

    return res.json({ transaction });
  } catch (error) {
    console.error('Update transaction error:', error);
    return res.status(500).json({ message: 'Failed to update transaction.' });
  }
}

async function deleteTransaction(req, res) {
  try {
    const { id } = req.params;
    const transaction = await TransactionMonitoring.findById(id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    await transaction.deleteOne();

    await logEvent({
      actor: req.admin?.name || 'Administrator',
      action: `Deleted transaction ${transaction.clientCardNo}`,
      scope: 'Transaction Monitoring Config',
      severity: 'Warning',
      source: 'Settings',
    });

    return res.json({ message: 'Transaction deleted successfully.' });
  } catch (error) {
    console.error('Delete transaction error:', error);
    return res.status(500).json({ message: 'Failed to delete transaction.' });
  }
}

module.exports = {
  getPublicQueueSummary,
  getDailyResetStatus,
  listDailyResetArchives,
  getDailyResetArchiveDetail,
  prepareDailyResetArchive,
  getDailyResetReport,
  executeDailyReset,
  listTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};