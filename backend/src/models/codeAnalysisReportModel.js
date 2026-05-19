const mongoose = require('mongoose');

const codeAnalysisSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    numeric_id: { type: Number, unique: true, sparse: true },
    repo_url: { type: String, required: true },
    repo_name: { type: String },
    description: { type: String, default: '' },
    score: { type: Number, default: 0 },
    status: { type: String, enum: ['queued', 'running', 'completed', 'failed'], default: 'completed' },
    metrics: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CodeAnalysisReport', codeAnalysisSchema);
