const express = require('express');

const {
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
} = require('../controllers/queueOfficerController');
const { protect, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/public-summary', listPublicQueueOfficerSummary);

router.use(protect);

router.get('/portal/entries', listPortalEntries);
router.get('/portal/transactions', listPortalTransactionHistory);
router.post('/portal/entries', createPortalEntry);
router.put('/portal/entries/:id', updatePortalEntry);
router.delete('/portal/entries/:id', deletePortalEntry);
router.post('/portal/entries/:id/call', callPortalEntry);
router.patch('/portal/entries/:id/status', updatePortalEntryStatus);

// Queue Number Officer — ready-number initialization
router.get('/qno/numbers', listInitializedNumbers);
router.post('/qno/numbers', createInitializedNumber);
router.patch('/qno/numbers/:id/throw', throwInitializedNumber);
router.delete('/qno/numbers/:id', deleteInitializedNumber);

router.get('/', requireAdmin, listQueueOfficers);
router.post('/', requireAdmin, createQueueOfficer);
router.put('/:id', requireAdmin, updateQueueOfficer);
router.patch('/:id/access', requireAdmin, updateQueueOfficerAccess);
router.delete('/:id', requireAdmin, deleteQueueOfficer);

module.exports = router;