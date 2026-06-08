const express = require('express');

const {
  getQueueDisplayConfig,
  updateQueueDisplaySettings,
  createQueueDisplayCard,
  updateQueueDisplayCard,
  deleteQueueDisplayCard,
} = require('../controllers/queueDisplayController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getQueueDisplayConfig);
router.put('/settings', protect, updateQueueDisplaySettings);
router.post('/cards', protect, createQueueDisplayCard);
router.put('/cards/:cardId', protect, updateQueueDisplayCard);
router.delete('/cards/:cardId', protect, deleteQueueDisplayCard);

module.exports = router;