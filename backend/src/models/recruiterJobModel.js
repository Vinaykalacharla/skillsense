const mongoose = require('mongoose');

const recruiterJobSchema = new mongoose.Schema(
  {
    recruiter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    required_skills: { type: [String], default: [] },
    preferred_skills: { type: [String], default: [] },
    min_ready_score: { type: Number, default: 65 },
    status: { type: String, enum: ['open', 'paused', 'closed'], default: 'open' },
    top_matches: { type: Number, default: 0 },
    numeric_id: { type: Number, unique: true, sparse: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RecruiterJob', recruiterJobSchema);
