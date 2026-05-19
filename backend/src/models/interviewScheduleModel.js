const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    candidate_numeric_id: { type: Number },
    candidate_name: { type: String },
    recruiter_name: { type: String },
    job_title: { type: String },
    scheduled_at: { type: Date },
    duration_minutes: { type: Number, default: 30 },
    meeting_link: { type: String },
    notes: { type: String },
    status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InterviewSchedule', interviewSchema);
