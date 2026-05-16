const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');

router.use(auth);
router.post('/chat', role('EMPLOYEE'), aiController.chat);

module.exports = router;
