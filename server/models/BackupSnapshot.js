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
    archiveType: {
      type: String,
      default: 'database',
      trim: true,
    },
    reportDate: {
      type: String,
      default: '',
      trim: true,
    },
    archiveSummary: {
      type: new mongoose.Schema(
        {
          totalTransactions: { type: Number, default: 0 },
          completedTransactions: { type: Number, default: 0 },
          activeTransactions: { type: Number, default: 0 },
        },
        { _id: false }
      ),
      default: () => ({}),
    },
    reportRows: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    archivedTransactions: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    resetExecutedAt: {
      type: Date,
      default: null,
    },
    resetDeletedCount: {
      type: Number,
      default: 0,
    },
    clearedAt: {
      type: Date,
      default: null,
    },
    clearedCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BackupSnapshot', backupSnapshotSchema);