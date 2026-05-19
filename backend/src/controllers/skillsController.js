const asyncHandler = require('express-async-handler');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const Activity = require('../models/activityModel');
const Notification = require('../models/notificationModel');
const InterviewSchedule = require('../models/interviewScheduleModel');
const RoadmapItem = require('../models/roadmapModel');
const MediaItem = require('../models/mediaModel');
const PerformancePoint = require('../models/performancePointModel');
const User = require('../models/userModel');
const RecruiterJob = require('../models/recruiterJobModel');

const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;

const DEFAULT_ACTIVITY_TEMPLATES = [
  {
    activity_type: 'github_analysis',
    title: 'GitHub repo review completed',
    description: 'Engineering signal capture from your latest repository',
    status: 'completed',
  },
  {
    activity_type: 'resume_verification',
    title: 'Resume parsed',
    description: 'Uploaded resume data used to seed your profile',
    status: 'completed',
  },
  {
    activity_type: 'media_review',
    title: 'Video proof of ownership',
    description: 'Recent introduction video approved by AI',
    status: 'completed',
  },
];

const DEFAULT_NOTIFICATIONS = [
  {
    title: 'New verification step available',
    message: 'AI interview unlocked. Finish it to verify your profile.',
    category: 'workflow',
    link: '/dashboard/interview',
  },
  {
    title: 'Resume builder ready',
    message: 'Use your updated scores to generate a recruiter-ready resume.',
    category: 'resume',
    link: '/dashboard/resume-builder',
  },
  {
    title: 'Roadmap updated',
    message: 'New micro-learning tasks were added to your dashboard.',
    category: 'roadmap',
  },
];

const DEFAULT_INTERVIEWS = [
  {
    title: 'AI Interview Session',
    recruiter_name: 'SkillSense AI Lab',
    job_title: 'Software Engineer Intern',
    scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    duration_minutes: 45,
    meeting_link: 'https://example.com/meeting',
    notes: 'Practice adaptive questions',
    status: 'scheduled',
  },
];

const DEFAULT_ROADMAP_ITEMS = [
  {
    title: 'Refine coding portfolio',
    description: 'Improve the GitHub repository with tests and documentation.',
    status: 'in_progress',
  },
  {
    title: 'Complete communication lab',
    description: 'Record a short demo explaining system design.',
    status: 'pending',
  },
  {
    title: 'Submit Skill Passport',
    description: 'Share your verified credentials with recruiters.',
    status: 'pending',
  },
];

const DEFAULT_RECOMMENDATIONS = [
  {
    id: 1,
    title: 'Complete AI interview',
    description: 'Share structured answers to showcase ownership.',
    action_type: 'ai_interview',
    priority: 'high',
    href: '/dashboard/interview',
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    title: 'Upload a project demo',
    description: 'Share recent work to boost your coding signal.',
    action_type: 'upload_projects',
    priority: 'medium',
    href: '/dashboard/media',
    created_at: new Date().toISOString(),
  },
  {
    id: 3,
    title: 'Review your roadmap',
    description: 'Complete tasks to improve your placement readiness.',
    action_type: 'review_roadmap',
    priority: 'low',
    href: '/dashboard/roadmap',
    created_at: new Date().toISOString(),
  },
];

const PerformanceLabels = [
  'coding_skill_index',
  'communication_score',
  'authenticity_score',
  'placement_ready',
];

const seedDocuments = async (Model, userId, templates) => {
  const exists = await Model.exists({ user: userId });
  if (!exists) {
    const docs = templates.map((item) => ({ ...item, user: userId }));
    await Model.insertMany(docs);
  }
};

const ensurePerformancePoints = async (user) => {
  const hasPoints = await PerformancePoint.exists({ user: user._id });
  if (hasPoints) {
    return;
  }
  const baseScores = user.scores || { coding_skill_index: 70, communication_score: 65, authenticity_score: 68, placement_ready: 72 };
  const now = Date.now();
  const points = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(now - index * 24 * 60 * 60 * 1000);
    const variation = index * 2;
    return {
      user: user._id,
      date,
      coding_skill_index: Math.min(100, Math.max(0, baseScores.coding_skill_index - variation)),
      communication_score: Math.min(100, Math.max(0, baseScores.communication_score - variation)),
      authenticity_score: Math.min(100, Math.max(0, baseScores.authenticity_score - variation)),
      placement_ready: Math.min(100, Math.max(0, baseScores.placement_ready - variation)),
    };
  });
  await PerformancePoint.insertMany(points);
};

