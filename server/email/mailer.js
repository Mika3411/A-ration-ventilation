import nodemailer from "nodemailer";

let mailTransport;

export function getMailTransport() {
  if (!mailTransport) {
    const smtpPort = Number.parseInt(process.env.SMTP_PORT || "587", 10);

    mailTransport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return mailTransport;
}

export function getMailFromAddress() {
  return process.env.CONTACT_FROM || process.env.SMTP_USER;
}

export function getMissingMailConfig() {
  return ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"].filter((key) => !process.env[key]);
}
