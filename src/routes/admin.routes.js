const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');

router.use(auth);
router.use(role('ADMIN'));

router.get('/bookings', adminController.getAllBookings);
router.get('/stats', adminController.getStats);
router.post('/policy', adminController.updatePolicy);
router.get('/employees', adminController.getEmployees);
router.post('/employees', adminController.createEmployee);
router.get('/vendors', adminController.getVendors);
router.post('/policies/analyze', adminController.analyzePolicy);

module.exports = router;
