const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
const path = require('path');
const User = require('../models/userModel');
const { sanitizeUserForResponse } = require('../utils/userHelpers');
const {
  buildDefaultBreakdown,
  deriveBreakdown,
  deriveGithubInsights,
  deriveScores,
} = require('../utils/scoring');
const { parseResume } = require('../utils/resumeParser');
const { analyzeGithubTarget, normalizeGithubInput } = require('../utils/githubAnalysis');
const { analyzeLeetcodeTarget } = require('../utils/leetcodeAnalysis');
const CodeAnalysisReport = require('../models/codeAnalysisReportModel');
const Activity = require('../models/activityModel');

const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';

const buildTokens = (userId) => ({
  access: jwt.sign({ id: userId }, process.env.JWT_SECRET || 'changeme', { expiresIn: ACCESS_TOKEN_EXPIRY }),
  refresh: jwt.sign({ id: userId }, process.env.JWT_SECRET || 'changeme', { expiresIn: REFRESH_TOKEN_EXPIRY }),
});

const respondWithTokens = (res, user) => {
  const tokens = buildTokens(user.id);
  res.status(200).json({ access: tokens.access, refresh: tokens.refresh, user: sanitizeUserForResponse(user) });
};

const signup = asyncHandler(async (req, res) => {
  const { email, password, full_name, username, role = 'student', organization_name } = req.body;

  if (!email || !password || !username) {
    res.status(400);
    throw new Error('Email, username, and password are required');
  }

  const existingEmail = await User.findOne({ email: email.toLowerCase().trim() });
  if (existingEmail) {
    res.status(409);
    throw new Error('A user with that email already exists');
  }
  const existingUsername = await User.findOne({ username: username.trim() });
  if (existingUsername) {
    res.status(409);
    throw new Error('A user with that username already exists');
  }

  const hashed = await bcrypt.hash(password, 10);
  const resumePath = req.file ? req.file.path : undefined;
  const normalizedRole = ['student', 'recruiter', 'university'].includes(role) ? role : 'student';
  const approvalStatus = normalizedRole === 'student' ? 'approved' : 'pending';

  let extractedDetails = {};
  if (resumePath && normalizedRole === 'student') {
    try {
      extractedDetails = await parseResume(resumePath) || {};
      
      // LOG EVERYTHING TO A FILE FOR AUDIT
      const signupLog = path.join(__dirname, '..', '..', 'signup_debug.log');
      const logData = `
--- SIGNUP ATTEMPT ${new Date().toISOString()} ---
Email: ${email}
Resume Path: ${resumePath}
Extracted Details: ${JSON.stringify(extractedDetails, null, 2)}
------------------------------------------------
\n`;
      fs.appendFileSync(signupLog, logData);
      console.log('DEBUG: Signup details logged to:', signupLog);

    } catch (err) {
      console.error('Critical failure in resume parsing pipeline:', err);
    }
  }

  const skillsFromResume = Array.isArray(extractedDetails.student_skills) 
    ? extractedDetails.student_skills 
    : (typeof extractedDetails.student_skills === 'string' ? extractedDetails.student_skills.split(',').map(s => s.trim()) : []);
    
  const initialSkills = req.body.student_skills
    ? req.body.student_skills
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean)
    : [];
  
  const skillsList = [...new Set([...initialSkills, ...skillsFromResume])];

  const user = await User.create({
    username: username.trim(),
    email: email.toLowerCase().trim(),
    password: hashed,
    full_name: full_name || extractedDetails.full_name || extractedDetails.name,
    organization_name,
    role: normalizedRole,
    approval_status: approvalStatus,
    approved_at: approvalStatus === 'approved' ? new Date() : undefined,
    resume_path: resumePath,
    student_skills: skillsList,
    college: extractedDetails.college || extractedDetails.university || '',
    course: extractedDetails.course || extractedDetails.degree || '',
    branch: extractedDetails.branch || extractedDetails.major || extractedDetails.specialization || '',
    year_of_study: extractedDetails.year_of_study || extractedDetails.graduation_year || '',
    cgpa: Number(extractedDetails.cgpa) || 0,
    github_link: normalizeGithubInput(req.body.github_link || extractedDetails.github_link),
    leetcode_link: (req.body.leetcode_link || extractedDetails.leetcode_link || '').includes('leetcode.com') 
      ? (req.body.leetcode_link || extractedDetails.leetcode_link) 
      : (req.body.leetcode_link || extractedDetails.leetcode_link) ? `https://leetcode.com/${req.body.leetcode_link || extractedDetails.leetcode_link}` : '',
    linkedin_link: (req.body.linkedin_link || extractedDetails.linkedin_link || '').includes('linkedin.com')
      ? (req.body.linkedin_link || extractedDetails.linkedin_link)
      : (req.body.linkedin_link || extractedDetails.linkedin_link) ? `https://linkedin.com/in/${req.body.linkedin_link || extractedDetails.linkedin_link}` : '',
    codechef_link: req.body.codechef_link || extractedDetails.codechef_link,
    hackerrank_link: req.body.hackerrank_link || extractedDetails.hackerrank_link,
    codeforces_link: req.body.codeforces_link || extractedDetails.codeforces_link,
    gfg_link: req.body.gfg_link || extractedDetails.gfg_link,
    linkedin_headline: extractedDetails.linkedin_headline,
    linkedin_about: extractedDetails.linkedin_about,
    scores: deriveScores({
      profile_verified: false,
      student_skills: skillsList,
      linkedin_skill_count: Number(req.body.linkedin_skill_count) || 0,
      github_link: normalizeGithubInput(req.body.github_link || extractedDetails.github_link),
      leetcode_link: req.body.leetcode_link || extractedDetails.leetcode_link,
      linkedin_link: req.body.linkedin_link || extractedDetails.linkedin_link,
    }),
    breakdown: buildDefaultBreakdown(),
  });

  // Automatically trigger GitHub analysis if a link was found
  if (user.github_link && user.role === 'student') {
    try {
      const analyses = await analyzeGithubTarget(user.github_link);
      for (const analysis of analyses) {
        await CodeAnalysisReport.create({
          user: user._id,
          repo_url: analysis.repo_url,
          repo_name: analysis.repo_name,
          description: analysis.description,
          score: analysis.score,
          metrics: analysis.metrics,
        });
      }
      user.github_stats = analyses[0].profile_stats;
    } catch (err) {
      console.error('Initial GitHub analysis failed:', err);
    }
  }

  // Automatically trigger LeetCode analysis if a link was found
  if (user.leetcode_link && user.role === 'student') {
    try {
      const result = await analyzeLeetcodeTarget(user.leetcode_link);
      if (result) {
        user.leetcode_stats = result.stats;
      }
    } catch (err) {
      console.error('Initial LeetCode analysis failed:', err);
    }
  }

  // Final scoring and AI analysis
  user.scores = deriveScores(user);
  user.breakdown = deriveBreakdown(user.scores);
  
  if (user.role === 'student') {
    const { generateProfileAnalysis } = require('../utils/profileAnalysis');
    user.ai_analysis = await generateProfileAnalysis(user);
  }
  
  await user.save();

  if (user.leetcode_link && user.leetcode_stats?.total_solved > 0) {
    await Activity.create({
      user: user._id,
      activity_type: 'leetcode_analysis',
      title: 'LeetCode profile synced',
      description: `Successfully fetched stats for ${user.leetcode_stats.username}. Total solved: ${user.leetcode_stats.total_solved}.`,
      status: 'completed',
    }).catch(() => null);
  }

  respondWithTokens(res, user);
});



