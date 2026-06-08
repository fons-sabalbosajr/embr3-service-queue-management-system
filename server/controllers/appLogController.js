const AppLog = require('../models/AppLog');

function summarize(logs) {
  return {
    total: logs.length,
    info: logs.filter((item) => item.severity === 'Info').length,
    notice: logs.filter((item) => item.severity === 'Notice').length,
    warnings: logs.filter((item) => item.severity === 'Warning').length,
    critical: logs.filter((item) => item.severity === 'Critical').length,
  };
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
  listAppLogs,
  createAppLog,
  updateAppLog,
  deleteAppLog,
};