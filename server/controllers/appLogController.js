const AppLog = require('../models/AppLog');
const BackupSnapshot = require('../models/BackupSnapshot');
const logEvent = require('../utils/logEvent');

function summarize(logs) {
  return {
    total: logs.length,
    info: logs.filter((item) => item.severity === 'Info').length,
    notice: logs.filter((item) => item.severity === 'Notice').length,
    warnings: logs.filter((item) => item.severity === 'Warning').length,
    critical: logs.filter((item) => item.severity === 'Critical').length,
  };
}

function reportDateLabel(now = new Date()) {
  return now.toLocaleDateString('en-CA');
}

async function getAppLogMaintenanceStatus(_req, res) {
  try {
    const [latestBackup, liveLogCount] = await Promise.all([
      BackupSnapshot.findOne({ archiveType: 'app-log-backup' })
        .sort({ createdAt: -1 })
        .select('label createdBy reportDate archiveSummary createdAt clearedAt clearedCount')
        .lean(),
      AppLog.countDocuments(),
    ])

    return res.json({ latestBackup, liveLogCount })
  } catch (error) {
    console.error('App log maintenance status error:', error)
    return res.status(500).json({ message: 'Failed to load app log maintenance status.' })
  }
}

async function listAppLogArchives(_req, res) {
  try {
    const archives = await BackupSnapshot.find({ archiveType: 'app-log-backup' })
      .sort({ createdAt: -1 })
      .select('label createdBy reportDate archiveSummary createdAt clearedAt clearedCount')
      .lean()

    return res.json({ archives })
  } catch (error) {
    console.error('App log archives error:', error)
    return res.status(500).json({ message: 'Failed to load activity log archives.' })
  }
}

async function backupAppLogs(req, res) {
  try {
    const logs = await AppLog.find().sort({ timestamp: -1, createdAt: -1 }).lean()
    if (!logs.length) {
      return res.status(400).json({ message: 'No activity logs available to back up.' })
    }

    const now = new Date()
    const dateLabel = reportDateLabel(now)
    const summary = summarize(logs)

    const backup = await BackupSnapshot.create({
      label: `Activity Logs ${dateLabel} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`,
      createdBy: req.admin?.email || req.admin?.name || 'Administrator',
      databaseName: 'app-logs',
      archiveType: 'app-log-backup',
      reportDate: dateLabel,
      collectionCount: 1,
      documentCount: logs.length,
      collections: [{ name: 'applogs', count: logs.length }],
      archiveSummary: {
        totalTransactions: summary.total,
        completedTransactions: summary.notice + summary.info,
        activeTransactions: summary.warnings + summary.critical,
      },
      reportRows: logs,
      archivedTransactions: logs,
    })

    await logEvent({
      actor: req.admin?.name || 'Administrator',
      action: 'Backed up activity logs',
      scope: 'Activity Log Maintenance',
      severity: 'Notice',
      source: 'Settings',
      details: `${logs.length} activity logs archived for ${dateLabel}.`,
    })

    return res.status(201).json({
      backup,
      reportRows: logs,
      reportFilename: `activity-logs-${dateLabel}`,
    })
  } catch (error) {
    console.error('Backup app logs error:', error)
    return res.status(500).json({ message: 'Failed to back up activity logs.' })
  }
}

async function getAppLogArchiveDetail(req, res) {
  try {
    const { backupId } = req.params
    const archive = await BackupSnapshot.findById(backupId)
      .select('label createdBy reportDate archiveSummary createdAt clearedAt clearedCount reportRows archivedTransactions')
      .lean()

    if (!archive || archive.archiveType !== 'app-log-backup') {
      return res.status(404).json({ message: 'Activity log archive not found.' })
    }

    return res.json({ archive })
  } catch (error) {
    console.error('App log archive detail error:', error)
    return res.status(500).json({ message: 'Failed to load activity log archive detail.' })
  }
}

