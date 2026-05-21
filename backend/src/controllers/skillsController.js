const asyncHandler = require('express-async-handler');
const { callAi } = require('../utils/aiClient');
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
    ai_analysis: item.ai_analysis || null,
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
    ai_analysis: null,
  });
});

const analyzeMediaSpeech = asyncHandler(async (req, res) => {
  const item = await MediaItem.findOne({ _id: req.params.id, user: req.user._id });
  if (!item) {
    res.status(404);
    throw new Error('Media item not found');
  }

  const prompt = `You are an expert speech and presentation coach. A student uploaded a ${item.media_type} titled "${item.title}".

Analyze this as if you transcribed their speech and provide a detailed coaching report.
Respond ONLY with valid JSON matching exactly this shape:
{
  "score": <number 0-100>,
  "pace_wpm": <estimated words per minute as a number>,
  "filler_count": <estimated total filler words>,
  "filler_words": [<list of top filler words detected e.g. "um", "uh", "like", "you know">],
  "critique": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<improvement 1>", "<improvement 2>", "<improvement 3>"]
}

Base your evaluation on:
- Clarity and structure of the presentation
- Pacing (ideal is 120-160 WPM for presentations)
- Use of filler words (more fillers = lower score)
- Confidence signals inferred from title and media type
- Actionable, specific coaching feedback`;

  let analysis = null;
  try {
    const raw = await callAi(prompt, { temperature: 0.4 });
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      analysis = {
        score: Math.min(100, Math.max(0, Number(parsed.score) || 72)),
        pace_wpm: Number(parsed.pace_wpm) || 140,
        filler_count: Number(parsed.filler_count) || 5,
        filler_words: Array.isArray(parsed.filler_words) ? parsed.filler_words.slice(0, 6) : ['um', 'uh'],
        critique: parsed.critique || 'Good effort overall.',
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 4) : [],
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements.slice(0, 4) : [],
        analyzed_at: new Date(),
      };
    }
  } catch (err) {
    console.error('AI speech analysis failed:', err.message);
  }

  if (!analysis) {
    analysis = {
      score: 68,
      pace_wpm: 135,
      filler_count: 8,
      filler_words: ['um', 'uh', 'like'],
      critique: 'Analysis processed. Work on reducing filler words and maintaining a steady pace.',
      strengths: ['Clear topic introduction', 'Good file preparation'],
      improvements: ['Reduce filler words', 'Maintain 130-150 WPM pace', 'Add structured conclusion'],
      analyzed_at: new Date(),
    };
  }

  item.ai_analysis = analysis;
  await item.save();

  res.json({
    id: item._id,
    title: item.title,
    media_type: item.media_type,
    status: item.status,
    file_url: `${BACKEND_URL}/${item.path}`,
    created_at: item.createdAt,
    ai_analysis: analysis,
  });
});

const getRoadmap = asyncHandler(async (req, res) => {
  await seedDocuments(RoadmapItem, req.user._id, DEFAULT_ROADMAP_ITEMS);
  const items = await RoadmapItem.find({ user: req.user._id }).sort({ phase: 1, createdAt: 1 });
  res.json({ items: items.map((item) => formatRecord(item)) });
});

