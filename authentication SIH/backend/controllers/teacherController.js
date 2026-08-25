const jwt = require('jsonwebtoken');
const Teacher = require('../models/Teacher');
const Question = require('../models/Question');
const { getAuth } = require('firebase-admin/auth');

async function verifyToken(req, res) {
  const { idToken } = req.body;
  if (!idToken) {
    return res.status(400).json({ error: 'Firebase ID token required' });
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    console.log("Firebase verified email:", decodedToken.email, "UID:", decodedToken.uid, "claims:", decodedToken);
    
    // Authorization: Check Firebase custom claims or MongoDB
    let isTeacher = decodedToken.role === 'teacher';
    let teacherRecord = null;
    
    if (!isTeacher) {
      // Check MongoDB
      teacherRecord = await Teacher.findOne({ email: decodedToken.email });
      if (teacherRecord) {
        isTeacher = true;
      }
    } else {
      // Find or create Teacher record in MongoDB
      teacherRecord = await Teacher.findOne({ email: decodedToken.email });
      if (!teacherRecord) {
        teacherRecord = await Teacher.create({ email: decodedToken.email, name: decodedToken.name || 'Firebase Teacher' });
      }
    }

    if (!isTeacher) {
      console.log("Teacher authorization failed for:", decodedToken.email);
      return res.status(403).json({ error: 'Forbidden: You do not have the teacher role' });
    }

    return res.json({ message: 'Authorized', email: decodedToken.email, name: teacherRecord.name });
  } catch (err) {
    console.error("Token verification failed error:", err.message);
    return res.status(401).json({ error: 'Invalid or expired Firebase ID token: ' + err.message });
  }
}

async function getQuestions(req, res) {
  try {
    const questions = await Question.find({ createdBy: req.teacher.uid }).sort({ createdAt: -1 });
    return res.json({ questions });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function addQuestion(req, res) {
  const { questionText, options, correctOptionIndex, subject, difficulty } = req.body;
  if (!questionText || !options || options.length === 0 || correctOptionIndex === undefined || !subject) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const question = await Question.create({
      questionText,
      options,
      correctOptionIndex: Number(correctOptionIndex),
      subject,
      difficulty: difficulty || 'Medium',
      createdBy: req.teacher.uid, // Associated with Firebase UID!
      status: 'Pending'
    });
    return res.status(201).json({ message: 'Question added successfully', question });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function updateQuestion(req, res) {
  const { id } = req.params;
  const { questionText, options, correctOptionIndex, subject, difficulty } = req.body;

  try {
    const question = await Question.findOne({ _id: id, createdBy: req.teacher.uid });
    if (!question) {
      return res.status(404).json({ error: 'Question not found or unauthorized' });
    }

    if (questionText) question.questionText = questionText;
    if (options) question.options = options;
    if (correctOptionIndex !== undefined) question.correctOptionIndex = Number(correctOptionIndex);
    if (subject) question.subject = subject;
    if (difficulty) question.difficulty = difficulty;

    await question.save();
    return res.json({ message: 'Question updated successfully', question });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function deleteQuestion(req, res) {
  const { id } = req.params;

  try {
    const result = await Question.deleteOne({ _id: id, createdBy: req.teacher.uid });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Question not found or unauthorized' });
    }
    return res.json({ message: 'Question deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function getStatistics(req, res) {
  try {
    const total = await Question.countDocuments({ createdBy: req.teacher.uid });
    const approved = await Question.countDocuments({ createdBy: req.teacher.uid, status: 'Approved' });
    const pending = await Question.countDocuments({ createdBy: req.teacher.uid, status: 'Pending' });
    
    return res.json({ total, approved, pending });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { verifyToken, getQuestions, addQuestion, updateQuestion, deleteQuestion, getStatistics };
