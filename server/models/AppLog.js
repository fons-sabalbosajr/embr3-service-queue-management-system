const mongoose = require('mongoose');

const appLogSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
    },
    actor: {
      type: String,
      required: true,
      trim: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    scope: {
      type: String,
      required: true,
      trim: true,
    },
    severity: {
      type: String,
      enum: ['Info', 'Notice', 'Warning', 'Critical'],
      default: 'Info',
    },
    source: {
      type: String,
      default: 'Admin Console',
      trim: true,
    },
    details: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AppLog', appLogSchema);