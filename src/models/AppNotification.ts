import { Schema, models, model, Types } from "mongoose";

export interface IAppNotification {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  body: string;
  href?: string;
  type: string;
  readAt?: Date;
  meta?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const AppNotificationSchema = new Schema<IAppNotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    href: String,
    type: { type: String, required: true, index: true },
    readAt: Date,
    meta: Schema.Types.Mixed,
  },
  { timestamps: true }
);

AppNotificationSchema.index({ userId: 1, createdAt: -1 });
AppNotificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

export const AppNotification =
  models.AppNotification ||
  model<IAppNotification>("AppNotification", AppNotificationSchema);
