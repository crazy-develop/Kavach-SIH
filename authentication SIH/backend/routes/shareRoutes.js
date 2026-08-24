const router = require('express').Router();
const shareController = require('../controllers/shareController');
const documentController = require('../controllers/documentController');
const authMiddleware = require('../utils/authMiddleware');

router.post('/submit', authMiddleware, shareController.submitShare);
router.get('/documents', authMiddleware, documentController.list);
router.post('/document/:id/decrypt', authMiddleware, documentController.decrypt);

module.exports = router;
