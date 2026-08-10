import { Schema, models, model, Types } from "mongoose";
import type { NotificationMessageType } from "@/types";

export interface IMessageLog {
  _id: Types.ObjectId;
  fromUserId: Types.ObjectId;
  toEmail: string;
  toUserId?: Types.ObjectId;
  type: NotificationMessageType | "custom";
  subject: string;
  body: string;
  channel: "email" | "slack";
  status: "queued" | "sent" | "failed";
  error?: string;
  meta?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const MessageLogSchema = new Schema<IMessageLog>(
  {
    fromUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    toEmail: { type: String, required: true, index: true },
    toUserId: { type: Schema.Types.ObjectId, ref: "User" },
    type: { type: String, required: true },
    subject: String,
    body: String,
    channel: { type: String, enum: ["email", "slack"], default: "email" },
    status: {
      type: String,
      enum: ["queued", "sent", "failed"],
      default: "queued",
      index: true,
    },
    error: String,
    meta: Schema.Types.Mixed,
  },
  { timestamps: true }
);

MessageLogSchema.index({ createdAt: -1 });

export const MessageLog =
  models.MessageLog || model<IMessageLog>("MessageLog", MessageLogSchema);
