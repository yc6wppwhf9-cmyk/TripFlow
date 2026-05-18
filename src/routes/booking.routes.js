const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const bookingController = require('../controllers/booking.controller');
const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');

router.use(auth);

router.get('/mine',      bookingController.getMyBookings);
router.get('/trip-plan', bookingController.getTripPlan);
router.get('/suggestions', bookingController.getSuggestions);
router.get('/:id',       bookingController.getBookingById);
router.delete('/:id',    bookingController.deleteBooking);

router.post('/', role('EMPLOYEE'), [
  body('type').isIn(['FLIGHT', 'HOTEL', 'TRAIN', 'CAB']).withMessage('type must be FLIGHT, HOTEL, TRAIN, or CAB'),
  body('cost').isFloat({ min: 0.01 }).withMessage('cost must be a positive number'),
  body('details.origin').notEmpty().withMessage('details.origin is required'),
  body('details.destination').notEmpty().withMessage('details.destination is required'),
  body('details.date')
    .isISO8601().withMessage('details.date must be a valid ISO 8601 date')
    .custom((value) => {
      if (new Date(value) < new Date()) throw new Error('details.date must be a future date');
      return true;
    }),
  validate
], bookingController.createBooking);

module.exports = router;
