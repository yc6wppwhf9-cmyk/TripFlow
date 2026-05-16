const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendor.controller');
const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const upload = require('../middleware/upload.middleware');

router.use(auth);
router.use(role('VENDOR'));

router.get('/requests', vendorController.getVendorRequests);
router.get('/completed', vendorController.getCompletedBookings);
router.post('/:id/upload-ticket', upload.single('ticket'), vendorController.uploadTicket);

module.exports = router;
