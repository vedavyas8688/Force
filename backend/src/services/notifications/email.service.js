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

export async function sendInviteOtpEmail({ to, name, role, otp, acceptUrl }) {
  const subject = "Your Force invitation";
  const roleLabel = formatRole(role);
  const text = `Hi ${name},\n\nYou were invited to Force as ${roleLabel}.\n\nAccept your invitation here: ${acceptUrl}\n\nTemporary invite code: ${otp}\n\nThis code expires in 5 minutes. After accepting, use your email and new password to log in.`;

  console.log(`[invite] ${roleLabel} invite code for ${to}: ${otp}`);

  if (!hasSmtpConfig()) {
    return;
  }

  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html: `<p>Hi ${name},</p><p>You were invited to Force as <strong>${roleLabel}</strong>.</p><p><a href="${acceptUrl}">Accept invitation</a></p><p>Temporary invite code: <strong>${otp}</strong></p><p>This code expires in 5 minutes. After accepting, use your email and new password to log in.</p>`,
  });
}

function formatRole(role = "") {
  return role.replaceAll("_", " ");
}
