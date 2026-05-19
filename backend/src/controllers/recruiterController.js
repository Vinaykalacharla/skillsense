const asyncHandler = require('express-async-handler');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const User = require('../models/userModel');
const RecruiterJob = require('../models/recruiterJobModel');
const CandidatePipeline = require('../models/candidatePipelineModel');
const SavedSearch = require('../models/savedSearchModel');
const InterviewSchedule = require('../models/interviewScheduleModel');

const toNumericId = (value) => {
  if (!value) {
    return Date.now();
  }
  const str = value.toString();
  const parsed = Number.parseInt(str.slice(-6), 16);
  return Number.isNaN(parsed) ? Math.abs(Number(str.slice(-6)) || Date.now()) : parsed;
};

const requireRecruiter = (user) => {
  if (!user || user.role !== 'recruiter') {
    const err = new Error('Unauthorized');
    err.status = 403;
    throw err;
  }
};

const ensureNumericId = async (doc) => {
  if (doc.numeric_id) {
    return doc.numeric_id;
  }
  doc.numeric_id = toNumericId(doc._id);
  await doc.save();
  return doc.numeric_id;
};

const ensureJobNumericId = async (job) => {
  if (job.numeric_id) {
    return job.numeric_id;
  }
  job.numeric_id = toNumericId(job._id);
  await job.save();
  return job.numeric_id;
};

const computeMatchPayload = (score, job) => {
  const base = Math.round(score);
  const target = job ? Math.round(job.min_ready_score || 65) : 65;
  const variation = Math.round((base - target) * 0.35);
  const final = Math.min(100, Math.max(0, base + variation));
  return {
    score: final,
    reasons: job
      ? [
          `Matches ${job.title}`,
          `${job.required_skills.slice(0, 2).join(', ') || 'Core skills match'}`,
        ]
      : ['Strong readiness signal'],
  };
};

const buildCandidatePayload = async (student, pipeline, selectedJob) => {
  const candidateId = await ensureNumericId(student);
  const readiness = Math.round(student.scores?.placement_ready ?? 70);
  const skills = (student.student_skills || []).map((skill) => ({
    name: skill,
    score: Math.min(100, readiness + 5),
    level: 'Advanced',
    verified: true,
  }));
  const jobForMatch = pipeline?.job || selectedJob;
  const match = computeMatchPayload(readiness, jobForMatch);
  const resumePath = student.resume_path;

  return {
    id: candidateId,
    verification_id: student.username || `SV${candidateId}`,
    name: student.full_name || student.username,
    email: student.email,
    college: student.college || 'College pending',
    course: student.course || 'Course pending',
    branch: student.branch || 'Branch pending',
    year_of_study: student.year_of_study || 'N/A',
    cgpa: student.cgpa ?? null,
    location: student.location || 'N/A',
    headline: student.linkedin_headline || 'Placement-ready engineer',
    summary: student.linkedin_about || 'No summary yet',
    profile_verified: student.profile_verified,
    status_label: student.profile_verified ? 'Verified profile' : 'Pending verification',
    focus_area: skills[0]?.name || 'Skills pending',
    recommended_action: 'Invite to interview',
    needs_attention: false,
    score: readiness,
    scores: {
      placement_ready: readiness,
      coding_skill_index: Math.round(student.scores?.coding_skill_index ?? readiness),
      communication_score: Math.round(student.scores?.communication_score ?? readiness - 5),
      authenticity_score: Math.round(student.scores?.authenticity_score ?? readiness - 3),
    },
    skills,
    verified_skills: skills.length,
    highlights: ['AI interview ready'],
    resume_document: resumePath
      ? {
          filename: path.basename(resumePath),
          uploaded_at: student.updatedAt?.toISOString() || null,
          download_path: `/api/skills/recruiter-dashboard/resume/${candidateId}/`,
        }
      : null,
    links: {
      github: student.github_link || '',
      leetcode: student.leetcode_link || '',
      linkedin: student.linkedin_link || '',
      codechef: student.codechef_link || '',
      hackerrank: student.hackerrank_link || '',
      codeforces: student.codeforces_link || '',
      gfg: student.gfg_link || '',
    },
    last_analyzed_at: student.last_analyzed_at?.toISOString() || null,
    pipeline: pipeline
      ? {
          status: pipeline.status,
          notes: pipeline.notes,
          tags: pipeline.tags || [],
          assignee_name: pipeline.assignee_name,
          next_step: pipeline.next_step,
          rejection_reason: pipeline.rejection_reason,
          follow_up_at: pipeline.follow_up_at?.toISOString() || null,
        }
      : null,
    match_score: match.score,
    match_reasons: match.reasons,
  };
};

