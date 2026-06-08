const express = require('express');

const {
  listAdmins,
  createAdmin,
  updateAdmin,
  updateAdminAccess,
  deleteAdmin,
} = require('../controllers/adminManagementController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', listAdmins);
router.post('/', createAdmin);
router.put('/:id', updateAdmin);
router.patch('/:id/access', updateAdminAccess);
router.delete('/:id', deleteAdmin);

module.exports = router;