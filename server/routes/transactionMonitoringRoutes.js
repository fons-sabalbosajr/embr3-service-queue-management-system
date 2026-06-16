const express = require('express');

const {
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
} = require('../controllers/transactionMonitoringController');
const { protect, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/public-summary', getPublicQueueSummary);

router.use(protect);

router.get('/daily-reset/status', requireAdmin, getDailyResetStatus);
router.get('/daily-reset/archives', requireAdmin, listDailyResetArchives);
router.get('/daily-reset/archive/:backupId', requireAdmin, getDailyResetArchiveDetail);
router.post('/daily-reset/prepare', requireAdmin, prepareDailyResetArchive);
router.get('/daily-reset/report/:backupId', requireAdmin, getDailyResetReport);
router.post('/daily-reset/execute', requireAdmin, executeDailyReset);

router.get('/', listTransactions);
router.post('/', createTransaction);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

module.exports = router;