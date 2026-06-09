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
    boardTitle: {
      type: String,
      default: 'Queue Dashboard',
      trim: true,
    },
    boardTitleSize: {
      type: Number,
      default: 56,
      min: 20,
      max: 120,
    },
    boardSubtitle: {
      type: String,
      default: 'Now Serving',
      trim: true,
    },
    boardSubtitleSize: {
      type: Number,
      default: 36,
      min: 14,
      max: 80,
    },
    counterCards: {
      type: [queueDisplayCardSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('QueueDisplayConfig', queueDisplayConfigSchema);