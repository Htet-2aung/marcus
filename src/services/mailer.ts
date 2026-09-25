import nodemailer from "nodemailer";

export const mailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MARCUS_GMAIL_ADDRESS,
    pass: process.env.MARCUS_GMAIL_APP_PASSWORD,
  },
});