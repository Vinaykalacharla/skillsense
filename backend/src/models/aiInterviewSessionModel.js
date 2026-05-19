const mongoose = require('mongoose');

const aiInterviewSessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['idle', 'active', 'completed'], default: 'idle' },
    transcript: { type: Array, default: [] },
    feedback: { type: Array, default: [] },
    metrics: { type: Array, default: [] },
    tips: { type: Array, default: [] },
    session_profile: { type: mongoose.Schema.Types.Mixed, default: {} },
    summary: { type: mongoose.Schema.Types.Mixed, default: {} },
    latest_analysis: { type: mongoose.Schema.Types.Mixed, default: {} },
    setup_defaults: { type: mongoose.Schema.Types.Mixed, default: {} },
    questions: { type: Array, default: [] },
    answers: { type: Array, default: [] },
    current_index: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    completed_at: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AiInterviewSession', aiInterviewSessionSchema);
