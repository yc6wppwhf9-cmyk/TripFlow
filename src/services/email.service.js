const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
exports.resend = resend;

exports.sendEmail = async (to, subject, text) => {
  if (!process.env.RESEND_API_KEY) {
    console.log(`Email not configured. Would have sent to ${to}: ${subject}`);
    return;
  }
  try {
    await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to,
      subject,
      text,
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
