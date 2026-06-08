const express = require('express');

const {
  listQueueOfficers,
  createQueueOfficer,
  updateQueueOfficer,
  deleteQueueOfficer,
} = require('../controllers/queueOfficerController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', listQueueOfficers);
router.post('/', createQueueOfficer);
router.put('/:id', updateQueueOfficer);
router.delete('/:id', deleteQueueOfficer);

module.exports = router;