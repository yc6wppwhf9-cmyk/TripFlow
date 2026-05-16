const { Resend } = require('resend');
const { emailQueue } = require('../config/redis');

const resend = new Resend(process.env.RESEND_API_KEY);

if (emailQueue) {
  emailQueue.process(async (job) => {
    const { to, subject, text, from } = job.data;

    await resend.emails.send({
      from: from || process.env.FROM_EMAIL,
      to,
      subject,
      text,
    });

    console.log(`Email sent to ${to}`);
  });

  emailQueue.on('failed', (job, err) => {
    console.error(`Email job failed for ${job.data.to}:`, err.message);
  });
}

module.exports = emailQueue;