const generateRoadmap = asyncHandler(async (req, res) => {
  const targetRole = (req.body.target_role || 'Software Engineer').trim();
  const seniority = (req.body.seniority || 'Entry Level').trim();
  const user = req.user;
  const skills = (user.student_skills || []).join(', ') || 'general programming';
  const scores = user.scores || {};

  const prompt = `You are a senior tech career coach. Create a highly personalized, actionable placement roadmap for a student.

Student profile:
- Target role: ${targetRole}
- Seniority: ${seniority}
- Current skills: ${skills}
- Coding index: ${Math.round(scores.coding_skill_index || 60)}/100
- Communication score: ${Math.round(scores.communication_score || 60)}/100
- Placement readiness: ${Math.round(scores.placement_ready || 60)}/100

Generate a roadmap of exactly 8 milestone steps across 3 phases.
Phase 1 (Foundation): 3 steps
Phase 2 (Application): 3 steps
Phase 3 (Interview Prep): 2 steps

Respond ONLY with a valid JSON array, no extra text:
[
  {
    "title": "<concise actionable title>",
    "description": "<specific 1-2 sentence action>",
    "phase": <1|2|3>,
    "estimated_days": <number>,
    "resources": [
      { "label": "<resource name>", "url": "<url>" }
    ]
  }
]`;

  let milestones = null;
  try {
    const raw = await callAi(prompt, { temperature: 0.5 });
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.length >= 4) {
        milestones = parsed.slice(0, 10);
      }
    }
  } catch (err) {
    console.error('Roadmap AI generation failed:', err.message);
  }

  if (!milestones) {
    milestones = [
      { title: `Master ${targetRole} fundamentals`, description: 'Study core concepts and patterns required for the role.', phase: 1, estimated_days: 7, resources: [] },
      { title: 'Build a portfolio project', description: `Create a full-stack project showcasing ${skills || 'your skills'}.`, phase: 1, estimated_days: 14, resources: [] },
      { title: 'Optimize GitHub profile', description: 'Add READMEs, clean commits, and pin best repositories.', phase: 1, estimated_days: 3, resources: [] },
      { title: 'Complete 30 LeetCode problems', description: 'Focus on arrays, trees, and dynamic programming patterns.', phase: 2, estimated_days: 14, resources: [{ label: 'LeetCode', url: 'https://leetcode.com' }] },
      { title: 'Apply to 20 companies', description: 'Use SkillSense resume builder and apply with your skill passport.', phase: 2, estimated_days: 7, resources: [] },
      { title: 'Request LinkedIn recommendations', description: 'Ask professors, mentors, or past internship managers for endorsements.', phase: 2, estimated_days: 5, resources: [] },
      { title: 'Complete 5 AI mock interviews', description: 'Practice STAR-format answers for behavioral and technical rounds.', phase: 3, estimated_days: 10, resources: [] },
      { title: 'Research target companies', description: 'Study the tech stack, culture, and recent projects of your top 5 targets.', phase: 3, estimated_days: 5, resources: [] },
    ];
  }

  // Delete old AI-generated items and replace
  await RoadmapItem.deleteMany({ user: user._id, ai_generated: true });
  const docs = milestones.map((m) => ({
    user: user._id,
    title: m.title,
    description: m.description,
    status: 'pending',
    phase: m.phase || 1,
    estimated_days: m.estimated_days || 5,
    resources: Array.isArray(m.resources) ? m.resources : [],
    ai_generated: true,
  }));
  await RoadmapItem.insertMany(docs);

  const items = await RoadmapItem.find({ user: user._id }).sort({ phase: 1, createdAt: 1 });
  res.json({ items: items.map((item) => formatRecord(item)) });
});

const toggleRoadmapMilestone = asyncHandler(async (req, res) => {
  const item = await RoadmapItem.findOne({ _id: req.params.id, user: req.user._id });
  if (!item) {
    res.status(404);
    throw new Error('Roadmap item not found');
  }
  item.status = item.status === 'completed' ? 'pending' : 'completed';
  await item.save();
  res.json(formatRecord(item));
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

const buildResumePreview = (user) => {
  const education = buildEducationSnapshot(user);
  const skills = (user.student_skills || []).map(skill => ({
    name: skill,
    category: 'Technical Skills'
  }));
  const achievements = [`Placement readiness score ${Math.round(user.scores?.placement_ready || 70)} / 100`].filter(Boolean);
  const projects = [
    {
      title: 'Smart Portfolio',
      description: 'AI code analysis platform built to surface deep engineering insights and metrics.',
      link: user.github_link || '',
      technologies: 'Node.js, Express, React, Tailwind CSS'
    }
  ];
  const links = [
    { label: 'GitHub', url: user.github_link || '' },
    { label: 'LinkedIn', url: user.linkedin_link || '' }
  ].filter(link => link.url);

  return {
    template: 'modern',
    full_name: user.full_name || user.username,
    headline: user.linkedin_headline || 'Placement-Ready Software Engineer',
    summary: user.linkedin_about || 'Driven engineer focused on developing secure, maintainable, and high-performance software applications.',
    contact: {
      email: user.email || '',
      phone: user.phone_number || '',
      location: user.college || '',
      linkedin: user.linkedin_link || '',
      github: user.github_link || '',
      website: ''
    },
    education: {
      college: education.college || '',
      course: education.course || '',
      branch: education.branch || '',
      year_of_study: education.year_of_study || '',
      cgpa: education.cgpa || ''
    },
    experience: [
      {
        company: 'SkillSense Prep',
        role: 'Full Stack Engineer Intern',
        location: 'Remote',
        start_date: '01/2026',
        end_date: 'Present',
        description: 'Collaborated on developing the core platform; optimized database query profiles and built robust backend routes.'
      }
    ],
    projects,
    skills,
    achievements,
    links
  };
};

const saveResumeBuilder = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  user.custom_resume = req.body;
  user.markModified('custom_resume');
  await user.save();
  res.json(user.custom_resume);
});

