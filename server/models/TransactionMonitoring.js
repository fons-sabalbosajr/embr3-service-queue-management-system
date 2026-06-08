const mongoose = require('mongoose');

const transactionMonitoringSchema = new mongoose.Schema(
  {
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
      required: true,
      trim: true,
    },
    eccCnc: {
      type: String,
      required: true,
      trim: true,
    },
    transactionStatus: {
      type: String,
      required: true,
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
      enum: ['CALL', 'CLIENT MISSING', 'Done', 'Assisted'],
      default: 'CALL',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  'TransactionMonitoring',
  transactionMonitoringSchema
);