const login = asyncHandler(async (req, res) => {
  const identifier = (req.body.email || req.body.username || req.body.identifier || '').trim();
  const { password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Email or username and password are required' });
  }

  const normalizedIdentifier = identifier.toLowerCase();
  const user = await User.findOne({
    $or: [
      { email: normalizedIdentifier },
      { username: identifier },
      { username: normalizedIdentifier },
    ],
  });

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (user.approval_status === 'pending') {
    return res.status(403).json({
      error: 'Your account is pending admin approval. Try again after approval.',
      approval_status: 'pending',
    });
  }

  if (user.approval_status === 'rejected') {
    return res.status(403).json({
      error: 'Your account request was rejected. Contact support or resubmit.',
      approval_status: 'rejected',
    });
  }

  respondWithTokens(res, user);
});

const getProfile = (req, res) => {
  const user = sanitizeUserForResponse(req.user);
  if (req.user.resume_path) {
    user.resume_document = {
      filename: path.basename(req.user.resume_path),
      download_path: '/api/skills/resume/',
    };
  }
  res.json({ user });
};

const updateProfile = asyncHandler(async (req, res) => {
  const updates = { ...req.body };
  const whitelist = [
    'full_name',
    'gender',
    'phone_number',
    'college',
    'course',
    'branch',
    'year_of_study',
    'cgpa',
    'student_skills',
    'github_link',
    'leetcode_link',
    'linkedin_link',
    'linkedin_headline',
    'linkedin_experience_count',
    'linkedin_skill_count',
    'linkedin_cert_count',
    'linkedin_about',
    'codechef_link',
    'hackerrank_link',
    'codeforces_link',
    'gfg_link',
  ];

  const numericKeys = ['cgpa', 'linkedin_experience_count', 'linkedin_skill_count', 'linkedin_cert_count'];
  whitelist.forEach((key) => {
    if (updates[key] !== undefined) {
      req.user[key] = numericKeys.includes(key)
        ? Number(updates[key]) || 0
        : updates[key];
    }
  });

  if (typeof updates.student_skills === 'string') {
    req.user.student_skills = updates.student_skills
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean);
  } else if (Array.isArray(updates.student_skills)) {
    req.user.student_skills = updates.student_skills;
  }

  req.user.scores = deriveScores(req.user);
  req.user.breakdown = deriveBreakdown(req.user.scores);
  await req.user.save();

  respondWithTokens(res, req.user);
});

