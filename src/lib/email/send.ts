import nodemailer from "nodemailer";
import { MessageLog } from "@/models";
import type { NotificationMessageType } from "@/types";
import { Types } from "mongoose";

export async function sendEmail(options: {
  fromUserId: string | Types.ObjectId;
  toEmail: string;
  toUserId?: string | Types.ObjectId;
  type: NotificationMessageType | "custom";
  subject: string;
  body: string;
  html?: string;
  meta?: Record<string, unknown>;
}) {
  const log = await MessageLog.create({
    fromUserId: options.fromUserId,
    toEmail: options.toEmail,
    toUserId: options.toUserId,
    type: options.type,
    subject: options.subject,
    body: options.body,
    channel: "email",
    status: "queued",
    meta: options.meta,
  });

  try {
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
        to: options.toEmail,
        subject: options.subject,
        text: options.body,
        html: options.html || options.body.replace(/\n/g, "<br/>"),
      });
    } else {
      // Demo / offline mode — log only
      console.info("[email:demo]", {
        to: options.toEmail,
        subject: options.subject,
      });
    }

    log.status = "sent";
    await log.save();
    return { ok: true, logId: String(log._id), demo: !process.env.SMTP_USER };
  } catch (error) {
    log.status = "failed";
    log.error = error instanceof Error ? error.message : "Unknown email error";
    await log.save();
    return { ok: false, error: log.error, logId: String(log._id) };
  }
}
