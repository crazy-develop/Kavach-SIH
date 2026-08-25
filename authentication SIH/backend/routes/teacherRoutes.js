const router = require('express').Router();
const teacherController = require('../controllers/teacherController');
const teacherAuthMiddleware = require('../utils/teacherAuthMiddleware');

router.post('/verify-token', teacherController.verifyToken);
router.get('/questions', teacherAuthMiddleware, teacherController.getQuestions);
router.post('/questions', teacherAuthMiddleware, teacherController.addQuestion);
router.put('/questions/:id', teacherAuthMiddleware, teacherController.updateQuestion);
router.delete('/questions/:id', teacherAuthMiddleware, teacherController.deleteQuestion);
router.get('/statistics', teacherAuthMiddleware, teacherController.getStatistics);

module.exports = router;
