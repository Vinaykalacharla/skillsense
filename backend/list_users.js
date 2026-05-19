const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/userModel');

async function listUsers() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillsense';
    console.log('Connecting to:', uri);
    await mongoose.connect(uri);
    console.log('Connected to DB');
    
    const users = await User.find({ role: 'student' }).sort({ createdAt: -1 }).limit(5);
    console.log('Latest 5 Students:');
    users.forEach(u => {
      console.log(`- ${u.full_name} (${u.email})`);
      console.log(`  College: ${u.college}, Course: ${u.course}, CGPA: ${u.cgpa}`);
      console.log(`  Skills: ${u.student_skills?.join(', ')}`);
      console.log(`  GitHub: ${u.github_link}`);
      console.log('---');
    });
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Failed to list users:', err.message);
  }
}

listUsers();