const dashboard = (req, res) => {
  const user = sanitizeUserForResponse(req.user);
  res.json({
    user,
    scores: req.user.scores || deriveScores(req.user),
    breakdown: req.user.breakdown || buildDefaultBreakdown(),
    github_insights: deriveGithubInsights(req.user),
  });
};

const recalculate = asyncHandler(async (req, res) => {
  // Refresh GitHub Stats if link exists
  if (req.user.github_link) {
    try {
      const analyses = await analyzeGithubTarget(req.user.github_link);
      req.user.github_stats = analyses[0].profile_stats;
      
      // Update or create latest reports for the top ones found
      for (const analysis of analyses) {
        await CodeAnalysisReport.findOneAndUpdate(
          { user: req.user._id, repo_url: analysis.repo_url },
          { 
            repo_name: analysis.repo_name,
            description: analysis.description,
            score: analysis.score,
            metrics: analysis.metrics,
          },
          { upsert: true }
        );
      }
    } catch (err) {
      console.error('GitHub refresh failed:', err);
    }
  }

  // Refresh LeetCode Stats if link exists
  if (req.user.leetcode_link) {
    try {
      const result = await analyzeLeetcodeTarget(req.user.leetcode_link);
      if (result) {
        req.user.leetcode_stats = result.stats;
      }
    } catch (err) {
      console.error('LeetCode refresh failed:', err);
    }
  }

  const updatedScores = deriveScores(req.user);
  req.user.scores = updatedScores;
  req.user.breakdown = deriveBreakdown(updatedScores);
  
  if (req.user.role === 'student') {
    const { generateProfileAnalysis } = require('../utils/profileAnalysis');
    req.user.ai_analysis = await generateProfileAnalysis(req.user);
  }
  
  req.user.last_analyzed_at = new Date();
  await req.user.save();

  res.json({
    user: sanitizeUserForResponse(req.user),
    scores: updatedScores,
    breakdown: req.user.breakdown,
    github_insights: deriveGithubInsights(req.user),
  });
});


