const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');

router.use(auth);

router.get('/mine', role('EMPLOYEE'), bookingController.getMyBookings);
router.get('/suggestions', role('EMPLOYEE'), bookingController.getSuggestions);
router.post('/', role('EMPLOYEE'), bookingController.createBooking);

module.exports = router;
