const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const bookingController = require('../controllers/booking.controller');
const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');

router.use(auth);

router.get('/mine',        bookingController.getMyBookings);
router.get('/trip-plan',   bookingController.getTripPlan);
router.get('/suggestions', bookingController.getSuggestions);
router.get('/:id',         bookingController.getBookingById);
router.delete('/:id',      bookingController.deleteBooking);

router.post('/', role('EMPLOYEE'), [
  body('type')
    .isIn(['FLIGHT', 'HOTEL', 'TRAIN', 'CAB', 'MEAL'])
    .withMessage('type must be FLIGHT, HOTEL, TRAIN, CAB, or MEAL'),

  body('cost')
    .isFloat({ min: 0.01 })
    .withMessage('cost must be a positive number'),

  body('details.destination')
    .notEmpty()
    .withMessage('details.destination is required'),

  // origin required for everything except MEAL
  body('details.origin')
    .if(body('type').not().equals('MEAL'))
    .notEmpty()
    .withMessage('details.origin is required for FLIGHT, HOTEL, TRAIN, and CAB bookings'),

  body('details.date')
    .isISO8601()
    .withMessage('details.date must be a valid ISO 8601 date')
    .custom(value => {
      if (new Date(value) <= new Date()) throw new Error('details.date must be a future date');
      return true;
    }),

  // trainClass: optional, only relevant for TRAIN bookings
  body('details.trainClass')
    .optional()
    .isIn(['1A', 'FC', '2A', '3A', 'SL', 'CC', '2S'])
    .withMessage('details.trainClass must be one of: 1A, FC, 2A, 3A, SL, CC, 2S'),

  // durationDays: required for MEAL, optional otherwise
  body('details.durationDays')
    .if(body('type').equals('MEAL'))
    .notEmpty()
    .withMessage('details.durationDays is required for MEAL bookings')
    .isInt({ min: 1, max: 20 })
    .withMessage('details.durationDays must be between 1 and 20'),

  // isForeignTravel: optional boolean, triggers 45-day advance rule
  body('details.isForeignTravel')
    .optional()
    .isBoolean()
    .withMessage('details.isForeignTravel must be true or false'),

  // urgencyReason: employee-provided justification to bypass the 30-day advance rule
  body('details.urgencyReason')
    .optional()
    .isString()
    .isLength({ min: 10 })
    .withMessage('details.urgencyReason must be at least 10 characters explaining the business need'),

  validate
], bookingController.createBooking);

module.exports = router;
