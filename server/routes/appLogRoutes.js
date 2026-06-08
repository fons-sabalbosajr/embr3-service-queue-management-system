const express = require('express');

const {
  listAppLogs,
  createAppLog,
  updateAppLog,
  deleteAppLog,
} = require('../controllers/appLogController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', listAppLogs);
router.post('/', createAppLog);
router.put('/:id', updateAppLog);
router.delete('/:id', deleteAppLog);

module.exports = router;