const formatRecord = (item) => {
  if (!item) {
    return null;
  }
  const payload = item.toObject ? item.toObject({ getters: true }) : { ...item };
  payload.id = payload._id;
  delete payload.__v;
  return payload;
};

const buildSkillRadar = (scores = {}) =>
  PerformanceLabels.map((key) => ({
    skill: key.replace(/_/g, ' '),
    level: Math.round(scores[key] || 0),
  }));

const buildBarData = (scores = {}) =>
  PerformanceLabels.map((key) => ({
    name: key.replace(/_/g, ' '),
    score: Math.round(scores[key] || 0),
  }));

const buildVerifiedSkills = (user) =>
  (user.student_skills || []).map((skill) => ({
    name: skill,
    level: 'Advanced',
    score: 80,
    verified: true,
    evidence_items: [
      {
        source: 'Resume',
        title: `${skill} proficiency`,
        detail: 'Listed on latest submitted resume',
      },
    ],
  }));

const buildEducationSnapshot = (user) => ({
  college: user.college || 'Pending input',
  course: user.course || 'Program not specified',
  branch: user.branch || 'Specialization pending',
  year_of_study: user.year_of_study || 'N/A',
  cgpa: user.cgpa ?? null,
});

const createPdfFromSkillPassport = (res, user, payload) => {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="skill-passport.pdf"');
  doc.pipe(res);
  doc.fontSize(20).text('SkillSense Skill Passport', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Name: ${user.full_name || user.username}`);
  doc.text(`Role: ${user.role}`);
  doc.text(`Generated: ${new Date().toLocaleString()}`);
  doc.moveDown();
  payload.bar_data.forEach((entry) => {
    doc.fontSize(12).text(`${entry.name}: ${entry.score}/100`);
  });
  doc.moveDown();
  doc.text('Skills Evidence:', { underline: true });
  payload.verified_skills.slice(0, 3).forEach((skill) => {
    doc.fontSize(12).text(`${skill.name} (${skill.level}) - ${skill.evidence_items.length} items`);
  });
  doc.end();
};

const ensureDefaultData = async (user) => {
  await Promise.all([
    seedDocuments(Activity, user._id, DEFAULT_ACTIVITY_TEMPLATES),
    seedDocuments(Notification, user._id, DEFAULT_NOTIFICATIONS),
    seedDocuments(InterviewSchedule, user._id, DEFAULT_INTERVIEWS),
    seedDocuments(RoadmapItem, user._id, DEFAULT_ROADMAP_ITEMS),
  ]);
  await ensurePerformancePoints(user);
};

const getDashboardSkills = asyncHandler(async (req, res) => {
  await ensureDefaultData(req.user);
  const skills = buildSkillRadar(req.user.scores);
  res.json({ skills });
});

const getActivities = asyncHandler(async (req, res) => {
  await seedDocuments(Activity, req.user._id, DEFAULT_ACTIVITY_TEMPLATES);
  const items = await Activity.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(items.map((item) => formatRecord(item)));
});

const getNotifications = asyncHandler(async (req, res) => {
  await seedDocuments(Notification, req.user._id, DEFAULT_NOTIFICATIONS);
  const items = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 });
  const notifications = items.map((item) => formatRecord(item));
  const unread_count = notifications.filter((item) => !item.read).length;
  res.json({ notifications, unread_count });
});

const markNotificationsRead = asyncHandler(async (req, res) => {
  const notificationId = req.params.id;
  if (notificationId === '0') {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  } else {
    await Notification.updateOne({ user: req.user._id, _id: notificationId }, { read: true });
  }
  res.json({ success: true });
});

const getInterviewSchedules = asyncHandler(async (req, res) => {
  await seedDocuments(InterviewSchedule, req.user._id, DEFAULT_INTERVIEWS);
  const schedules = await InterviewSchedule.find({ user: req.user._id }).sort({ scheduled_at: 1 });
  res.json({ schedules: schedules.map((item) => formatRecord(item)) });
});

const createInterviewSchedule = asyncHandler(async (req, res) => {
  const {
    candidate_id,
    title,
    scheduled_at,
    duration_minutes,
    meeting_link,
    notes,
    job_id,
  } = req.body;
  if (!candidate_id || !title || !scheduled_at) {
    res.status(400);
    throw new Error('Candidate, title, and scheduled time are required');
  }
  const candidate = await User.findOne({ numeric_id: Number(candidate_id), role: 'student' });
  if (!candidate) {
    res.status(404);
    throw new Error('Student record not found');
  }
  const job = job_id ? await RecruiterJob.findOne({ numeric_id: Number(job_id) }) : null;
  const schedule = await InterviewSchedule.create({
    user: candidate._id,
    title,
    candidate_numeric_id: Number(candidate_id),
    candidate_name: candidate.full_name || candidate.username,
    recruiter_name: req.user.full_name || req.user.username,
    job_title: job?.title || '',
    scheduled_at: new Date(scheduled_at),
    duration_minutes: Number(duration_minutes) || 30,
    meeting_link: meeting_link || '',
    notes: notes || '',
    status: 'scheduled',
  });
  res.status(201).json({
    schedule: {
      id: schedule._id,
      title: schedule.title,
      candidate_id: schedule.candidate_numeric_id,
      recruiter_name: schedule.recruiter_name,
      job_title: schedule.job_title,
      scheduled_at: schedule.scheduled_at?.toISOString() || null,
      duration_minutes: schedule.duration_minutes,
      meeting_link: schedule.meeting_link,
      notes: schedule.notes,
      status: schedule.status,
    },
  });
});

const getVerificationSteps = (req, res) => {
  const steps = [
    {
      id: 1,
      title: 'Resume upload & parsing',
      description: 'We extract education, skills, and platform links from your resume.',
      status: req.user.resume_path ? 'completed' : 'completed',
      completed_at: req.user.resume_path ? new Date().toISOString() : null,
    },
    {
      id: 2,
      title: 'GitHub + coding signal review',
      description: 'We analyze your repositories and capture coding fingerprints.',
      status: 'completed',
      completed_at: new Date().toISOString(),
    },
    {
      id: 3,
      title: 'AI interview completion',
      description: 'Finish the adaptive interview for verification.',
      status: req.user.profile_verified ? 'completed' : 'pending',
      completed_at: req.user.profile_verified ? new Date().toISOString() : null,
    },
    {
      id: 4,
      title: 'Skill passport ready',
      description: 'Download your verified credentials for recruiters.',
      status: 'pending',
      completed_at: null,
    },
  ];
  res.json(steps);
};

const getPerformanceSeries = asyncHandler(async (req, res) => {
  await ensurePerformancePoints(req.user);
  const points = await PerformancePoint.find({ user: req.user._id }).sort({ date: 1 });
  const series = points.map((point) => ({
    date: point.date.toISOString(),
    coding_skill_index: point.coding_skill_index,
    communication_score: point.communication_score,
    authenticity_score: point.authenticity_score,
    placement_ready: point.placement_ready,
  }));
  res.json({ series });
});

const listMedia = asyncHandler(async (req, res) => {
  const items = await MediaItem.find({ user: req.user._id }).sort({ createdAt: -1 });
  const serialized = items.map((item) => ({
    id: item._id,
    title: item.title,
    media_type: item.media_type,
    status: item.status,
    file_url: `${BACKEND_URL}/${item.path}`,
    created_at: item.createdAt,
  }));
  res.json({ items: serialized });
});

const uploadMedia = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No file uploaded');
  }
  const title = req.body.title?.trim() || req.file.originalname;
  const mediaType = req.body.media_type === 'audio' ? 'audio' : 'video';
  const relativePath = path.join('uploads', 'media', req.file.filename).replace(/\\/g, '/');
  const item = await MediaItem.create({
    user: req.user._id,
    title,
    media_type: mediaType,
    status: 'ready',
    path: relativePath,
    file_size: req.file.size,
  });
  res.json({
    id: item._id,
    title: item.title,
    media_type: item.media_type,
    status: item.status,
    file_url: `${BACKEND_URL}/${relativePath}`,
    created_at: item.createdAt,
  });
});

const getRoadmap = asyncHandler(async (req, res) => {
  await seedDocuments(RoadmapItem, req.user._id, DEFAULT_ROADMAP_ITEMS);
  const items = await RoadmapItem.find({ user: req.user._id }).sort({ createdAt: 1 });
  res.json({ items: items.map((item) => formatRecord(item)) });
});

const getSkillPassport = (req, res) => {
  const payload = {
    radar_data: buildSkillRadar(req.user.scores),
    bar_data: buildBarData(req.user.scores),
    verified_skills: buildVerifiedSkills(req.user),
  };
  res.json(payload);
};

const downloadSkillPassportPdf = asyncHandler(async (req, res) => {
  const payload = {
    radar_data: buildSkillRadar(req.user.scores),
    bar_data: buildBarData(req.user.scores),
    verified_skills: buildVerifiedSkills(req.user),
  };
  createPdfFromSkillPassport(res, req.user, payload);
});

const downloadResume = asyncHandler(async (req, res) => {
  if (!req.user.resume_path) {
    res.status(404);
    throw new Error('Resume not uploaded yet');
  }
  const absolutePath = path.resolve(req.user.resume_path);
  if (!fs.existsSync(absolutePath)) {
    res.status(404);
    throw new Error('Resume file not found');
  }
  res.download(absolutePath);
});

const buildResumePreview = (user) => ({
  full_name: user.full_name || user.username,
  headline: user.linkedin_headline || 'Placement-ready engineer',
  summary: user.linkedin_about || 'Driven engineer with a focus on building reliable systems.',
  generated_at: new Date().toISOString(),
  education: buildEducationSnapshot(user),
  skills: buildVerifiedSkills(user),
  achievements: [`Placement readiness score ${Math.round(user.scores?.placement_ready || 70)} / 100`],
  projects: [
    {
      title: 'Smart Portfolio',
      description: 'Code analysis platform that surfaces engineering insights.',
      link: user.github_link,
    },
  ],
  links: [
    { label: 'GitHub', url: user.github_link || 'https://github.com' },
    { label: 'LinkedIn', url: user.linkedin_link || 'https://linkedin.com' },
  ],
});

const downloadResumeBuilderPdf = asyncHandler(async (req, res) => {
  const preview = buildResumePreview(req.user);
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="skillsense-resume.pdf"');
  doc.pipe(res);
  doc.fontSize(20).text(preview.full_name, { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(preview.headline, { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(preview.summary);
  doc.moveDown();
  doc.fontSize(14).text('Education');
  doc.fontSize(12).text(`${preview.education.college}`);
  doc.text(`${preview.education.course} | ${preview.education.branch} | ${preview.education.year_of_study}`);
  if (preview.education.cgpa) {
    doc.text(`CGPA: ${preview.education.cgpa}`);
  }
  doc.moveDown();
  doc.fontSize(14).text('Skills');
  preview.skills.forEach((skill) => {
    doc.fontSize(12).text(`${skill.name} (${skill.level})`);
  });
  doc.end();
});

const getResumeBuilder = (req, res) => {
  const preview = buildResumePreview(req.user);
  res.json(preview);
};

const getRecommendations = (req, res) => {
  res.json(DEFAULT_RECOMMENDATIONS);
};

module.exports = {
  getDashboardSkills,
  getActivities,
  getNotifications,
  markNotificationsRead,
  getInterviewSchedules,
  createInterviewSchedule,
  getVerificationSteps,
  getPerformanceSeries,
  listMedia,
  uploadMedia,
  getRoadmap,
  getSkillPassport,
  downloadSkillPassportPdf,
  downloadResume,
  getResumeBuilder,
  downloadResumeBuilderPdf,
  getRecommendations,
};
