const express = require('express');

const {
  getDatabaseDiagnostics,
  createBackupSnapshot,
  exportCollection,
} = require('../controllers/diagnosticsController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/database', getDatabaseDiagnostics);
router.post('/database/backups', createBackupSnapshot);
router.get('/database/export/:collectionName', exportCollection);

module.exports = router;