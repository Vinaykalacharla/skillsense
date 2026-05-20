const mongoose = require('mongoose');

const statsSchema = new mongoose.Schema(
  {
    top_languages: [
      {
        name: { type: String },
        value: { type: Number },
      },
    ],
    forked: { type: Number, default: 0 },
    original: { type: Number, default: 0 },
    fork_ratio: { type: Number, default: 0 },
  },
  { _id: false }
);

const scoreSchema = new mongoose.Schema(
  {
    coding_skill_index: { type: Number, default: 0 },
    communication_score: { type: Number, default: 0 },
    authenticity_score: { type: Number, default: 0 },
    placement_ready: { type: Number, default: 0 },
  },
  { _id: false }
);

const breakdownSchema = new mongoose.Schema(
  {
    coding_skill_index: { type: Map, of: Number, default: {} },
    communication_score: { type: Map, of: Number, default: {} },
    authenticity_score: { type: Map, of: Number, default: {} },
    placement_ready: { type: Map, of: Number, default: {} },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['student', 'recruiter', 'university'],
      default: 'student',
    },
    full_name: { type: String, trim: true },
    gender: { type: String, trim: true },
    phone_number: { type: String, trim: true },
    organization_name: { type: String, trim: true },
    approval_status: {
      type: String,
      enum: ['approved', 'pending', 'rejected'],
      default: 'approved',
    },
    approved_at: { type: Date },
    approval_notes: { type: String },
    profile_verified: { type: Boolean, default: false },
    college: { type: String, trim: true },
    course: { type: String, trim: true },
    branch: { type: String, trim: true },
    year_of_study: { type: String, trim: true },
    cgpa: { type: Number },
    student_skills: [String],
    github_link: { type: String, trim: true },
    leetcode_link: { type: String, trim: true },
    linkedin_link: { type: String, trim: true },
    linkedin_headline: { type: String, trim: true },
    linkedin_about: { type: String },
    linkedin_experience_count: { type: Number },
    linkedin_skill_count: { type: Number },
    linkedin_cert_count: { type: Number },
    codechef_link: { type: String, trim: true },
    hackerrank_link: { type: String, trim: true },
    codeforces_link: { type: String, trim: true },
    gfg_link: { type: String, trim: true },
    github_stats: { type: statsSchema, default: () => ({}) },
    leetcode_stats: { type: mongoose.Schema.Types.Mixed, default: {} },
    linkedin_stats: { type: mongoose.Schema.Types.Mixed, default: {} },
    last_analyzed_at: { type: Date },
    numeric_id: { type: Number, unique: true, sparse: true, index: true },
    resume_path: { type: String },
    ai_analysis: { type: mongoose.Schema.Types.Mixed },
    ats_report: { type: mongoose.Schema.Types.Mixed },
    scores: { type: scoreSchema, default: () => ({}) },
    breakdown: { type: breakdownSchema, default: () => ({}) },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
