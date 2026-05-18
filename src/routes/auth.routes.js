const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { body } = require('express-validator');
const validate = require('../middleware/validate.middleware');
const auth = require('../middleware/auth.middleware');

router.post('/register', [
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty(),
  validate
], authController.register);

router.post('/login', [
  body('email').isEmail(),
  body('password').exists(),
  validate
], authController.login);

router.post('/refresh', [
  body('token').notEmpty().withMessage('token is required'),
  validate
], authController.refresh);

router.get('/me', auth, authController.me);

module.exports = router;
