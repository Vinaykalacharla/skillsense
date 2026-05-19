const { parseResume } = require('./src/utils/resumeParser');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function test() {
  // Try to find a resume in the uploads folder
  const resumeDir = path.join(__dirname, 'uploads', 'resumes');
  if (!fs.existsSync(resumeDir)) {
    console.error('Resume directory not found:', resumeDir);
    process.exit(1);
  }

  const files = fs.readdirSync(resumeDir).filter(f => f.endsWith('.pdf'));
  if (files.length === 0) {
    console.error('No PDF resumes found in:', resumeDir);
    process.exit(1);
  }

  const resumePath = path.join(resumeDir, files[0]);
  console.log('Testing resume parsing for:', resumePath);
  
  try {
    const details = await parseResume(resumePath);
    console.log('EXTRACTED DETAILS:');
    console.log(JSON.stringify(details, null, 2));
  } catch (err) {
    console.error('TEST FAILED:', err);
  }
}

test();
