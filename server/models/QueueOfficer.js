const mongoose = require('mongoose');

const queueOfficerSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    position: {
      type: String,
      required: [true, 'Position is required'],
      trim: true,
    },
    designation: {
      type: String,
      default: '',
      trim: true,
    },
    assignedTransaction: {
      type: String,
      required: [true, 'Assigned transaction is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['Available', 'Not Available'],
      default: 'Available',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('QueueOfficer', queueOfficerSchema);