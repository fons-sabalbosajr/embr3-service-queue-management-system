const mongoose = require('mongoose');

const DEFAULT_OFFICER_ACCESS = [
  'dashboard',
  'queue-dashboard',
  'queue-officer',
  'queue-officer-serving-desk',
  'queue-officer-portal',
];

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
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
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
    accountStatus: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    accessModules: {
      type: [String],
      default: DEFAULT_OFFICER_ACCESS,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('QueueOfficer', queueOfficerSchema);