const mongoose = require('mongoose');

const candidatePipelineSchema = new mongoose.Schema(
  {
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recruiter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'RecruiterJob' },
    status: {
      type: String,
      enum: ['sourced', 'shortlisted', 'interviewing', 'offered', 'rejected'],
      default: 'sourced',
    },
    notes: { type: String, default: '' },
    tags: { type: [String], default: [] },
    assignee_name: { type: String, default: '' },
    next_step: { type: String, default: '' },
    rejection_reason: { type: String, default: '' },
    follow_up_at: { type: Date },
    match_score: { type: Number, default: 0 },
    match_reasons: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CandidatePipeline', candidatePipelineSchema);
