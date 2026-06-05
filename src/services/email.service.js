const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;
exports.resend = resend;

// ── Shared HTML wrapper ──────────────────────────────────────────────────────
function emailWrapper(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background:#003d9b;padding:24px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td><span style="font-size:1.3rem;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">TripDesk</span></td>
              <td align="right"><span style="font-size:0.72rem;font-weight:600;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:0.06em;">Corporate Travel</span></td>
            </tr>
          </table>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          ${bodyHtml}
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f4f6fb;padding:20px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:0.72rem;color:#9ca3af;text-align:center;">This is an automated message from TripDesk. Do not reply to this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function pill(label, color, bg) {
  return `<span style="display:inline-block;background:${bg};color:${color};font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;padding:3px 10px;border-radius:20px;">${label}</span>`;
}

function infoRow(label, value) {
  return `<tr>
    <td style="padding:6px 0;font-size:0.8rem;color:#6b7280;font-weight:600;white-space:nowrap;padding-right:16px;">${label}</td>
    <td style="padding:6px 0;font-size:0.8rem;color:#111827;font-weight:700;">${value}</td>
  </tr>`;
}

function ctaButton(label, url) {
  return `<table cellpadding="0" cellspacing="0" style="margin-top:24px;">
    <tr><td style="background:#003d9b;border-radius:8px;padding:12px 28px;">
      <a href="${url}" style="color:#ffffff;font-size:0.88rem;font-weight:700;text-decoration:none;display:block;">${label} →</a>
    </td></tr>
  </table>`;
}

const APP_URL = process.env.APP_URL || 'https://tripflow-dqvp.onrender.com';