const buildSummary = (candidates, jobsCount, pipelines) => {
  const total = candidates.length;
  const verified = candidates.filter((candidate) => candidate.profile_verified).length;
  const averageReady = total ? Math.round(candidates.reduce((sum, candidate) => sum + candidate.score, 0) / total) : 0;
  return {
    candidates: total,
    average_ready: averageReady,
    verified_profiles: verified,
    shortlist_ready: candidates.filter((candidate) => candidate.score >= 75).length,
    active_jobs: jobsCount,
    shortlisted: pipelines.filter((pipeline) => pipeline.status === 'shortlisted').length,
  };
};

const buildFilters = (candidates) => ({
  skills: Array.from(new Set(candidates.flatMap((candidate) => candidate.skills.map((skill) => skill.name)))),
});

const buildPipelineSummary = (pipelines) => {
  const summary = {};
  pipelines.forEach((pipeline) => {
    summary[pipeline.status] = (summary[pipeline.status] || 0) + 1;
  });
  return summary;
};

const buildInterviewSchedulesPayload = async () => {
  const schedules = await InterviewSchedule.find().sort({ scheduled_at: -1 }).limit(20);
  return schedules.map((schedule) => ({
    id: schedule._id,
    title: schedule.title,
    candidate_id: toNumericId(schedule.user),
    recruiter_name: schedule.recruiter_name,
    job_title: schedule.job_title,
    scheduled_at: schedule.scheduled_at?.toISOString() || null,
    duration_minutes: schedule.duration_minutes,
    meeting_link: schedule.meeting_link,
    notes: schedule.notes,
    status: schedule.status,
  }));
};

const transformJob = async (job, pipelineCounts) => ({
  id: await ensureJobNumericId(job),
  title: job.title,
  description: job.description,
  required_skills: job.required_skills,
  preferred_skills: job.preferred_skills,
  min_ready_score: job.min_ready_score,
  status: job.status,
  top_matches: pipelineCounts[job._id.toString()] || 0,
  created_at: job.createdAt?.toISOString() || null,
  updated_at: job.updatedAt?.toISOString() || null,
});

const getRecruiterDashboard = asyncHandler(async (req, res) => {
  requireRecruiter(req.user);
  const jobParam = Number(req.query.job_id) || null;
  const [students, pipelines] = await Promise.all([
    User.find({ role: 'student' }).limit(40).sort({ updatedAt: -1 }),
    CandidatePipeline.find({ recruiter: req.user._id }),
  ]);
  const jobs = await RecruiterJob.find({ recruiter: req.user._id }).sort({ updatedAt: -1 });
  const pipelineCounts = pipelines.reduce((acc, pipeline) => {
    const jobKey = pipeline.job?.toString();
    if (jobKey) {
      acc[jobKey] = (acc[jobKey] || 0) + 1;
    }
    return acc;
  }, {});
  const jobPayloads = await Promise.all(jobs.map((job) => transformJob(job, pipelineCounts)));
  const selectedJob = jobPayloads.find((job) => job.id === jobParam) || jobPayloads[0] || null;
  const pipelineMap = new Map(pipelines.map((pipeline) => [pipeline.candidate.toString(), pipeline]));
  const candidates = [];
  for (const student of students) {
    const pipeline = pipelineMap.get(student._id.toString()) || null;
    const payload = await buildCandidatePayload(student, pipeline, selectedJob);
    candidates.push(payload);
  }
  const summary = buildSummary(candidates, jobPayloads.length, pipelines);
  const response = {
    summary,
    filters: buildFilters(candidates),
    selected_job_id: selectedJob?.id ?? null,
    jobs: jobPayloads,
    saved_searches: await SavedSearch.find({ recruiter: req.user._id }).sort({ createdAt: -1 }).limit(12),
    pipeline_summary: buildPipelineSummary(pipelines),
    interview_schedules: await buildInterviewSchedulesPayload(),
    candidates,
  };
  res.json(response);
});

const createRecruiterJob = asyncHandler(async (req, res) => {
  requireRecruiter(req.user);
  const { title, description, required_skills, preferred_skills, min_ready_score } = req.body;
  if (!title) {
    res.status(400);
    throw new Error('Job title required');
  }
  const job = await RecruiterJob.create({
    recruiter: req.user._id,
    title,
    description: description || '',
    required_skills: (required_skills || '').split(',').map((item) => item.trim()).filter(Boolean),
    preferred_skills: (preferred_skills || '').split(',').map((item) => item.trim()).filter(Boolean),
    min_ready_score: Number(min_ready_score) || 65,
  });
  res.status(201).json(await transformJob(job, {}));
});