const scoreReport = asyncHandler(async (req, res) => {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="skillverify-score-report.pdf"');

  doc.fontSize(20).fillColor('#0f172a').text('SkillSense AI Score Report', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Name: ${req.user.full_name || req.user.username}`);
  doc.text(`Role: ${req.user.role}`);
  doc.text(`Email: ${req.user.email}`);
  doc.moveDown();

  const scores = req.user.scores || deriveScores(req.user);
  Object.entries(scores).forEach(([key, value]) => {
    doc.fontSize(12).text(`${key.replace(/_/g, ' ')}: ${Math.round(value)}`);
  });
  doc.moveDown();

  doc.fontSize(12).text('GitHub Insights:', { underline: true });
  const insights = deriveGithubInsights(req.user);
  doc.text(`Top Languages: ${insights.top_languages.map(([lang]) => lang).join(', ') || 'N/A'}`);
  doc.text(`Original repos: ${insights.original}`);
  doc.text(`Forked repos: ${insights.forked}`);
  doc.text(`Fork ratio: ${Math.round(insights.fork_ratio * 100)}%`);

  doc.pipe(res);
  doc.end();
});

const logout = (req, res) => {
  res.json({ message: 'Logged out' });
};

const syncFromResume = asyncHandler(async (req, res) => {
  if (!req.user.resume_path) {
    return res.status(400).json({ error: 'No resume found for this user.' });
  }

  const extractedDetails = await parseResume(req.user.resume_path);
  if (!extractedDetails) {
    return res.status(500).json({ error: 'Failed to extract details from resume.' });
  }

  // Update user fields
  req.user.college = extractedDetails.college || extractedDetails.university || req.user.college;
  req.user.course = extractedDetails.course || extractedDetails.degree || req.user.course;
  req.user.branch = extractedDetails.branch || extractedDetails.major || extractedDetails.specialization || req.user.branch;
  req.user.year_of_study = extractedDetails.year_of_study || extractedDetails.graduation_year || req.user.year_of_study;
  req.user.cgpa = Number(extractedDetails.cgpa) || req.user.cgpa;
  
  if (extractedDetails.student_skills) {
    const skillsList = Array.isArray(extractedDetails.student_skills) 
      ? extractedDetails.student_skills 
      : extractedDetails.student_skills.split(',').map(s => s.trim());
    req.user.student_skills = [...new Set([...(req.user.student_skills || []), ...skillsList])];
  }

  req.user.github_link = req.user.github_link || extractedDetails.github_link;
  req.user.leetcode_link = req.user.leetcode_link || extractedDetails.leetcode_link;
  req.user.linkedin_link = req.user.linkedin_link || extractedDetails.linkedin_link;

  // Refresh analysis if links were found
  if (req.user.github_link) {
    try {
      const analyses = await analyzeGithubTarget(req.user.github_link);
      req.user.github_stats = analyses[0].profile_stats;
    } catch (e) {}
  }
  if (req.user.leetcode_link) {
    try {
      const result = await analyzeLeetcodeTarget(req.user.leetcode_link);
      if (result) req.user.leetcode_stats = result.stats;
    } catch (e) {}
  }

  req.user.scores = deriveScores(req.user);
  req.user.breakdown = deriveBreakdown(req.user.scores);

  if (req.user.role === 'student') {
    const { generateProfileAnalysis } = require('../utils/profileAnalysis');
    req.user.ai_analysis = await generateProfileAnalysis(req.user);
  }

  await req.user.save();

  res.json({
    message: 'Profile synced from resume successfully.',
    user: sanitizeUserForResponse(req.user)
  });
});

module.exports = {
  signup,
  login,
  dashboard,
  recalculate,
  scoreReport,
  getProfile,
  updateProfile,
  syncFromResume,
  logout,
};
