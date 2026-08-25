const Teacher = require('../models/Teacher');

async function ensureDefaultTeacher() {
  const email = process.env.FIREBASE_TEACHER_EMAIL || 'teacher@exam.gov';
  const existing = await Teacher.findOne({ email });
  if (existing) return;

  await Teacher.create({ email, name: 'Default Teacher' });
  console.log(`Authorized teacher email: ${email}`);
  console.log('Ensure this user exists in Firebase Console -> Authentication -> Add user.');
}

module.exports = { ensureDefaultTeacher };
