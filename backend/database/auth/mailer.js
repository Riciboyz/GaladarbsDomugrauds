const nodemailer = require('nodemailer');
let Resend = null;
try {
  Resend = require('resend').Resend;
} catch (e) {
  Resend = null;
}

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
  }
  return null;
}

async function sendEmailOtp(toEmail, code) {
  const transport = getTransport();
  const subject = 'Your login verification code';
  const text = `Your verification code is: ${code}\nIt expires in 10 minutes.`;

  // Try Resend first if configured
  const resendKey = process.env.RESEND_API_KEY;
  if (Resend && resendKey) {
    try {
      const resend = new Resend(resendKey);
      const from = process.env.SMTP_FROM || 'no-reply@domugrauds.app';
      await resend.emails.send({ from, to: toEmail, subject, text });
      return { ok: true, provider: 'resend' };
    } catch (err) {
      console.warn('[MAILER] Resend failed, will try SMTP:', err && err.message);
    }
  }

  if (!transport) {
    console.log(`[DEV MAILER] Would send OTP to ${toEmail}: ${code}`);
    return { ok: true, dev: true };
  }

  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: toEmail,
      subject,
      text
    });
    return { ok: true, provider: 'smtp' };
  } catch (err) {
    console.warn('[MAILER] SMTP send failed, falling back to console log:', err && err.message);
    console.log(`[DEV MAILER FALLBACK] OTP for ${toEmail}: ${code}`);
    return { ok: true, fallback: true };
  }
}

module.exports = { sendEmailOtp };


