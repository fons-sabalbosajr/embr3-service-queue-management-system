const express = require('express');

const {
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
} = require('../controllers/appLogController');
const { protect, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/maintenance/status', requireAdmin, getAppLogMaintenanceStatus);
router.get('/maintenance/archives', requireAdmin, listAppLogArchives);
router.post('/maintenance/backup', requireAdmin, backupAppLogs);
router.get('/maintenance/archive/:backupId', requireAdmin, getAppLogArchiveDetail);
router.get('/maintenance/report/:backupId', requireAdmin, getAppLogArchiveReport);
router.post('/maintenance/clear', requireAdmin, clearAppLogs);

router.get('/', listAppLogs);
router.post('/', createAppLog);
router.put('/:id', updateAppLog);
router.delete('/:id', deleteAppLog);

module.exports = router;