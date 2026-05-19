require('dotenv').config();
const { analyzeLeetcodeTarget } = require('./src/utils/leetcodeAnalysis');

async function test() {
  const username = 'KALACHARLA_VINAY';
  console.log('Testing LeetCode analysis for:', username);
  try {
    const result = await analyzeLeetcodeTarget(username);
    console.log('RESULT:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('ERROR:', err);
  }
}

test();
