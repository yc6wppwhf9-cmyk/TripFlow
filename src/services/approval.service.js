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

// Manager approves → moves to PENDING_HR (no vendor yet)
exports.approve = async (bookingId) => {
  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: { stage: 'PENDING_HR' },
    include: {
      employee: { include: { user: userSelect } }
    }
  });

  await prisma.notification.create({
    data: {
      userId:  booking.employee.userId,
      message: `Your travel request (${booking.details?.origin || ''} → ${booking.details?.destination || ''}) has been approved by your manager and is pending vendor assignment.`
    }
  });

  const hrUsers = await prisma.user.findMany({ where: { role: 'HR' } });
  for (const hr of hrUsers) {
    await prisma.notification.create({
      data: {
        userId:  hr.id,
        message: `New booking pending vendor assignment: ${booking.details?.origin || ''} → ${booking.details?.destination || ''} (${booking.type}, ₹${booking.cost || 'TBD'})`
      }
    });
  }

  await emailService.sendHrNotification(hrUsers, booking);

  return booking;
};

// HR assigns vendor → moves to PENDING_VENDOR
exports.assignVendor = async (bookingId, vendorId) => {
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
      message: `Your booking (${booking.details?.origin || ''} → ${booking.details?.destination || ''}) has been assigned to ${booking.vendor?.companyName || 'a vendor'} and is being processed.`
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
