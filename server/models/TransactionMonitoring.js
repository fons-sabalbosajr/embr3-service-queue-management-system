const mongoose = require('mongoose');

const transactionMonitoringSchema = new mongoose.Schema(
  {
    queueOfficerId: {
      type: String,
      default: '',
      trim: true,
    },
    clientName: {
      type: String,
      default: '',
      trim: true,
    },
    clientCardNo: {
      type: String,
      required: true,
      trim: true,
    },
    clientStatus: {
      type: String,
      required: true,
      trim: true,
    },
    screeningOfficer: {
      type: String,
      default: '',
      trim: true,
    },
    eccCnc: {
      type: String,
      required: true,
      trim: true,
    },
    transactionStatus: {
      type: String,
      default: '',
      trim: true,
    },
    specificInquiry: {
      type: String,
      default: '',
      trim: true,
    },
    companyOrApplicationNo: {
      type: String,
      default: '',
      trim: true,
    },
    receiptDate: {
      type: String,
      default: '',
      trim: true,
    },
    receiptTime: {
      type: String,
      default: '',
      trim: true,
    },
    clientCallStatus: {
      type: String,
      required: true,
      enum: ['Initialized', 'Queued', 'Waiting to Call', 'CALL', 'On Hold', 'Skipped', 'CLIENT MISSING', 'Done', 'Assisted', 'Done/Assisted'],
      default: 'Queued',
    },
    // True once a Queue Number Officer throws an Initialized number to the
    // queue officer's portal. Defaults false for officer-created entries.
    thrown: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  'TransactionMonitoring',
  transactionMonitoringSchema
);