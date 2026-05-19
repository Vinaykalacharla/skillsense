const mongoose = require('mongoose');

const savedSearchSchema = new mongoose.Schema(
  {
    recruiter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    query: { type: String, default: '' },
    filters: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SavedSearch', savedSearchSchema);
