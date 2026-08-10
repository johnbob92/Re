import { Schema, models, model, Types } from "mongoose";

export interface IAdminProfile {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  companyName: string;
  companyDescription?: string;
  companyWebsiteUrl?: string;
  calendlyUrl?: string;
  googleCalendarConnected?: boolean;
  gmailConnected?: boolean;
  slackConnected?: boolean;
  offerLetterTemplateHtml?: string;
  offerLetterTemplateUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AdminProfileSchema = new Schema<IAdminProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    companyName: { type: String, required: true, trim: true },
    companyDescription: String,
    companyWebsiteUrl: String,
    calendlyUrl: String,
    googleCalendarConnected: { type: Boolean, default: false },
    gmailConnected: { type: Boolean, default: false },
    slackConnected: { type: Boolean, default: false },
    offerLetterTemplateHtml: String,
    offerLetterTemplateUrl: String,
  },
  { timestamps: true }
);

AdminProfileSchema.index({ companyName: 1 });

export const AdminProfile =
  models.AdminProfile || model<IAdminProfile>("AdminProfile", AdminProfileSchema);
