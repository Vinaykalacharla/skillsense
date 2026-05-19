require('dotenv').config();
const { analyzeGithubTarget } = require('./src/utils/githubAnalysis');

async function test() {
  const username = 'Vinaykalacharla';
  console.log('Testing GitHub analysis for:', username);
  try {
    const result = await analyzeGithubTarget(username);
    console.log('RESULT:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('ERROR:', err);
  }
}

test();
