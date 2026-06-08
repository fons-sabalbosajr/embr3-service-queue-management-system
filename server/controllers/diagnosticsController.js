const mongoose = require('mongoose');

const AppLog = require('../models/AppLog');
const BackupSnapshot = require('../models/BackupSnapshot');
const logEvent = require('../utils/logEvent');

async function collectionSnapshot() {
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  const stats = await Promise.all(
    collections.map(async (collection) => ({
      name: collection.name,
      count: await db.collection(collection.name).countDocuments(),
    }))
  );

  return stats.sort((a, b) => a.name.localeCompare(b.name));
}

async function getDatabaseDiagnostics(_req, res) {
  try {
    const db = mongoose.connection.db;
    const admin = db.admin();
    const collections = await collectionSnapshot();
    const backups = await BackupSnapshot.find().sort({ createdAt: -1 }).limit(10);

    let serverInfo = null;
    let serverStatus = null;

    try {
      serverInfo = await admin.serverInfo();
    } catch (_error) {
      serverInfo = null;
    }

    try {
      serverStatus = await admin.serverStatus();
    } catch (_error) {
      serverStatus = null;
    }

    return res.json({
      status: 'ok',
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      uptimeSeconds: Math.floor(process.uptime()),
      serverTime: new Date().toISOString(),
      databaseName: db.databaseName,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      mongoVersion: serverInfo?.version || 'Unavailable',
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage(),
      connections: serverStatus?.connections || null,
      collections,
      collectionCount: collections.length,
      totalDocuments: collections.reduce((total, item) => total + item.count, 0),
      backups,
      logCount: await AppLog.countDocuments(),
    });
  } catch (error) {
    console.error('Database diagnostics error:', error);
    return res.status(500).json({ message: 'Failed to load database diagnostics.' });
  }
}

async function createBackupSnapshot(req, res) {
  try {
    const collections = await collectionSnapshot();
    const snapshot = await BackupSnapshot.create({
      label: `Backup ${new Date().toISOString()}`,
      createdBy: req.admin?.email || req.admin?.name || 'System',
      databaseName: mongoose.connection.db.databaseName,
      collectionCount: collections.length,
      documentCount: collections.reduce((total, item) => total + item.count, 0),
      collections,
    });

    await logEvent({
      actor: req.admin?.name || 'Administrator',
      action: 'Created backup snapshot',
      scope: 'Database Status and Connections',
      severity: 'Notice',
      source: 'Developer Menu',
      details: `Snapshot ${snapshot.label} created for ${snapshot.collectionCount} collections.`,
    });

    return res.status(201).json({ backup: snapshot });
  } catch (error) {
    console.error('Create backup snapshot error:', error);
    return res.status(500).json({ message: 'Failed to create backup snapshot.' });
  }
}

async function exportCollection(req, res) {
  try {
    const { collectionName } = req.params;
    const db = mongoose.connection.db;
    const collections = await db.listCollections({ name: collectionName }).toArray();

    if (!collections.length) {
      return res.status(404).json({ message: 'Collection not found.' });
    }

    const documents = await db.collection(collectionName).find({}).toArray();

    await logEvent({
      actor: req.admin?.name || 'Administrator',
      action: `Exported ${collectionName} collection`,
      scope: 'Database Status and Connections',
      severity: 'Notice',
      source: 'Developer Menu',
      details: `Exported ${documents.length} records from ${collectionName}.`,
    });

    return res.json({
      collectionName,
      exportedAt: new Date().toISOString(),
      count: documents.length,
      documents,
    });
  } catch (error) {
    console.error('Export collection error:', error);
    return res.status(500).json({ message: 'Failed to export collection data.' });
  }
}

module.exports = {
  getDatabaseDiagnostics,
  createBackupSnapshot,
  exportCollection,
};