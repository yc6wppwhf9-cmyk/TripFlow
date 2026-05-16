const prisma = require('../config/db');
const emailService = require('./email.service');
const whatsappService = require('./whatsapp.service');

exports.submitRequest = async (bookingId) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { employee: { include: { user: true, manager: true } } }
  });

  if (!booking) throw new Error('Booking not found');

  // Notify Manager and HR
  const hrAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  
  await emailService.sendApprovalRequest(
    booking.employee.manager.email,
    hrAdmin ? hrAdmin.email : process.env.FROM_EMAIL,
    booking.employee.user.name,
    booking.details
  );

  return booking;
};

exports.approve = async (bookingId, vendorId) => {
  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: { 
      stage: 'PENDING_VENDOR',
      vendorId: vendorId
    },
    include: { vendor: { include: { user: true } } }
  });

  // Notify Vendor
  await emailService.sendVendorRequest(booking.vendor.user.email, booking.details);

  return booking;
};

exports.reject = async (bookingId, reason) => {
  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: { 
      stage: 'REJECTED',
      rejectionReason: reason
    },
    include: { employee: { include: { user: true } } }
  });

  // Notify Employee
  await emailService.sendRejectionNotice(booking.employee.user.email, reason);

  return booking;
};

exports.complete = async (bookingId, ticketUrl, pnr) => {
  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: { 
      stage: 'COMPLETED',
      ticketUrl: ticketUrl,
      pnr: pnr
    },
    include: { employee: { include: { user: true } } }
  });

  const hrAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

  // Notify Employee and HR
  await emailService.sendTicketConfirmation(
    booking.employee.user.email,
    hrAdmin ? hrAdmin.email : process.env.FROM_EMAIL,
    ticketUrl,
    pnr
  );

  // WhatsApp Notification
  // Assuming user model has a phone field or it's in details
  const phoneNumber = booking.employee.user.phone || ""; // Need to add phone to User model or handle it
  if (phoneNumber) {
    await whatsappService.sendTicketUploaded(phoneNumber, pnr);
  }

  return booking;
};
