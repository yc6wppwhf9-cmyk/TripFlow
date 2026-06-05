const prisma = require('../config/db');
const { userSelect } = require('../config/selects');
const emailService = require('./email.service');
const whatsappService = require('./whatsapp.service');
const { STAGE } = require('../constants/booking');

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

// Manager approves → moves to PENDING_HR
exports.approve = async (bookingId) => {
  const { booking, hrUsers } = await prisma.$transaction(async (tx) => {
    const updated = await tx.booking.update({
      where: { id: bookingId },
      data:  { stage: STAGE.PENDING_HR },
      include: { employee: { include: { user: userSelect } } }
    });

    const hrs = await tx.user.findMany({ where: { role: 'HR' } });

    await tx.notification.createMany({
      data: [
        {
          userId:  updated.employee.userId,
          message: `Your travel request (${updated.details?.origin || ''} → ${updated.details?.destination || ''}) has been approved by your manager and is pending vendor assignment.`
        },
        ...hrs.map(hr => ({
          userId:  hr.id,
          message: `New booking pending vendor assignment: ${updated.details?.origin || ''} → ${updated.details?.destination || ''} (${updated.type}, ₹${updated.cost || 'TBD'})`
        }))
      ]
    });

    return { booking: updated, hrUsers: hrs };
  });

  // Fire emails after the transaction commits — failures here don't corrupt DB state
  await Promise.all([
    emailService.sendManagerApprovalNotice(booking.employee.user.email, booking),
    emailService.sendHrNotification(hrUsers, booking),
  ]);

  return booking;
};

// HR assigns vendor → moves to PENDING_VENDOR
exports.assignVendor = async (bookingId, vendorId) => {
  const booking = await prisma.$transaction(async (tx) => {
    const updated = await tx.booking.update({
      where: { id: bookingId },
      data:  { stage: STAGE.PENDING_VENDOR, vendorId },
      include: {
        employee: { include: { user: userSelect } },
        vendor:   { include: { user: userSelect } }
      }
    });

    await tx.notification.create({
      data: {
        userId:  updated.employee.userId,
        message: `Your booking (${updated.details?.origin || ''} → ${updated.details?.destination || ''}) has been assigned to ${updated.vendor?.companyName || 'a vendor'} and is being processed.`
      }
    });

    return updated;
  });

  if (booking.vendor) {
    await emailService.sendVendorRequest(booking.vendor.user.email, booking.details);
  }

  return booking;
};

exports.reject = async (bookingId, reason) => {
  const booking = await prisma.$transaction(async (tx) => {
    const updated = await tx.booking.update({
      where: { id: bookingId },
      data:  { stage: STAGE.REJECTED, rejectionReason: reason },
      include: { employee: { include: { user: userSelect } } }
    });

    await tx.notification.create({
      data: {
        userId:  updated.employee.userId,
        message: `Your travel request (${updated.details?.origin || ''} → ${updated.details?.destination || ''}) was rejected. Reason: ${reason || 'No reason provided.'}`
      }
    });

    return updated;
  });

  await emailService.sendRejectionNotice(booking.employee.user.email, reason);

  return booking;
};

exports.complete = async (bookingId, ticketUrl, pnr) => {
  const booking = await prisma.$transaction(async (tx) => {
    const updated = await tx.booking.update({
      where: { id: bookingId },
      data:  { stage: STAGE.COMPLETED, ticketUrl, pnr },
      include: { employee: { include: { user: userSelect } } }
    });

    await tx.notification.create({
      data: {
        userId:  updated.employee.userId,
        message: `Your ticket is ready! ${pnr ? `PNR: ${pnr}. ` : ''}Trip: ${updated.details?.origin || ''} → ${updated.details?.destination || ''}.`
      }
    });

    return updated;
  });

  const hrAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

  await Promise.all([
    emailService.sendTicketConfirmation(
      booking.employee.user.email,
      hrAdmin ? hrAdmin.email : process.env.FROM_EMAIL,
      ticketUrl,
      pnr
    ),
    booking.employee.user.phone
      ? whatsappService.sendTicketUploaded(booking.employee.user.phone, pnr)
      : Promise.resolve()
  ]);

  return booking;
};
