import { Schema, models, model, Types } from "mongoose";
import type { NotificationMessageType } from "@/types";

export interface INotificationTemplate {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: NotificationMessageType;
  subject: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationTemplateSchema = new Schema<INotificationTemplate>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: [
        "reminder",
        "waiting",
        "passed",
        "failed",
        "tech_invite",
        "final_invite",
        "offer",
      ],
      required: true,
    },
    subject: { type: String, required: true },
    body: { type: String, required: true },
  },
  { timestamps: true }
);

NotificationTemplateSchema.index({ userId: 1, type: 1 }, { unique: true });

export const NotificationTemplate =
  models.NotificationTemplate ||
  model<INotificationTemplate>("NotificationTemplate", NotificationTemplateSchema);
