require('dotenv').config();
const mongoose = require('mongoose');
const { createServer } = require('./app');
const { ensureDns } = require('./utils/dns');
const { ensureDefaultAdmin } = require('./services/adminService');
const { ensureDefaultTeacher } = require('./services/teacherService');
const { getFirebaseAdminApp } = require('./utils/firebaseAdmin');

async function start() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('\nMONGODB_URI missing.');
    console.error('1. Create a free cluster at https://www.mongodb.com/atlas');
    console.error('2. Add your connection string to backend/.env as MONGODB_URI=mongodb+srv://...');
    console.error('3. Also add JWT_SECRET (any long random string)\n');
    process.exit(1);
  }

  ensureDns();
  getFirebaseAdminApp();
  await mongoose.connect(uri, { dbName: process.env.DB_NAME || 'exam_auth' });
  console.log('MongoDB connected');
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
