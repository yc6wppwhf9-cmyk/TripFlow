const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
exports.resend = resend;

exports.sendEmail = async (to, subject, text, html) => {
  if (!process.env.RESEND_API_KEY) {
    console.log(`Email not configured. Would have sent to ${to}: ${subject}`);
    return;
  }
  try {
    await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to,
      subject,
      ...(html ? { html } : { text }),
    });
    console.log(`Email sent to ${to}`);
  } catch (err) {
    console.error(`Failed to send email to ${to}:`, err.message);
  }
};

exports.sendApprovalRequest = async (managerEmail, hrEmail, employeeName, bookingDetails) => {
  const subject = `Travel Approval Request: ${employeeName}`;
  const text = `A new travel request has been submitted by ${employeeName}.\nDetails: ${JSON.stringify(bookingDetails)}`;
  await exports.sendEmail(managerEmail, subject, text);
  await exports.sendEmail(hrEmail, subject, text);
};

exports.sendVendorRequest = async (vendorEmail, bookingDetails) => {
  const subject = `New Travel Booking Request`;
  const text = `Please process the following booking: ${JSON.stringify(bookingDetails)}`;
  await exports.sendEmail(vendorEmail, subject, text);
};

exports.sendTicketConfirmation = async (employeeEmail, hrEmail, ticketUrl, pnr) => {
  const subject = `Your Travel Ticket is Ready`;
  const text = `Your booking is confirmed.\nPNR: ${pnr}\nTicket: ${ticketUrl}`;
  await exports.sendEmail(employeeEmail, subject, text);
  await exports.sendEmail(hrEmail, subject, text);
};

exports.sendRejectionNotice = async (employeeEmail, reason) => {
  const subject = `Travel Request Rejected`;
  const text = `Your travel request has been rejected.\nReason: ${reason}`;
  await exports.sendEmail(employeeEmail, subject, text);
};

exports.sendManagerApprovalNotice = async (employeeEmail, booking) => {
  const details = booking.details || {};
  const route = details.origin && details.destination ? `${details.origin} → ${details.destination}` : 'your trip';
  const subject = `Manager Approved: Your travel request for ${route}`;
  const text = `Good news! Your manager has approved your travel request.\n\nRoute: ${route}\nType: ${booking.type}\nCost: ₹${booking.cost || 'TBD'}\n\nYour request is now with HR for vendor assignment. You'll receive another update once your ticket is issued.\n\nLog in to TripFlow to track your booking status.`;
  await exports.sendEmail(employeeEmail, subject, text);
};

exports.sendHrNotification = async (hrUsers, booking) => {
  if (!hrUsers || !hrUsers.length) return;
  const details = booking.details || {};
  const route = details.origin && details.destination ? `${details.origin} → ${details.destination}` : 'Travel request';
  const subject = `Action Required: Assign Vendor for ${route}`;
  const text = `A travel booking has been approved by the manager and requires vendor assignment.\n\nEmployee: ${booking.employee?.user?.name || 'N/A'}\nRoute: ${route}\nType: ${booking.type}\nCost: ₹${booking.cost || 'TBD'}\n\nPlease log in to TripFlow and assign a vendor.`;
  for (const hr of hrUsers) {
    await exports.sendEmail(hr.email, subject, text);
  }
};
