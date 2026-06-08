const AppLog = require('../models/AppLog');

async function logEvent(payload) {
  try {
    await AppLog.create({
      actor: payload.actor,
      action: payload.action,
      scope: payload.scope,
      severity: payload.severity || 'Info',
      source: payload.source || 'Admin Console',
      details: payload.details || '',
      timestamp: payload.timestamp || new Date(),
    });
  } catch (error) {
    console.error('Log event failed:', error.message);
  }
}

module.exports = logEvent;