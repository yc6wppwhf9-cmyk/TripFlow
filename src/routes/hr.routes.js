const express = require('express');
const router = express.Router();
const hrController = require('../controllers/hr.controller');
const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');

router.use(auth);

router.get('/bookings', role(['HR', 'ADMIN']), hrController.getAllBookings);
router.get('/dept-spend', role(['HR', 'ADMIN']), hrController.getDeptSpend);
router.get('/policy-compliance', role(['HR', 'ADMIN']), hrController.getPolicyCompliance);
router.get('/monthly-trend', role(['HR', 'ADMIN']), hrController.getMonthlyTrend);
router.get('/management-stats', role(['HR', 'ADMIN']), hrController.getManagementStats);

module.exports = router;
