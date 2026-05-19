const { parseResume } = require('./backend/src/utils/resumeParser');
require('dotenv').config({ path: './backend/.env' });

async function test() {
  const resumePath = 'backend/uploads/resumes/1777722832044-VINAY_RESUME_2027.pdf';
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