async function getAppLogArchiveReport(req, res) {
  try {
    const { backupId } = req.params
    const archive = await BackupSnapshot.findById(backupId).lean()

    if (!archive || archive.archiveType !== 'app-log-backup') {
      return res.status(404).json({ message: 'Activity log archive not found.' })
    }

    return res.json({
      reportRows: archive.reportRows || [],
      reportFilename: `activity-logs-${archive.reportDate || 'archive'}`,
    })
  } catch (error) {
    console.error('App log archive report error:', error)
    return res.status(500).json({ message: 'Failed to load activity log archive report.' })
  }
}

async function clearAppLogs(req, res) {
  try {
    const { backupId } = req.body
    if (!backupId) {
      return res.status(400).json({ message: 'Backup id is required before clearing activity logs.' })
    }

    const backup = await BackupSnapshot.findById(backupId)
    if (!backup || backup.archiveType !== 'app-log-backup') {
      return res.status(404).json({ message: 'Activity log backup not found.' })
    }

    if (backup.clearedAt) {
      return res.status(409).json({ message: 'This activity log backup has already been used to clear the logs.' })
    }

    const deleteResult = await AppLog.deleteMany({})
    backup.clearedAt = new Date()
    backup.clearedCount = deleteResult.deletedCount || 0
    await backup.save()

    await logEvent({
      actor: req.admin?.name || 'Administrator',
      action: 'Cleared activity logs',
      scope: 'Activity Log Maintenance',
      severity: 'Warning',
      source: 'Settings',
      details: `${backup.clearedCount} activity logs cleared after secured backup.`,
    })

    return res.json({
      message: 'Activity logs cleared successfully.',
      clearedCount: backup.clearedCount,
      backup,
    })
  } catch (error) {
    console.error('Clear app logs error:', error)
    return res.status(500).json({ message: 'Failed to clear activity logs.' })
  }
}

async function listAppLogs(req, res) {
  const query = {};
  const search = req.query.search?.trim();

  if (search) {
    query.$or = [
      { actor: { $regex: search, $options: 'i' } },
      { action: { $regex: search, $options: 'i' } },
      { scope: { $regex: search, $options: 'i' } },
      { source: { $regex: search, $options: 'i' } },
    ];
  }

  const logs = await AppLog.find(query).sort({ timestamp: -1, createdAt: -1 });
  return res.json({ logs, summary: summarize(logs) });
}

async function createAppLog(req, res) {
  try {
    const { actor, action, scope, severity = 'Info', source = 'Admin Console', details = '' } = req.body;

    if (!actor || !action || !scope) {
      return res.status(400).json({ message: 'Actor, action, and scope are required.' });
    }

    const log = await AppLog.create({ actor, action, scope, severity, source, details });
    return res.status(201).json({ log });
  } catch (error) {
    console.error('Create app log error:', error);
    return res.status(500).json({ message: 'Failed to create app log.' });
  }
}

async function updateAppLog(req, res) {
  try {
    const { id } = req.params;
    const { actor, action, scope, severity, source, details } = req.body;
    const log = await AppLog.findById(id);

    if (!log) {
      return res.status(404).json({ message: 'App log not found.' });
    }

    log.actor = actor ?? log.actor;
    log.action = action ?? log.action;
    log.scope = scope ?? log.scope;
    log.severity = severity ?? log.severity;
    log.source = source ?? log.source;
    log.details = details ?? log.details;
    await log.save();

    return res.json({ log });
  } catch (error) {
    console.error('Update app log error:', error);
    return res.status(500).json({ message: 'Failed to update app log.' });
  }
}

async function deleteAppLog(req, res) {
  try {
    const { id } = req.params;
    const log = await AppLog.findById(id);

    if (!log) {
      return res.status(404).json({ message: 'App log not found.' });
    }

    await log.deleteOne();
    return res.json({ message: 'App log deleted successfully.' });
  } catch (error) {
    console.error('Delete app log error:', error);
    return res.status(500).json({ message: 'Failed to delete app log.' });
  }
}

module.exports = {
  getAppLogMaintenanceStatus,
  listAppLogArchives,
  backupAppLogs,
  getAppLogArchiveDetail,
  getAppLogArchiveReport,
  clearAppLogs,
  listAppLogs,
  createAppLog,
  updateAppLog,
  deleteAppLog,
};