// ── Core sender ──────────────────────────────────────────────────────────────
exports.sendEmail = async (to, subject, text, html) => {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[email] not configured — would send to ${to}: ${subject}`);
    return;
  }
  try {
    await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to,
      subject,
      ...(html ? { html } : { text }),
    });
    console.log(`[email] sent to ${to}: ${subject}`);
  } catch (err) {
    console.error(`[email] failed to ${to}:`, err.message);
  }
};

// ── 1. New request submitted → manager + HR CC ───────────────────────────────
exports.sendApprovalRequest = async (managerEmail, hrEmail, employeeName, bookingDetails) => {
  const d = bookingDetails || {};
  const route = d.origin && d.destination ? `${d.origin} → ${d.destination}` : 'Route TBD';
  const subject = `[Action Required] Travel Request from ${employeeName}`;
  const html = emailWrapper(subject, `
    <h2 style="margin:0 0 4px;font-size:1.15rem;font-weight:800;color:#111827;">New Travel Request</h2>
    <p style="margin:0 0 20px;font-size:0.85rem;color:#6b7280;">Submitted by <strong>${employeeName}</strong> — awaiting your approval.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:20px;">
      <tr style="background:#f9fafb;">
        <td style="padding:14px 16px;" colspan="2">
          ${pill('Pending Approval', '#92400e', '#fef3c7')}
          <span style="font-size:0.95rem;font-weight:800;color:#003d9b;margin-left:8px;">${route}</span>
        </td>
      </tr>
      <tr><td style="padding:0 16px 16px;" colspan="2">
        <table cellpadding="0" cellspacing="0" style="width:100%;margin-top:12px;">
          ${d.type ? infoRow('Type', d.type) : ''}
          ${d.travelDate ? infoRow('Date', d.travelDate) : ''}
          ${d.cost ? infoRow('Est. Cost', `₹${Number(d.cost).toLocaleString('en-IN')}`) : ''}
          ${d.purpose ? infoRow('Purpose', d.purpose) : ''}
        </table>
      </td></tr>
    </table>
    ${ctaButton('Review Request in TripDesk', `${APP_URL}/manager.html`)}
  `);
  await exports.sendEmail(managerEmail, subject, undefined, html);
};

// ── 2. HR notified to assign vendor ─────────────────────────────────────────
exports.sendHrNotification = async (hrUsers, booking) => {
  if (!hrUsers || !hrUsers.length) return;
  const d = booking.details || {};
  const route = d.origin && d.destination ? `${d.origin} → ${d.destination}` : 'Route TBD';
  const subject = `[Action Required] Assign Vendor — ${route}`;
  const html = emailWrapper(subject, `
    <h2 style="margin:0 0 4px;font-size:1.15rem;font-weight:800;color:#111827;">Vendor Assignment Needed</h2>
    <p style="margin:0 0 20px;font-size:0.85rem;color:#6b7280;">Manager has approved this booking. Please assign a vendor to proceed.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:20px;">
      <tr style="background:#f9fafb;">
        <td style="padding:14px 16px;" colspan="2">
          ${pill('Pending Vendor', '#5b21b6', '#ede9fe')}
          <span style="font-size:0.95rem;font-weight:800;color:#003d9b;margin-left:8px;">${route}</span>
        </td>
      </tr>
      <tr><td style="padding:0 16px 16px;" colspan="2">
        <table cellpadding="0" cellspacing="0" style="width:100%;margin-top:12px;">
          ${infoRow('Employee', booking.employee?.user?.name || 'N/A')}
          ${infoRow('Type', booking.type || 'N/A')}
          ${booking.cost ? infoRow('Cost', `₹${Number(booking.cost).toLocaleString('en-IN')}`) : ''}
          ${d.travelDate ? infoRow('Travel Date', d.travelDate) : ''}
        </table>
      </td></tr>
    </table>
    ${ctaButton('Assign Vendor in TripDesk', `${APP_URL}/hr.html`)}
  `);
  await Promise.all(hrUsers.map(hr => exports.sendEmail(hr.email, subject, undefined, html)));
};

// ── 3. Employee: manager approved ────────────────────────────────────────────
exports.sendManagerApprovalNotice = async (employeeEmail, booking) => {
  const d = booking.details || {};
  const route = d.origin && d.destination ? `${d.origin} → ${d.destination}` : 'your trip';
  const subject = `✓ Manager Approved — ${route}`;
  const html = emailWrapper(subject, `
    <h2 style="margin:0 0 4px;font-size:1.15rem;font-weight:800;color:#111827;">Your request has been approved!</h2>
    <p style="margin:0 0 20px;font-size:0.85rem;color:#6b7280;">Your manager has approved your travel request. HR is now assigning a vendor to issue your ticket.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:20px;">
      <tr style="background:#f0fdf4;">
        <td style="padding:14px 16px;" colspan="2">
          ${pill('Manager Approved', '#065f46', '#d1fae5')}
          <span style="font-size:0.95rem;font-weight:800;color:#003d9b;margin-left:8px;">${route}</span>
        </td>
      </tr>
      <tr><td style="padding:0 16px 16px;" colspan="2">
        <table cellpadding="0" cellspacing="0" style="width:100%;margin-top:12px;">
          ${infoRow('Type', booking.type || 'N/A')}
          ${booking.cost ? infoRow('Approved Cost', `₹${Number(booking.cost).toLocaleString('en-IN')}`) : ''}
          ${d.travelDate ? infoRow('Travel Date', d.travelDate) : ''}
        </table>
      </td></tr>
    </table>
    <p style="margin:0 0 20px;font-size:0.83rem;color:#6b7280;line-height:1.6;">
      <strong>What's next?</strong> HR is assigning a travel vendor to process your booking. You'll receive another email once your ticket is ready with your PNR.
    </p>
    ${ctaButton('Track Your Request', `${APP_URL}/mytrips.html`)}
  `);
  await exports.sendEmail(employeeEmail, subject, undefined, html);
};

// ── 4. Vendor assigned → employee notified ───────────────────────────────────
exports.sendVendorAssignedNotice = async (employeeEmail, booking) => {
  const d = booking.details || {};
  const route = d.origin && d.destination ? `${d.origin} → ${d.destination}` : 'your trip';
  const vendorName = booking.vendor?.companyName || 'our travel vendor';
  const subject = `Vendor Assigned — ${route}`;
  const html = emailWrapper(subject, `
    <h2 style="margin:0 0 4px;font-size:1.15rem;font-weight:800;color:#111827;">A vendor has been assigned to your booking</h2>
    <p style="margin:0 0 20px;font-size:0.85rem;color:#6b7280;"><strong>${vendorName}</strong> is now processing your booking. Your ticket will be issued shortly.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:20px;">
      <tr style="background:#eff6ff;">
        <td style="padding:14px 16px;" colspan="2">
          ${pill('Processing', '#1e40af', '#dbeafe')}
          <span style="font-size:0.95rem;font-weight:800;color:#003d9b;margin-left:8px;">${route}</span>
        </td>
      </tr>
      <tr><td style="padding:0 16px 16px;" colspan="2">
        <table cellpadding="0" cellspacing="0" style="width:100%;margin-top:12px;">
          ${infoRow('Vendor', vendorName)}
          ${infoRow('Type', booking.type || 'N/A')}
          ${d.travelDate ? infoRow('Travel Date', d.travelDate) : ''}
        </table>
      </td></tr>
    </table>
    ${ctaButton('Track Your Request', `${APP_URL}/mytrips.html`)}
  `);
  await exports.sendEmail(employeeEmail, subject, undefined, html);
};

// ── 5. Vendor: new booking to fulfill ────────────────────────────────────────
exports.sendVendorRequest = async (vendorEmail, bookingDetails) => {
  const d = bookingDetails || {};
  const route = d.origin && d.destination ? `${d.origin} → ${d.destination}` : 'Route TBD';
  const subject = `[Action Required] New Booking to Fulfill — ${route}`;
  const html = emailWrapper(subject, `
    <h2 style="margin:0 0 4px;font-size:1.15rem;font-weight:800;color:#111827;">New Booking Assigned</h2>
    <p style="margin:0 0 20px;font-size:0.85rem;color:#6b7280;">A new travel booking has been assigned to you. Please issue the ticket and upload the boarding pass / e-ticket PDF.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:20px;">
      <tr style="background:#fefce8;">
        <td style="padding:14px 16px;" colspan="2">
          ${pill('Pending Fulfillment', '#854d0e', '#fef9c3')}
          <span style="font-size:0.95rem;font-weight:800;color:#003d9b;margin-left:8px;">${route}</span>
        </td>
      </tr>
      <tr><td style="padding:0 16px 16px;" colspan="2">
        <table cellpadding="0" cellspacing="0" style="width:100%;margin-top:12px;">
          ${d.type ? infoRow('Type', d.type) : ''}
          ${d.travelDate ? infoRow('Travel Date', d.travelDate) : ''}
          ${d.travelerName ? infoRow('Traveler', d.travelerName) : ''}
          ${d.cost ? infoRow('Budget', `₹${Number(d.cost).toLocaleString('en-IN')}`) : ''}
        </table>
      </td></tr>
    </table>
    ${ctaButton('Open in TripDesk Vendor Portal', `${APP_URL}/vendor.html`)}
  `);
  await exports.sendEmail(vendorEmail, subject, undefined, html);
};

// ── 6. Employee: ticket ready ────────────────────────────────────────────────
exports.sendTicketConfirmation = async (employeeEmail, hrEmail, ticketUrl, pnr) => {
  const subject = `🎫 Your Ticket is Ready${pnr ? ` — PNR ${pnr}` : ''}`;
  const html = emailWrapper(subject, `
    <h2 style="margin:0 0 4px;font-size:1.15rem;font-weight:800;color:#111827;">Your ticket has been issued!</h2>
    <p style="margin:0 0 20px;font-size:0.85rem;color:#6b7280;">Your travel booking is confirmed. Save your PNR and download your e-ticket.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;border:2px solid #003d9b;border-radius:8px;overflow:hidden;margin-bottom:20px;">
      <tr style="background:#003d9b;">
        <td style="padding:14px 16px;" colspan="2">
          <span style="font-size:0.95rem;font-weight:800;color:#ffffff;">Booking Confirmed</span>
        </td>
      </tr>
      <tr><td style="padding:16px;" colspan="2">
        <table cellpadding="0" cellspacing="0" style="width:100%;">
          ${pnr ? infoRow('PNR', `<span style="font-family:monospace;font-size:1rem;color:#003d9b;letter-spacing:0.08em;">${pnr}</span>`) : ''}
          ${ticketUrl ? infoRow('E-Ticket', `<a href="${ticketUrl}" style="color:#003d9b;font-weight:700;">Download PDF</a>`) : ''}
        </table>
      </td></tr>
    </table>
    <p style="margin:0 0 20px;font-size:0.83rem;color:#6b7280;line-height:1.6;">
      Please carry a printout or digital copy of your e-ticket when travelling. Contact HR if you have any questions.
    </p>
    ${ctaButton('View in My Trips', `${APP_URL}/mytrips.html`)}
  `);
  await exports.sendEmail(employeeEmail, subject, undefined, html);
  await exports.sendEmail(hrEmail, `[FYI] Ticket Issued — PNR: ${pnr || 'N/A'}`, undefined, html);
};

// ── 7. Employee: request rejected ────────────────────────────────────────────
exports.sendRejectionNotice = async (employeeEmail, reason) => {
  const subject = `Travel Request Not Approved`;
  const html = emailWrapper(subject, `
    <h2 style="margin:0 0 4px;font-size:1.15rem;font-weight:800;color:#111827;">Your travel request was not approved</h2>
    <p style="margin:0 0 20px;font-size:0.85rem;color:#6b7280;">Unfortunately, your travel request could not be approved at this time.</p>
    ${reason ? `
    <table cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #fecaca;border-radius:8px;background:#fff5f5;margin-bottom:20px;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 4px;font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#dc2626;">Reason</p>
        <p style="margin:0;font-size:0.88rem;color:#7f1d1d;line-height:1.5;">${reason}</p>
      </td></tr>
    </table>` : ''}
    <p style="margin:0 0 20px;font-size:0.83rem;color:#6b7280;line-height:1.6;">
      If you believe this is an error, please speak with your manager or contact HR.
    </p>
    ${ctaButton('View My Trips', `${APP_URL}/mytrips.html`)}
  `);
  await exports.sendEmail(employeeEmail, subject, undefined, html);
};