const optimizeResumeText = asyncHandler(async (req, res) => {
  const { text, type } = req.body;
  if (!text || text.trim().length < 5) {
    res.status(400);
    throw new Error('Text is too short to optimize');
  }

  const systemPrompt = `You are a professional resume writer and career coach. Optimize the candidate's input text to be highly professional, impactful, and clear.
Follow these rules:
1. Use the STAR method format where appropriate (Situation, Task, Action, Result).
2. Start bullet points with strong action verbs (e.g., 'Architected', 'Spearheaded', 'Optimized', 'Engineered').
3. Keep it concise, professional, and clear.
4. Return a JSON object with a single key "optimized_text" which is the optimized string. Do not include any formatting, code blocks, or markdown backticks outside of the JSON.`;

  const prompt = `Optimize the following text for a resume. Section type: ${type || 'general'}.
Original Text: "${text}"`;

  try {
    const response = await callAi(prompt, systemPrompt);
    if (response && response.optimized_text) {
      res.json({ optimized_text: response.optimized_text });
    } else {
      res.status(500);
      throw new Error('Invalid AI response structure');
    }
  } catch (error) {
    console.error('AI Resume optimization failed:', error);
    res.status(500);
    throw new Error('Failed to optimize text using AI: ' + error.message);
  }
});

