const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');

router.use(auth);

// HR + ADMIN can view data
router.get('/bookings', role(['ADMIN', 'HR']), adminController.getAllBookings);
router.get('/stats', role(['ADMIN', 'HR']), adminController.getStats);
router.get('/users', role(['ADMIN', 'HR']), adminController.getAllUsers);
router.get('/employees', role(['ADMIN', 'HR']), adminController.getEmployees);
router.get('/vendors', role(['ADMIN', 'HR']), adminController.getVendors);
router.get('/policies', role(['ADMIN', 'HR']), adminController.getPolicies);

// ADMIN + HR — user & employee management
router.post('/users', role(['ADMIN', 'HR']), adminController.createUser);
router.post('/employees', role(['ADMIN', 'HR']), adminController.createEmployee);
router.post('/policies', role(['ADMIN', 'HR']), adminController.createPolicy);
router.post('/policies/assign', role(['ADMIN', 'HR']), adminController.assignPolicy);
router.post('/policies/analyze', role(['ADMIN', 'HR']), adminController.analyzePolicy);
router.post('/policy', role('ADMIN'), adminController.updatePolicy);

module.exports = router;