const updateCandidatePipeline = asyncHandler(async (req, res) => {
  requireRecruiter(req.user);
  const candidateNumericId = Number(req.params.candidateId) || null;
  if (!candidateNumericId) {
    res.status(400);
    throw new Error('Candidate id required');
  }
  const candidate = await User.findOne({ numeric_id: candidateNumericId, role: 'student' });
  if (!candidate) {
    res.status(404);
    throw new Error('Candidate not found');
  }
  const jobId = Number(req.body.job_id) || null;
  const job = jobId ? await RecruiterJob.findOne({ numeric_id: jobId }) : null;
  const payload = {
    status: req.body.status || 'sourced',
    notes: req.body.notes || '',
    tags: (req.body.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean),
    assignee_name: req.body.assignee_name || '',
    next_step: req.body.next_step || '',
    rejection_reason: req.body.rejection_reason || '',
    follow_up_at: req.body.follow_up_at ? new Date(req.body.follow_up_at) : null,
    job: job?._id,
  };
  const pipeline = await CandidatePipeline.findOneAndUpdate(
    { candidate: candidate._id, recruiter: req.user._id },
    payload,
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  pipeline.match_score = computeMatchPayload(candidate.scores?.placement_ready || 70, job).score;
  pipeline.match_reasons = computeMatchPayload(candidate.scores?.placement_ready || 70, job).reasons;
  await pipeline.save();
  res.json({
    pipeline: {
      status: pipeline.status,
      notes: pipeline.notes,
      tags: pipeline.tags,
      assignee_name: pipeline.assignee_name,
      next_step: pipeline.next_step,
      rejection_reason: pipeline.rejection_reason,
      follow_up_at: pipeline.follow_up_at?.toISOString() || null,
    },
    match: {
      score: pipeline.match_score,
      reasons: pipeline.match_reasons,
    },
  });
});

const createSavedSearch = asyncHandler(async (req, res) => {
  requireRecruiter(req.user);
  const { name, query, filters } = req.body;
  if (!name) {
    res.status(400);
    throw new Error('Name required');
  }
  const search = await SavedSearch.create({
    recruiter: req.user._id,
    name,
    query: query || '',
    filters: filters || {},
  });
  res.status(201).json(search);
});

const buildCandidateReportPdf = (student, res) => {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${student.username || 'candidate'}-report.pdf"`);
  doc.fontSize(20).text(`${student.full_name || student.username} - Candidate Summary`, { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Email: ${student.email}`);
  doc.text(`Branch: ${student.branch || 'N/A'}`);
  doc.text(`Course: ${student.course || 'N/A'}`);
  doc.text(`Score: ${student.scores?.placement_ready ?? 70}`);
  doc.moveDown();
  doc.fontSize(12).text('Top Skills:');
  (student.student_skills || []).forEach((skill) => doc.text(`• ${skill}`));
  doc.moveDown();
  doc.fontSize(12).text('Linked Profiles:');
  doc.text(`GitHub: ${student.github_link || 'N/A'}`);
  doc.text(`LinkedIn: ${student.linkedin_link || 'N/A'}`);
  doc.end();
  doc.pipe(res);
};

const downloadCandidateReport = asyncHandler(async (req, res) => {
  requireRecruiter(req.user);
  const candidateNumericId = Number(req.params.studentId) || null;
  if (!candidateNumericId) {
    res.status(400);
    throw new Error('Candidate id required');
  }
  const candidate = await User.findOne({ numeric_id: candidateNumericId, role: 'student' });
  if (!candidate) {
    res.status(404);
    throw new Error('Candidate not found');
  }
  buildCandidateReportPdf(candidate, res);
});

const downloadCandidateResume = asyncHandler(async (req, res) => {
  requireRecruiter(req.user);
  const candidateNumericId = Number(req.params.studentId) || null;
  if (!candidateNumericId) {
    res.status(400);
    throw new Error('Candidate id required');
  }
  const candidate = await User.findOne({ numeric_id: candidateNumericId, role: 'student' });
  if (!candidate || !candidate.resume_path) {
    res.status(404);
    throw new Error('Resume not available');
  }
  const absolutePath = path.resolve(candidate.resume_path);
  if (!fs.existsSync(absolutePath)) {
    res.status(404);
    throw new Error('Resume file missing');
  }
  res.download(absolutePath);
});

module.exports = {
  getRecruiterDashboard,
  createRecruiterJob,
  updateCandidatePipeline,
  createSavedSearch,
  downloadCandidateReport,
  downloadCandidateResume,
};