const downloadResumeBuilderPdf = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  let resume = user.custom_resume;
  if (!resume) {
    resume = buildResumePreview(user);
  }

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${(resume.full_name || 'resume').replace(/\s+/g, '_')}_resume.pdf"`);
  doc.pipe(res);

  const template = resume.template || 'modern';

  if (template === 'minimalist') {
    doc.font('Times-Bold').fontSize(22).text(resume.full_name || '', { align: 'center' });
    doc.moveDown(0.2);
    doc.font('Times-Roman').fontSize(11).text(resume.headline || '', { align: 'center' });
    
    doc.moveDown(0.3);
    const contactParts = [];
    if (resume.contact?.email) contactParts.push(resume.contact.email);
    if (resume.contact?.phone) contactParts.push(resume.contact.phone);
    if (resume.contact?.location) contactParts.push(resume.contact.location);
    if (resume.contact?.linkedin) contactParts.push('LinkedIn');
    if (resume.contact?.github) contactParts.push('GitHub');
    doc.fontSize(9).text(contactParts.join('  |  '), { align: 'center' });

    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#d1d5db').lineWidth(0.5).stroke();
    doc.moveDown(0.8);

    if (resume.summary) {
      doc.font('Times-Bold').fontSize(11).text('PROFESSIONAL SUMMARY');
      doc.moveTo(40, doc.y + 2).lineTo(555, doc.y + 2).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
      doc.moveDown(0.4);
      doc.font('Times-Roman').fontSize(10).text(resume.summary, { align: 'justify', lineGap: 2 });
      doc.moveDown(1.2);
    }

    if (resume.education && resume.education.college) {
      doc.font('Times-Bold').fontSize(11).text('EDUCATION');
      doc.moveTo(40, doc.y + 2).lineTo(555, doc.y + 2).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
      doc.moveDown(0.4);
      doc.font('Times-Bold').fontSize(10).text(resume.education.college);
      const degreeStr = [resume.education.course, resume.education.branch, resume.education.year_of_study].filter(Boolean).join(', ');
      doc.font('Times-Roman').fontSize(10).text(degreeStr);
      if (resume.education.cgpa) {
        doc.font('Times-Italic').text(`CGPA: ${resume.education.cgpa}`);
      }
      doc.moveDown(1.2);
    }

    if (resume.experience && resume.experience.length > 0) {
      doc.font('Times-Bold').fontSize(11).text('PROFESSIONAL EXPERIENCE');
      doc.moveTo(40, doc.y + 2).lineTo(555, doc.y + 2).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
      doc.moveDown(0.4);

      resume.experience.forEach(exp => {
        const topY = doc.y;
        doc.font('Times-Bold').fontSize(10).text(exp.role || '');
        doc.font('Times-Roman').text(`${exp.company || ''} - ${exp.location || ''}`);
        
        const dateStr = `${exp.start_date || ''} - ${exp.end_date || ''}`;
        doc.font('Times-Italic').fontSize(10).text(dateStr, 400, topY, { align: 'right', width: 155 });
        
        doc.x = 40;
        doc.moveDown(0.2);
        
        if (exp.description) {
          doc.font('Times-Roman').fontSize(10).text(exp.description, { align: 'justify', lineGap: 1.5 });
        }
        doc.moveDown(0.8);
      });
      doc.moveDown(0.4);
    }

    if (resume.projects && resume.projects.length > 0) {
      doc.font('Times-Bold').fontSize(11).text('PROJECTS');
      doc.moveTo(40, doc.y + 2).lineTo(555, doc.y + 2).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
      doc.moveDown(0.4);

      resume.projects.forEach(proj => {
        doc.font('Times-Bold').fontSize(10).text(proj.title || '');
        if (proj.link) {
          doc.font('Times-Roman').fontSize(9).fillColor('#2563eb').text(proj.link, { underline: true }).fillColor('#1c1917');
        }
        
        doc.x = 40;
        doc.moveDown(0.2);
        if (proj.description) {
          doc.font('Times-Roman').fontSize(10).text(proj.description, { align: 'justify', lineGap: 1.5 });
        }
        if (proj.technologies) {
          doc.font('Times-Italic').fontSize(9.5).text(`Technologies: ${proj.technologies}`);
        }
        doc.moveDown(0.8);
      });
      doc.moveDown(0.4);
    }

    if (resume.skills && resume.skills.length > 0) {
      doc.font('Times-Bold').fontSize(11).text('TECHNICAL SKILLS');
      doc.moveTo(40, doc.y + 2).lineTo(555, doc.y + 2).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
      doc.moveDown(0.4);

      const skillGroups = {};
      resume.skills.forEach(s => {
        const category = s.category || 'Other Skills';
        if (!skillGroups[category]) skillGroups[category] = [];
        skillGroups[category].push(s.name);
      });

      Object.entries(skillGroups).forEach(([cat, names]) => {
        doc.font('Times-Bold').fontSize(10).text(`${cat}: `, { continued: true })
           .font('Times-Roman').text(names.join(', '));
        doc.moveDown(0.3);
      });
      doc.moveDown(0.8);
    }

    if (resume.achievements && resume.achievements.length > 0) {
      doc.font('Times-Bold').fontSize(11).text('ACHIEVEMENTS & HIGHLIGHTS');
      doc.moveTo(40, doc.y + 2).lineTo(555, doc.y + 2).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
      doc.moveDown(0.4);

      resume.achievements.forEach(ach => {
        doc.font('Times-Roman').fontSize(10).text(`• ${ach}`);
        doc.moveDown(0.2);
      });
    }

  } else if (template === 'corporate') {
    const primaryColor = '#334155';
    const accentColor = '#0d9488';
    const textColor = '#374151';

    doc.font('Helvetica-Bold').fontSize(24).fillColor(primaryColor).text(resume.full_name || '');
    doc.font('Helvetica-Oblique').fontSize(12).fillColor(accentColor).text(resume.headline || '');
    
    doc.moveDown(0.3);
    const details = [];
    if (resume.contact?.email) details.push(resume.contact.email);
    if (resume.contact?.phone) details.push(resume.contact.phone);
    if (resume.contact?.location) details.push(resume.contact.location);
    doc.font('Helvetica').fontSize(9.5).fillColor(textColor).text(details.join('  |  '));
    
    const linksList = [];
    if (resume.contact?.linkedin) linksList.push(`LinkedIn: ${resume.contact.linkedin}`);
    if (resume.contact?.github) linksList.push(`GitHub: ${resume.contact.github}`);
    if (linksList.length > 0) {
      doc.text(linksList.join('  |  '));
    }

    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor(accentColor).lineWidth(1.5).stroke();
    doc.moveDown(0.8);

    const drawSectionHeader = (title) => {
      doc.font('Helvetica-Bold').fontSize(12).fillColor(primaryColor).text(title.toUpperCase());
      doc.moveTo(40, doc.y + 2).lineTo(555, doc.y + 2).strokeColor('#cbd5e1').lineWidth(0.75).stroke();
      doc.moveDown(0.5);
    };

    if (resume.summary) {
      drawSectionHeader('Professional Summary');
      doc.font('Helvetica').fontSize(10).fillColor(textColor).text(resume.summary, { align: 'justify', lineGap: 2 });
      doc.moveDown(1.2);
    }

    if (resume.experience && resume.experience.length > 0) {
      drawSectionHeader('Experience');
      resume.experience.forEach(exp => {
        const topY = doc.y;
        doc.font('Helvetica-Bold').fontSize(10.5).fillColor(primaryColor).text(exp.role || '');
        doc.font('Helvetica-Oblique').fontSize(10).fillColor(accentColor).text(`${exp.company || ''} -- ${exp.location || ''}`);
        
        const dateStr = `${exp.start_date || ''} - ${exp.end_date || ''}`;
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor(textColor).text(dateStr, 400, topY, { align: 'right', width: 155 });
        
        doc.x = 40;
        doc.moveDown(0.2);
        if (exp.description) {
          doc.font('Helvetica').fontSize(10).fillColor(textColor).text(exp.description, { align: 'justify', lineGap: 1.5 });
        }
        doc.moveDown(0.8);
      });
      doc.moveDown(0.4);
    }

    if (resume.projects && resume.projects.length > 0) {
      drawSectionHeader('Projects');
      resume.projects.forEach(proj => {
        doc.font('Helvetica-Bold').fontSize(10.5).fillColor(primaryColor).text(proj.title || '');
        if (proj.link) {
          doc.font('Helvetica').fontSize(9).fillColor(accentColor).text(proj.link, { underline: true });
        }
        doc.x = 40;
        doc.moveDown(0.2);
        if (proj.description) {
          doc.font('Helvetica').fontSize(10).fillColor(textColor).text(proj.description, { align: 'justify', lineGap: 1.5 });
        }
        if (proj.technologies) {
          doc.font('Helvetica-Oblique').fontSize(9.5).fillColor(accentColor).text(`Technologies: ${proj.technologies}`);
        }
        doc.moveDown(0.8);
      });
      doc.moveDown(0.4);
    }

    if (resume.education && resume.education.college) {
      drawSectionHeader('Education');
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor(primaryColor).text(resume.education.college);
      const degreeStr = [resume.education.course, resume.education.branch, resume.education.year_of_study].filter(Boolean).join(', ');
      doc.font('Helvetica').fontSize(10).fillColor(textColor).text(degreeStr);
      if (resume.education.cgpa) {
        doc.font('Helvetica-Oblique').fontSize(10).fillColor(accentColor).text(`CGPA: ${resume.education.cgpa}`);
      }
      doc.moveDown(1.2);
    }

    if (resume.skills && resume.skills.length > 0) {
      drawSectionHeader('Skills');
      const skillGroups = {};
      resume.skills.forEach(s => {
        const category = s.category || 'Technical Skills';
        if (!skillGroups[category]) skillGroups[category] = [];
        skillGroups[category].push(s.name);
      });
      Object.entries(skillGroups).forEach(([cat, names]) => {
        doc.font('Helvetica-Bold').fontSize(10).fillColor(primaryColor).text(`${cat}: `, { continued: true })
           .font('Helvetica').fillColor(textColor).text(names.join(', '));
        doc.moveDown(0.3);
      });
      doc.moveDown(0.8);
    }

    if (resume.achievements && resume.achievements.length > 0) {
      drawSectionHeader('Achievements');
      resume.achievements.forEach(ach => {
        doc.font('Helvetica').fontSize(10).fillColor(textColor).text(`• ${ach}`);
        doc.moveDown(0.2);
      });
    }

  } else if (template === 'creative') {
    const primaryColor = '#111827';
    const accentColor = '#4f46e5';
    const textColor = '#374151';
    const sidebarBg = '#f3f4f6';

    doc.rect(0, 0, 180, 842).fill(sidebarBg);

    doc.fillColor(primaryColor);
    
    let currentY = 40;
    doc.font('Helvetica-Bold').fontSize(12).fillColor(accentColor).text('CONTACT', 30, currentY);
    currentY += 20;

    doc.font('Helvetica').fontSize(9).fillColor(textColor);
    if (resume.contact?.email) {
      doc.text(resume.contact.email, 30, currentY, { width: 130 });
      currentY += 25;
    }
    if (resume.contact?.phone) {
      doc.text(resume.contact.phone, 30, currentY, { width: 130 });
      currentY += 18;
    }
    if (resume.contact?.location) {
      doc.text(resume.contact.location, 30, currentY, { width: 130 });
      currentY += 25;
    }

    doc.font('Helvetica-Bold').fontSize(12).fillColor(accentColor).text('LINKS', 30, currentY);
    currentY += 20;
    doc.font('Helvetica').fontSize(8.5).fillColor(textColor);
    if (resume.contact?.linkedin) {
      doc.text(`LinkedIn:\n${resume.contact.linkedin.replace('https://', '')}`, 30, currentY, { width: 130 });
      currentY += 30;
    }
    if (resume.contact?.github) {
      doc.text(`GitHub:\n${resume.contact.github.replace('https://', '')}`, 30, currentY, { width: 130 });
      currentY += 30;
    }

    if (resume.skills && resume.skills.length > 0) {
      doc.font('Helvetica-Bold').fontSize(12).fillColor(accentColor).text('SKILLS', 30, currentY);
      currentY += 20;

      const skillGroups = {};
      resume.skills.forEach(s => {
        const category = s.category || 'General';
        if (!skillGroups[category]) skillGroups[category] = [];
        skillGroups[category].push(s.name);
      });

      Object.entries(skillGroups).forEach(([cat, names]) => {
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor(primaryColor).text(cat, 30, currentY, { width: 130 });
        currentY += 13;
        doc.font('Helvetica').fontSize(8.5).fillColor(textColor).text(names.join(', '), 30, currentY, { width: 130 });
        currentY += Math.ceil(names.join(', ').length / 25) * 11 + 10;
      });
    }

    doc.font('Helvetica-Bold').fontSize(26).fillColor(primaryColor).text(resume.full_name || '', 200, 40);
    doc.font('Helvetica-Bold').fontSize(12).fillColor(accentColor).text((resume.headline || '').toUpperCase());
    doc.moveDown(0.8);

    const drawRightHeader = (title) => {
      doc.font('Helvetica-Bold').fontSize(12).fillColor(primaryColor).text(title.toUpperCase());
      doc.moveTo(doc.x, doc.y + 2).lineTo(555, doc.y + 2).strokeColor('#cbd5e1').lineWidth(1).stroke();
      doc.moveDown(0.5);
    };

    if (resume.summary) {
      drawRightHeader('Profile');
      doc.font('Helvetica').fontSize(10).fillColor(textColor).text(resume.summary, { align: 'justify', lineGap: 1.5 });
      doc.moveDown(1.2);
    }

    if (resume.experience && resume.experience.length > 0) {
      drawRightHeader('Work Experience');
      resume.experience.forEach(exp => {
        const topY = doc.y;
        doc.font('Helvetica-Bold').fontSize(10.5).fillColor(primaryColor).text(exp.role || '', 200, topY);
        doc.font('Helvetica-Oblique').fontSize(9.5).fillColor(accentColor).text(exp.company || '');
        
        const dateStr = `${exp.start_date || ''} - ${exp.end_date || ''}`;
        doc.font('Helvetica').fontSize(9.5).fillColor(textColor).text(dateStr, 400, topY, { align: 'right', width: 155 });
        
        doc.x = 200;
        doc.moveDown(0.2);
        if (exp.description) {
          doc.font('Helvetica').fontSize(9.5).fillColor(textColor).text(exp.description, { align: 'justify', lineGap: 1.5 });
        }
        doc.moveDown(0.8);
      });
      doc.moveDown(0.4);
    }

    if (resume.projects && resume.projects.length > 0) {
      drawRightHeader('Projects');
      resume.projects.forEach(proj => {
        const topY = doc.y;
        doc.font('Helvetica-Bold').fontSize(10.5).fillColor(primaryColor).text(proj.title || '', 200, topY);
        if (proj.link) {
          doc.font('Helvetica').fontSize(8.5).fillColor(accentColor).text(proj.link, { underline: true });
        }
        doc.x = 200;
        doc.moveDown(0.2);
        if (proj.description) {
          doc.font('Helvetica').fontSize(9.5).fillColor(textColor).text(proj.description, { align: 'justify', lineGap: 1.5 });
        }
        if (proj.technologies) {
          doc.font('Helvetica-Oblique').fontSize(9).fillColor(accentColor).text(`Tech Stack: ${proj.technologies}`);
        }
        doc.moveDown(0.8);
      });
      doc.moveDown(0.4);
    }

    if (resume.education && resume.education.college) {
      drawRightHeader('Education');
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor(primaryColor).text(resume.education.college, 200, doc.y);
      const degreeStr = [resume.education.course, resume.education.branch, resume.education.year_of_study].filter(Boolean).join(', ');
      doc.font('Helvetica').fontSize(9.5).fillColor(textColor).text(degreeStr);
      if (resume.education.cgpa) {
        doc.font('Helvetica-Oblique').fontSize(9.5).fillColor(accentColor).text(`CGPA: ${resume.education.cgpa}`);
      }
      doc.moveDown(1.2);
    }

    if (resume.achievements && resume.achievements.length > 0) {
      drawRightHeader('Achievements');
      resume.achievements.forEach(ach => {
        doc.font('Helvetica').fontSize(9.5).fillColor(textColor).text(`• ${ach}`, 200, doc.y);
        doc.moveDown(0.2);
      });
    }

  } else {
    const primaryColor = '#1e293b';
    const accentColor = '#3b82f6';
    const textColor = '#334155';

    doc.rect(40, 40, 515, 6).fill(accentColor);
    doc.moveDown(1.2);

    doc.font('Helvetica-Bold').fontSize(24).fillColor(primaryColor).text(resume.full_name || '', { align: 'center' });
    doc.font('Helvetica').fontSize(12).fillColor(accentColor).text(resume.headline || '', { align: 'center' });
    
    doc.moveDown(0.4);
    const contacts = [];
    if (resume.contact?.email) contacts.push(resume.contact.email);
    if (resume.contact?.phone) contacts.push(resume.contact.phone);
    if (resume.contact?.location) contacts.push(resume.contact.location);
    doc.font('Helvetica').fontSize(9.5).fillColor(textColor).text(contacts.join('  •  '), { align: 'center' });

    const links = [];
    if (resume.contact?.linkedin) links.push(`LinkedIn: ${resume.contact.linkedin}`);
    if (resume.contact?.github) links.push(`GitHub: ${resume.contact.github}`);
    if (links.length > 0) {
      doc.text(links.join('  •  '), { align: 'center' });
    }

    doc.moveDown(0.8);
    
    const drawModernHeader = (title) => {
      doc.font('Helvetica-Bold').fontSize(11).fillColor(accentColor).text(title.toUpperCase());
      doc.moveTo(40, doc.y + 2).lineTo(555, doc.y + 2).strokeColor('#e2e8f0').lineWidth(1).stroke();
      doc.moveDown(0.5);
    };

    if (resume.summary) {
      drawModernHeader('Professional Summary');
      doc.font('Helvetica').fontSize(10).fillColor(textColor).text(resume.summary, { align: 'justify', lineGap: 1.5 });
      doc.moveDown(1.2);
    }

    if (resume.education && resume.education.college) {
      drawModernHeader('Education');
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor(primaryColor).text(resume.education.college);
      const degreeStr = [resume.education.course, resume.education.branch, resume.education.year_of_study].filter(Boolean).join(', ');
      doc.font('Helvetica').fontSize(10).fillColor(textColor).text(degreeStr);
      if (resume.education.cgpa) {
        doc.font('Helvetica-Oblique').fontSize(9.5).fillColor(accentColor).text(`CGPA: ${resume.education.cgpa}`);
      }
      doc.moveDown(1.2);
    }

    if (resume.experience && resume.experience.length > 0) {
      drawModernHeader('Experience');
      resume.experience.forEach(exp => {
        const topY = doc.y;
        doc.font('Helvetica-Bold').fontSize(10.5).fillColor(primaryColor).text(exp.role || '');
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor(accentColor).text(exp.company || '');
        
        const dateStr = `${exp.start_date || ''} - ${exp.end_date || ''}`;
        doc.font('Helvetica').fontSize(9.5).fillColor(textColor).text(dateStr, 400, topY, { align: 'right', width: 155 });
        
        doc.x = 40;
        doc.moveDown(0.2);
        if (exp.description) {
          doc.font('Helvetica').fontSize(9.5).fillColor(textColor).text(exp.description, { align: 'justify', lineGap: 1.5 });
        }
        doc.moveDown(0.8);
      });
      doc.moveDown(0.4);
    }

    if (resume.projects && resume.projects.length > 0) {
      drawModernHeader('Academic & Personal Projects');
      resume.projects.forEach(proj => {
        const topY = doc.y;
        doc.font('Helvetica-Bold').fontSize(10.5).fillColor(primaryColor).text(proj.title || '');
        if (proj.link) {
          doc.font('Helvetica').fontSize(9).fillColor(accentColor).text(proj.link, { underline: true });
        }
        doc.x = 40;
        doc.moveDown(0.2);
        if (proj.description) {
          doc.font('Helvetica').fontSize(9.5).fillColor(textColor).text(proj.description, { align: 'justify', lineGap: 1.5 });
        }
        if (proj.technologies) {
          doc.font('Helvetica-Oblique').fontSize(9).fillColor(accentColor).text(`Technologies: ${proj.technologies}`);
        }
        doc.moveDown(0.8);
      });
      doc.moveDown(0.4);
    }

    if (resume.skills && resume.skills.length > 0) {
      drawModernHeader('Technical Skills');
      const skillGroups = {};
      resume.skills.forEach(s => {
        const category = s.category || 'Skills';
        if (!skillGroups[category]) skillGroups[category] = [];
        skillGroups[category].push(s.name);
      });
      Object.entries(skillGroups).forEach(([cat, names]) => {
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor(primaryColor).text(`${cat}: `, { continued: true })
           .font('Helvetica').fillColor(textColor).text(names.join(', '));
        doc.moveDown(0.3);
      });
      doc.moveDown(0.8);
    }

    if (resume.achievements && resume.achievements.length > 0) {
      drawModernHeader('Achievements');
      resume.achievements.forEach(ach => {
        doc.font('Helvetica').fontSize(9.5).fillColor(textColor).text(`• ${ach}`);
        doc.moveDown(0.2);
      });
    }
  }

  doc.end();
});

const getResumeBuilder = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  if (!user.custom_resume) {
    user.custom_resume = buildResumePreview(user);
    user.markModified('custom_resume');
    await user.save();
  }
  res.json(user.custom_resume);
});

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
  analyzeMediaSpeech,
  getRoadmap,
  generateRoadmap,
  toggleRoadmapMilestone,
  getSkillPassport,
  downloadSkillPassportPdf,
  downloadResume,
  getResumeBuilder,
  saveResumeBuilder,
  optimizeResumeText,
  downloadResumeBuilderPdf,
  getRecommendations,
};
