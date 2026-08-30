const jwt = require('jsonwebtoken');
const Teacher = require('../models/Teacher');
const Question = require('../models/Question');
const { getAuth } = require('firebase-admin/auth');
const { isFirebaseAdminInitialized } = require('../utils/firebaseAdmin');

async function verifyToken(req, res) {
  if (!isFirebaseAdminInitialized()) {
    return res.status(503).json({ error: 'Firebase Admin is not configured' });
  }

  const { idToken } = req.body;
  if (!idToken) {
    return res.status(400).json({ error: 'Firebase ID token required' });
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    console.log("Firebase verified email:", decodedToken.email, "UID:", decodedToken.uid, "claims:", decodedToken);
    
    let isTeacher = decodedToken.role === 'teacher';
    let teacherRecord = null;
    
    if (!isTeacher) {
      teacherRecord = await Teacher.findOne({ email: decodedToken.email });
      if (teacherRecord) {
        isTeacher = true;
      }
    } else {
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const status = req.query.status || 'All';
    const sortBy = req.query.sortBy || 'updatedAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const filter = {};

    if (status !== 'All') {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { questionText: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { chapter: { $regex: search, $options: 'i' } },
        { topic: { $regex: search, $options: 'i' } }
      ];
    }

    const totalQuestions = await Question.countDocuments(filter);
    const totalPages = Math.ceil(totalQuestions / limit);

    const questions = await Question.find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.json({
      questions,
      totalQuestions,
      totalPages,
      currentPage: page,
      limit
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function getQuestionById(req, res) {
  try {
    const { id } = req.params;
    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    return res.json({ question });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function addQuestion(req, res) {
  const { 
    questionText, 
    options, 
    correctOptionIndex, 
    correctAnswer, 
    subject, 
    chapter, 
    topic, 
    difficulty, 
    marks, 
    source 
  } = req.body;

  if (!questionText || !options || options.length === 0 || !subject || !chapter) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const answerIndexMap = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
  const answerIndexToLetter = ['A', 'B', 'C', 'D'];

  let finalIndex = Number(correctOptionIndex);
  let finalLetter = correctAnswer;

  if (finalLetter && finalIndex === undefined) {
    finalIndex = answerIndexMap[finalLetter.toUpperCase()];
  } else if (finalIndex !== undefined && !finalLetter) {
    finalLetter = answerIndexToLetter[finalIndex];
  }

  if (finalIndex === undefined || finalIndex < 0 || finalIndex > 3) {
    return res.status(400).json({ error: 'Invalid correct answer / index' });
  }

  try {
    const question = await Question.create({
      questionText,
      options,
      correctOptionIndex: finalIndex,
      correctAnswer: finalLetter,
      subject,
      chapter,
      topic,
      difficulty: difficulty || 'Medium',
      marks: Number(marks) || 4,
      source: source || 'Manual Entry',
      status: 'DRAFT',
      submittedBy: req.teacher.uid
    });
    return res.status(201).json({ message: 'Question added successfully', question });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function updateQuestion(req, res) {
  const { id } = req.params;
  const { 
    questionText, 
    options, 
    correctOptionIndex, 
    correctAnswer, 
    subject, 
    chapter, 
    topic, 
    difficulty, 
    marks, 
    source 
  } = req.body;

  try {
    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    if (questionText) question.questionText = questionText;
    if (options) question.options = options;
    if (subject) question.subject = subject;
    if (chapter) question.chapter = chapter;
    if (topic !== undefined) question.topic = topic;
    if (difficulty) question.difficulty = difficulty;
    if (marks !== undefined) question.marks = Number(marks);
    if (source !== undefined) question.source = source;

    const answerIndexMap = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
    const answerIndexToLetter = ['A', 'B', 'C', 'D'];

    if (correctAnswer && correctOptionIndex === undefined) {
      question.correctAnswer = correctAnswer;
      question.correctOptionIndex = answerIndexMap[correctAnswer.toUpperCase()];
    } else if (correctOptionIndex !== undefined && !correctAnswer) {
      question.correctOptionIndex = Number(correctOptionIndex);
      question.correctAnswer = answerIndexToLetter[Number(correctOptionIndex)];
    } else if (correctOptionIndex !== undefined && correctAnswer) {
      question.correctOptionIndex = Number(correctOptionIndex);
      question.correctAnswer = correctAnswer;
    }

    await question.save();
    return res.json({ message: 'Question updated successfully', question });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function deleteQuestion(req, res) {
  const { id } = req.params;
  try {
    const result = await Question.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }
    return res.json({ message: 'Question deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function getStatistics(req, res) {
  try {
    const total = await Question.countDocuments({});
    const draft = await Question.countDocuments({ status: 'DRAFT' });
    const underReview = await Question.countDocuments({ status: 'UNDER_REVIEW' });
    const approved = await Question.countDocuments({ status: 'APPROVED' });
    const active = await Question.countDocuments({ status: 'ACTIVE' });
    const retired = await Question.countDocuments({ status: 'RETIRED' });
    
    return res.json({ total, draft, underReview, approved, active, retired });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// Lifecycle State Transitions
async function submitReview(req, res) {
  try {
    const { id } = req.params;
    const question = await Question.findById(id);
    if (!question) return res.status(404).json({ error: 'Question not found' });
    
    question.status = 'UNDER_REVIEW';
    question.submittedAt = new Date();
    question.submittedBy = req.teacher.uid;
    
    await question.save();
    return res.json({ message: 'Question submitted for review', question });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

async function approveQuestion(req, res) {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const question = await Question.findById(id);
    if (!question) return res.status(404).json({ error: 'Question not found' });
    
    question.status = 'APPROVED';
    question.approvedAt = new Date();
    question.approvedBy = req.teacher.uid;
    if (comment) {
      question.reviewComment = comment;
    }
    
    await question.save();
    return res.json({ message: 'Question approved successfully', question });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

async function rejectQuestion(req, res) {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const question = await Question.findById(id);
    if (!question) return res.status(404).json({ error: 'Question not found' });
    
    question.status = 'DRAFT';
    question.reviewedAt = new Date();
    question.reviewedBy = req.teacher.uid;
    if (comment) {
      question.reviewComment = comment;
    }
    
    await question.save();
    return res.json({ message: 'Question returned to DRAFT (Needs Correction)', question });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

async function activateQuestion(req, res) {
  try {
    const { id } = req.params;
    const question = await Question.findById(id);
    if (!question) return res.status(404).json({ error: 'Question not found' });
    
    question.status = 'ACTIVE';
    question.activatedAt = new Date();
    question.activatedBy = req.teacher.uid;
    
    await question.save();
    return res.json({ message: 'Question activated successfully', question });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

async function retireQuestion(req, res) {
  try {
    const { id } = req.params;
    const question = await Question.findById(id);
    if (!question) return res.status(404).json({ error: 'Question not found' });
    
    question.status = 'RETIRED';
    question.retiredAt = new Date();
    question.retiredBy = req.teacher.uid;
    
    await question.save();
    return res.json({ message: 'Question retired successfully', question });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

async function generatePaper(req, res) {
  try {
    const { subject, chapter, topic, difficulty, marks, questionCount } = req.body;

    if (!subject) {
      return res.status(400).json({ error: 'subject is required' });
    }
    const countVal = parseInt(questionCount);
    if (!countVal || countVal <= 0) {
      return res.status(400).json({ error: 'questionCount must be a positive integer' });
    }

    const match = {
      status: { $in: ['APPROVED', 'ACTIVE'] },
      subject: subject
    };

    if (chapter) match.chapter = chapter;
    if (topic) match.topic = topic;
    if (difficulty) match.difficulty = difficulty;
    if (marks !== undefined && marks !== null) match.marks = Number(marks);

    const availableCount = await Question.countDocuments(match);
    if (availableCount < countVal) {
      return res.status(400).json({
        error: `Insufficient questions available. Requested: ${countVal}, Available APPROVED/ACTIVE: ${availableCount}`
      });
    }

    const questions = await Question.aggregate([
      { $match: match },
      { $sample: { size: countVal } }
    ]);

    return res.json({
      message: 'Exam paper generated successfully',
      subject,
      chapter,
      topic,
      difficulty,
      marks,
      questionCount: countVal,
      questions
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { 
  verifyToken, 
  getQuestions, 
  getQuestionById,
  addQuestion, 
  updateQuestion, 
  deleteQuestion, 
  getStatistics,
  submitReview,
  approveQuestion,
  rejectQuestion,
  activateQuestion,
  retireQuestion,
  generatePaper
};
