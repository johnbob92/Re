import { Schema, models, model, Types } from "mongoose";

export interface IOfferLetter {
  _id: Types.ObjectId;
  adminId: Types.ObjectId;
  candidateId: Types.ObjectId;
  title: string;
  contentHtml: string;
  fileUrl?: string;
  sentAt?: Date;
  status: "draft" | "sent" | "accepted" | "declined";
  createdAt: Date;
  updatedAt: Date;
}

const OfferLetterSchema = new Schema<IOfferLetter>(
  {
    adminId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: "CandidateProfile",
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    contentHtml: { type: String, required: true },
    fileUrl: String,
    sentAt: Date,
    status: {
      type: String,
      enum: ["draft", "sent", "accepted", "declined"],
      default: "draft",
      index: true,
    },
  },
  { timestamps: true }
);

OfferLetterSchema.index({ adminId: 1, status: 1, createdAt: -1 });

export const OfferLetter =
  models.OfferLetter || model<IOfferLetter>("OfferLetter", OfferLetterSchema);
