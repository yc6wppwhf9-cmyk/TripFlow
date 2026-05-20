const prisma = require('../config/db');
const { userSelect } = require('../config/selects');
const emailService = require('./email.service');
const whatsappService = require('./whatsapp.service');

exports.submitRequest = async (bookingId) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { employee: { include: { user: userSelect, manager: true } } }
  });

  if (!booking) throw new Error('Booking not found');

  // Notify Manager and HR
  const hrAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

  if (booking.employee.manager) {
    await emailService.sendApprovalRequest(
      booking.employee.manager.email,
      hrAdmin ? hrAdmin.email : process.env.FROM_EMAIL,
      booking.employee.user.name,
      booking.details
    );
  }

  return booking;
};

exports.approve = async (bookingId, vendorId) => {
  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: { stage: 'PENDING_VENDOR', vendorId },
    include: {
      employee: { include: { user: userSelect } },
      vendor:   { include: { user: userSelect } }
    }
  });

  await prisma.notification.create({
    data: {
      userId:  booking.employee.userId,
      message: `Your travel request (${booking.details?.origin || ''} → ${booking.details?.destination || ''}) has been approved and sent to the travel desk.`
    }
  });

  if (booking.vendor) {
    await emailService.sendVendorRequest(booking.vendor.user.email, booking.details);
  }

  return booking;
};

exports.reject = async (bookingId, reason) => {
  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: { stage: 'REJECTED', rejectionReason: reason },
    include: { employee: { include: { user: userSelect } } }
  });

  await prisma.notification.create({
    data: {
      userId:  booking.employee.userId,
      message: `Your travel request (${booking.details?.origin || ''} → ${booking.details?.destination || ''}) was rejected. Reason: ${reason || 'No reason provided.'}`
    }
  });

  await emailService.sendRejectionNotice(booking.employee.user.email, reason);

  return booking;
};

exports.complete = async (bookingId, ticketUrl, pnr) => {
  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: { stage: 'COMPLETED', ticketUrl, pnr },
    include: { employee: { include: { user: userSelect } } }
  });

  await prisma.notification.create({
    data: {
      userId:  booking.employee.userId,
      message: `Your ticket is ready! ${pnr ? `PNR: ${pnr}. ` : ''}Trip: ${booking.details?.origin || ''} → ${booking.details?.destination || ''}.`
    }
  });

  const hrAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

  await emailService.sendTicketConfirmation(
    booking.employee.user.email,
    hrAdmin ? hrAdmin.email : process.env.FROM_EMAIL,
    ticketUrl,
    pnr
  );

  const phoneNumber = booking.employee.user.phone || '';
  if (phoneNumber) {
    await whatsappService.sendTicketUploaded(phoneNumber, pnr);
  }

  return booking;
};
