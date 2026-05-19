const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillsense';
    console.log('Connecting to:', uri);
    await mongoose.connect(uri);
    console.log('✅ MongoDB Connected Successfully!');
    const users = await mongoose.connection.db.collection('users').countDocuments();
    console.log('Number of users in DB:', users);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ MongoDB Connection Failed:', err.message);
    process.exit(1);
  }
}

check();
