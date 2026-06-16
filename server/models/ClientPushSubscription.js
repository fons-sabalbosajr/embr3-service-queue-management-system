const mongoose = require('mongoose');

const clientPushSubscriptionSchema = new mongoose.Schema(
  {
    endpoint: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    keys: {
      p256dh: {
        type: String,
        required: true,
        trim: true,
      },
      auth: {
        type: String,
        required: true,
        trim: true,
      },
    },
    trackedEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TransactionMonitoring',
      default: null,
    },
    trackedTicket: {
      type: String,
      default: '',
      trim: true,
    },
    trackedTransaction: {
      type: String,
      default: '',
      trim: true,
    },
    trackedLane: {
      type: String,
      enum: ['regular', 'priority'],
      default: 'regular',
    },
    active: {
      type: Boolean,
      default: true,
    },
    lastNotifiedStage: {
      type: String,
      default: '',
      trim: true,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ClientPushSubscription', clientPushSubscriptionSchema);