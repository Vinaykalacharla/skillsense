const bcrypt = require('bcryptjs');
const User = require('../models/userModel');

const SAMPLE_PASSWORDS = {
  recruiter: 'Recruiter@123',
  university: 'University@123',
  student: 'Student@123',
};

const buildBreakdown = (scores) => ({
  coding_skill_index: {
    problem_solving: Math.round((scores.coding_skill_index || 0) * 0.42),
    architecture: Math.round((scores.coding_skill_index || 0) * 0.31),
    testing: Math.round((scores.coding_skill_index || 0) * 0.27),
  },
  communication_score: {
    clarity: Math.round((scores.communication_score || 0) * 0.38),
    articulation: Math.round((scores.communication_score || 0) * 0.34),
    collaboration: Math.round((scores.communication_score || 0) * 0.28),
  },
  authenticity_score: {
    honesty: Math.round((scores.authenticity_score || 0) * 0.4),
    ownership: Math.round((scores.authenticity_score || 0) * 0.34),
    grit: Math.round((scores.authenticity_score || 0) * 0.26),
  },
  placement_ready: {
    readiness: Math.round((scores.placement_ready || 0) * 0.58),
    evidence: Math.round((scores.placement_ready || 0) * 0.42),
  },
});

const sampleUsers = [
  {
    username: 'recruiter_demo',
    email: 'recruiter.demo@skillsense.local',
    role: 'recruiter',
    password: SAMPLE_PASSWORDS.recruiter,
    full_name: 'Aarav Mehta',
    organization_name: 'Northwind Talent',
    approval_status: 'approved',
    profile_verified: true,
    scores: {
      coding_skill_index: 74,
      communication_score: 81,
      authenticity_score: 86,
      placement_ready: 79,
    },
  },
  {
    username: 'university_demo',
    email: 'university.demo@skillsense.local',
    role: 'university',
    password: SAMPLE_PASSWORDS.university,
    full_name: 'Priya Nair',
    organization_name: 'Cityline Institute',
    approval_status: 'approved',
    profile_verified: true,
    scores: {
      coding_skill_index: 72,
      communication_score: 78,
      authenticity_score: 88,
      placement_ready: 80,
    },
  },
  {
    username: 'student_demo_1',
    email: 'student.anjali@skillsense.local',
    role: 'student',
    password: SAMPLE_PASSWORDS.student,
    full_name: 'Anjali Verma',
    organization_name: 'Cityline Institute',
    college: 'Cityline Institute',
    course: 'B.Tech',
    branch: 'Computer Science',
    year_of_study: '4',
    cgpa: 8.7,
    student_skills: ['React', 'Node.js', 'System Design'],
    github_link: 'https://github.com/anjali-demo',
    linkedin_link: 'https://linkedin.com/in/anjali-demo',
    leetcode_link: 'https://leetcode.com/anjali-demo',
    linkedin_headline: 'Full-stack student building placement-ready products',
    linkedin_about: 'Hands-on student developer focused on product engineering and API design.',
    approval_status: 'approved',
    profile_verified: true,
    scores: {
      coding_skill_index: 84,
      communication_score: 79,
      authenticity_score: 88,
      placement_ready: 83,
    },
  },
  {
    username: 'student_demo_2',
    email: 'student.rohan@skillsense.local',
    role: 'student',
    password: SAMPLE_PASSWORDS.student,
    full_name: 'Rohan Iyer',
    organization_name: 'Cityline Institute',
    college: 'Cityline Institute',
    course: 'B.Tech',
    branch: 'Information Technology',
    year_of_study: '4',
    cgpa: 8.2,
    student_skills: ['Java', 'Spring Boot', 'SQL'],
    github_link: 'https://github.com/rohan-demo',
    linkedin_link: 'https://linkedin.com/in/rohan-demo',
    leetcode_link: 'https://leetcode.com/rohan-demo',
    linkedin_headline: 'Backend-focused student with strong DSA signal',
    linkedin_about: 'Interested in backend systems, performance, and clean APIs.',
    approval_status: 'approved',
    profile_verified: true,
    scores: {
      coding_skill_index: 78,
      communication_score: 72,
      authenticity_score: 82,
      placement_ready: 76,
    },
  },
  {
    username: 'student_demo_3',
    email: 'student.meera@skillsense.local',
    role: 'student',
    password: SAMPLE_PASSWORDS.student,
    full_name: 'Meera Kapoor',
    organization_name: 'Cityline Institute',
    college: 'Cityline Institute',
    course: 'B.Tech',
    branch: 'Electronics and Communication',
    year_of_study: '3',
    cgpa: 9.0,
    student_skills: ['Python', 'Data Analysis', 'Machine Learning'],
    github_link: 'https://github.com/meera-demo',
    linkedin_link: 'https://linkedin.com/in/meera-demo',
    leetcode_link: 'https://leetcode.com/meera-demo',
    linkedin_headline: 'Data and AI student with strong communication signal',
    linkedin_about: 'Builds data products and communicates technical work clearly.',
    approval_status: 'approved',
    profile_verified: false,
    scores: {
      coding_skill_index: 73,
      communication_score: 84,
      authenticity_score: 80,
      placement_ready: 77,
    },
  },
];

const upsertSampleUser = async (sample) => {
  const existing = await User.findOne({
    $or: [{ email: sample.email.toLowerCase() }, { username: sample.username }],
  });

  if (existing) {
    return { user: existing, created: false };
  }

  const password = await bcrypt.hash(sample.password, 10);
  const user = await User.create({
    ...sample,
    email: sample.email.toLowerCase(),
    password,
    approved_at: sample.approval_status === 'approved' ? new Date() : undefined,
    breakdown: buildBreakdown(sample.scores || {}),
  });

  return { user, created: true };
};

const ensureSampleUsers = async () => {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  const results = [];
  for (const sample of sampleUsers) {
    results.push(await upsertSampleUser(sample));
  }

  const createdCount = results.filter((item) => item.created).length;
  if (createdCount > 0) {
    console.log('Seeded sample accounts for local development.');
  }

  console.log('Sample login credentials:');
  console.log(`Recruiter: recruiter.demo@skillsense.local / ${SAMPLE_PASSWORDS.recruiter}`);
  console.log(`University: university.demo@skillsense.local / ${SAMPLE_PASSWORDS.university}`);
  console.log(`Student: student.anjali@skillsense.local / ${SAMPLE_PASSWORDS.student}`);
};

module.exports = {
  ensureSampleUsers,
};
