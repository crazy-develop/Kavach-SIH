require('dotenv').config();
const mongoose = require('mongoose');
const { createServer } = require('./app');
const { ensureDns } = require('./utils/dns');
const { ensureDefaultAdmin } = require('./services/adminService');
const { ensureDefaultTeacher } = require('./services/teacherService');
const { getFirebaseAdminApp } = require('./utils/firebaseAdmin');

async function start() {
  let uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('\nMONGODB_URI missing. Set it in .env');
    process.exit(1);
  }

  // Commented out to prevent DNS timeouts under blocked environments
  // ensureDns();
  getFirebaseAdminApp();

  try {
    console.log(`Attempting to connect to MongoDB at ${uri}...`);
    // Fast timeout so it doesn't hang
    await mongoose.connect(uri, { dbName: process.env.DB_NAME || 'exam_auth', serverSelectionTimeoutMS: 2000 });
    console.log('MongoDB connected successfully to local/remote server.');
  } catch (err) {
    console.log(`Failed to connect to ${uri}: ${err.message}`);
    console.log('Starting in-memory MongoDB fallback (version 6.0.4)...');
    // Force version 6.0.4 to avoid EFTYPE errors on Windows with v7+ binaries
    process.env.MONGOMS_VERSION = '6.0.4';
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create({
      instance: {
        dbPath: 'E:\\SIH\\database_storage',
        storageEngine: 'wiredTiger'
      }
    });
    const fallbackUri = mongod.getUri();
    await mongoose.connect(fallbackUri, { dbName: process.env.DB_NAME || 'exam_auth' });
    console.log(`MongoDB connected successfully to IN-MEMORY server at ${fallbackUri}`);
  }

  await ensureDefaultAdmin();
  await ensureDefaultTeacher();
  const { server } = createServer();
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
