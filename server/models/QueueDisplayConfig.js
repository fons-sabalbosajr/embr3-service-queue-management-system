const mongoose = require('mongoose');

const queueDisplayCardSchema = new mongoose.Schema(
  {
    transactionName: {
      type: String,
      required: true,
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

const queueDisplayConfigSchema = new mongoose.Schema(
  {
    configKey: {
      type: String,
      unique: true,
      default: 'default',
    },
    refreshSeconds: {
      type: Number,
      default: 4,
      min: 1,
      max: 60,
    },
    density: {
      type: String,
      enum: ['Comfortable', 'Compact'],
      default: 'Comfortable',
    },
    soundAlerts: {
      type: Boolean,
      default: true,
    },
    counterCards: {
      type: [queueDisplayCardSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('QueueDisplayConfig', queueDisplayConfigSchema);