const mongoose = require('mongoose');

const batchUploadSchema = new mongoose.Schema(
  {
    university: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    filename: { type: String, required: true },
    path: { type: String, required: true },
    status: { type: String, enum: ['completed', 'failed'], default: 'completed' },
    summary: {
      created: { type: Number, default: 0 },
      updated: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BatchUpload', batchUploadSchema);
