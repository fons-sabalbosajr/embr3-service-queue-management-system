const express = require('express');

const {
  getPublicQueueSummary,
  listTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} = require('../controllers/transactionMonitoringController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/public-summary', getPublicQueueSummary);

router.use(protect);

router.get('/', listTransactions);
router.post('/', createTransaction);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

module.exports = router;