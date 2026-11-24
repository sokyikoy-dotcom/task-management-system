const mongoose = require('mongoose');

async function connectDB() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskdb';
  await mongoose.connect(mongoUri);
  console.log('MongoDB connected');
}

module.exports = connectDB;
