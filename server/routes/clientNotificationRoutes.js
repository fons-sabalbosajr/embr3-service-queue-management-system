const express = require('express');

const {
  getPublicPushConfig,
  subscribeClient,
  unsubscribeClient,
} = require('../controllers/clientNotificationController');

const router = express.Router();

router.get('/config', getPublicPushConfig);
router.post('/subscribe', subscribeClient);
router.post('/unsubscribe', unsubscribeClient);

module.exports = router;