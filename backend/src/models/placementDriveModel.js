const mongoose = require('mongoose');

const placementCandidateSchema = new mongoose.Schema(
  {
    candidate_id: Number,
    name: String,
    score: Number,
    branch: String,
    verification_id: String,
  },
  { _id: false }
);

const placementDriveSchema = new mongoose.Schema(
  {
    university: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    company_name: { type: String, required: true },
    role_title: { type: String, required: true },
    description: { type: String, default: '' },
    target_branches: { type: [String], default: [] },
    target_courses: { type: [String], default: [] },
    minimum_ready_score: { type: Number, default: 70 },
    scheduled_on: { type: Date },
    status: { type: String, enum: ['planning', 'live', 'closed'], default: 'planning' },
    eligible_count: { type: Number, default: 0 },
    top_candidates: { type: [placementCandidateSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PlacementDrive', placementDriveSchema);
