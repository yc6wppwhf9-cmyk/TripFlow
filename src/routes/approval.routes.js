const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approval.controller');
const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');

router.use(auth);
router.use(role(['MANAGER', 'ADMIN']));

router.get('/vendors', approvalController.getVendors);
router.get('/pending', approvalController.getPendingApprovals);
router.get('/team', approvalController.getTeamBookings);
router.post('/:id/approve', approvalController.approveBooking);
router.post('/:id/reject', approvalController.rejectBooking);

module.exports = router;
