const { getAuth } = require('firebase-admin/auth');
const { isFirebaseAdminInitialized } = require('./firebaseAdmin');
const Teacher = require('../models/Teacher');

async function teacherAuthMiddleware(req, res, next) {
  if (!isFirebaseAdminInitialized()) {
    return res.status(503).json({ error: 'Firebase Admin is not configured' });
  }

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Firebase ID token required' });
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    
    // Authorization: custom claim or MongoDB
    let isTeacher = decodedToken.role === 'teacher';
    if (!isTeacher) {
      const teacherRecord = await Teacher.findOne({ email: decodedToken.email });
      if (teacherRecord) {
        isTeacher = true;
      }
    }

    if (!isTeacher) {
      return res.status(403).json({ error: 'Forbidden: You do not have the teacher role' });
    }

    req.teacher = decodedToken; // contains uid, email, etc.
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired Firebase ID token: ' + err.message });
  }
}

module.exports = teacherAuthMiddleware;
