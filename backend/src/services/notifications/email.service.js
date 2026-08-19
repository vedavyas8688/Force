import nodemailer from "nodemailer";

function hasSmtpConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendLoginOtpEmail({ to, name, otp }) {
  const subject = "Your Force login OTP";
  const text = `Hi ${name},\n\nYour Force login OTP is ${otp}. It expires in 5 minutes.\n\nIf this was not you, ignore this email.`;

  console.log(`[auth] Login OTP for ${to}: ${otp}`);

  if (!hasSmtpConfig()) {
    return;
  }

  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html: `<p>Hi ${name},</p><p>Your Force login OTP is <strong>${otp}</strong>.</p><p>It expires in 5 minutes.</p>`,
  });
}
