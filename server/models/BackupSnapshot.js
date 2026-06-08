const mongoose = require('mongoose');

const backupSnapshotSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: String,
      default: 'System',
      trim: true,
    },
    databaseName: {
      type: String,
      required: true,
      trim: true,
    },
    collectionCount: {
      type: Number,
      default: 0,
    },
    documentCount: {
      type: Number,
      default: 0,
    },
    collections: {
      type: [
        new mongoose.Schema(
          {
            name: String,
            count: Number,
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BackupSnapshot', backupSnapshotSchema);