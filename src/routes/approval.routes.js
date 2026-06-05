const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approval.controller');
const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');

router.use(auth);

// Vendor list (managers need this to know who is available)
router.get('/vendors', role(['MANAGER', 'ADMIN', 'HR']), approvalController.getVendors);

// Manager routes
router.get('/pending', role(['MANAGER', 'ADMIN']), approvalController.getPendingApprovals);
router.get('/team',    role(['MANAGER', 'ADMIN']), approvalController.getTeamBookings);
router.post('/:id/approve', role(['MANAGER', 'ADMIN', 'HR']), approvalController.approveBooking);
router.post('/:id/reject',  role(['MANAGER', 'ADMIN', 'HR']), approvalController.rejectBooking);

// HR routes
router.get('/hr/pending',         role(['HR', 'ADMIN']), approvalController.getHrPendingApprovals);
router.post('/:id/assign-vendor', role(['HR', 'ADMIN']), approvalController.assignVendorToBooking);

module.exports = router;
