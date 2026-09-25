import nodemailer from "nodemailer";
import { env } from "../config/env.js";

if (!env.gmail.address || !env.gmail.appPassword) {
  console.warn(
    "⚠️ Gmail credentials are not configured."
  );
}

export const mailTransporter =
  nodemailer.createTransport({
    service: "gmail",

    auth: {
      user: env.gmail.address,
      pass: env.gmail.appPassword,
    },

    pool: true,

    maxConnections: 3,

    maxMessages: 50,
  });

export async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
}) {

  if (!env.gmail.address) {
    throw new Error(
      "Email service is not configured."
    );
  }

  if (!params.to.includes("@")) {
    throw new Error(
      "Invalid recipient email address."
    );
  }

  if (!params.subject.trim()) {
    throw new Error(
      "Email subject cannot be empty."
    );
  }

  if (!params.body.trim()) {
    throw new Error(
      "Email body cannot be empty."
    );
  }

  const result =
    await mailTransporter.sendMail({
      from: `"AI Workforce" <${env.gmail.address}>`,
      to: params.to,
      subject: params.subject,
      text: params.body,
    });

  return {
    success: true,
    messageId: result.messageId,
    accepted: result.accepted,
  };
}