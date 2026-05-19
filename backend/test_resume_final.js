require('dotenv').config();
const { parseResume } = require('./src/utils/resumeParser');
const path = require('path');

async function test() {
  const resumePath = path.join(__dirname, 'uploads', 'resumes', '1777707188591-VINAY_RESUME_2027.pdf');
  console.log('Testing final resume parsing for:', resumePath);
  try {
    const details = await parseResume(resumePath);
    console.log('EXTRACTED DETAILS:');
    console.log(JSON.stringify(details, null, 2));
  } catch (err) {
    console.error('ERROR:', err);
  }
}

test();
