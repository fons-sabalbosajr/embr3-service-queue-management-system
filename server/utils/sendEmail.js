const nodemailer = require('nodemailer');

function createTransport() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error('EMAIL_USER or EMAIL_APP_PASSWORD is missing in server/.env');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

async function sendEmail({ to, subject, html }) {
  const transporter = createTransport();

  await transporter.sendMail({
    from: `"EMB R3 SQMS" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
}

module.exports = sendEmail;
