const asyncHandler = require('express-async-handler');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
const { deriveScores, deriveBreakdown, buildDefaultBreakdown } = require('../utils/scoring');
const UniversityIntervention = require('../models/universityInterventionModel');
const BatchUpload = require('../models/batchUploadModel');
const PlacementDrive = require('../models/placementDriveModel');
const PerformancePoint = require('../models/performancePointModel');
const { analyzeGithubTarget } = require('../utils/githubAnalysis');
const { analyzeLeetcodeTarget } = require('../utils/leetcodeAnalysis');
const CodeAnalysisReport = require('../models/codeAnalysisReportModel');
const { callAi } = require('../utils/aiClient');

const toNumericId = (value) => {
  if (!value) {
    return Date.now();
  }
  const str = value.toString();
  const parsed = Number.parseInt(str.slice(-6), 16);
  return Number.isNaN(parsed) ? Math.abs(Number(str.slice(-6)) || Date.now()) : parsed;
};

const requireUniversity = (user) => {
  if (!user || user.role !== 'university') {
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

const buildStudentPayload = async (student) => {
  const candidateId = await ensureNumericId(student);
  const score = Math.round(student.scores?.placement_ready ?? 70);
  return {
    id: candidateId,
    verification_id: student.username || `SV${candidateId}`,
    name: student.full_name || student.username,
    college: student.college || 'College pending',
    course: student.course || 'Course pending',
    branch: student.branch || 'Branch pending',
    year_of_study: student.year_of_study || 'N/A',
    profile_verified: student.profile_verified,
    score,
    focus_area: (student.student_skills || [])[0] || 'Skills pending',
    recommended_action: 'Encourage AI interview',
    scores: {
      placement_ready: score,
      coding_skill_index: Math.round(student.scores?.coding_skill_index ?? score),
      communication_score: Math.round(student.scores?.communication_score ?? score),
      authenticity_score: Math.round(student.scores?.authenticity_score ?? score),
    },
  };
};

const buildSummary = (students, interventions) => {
  const total = students.length;
  const avgReady = total ? Math.round(students.reduce((sum, student) => sum + student.score, 0) / total) : 0;
  const avgCoding = total ? Math.round(students.reduce((sum, student) => sum + student.scores.coding_skill_index, 0) / total) : 0;
  const avgAuthenticity = total
    ? Math.round(students.reduce((sum, student) => sum + student.scores.authenticity_score, 0) / total)
    : 0;
  const needAttention = students.filter((student) => student.score < 60).length;
  return {
    students: total,
    average_ready: avgReady,
    average_coding: avgCoding,
    average_authenticity: avgAuthenticity,
    verified_profiles: students.filter((student) => student.profile_verified).length,
    need_attention: needAttention,
    tracked_interventions: interventions.length,
  };
};

const buildFilters = (students) => ({
  branches: Array.from(new Set(students.map((student) => student.branch).filter(Boolean))),
  courses: Array.from(new Set(students.map((student) => student.course).filter(Boolean))),
  years: Array.from(new Set(students.map((student) => student.year_of_study).filter(Boolean))),
});

const buildReadinessBreakdown = (students) => {
  const buckets = [
    { name: 'High readiness', test: (score) => score >= 80 },
    { name: 'Medium readiness', test: (score) => score >= 65 && score < 80 },
    { name: 'Low readiness', test: (score) => score < 65 },
  ];
  return buckets.map((bucket) => ({
    name: bucket.name,
    count: students.filter((student) => bucket.test(student.score)).length,
  }));
};

const buildSkillDistribution = (students) => {
  const counter = {};
  students.forEach((student) => {
    (student.focus_area ? [student.focus_area] : []).forEach((skill) => {
      counter[skill] = (counter[skill] || 0) + 1;
    });
  });
  return Object.entries(counter).map(([name, count]) => ({ name, count }));
};

const buildPlacementTrend = async (studentDocs) => {
  const studentIds = studentDocs.map((student) => student._id);
  const points = await PerformancePoint.find({ user: { $in: studentIds } }).sort({ date: 1 });
  if (!points.length) {
    const today = Date.now();
    return Array.from({ length: 5 }).map((_, index) => ({
      date: new Date(today - (4 - index) * 86400000).toISOString(),
      placement_ready: 60 + index * 4,
      coding_skill_index: 55 + index * 3,
      communication_score: 50 + index * 3,
      authenticity_score: 58 + index * 2,
    }));
  }
  const aggregate = {};
  points.forEach((point) => {
    const date = point.date.toISOString().split('T')[0];
    if (!aggregate[date]) {
      aggregate[date] = { total: 0, count: 0, coding: 0, communication: 0, authenticity: 0 };
    }
    aggregate[date].total += point.placement_ready;
    aggregate[date].coding += point.coding_skill_index;
    aggregate[date].communication += point.communication_score;
    aggregate[date].authenticity += point.authenticity_score;
    aggregate[date].count += 1;
  });
  return Object.entries(aggregate).map(([date, accum]) => ({
    date,
    placement_ready: Math.round(accum.total / accum.count),
    coding_skill_index: Math.round(accum.coding / accum.count),
    communication_score: Math.round(accum.communication / accum.count),
    authenticity_score: Math.round(accum.authenticity / accum.count),
  }));
};

const buildInterventions = async (user, students) => {
  const records = await UniversityIntervention.find({ university: user._id }).sort({ updatedAt: -1 });
  const studentMap = new Map(students.map((student) => [student.id, student]));
  return records.map((record) => {
    const student = students.find((s) => s.id === record.student_numeric_id) || {};
    return {
      id: record.student_numeric_id,
      name: student.name || record.student_name || 'Student',
      verification_id: student.verification_id || record.student_verification_id || 'N/A',
      college: student.college || 'College',
      branch: student.branch || 'Branch',
      score: student.score || 0,
      focus_area: student.focus_area || 'N/A',
      severity: record.severity,
      reason: record.reason,
      action: record.action,
      status: record.status,
      priority: record.priority,
      note: record.note,
      recommended_action: record.recommended_action,
    };
  });
};

const buildTopStudents = (students) => [...students].sort((a, b) => b.score - a.score).slice(0, 6);

const mapBatchUpload = (upload) => ({
  id: upload._id,
  filename: upload.filename,
  status: upload.status,
  summary: upload.summary,
  created_at: upload.createdAt?.toISOString() || null,
});

const mapPlacementDrive = (drive, students) => ({
  id: drive._id,
  company_name: drive.company_name,
  role_title: drive.role_title,
  description: drive.description,
  target_branches: drive.target_branches,
  target_courses: drive.target_courses,
  minimum_ready_score: drive.minimum_ready_score,
  scheduled_on: drive.scheduled_on?.toISOString() || null,
  status: drive.status,
  eligible_count: drive.eligible_count,
  top_candidates: drive.top_candidates || [],
  updated_at: drive.updatedAt?.toISOString() || null,
});

const getUniversityDashboard = asyncHandler(async (req, res) => {
  requireUniversity(req.user);
  const filters = {};
  if (req.query.branch) {
    filters.branch = req.query.branch;
  }
  if (req.query.course) {
    filters.course = req.query.course;
  }
  if (req.query.year_of_study) {
    filters.year_of_study = req.query.year_of_study;
  }
  const studentsQuery = { role: 'student', ...filters };
  const studentDocs = await User.find(studentsQuery).limit(60).sort({ updatedAt: -1 });
  const students = await Promise.all(studentDocs.map((student) => buildStudentPayload(student)));
  const interventions = await UniversityIntervention.find({ university: req.user._id }).limit(20).sort({ updatedAt: -1 });
  const summary = buildSummary(students, interventions);
  const response = {
    summary,
    filters: buildFilters(students),
    readiness_breakdown: buildReadinessBreakdown(students),
    skill_distribution: buildSkillDistribution(students),
    placement_trend: await buildPlacementTrend(studentDocs),
    interventions: await buildInterventions(req.user, students),
    top_students: buildTopStudents(students),
    students,
    batch_uploads: (await BatchUpload.find({ university: req.user._id }).sort({ createdAt: -1 }).limit(5)).map(mapBatchUpload),
    placement_drives: (await PlacementDrive.find({ university: req.user._id }).sort({ updatedAt: -1 }).limit(6)).map((drive) => mapPlacementDrive(drive, students)),
  };
  res.json(response);
});

const handleBatchUpload = asyncHandler(async (req, res) => {
  requireUniversity(req.user);
  if (!req.file) {
    res.status(400);
    throw new Error('File required');
  }

  const lines = fs.readFileSync(req.file.path, 'utf8').split(/\r?\n/).filter(Boolean);
  
  // Skip header if it exists
  const startIdx = lines[0].toLowerCase().includes('email') ? 1 : 0;
  const studentLines = lines.slice(startIdx);

  const summary = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  for (const line of studentLines) {
    try {
      // CSV parsing: email, full_name, username, password, github_link, leetcode_link
      const [email, full_name, username, password, github_link, leetcode_link] = line.split(',').map((s) => s.trim());

      if (!email || !username) {
        summary.skipped += 1;
        continue;
      }

      const existingUser = await User.findOne({ 
        $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] 
      });

      if (existingUser) {
        summary.updated += 1;
        continue;
      }

      const hashedPassword = await bcrypt.hash(password || 'SkillSense@123', 10);
      
      const user = await User.create({
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        full_name: full_name || username,
        password: hashedPassword,
        role: 'student',
        organization_name: req.user.organization_name || req.user.full_name,
        college: req.user.organization_name || req.user.full_name,
        approval_status: 'approved',
        approved_at: new Date(),
        github_link: github_link || '',
        leetcode_link: leetcode_link || '',
        scores: deriveScores({}),
        breakdown: buildDefaultBreakdown(),
      });

      // Trigger GitHub Analysis
      if (user.github_link) {
        try {
          const analysis = await analyzeGithubTarget(user.github_link);
          await CodeAnalysisReport.create({
            user: user._id,
            repo_url: analysis.repo_url,
            repo_name: analysis.repo_name,
            description: analysis.description,
            score: analysis.score,
            metrics: analysis.metrics,
          });
          user.github_stats = analysis.profile_stats;
        } catch (err) {
          console.error(`GitHub analysis failed for ${user.username}:`, err.message);
        }
      }

      // Trigger LeetCode Analysis
      if (user.leetcode_link) {
        try {
          const result = await analyzeLeetcodeTarget(user.leetcode_link);
          if (result) {
            user.leetcode_stats = result.stats;
          }
        } catch (err) {
          console.error(`LeetCode analysis failed for ${user.username}:`, err.message);
        }
      }

      user.scores = deriveScores(user);
      user.breakdown = deriveBreakdown(user.scores);
      await user.save();
      summary.created += 1;
    } catch (err) {
      console.error('Error processing batch line:', err);
      summary.skipped += 1;
      summary.errors.push(err.message);
    }

  }

  await BatchUpload.create({
    university: req.user._id,
    filename: req.file.originalname,
    path: req.file.path,
    summary,
    status: 'completed',
  });

  res.status(201).json({ summary });
});

const updateUniversityIntervention = asyncHandler(async (req, res) => {
  requireUniversity(req.user);
  const studentId = Number(req.params.studentId) || null;
  if (!studentId) {
    res.status(400);
    throw new Error('Student id required');
  }
  const payload = {
    status: req.body.status || 'planned',
    priority: req.body.priority || 'medium',
    note: req.body.note || '',
    recommended_action: req.body.recommended_action || '',
  };
  const intervention = await UniversityIntervention.findOneAndUpdate(
    { university: req.user._id, student_numeric_id: studentId },
    { ...payload, student_numeric_id: studentId, student: req.body.student || null },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  res.json({
    id: intervention.student_numeric_id,
    ...payload,
  });
});

const createPlacementDrive = asyncHandler(async (req, res) => {
  requireUniversity(req.user);
  const { company_name, role_title, description, target_branches, target_courses, minimum_ready_score, scheduled_on, status } = req.body;
  if (!company_name || !role_title) {
    res.status(400);
    throw new Error('Company and role required');
  }
  const students = await User.find({ role: 'student' }).limit(60);
  const eligibleCount = students.filter((student) => (student.scores?.placement_ready ?? 70) >= (Number(minimum_ready_score) || 70)).length;
  const candidatePayloads = await Promise.all(
    students.map(async (student) => ({
      id: await ensureNumericId(student),
      name: student.full_name || student.username,
      score: Math.round(student.scores?.placement_ready ?? 70),
      branch: student.branch || 'N/A',
      verification_id: student.username || `SV${toNumericId(student._id)}`,
    })),
  );
  const topCandidates = candidatePayloads.sort((a, b) => b.score - a.score).slice(0, 3);
  const drive = await PlacementDrive.create({
    university: req.user._id,
    company_name,
    role_title,
    description: description || '',
    target_branches: (target_branches || '').split(',').map((item) => item.trim()).filter(Boolean),
    target_courses: (target_courses || '').split(',').map((item) => item.trim()).filter(Boolean),
    minimum_ready_score: Number(minimum_ready_score) || 70,
    scheduled_on: scheduled_on ? new Date(scheduled_on) : null,
    status: status || 'planning',
    eligible_count: eligibleCount,
    top_candidates: topCandidates,
  });
  res.status(201).json({ drive: mapPlacementDrive(drive, students) });
});

const generateAIIntervention = asyncHandler(async (req, res) => {
  requireUniversity(req.user);
  const studentId = Number(req.params.studentId);
  if (!studentId) {
    res.status(400);
    throw new Error('Student ID required');
  }

  const student = await User.findOne({ numeric_id: studentId, role: 'student' });
  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  const systemPrompt = `You are an expert academic advisor and AI intervention planner.
Based on the student's current profile, scores, and focus areas, recommend an intervention plan.
Return a JSON object with:
- recommended_action (string: a clear 1-2 sentence action plan for the student)
- note (string: a note for the advisor or university tracking)
- priority (string: "high", "medium", or "low")`;

  const studentProfile = `
Name: ${student.full_name || student.username}
Focus Area: ${(student.student_skills || [])[0] || 'N/A'}
Placement Ready Score: ${student.scores?.placement_ready ?? 70}/100
Coding Score: ${student.scores?.coding_skill_index ?? 70}/100
Communication Score: ${student.scores?.communication_score ?? 70}/100
Authenticity Score: ${student.scores?.authenticity_score ?? 70}/100
`;

  const prompt = `Student Profile:\n${studentProfile}`;

  try {
    const analysis = await callAi(prompt, systemPrompt);
    res.json(analysis);
  } catch (err) {
    console.error('AI intervention generation failed:', err);
    res.status(500);
    throw new Error('AI analysis failed');
  }
});

module.exports = {
  getUniversityDashboard,
  handleBatchUpload,
  updateUniversityIntervention,
  createPlacementDrive,
  generateAIIntervention,
};

