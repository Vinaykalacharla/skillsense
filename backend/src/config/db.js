const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

let memoryServerPromise;

const isPlaceholderUri = (uri = '') => /<[^>]+>/.test(uri) || uri.includes('your-cluster');

const shouldUseDevFallback = () => process.env.NODE_ENV !== 'production';

const getDevMongoPath = () =>
  path.resolve(
    process.env.DEV_MONGO_DB_PATH || path.join(__dirname, '..', '..', '.dev-mongo', 'skillsense'),
  );

const connectDevMongo = async (reason) => {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const dbPath = getDevMongoPath();

  fs.mkdirSync(dbPath, { recursive: true });

  if (!memoryServerPromise) {
    memoryServerPromise = MongoMemoryServer.create({
      instance: {
        dbName: 'skillsense',
        dbPath,
        storageEngine: 'wiredTiger',
      },
    });
  }

  const memoryServer = await memoryServerPromise;
  const uri = memoryServer.getUri();

  await mongoose.connect(uri);
  console.warn(`MongoDB unavailable (${reason}). Using local dev MongoDB at ${dbPath}.`);

  return { mode: 'local-fallback', uri, dbPath };
};

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    return { mode: 'existing' };
  }

  const uri = process.env.MONGODB_URI?.trim();

  if (!uri) {
    if (!shouldUseDevFallback()) {
      throw new Error('MONGODB_URI is not defined');
    }

    return connectDevMongo('MONGODB_URI is not defined');
  }

  if (isPlaceholderUri(uri)) {
    if (!shouldUseDevFallback()) {
      throw new Error('MONGODB_URI still contains placeholder text');
    }

    return connectDevMongo('MONGODB_URI still contains placeholder text');
  }

  try {
    await mongoose.connect(uri);
    console.log('MongoDB connected');

    return { mode: 'external', uri };
  } catch (error) {
    if (!shouldUseDevFallback()) {
      throw error;
    }

    return connectDevMongo(error.code || error.message);
  }
};

module.exports = connectDB;
