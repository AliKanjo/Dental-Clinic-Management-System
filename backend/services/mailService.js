const nodemailer = require('nodemailer');
const { config } = require('../config/env');
const { AppError } = require('../middleware/errorHandler');

const testOutbox = [];
let transporter = null;

function getTransporter() {
  if (config.isTest) {
    return nodemailer.createTransport({ jsonTransport: true });
  }

  if (!config.smtp.host) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth:
        config.smtp.user && config.smtp.pass
          ? {
              user: config.smtp.user,
              pass: config.smtp.pass,
            }
          : undefined,
    });
  }
  return transporter;
}

async function sendPasswordResetEmail(toEmail, firstName, code) {
  const mailOptions = {
    from: config.smtp.from,
    to: toEmail,
    subject: 'DentalFlow Password Reset Code',
    text: `Hello ${firstName || 'User'},\n\nYour password reset verification code is: ${code}\n\nThis code expires in 15 minutes. If you did not request this, please ignore this email.`,
  };

  if (config.isTest) {
    const activeTransport = getTransporter();
    await activeTransport.sendMail(mailOptions);
    testOutbox.push({ to: toEmail, subject: mailOptions.subject, code, text: mailOptions.text });
    return;
  }

  const activeTransport = getTransporter();
  if (!activeTransport) {
    throw new AppError(503, 'Password reset email service is not configured.');
  }

  await activeTransport.sendMail(mailOptions);
}

function getTestOutbox() {
  return testOutbox;
}

function clearTestOutbox() {
  testOutbox.length = 0;
}

module.exports = {
  sendPasswordResetEmail,
  getTestOutbox,
  clearTestOutbox,
};

