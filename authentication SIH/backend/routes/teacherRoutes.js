const router = require('express').Router();
const teacherController = require('../controllers/teacherController');
const teacherAuthMiddleware = require('../utils/teacherAuthMiddleware');

router.post('/verify-token', teacherController.verifyToken);
router.get('/questions', teacherAuthMiddleware, teacherController.getQuestions);
router.get('/questions/:id', teacherAuthMiddleware, teacherController.getQuestionById);
router.post('/questions', teacherAuthMiddleware, teacherController.addQuestion);
router.put('/questions/:id', teacherAuthMiddleware, teacherController.updateQuestion);
router.delete('/questions/:id', teacherAuthMiddleware, teacherController.deleteQuestion);
router.get('/statistics', teacherAuthMiddleware, teacherController.getStatistics);

// Question Workflow Lifecycle Transitions
router.post('/questions/:id/submit-review', teacherAuthMiddleware, teacherController.submitReview);
router.post('/questions/:id/approve', teacherAuthMiddleware, teacherController.approveQuestion);
router.post('/questions/:id/reject', teacherAuthMiddleware, teacherController.rejectQuestion);
router.post('/questions/:id/activate', teacherAuthMiddleware, teacherController.activateQuestion);
router.post('/questions/:id/retire', teacherAuthMiddleware, teacherController.retireQuestion);

// Paper Generation Endpoint
router.post('/generate-paper', teacherAuthMiddleware, teacherController.generatePaper);

module.exports = router;
