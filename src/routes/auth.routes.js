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

router.post('/logout', auth, authController.logout);

router.post('/forgot-password', [
  body('email').isEmail().withMessage('Valid email is required'),
  validate
], authController.forgotPassword);

router.post('/reset-password', [
  body('token').notEmpty().withMessage('token is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  validate
], authController.resetPassword);

router.get('/me', auth, authController.me);

module.exports = router;
