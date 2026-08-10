import { Schema, models, model, Types } from "mongoose";

export interface IChatThread {
  _id: Types.ObjectId;
  adminId?: Types.ObjectId;
  recruiterId: Types.ObjectId;
  candidateUserId: Types.ObjectId;
  candidateProfileId?: Types.ObjectId;
  lastMessageAt?: Date;
  lastMessagePreview?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ChatThreadSchema = new Schema<IChatThread>(
  {
    adminId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    recruiterId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    candidateUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    candidateProfileId: { type: Schema.Types.ObjectId, ref: "CandidateProfile" },
    lastMessageAt: Date,
    lastMessagePreview: String,
  },
  { timestamps: true }
);

ChatThreadSchema.index({ recruiterId: 1, candidateUserId: 1 }, { unique: true });
ChatThreadSchema.index({ recruiterId: 1, lastMessageAt: -1 });
ChatThreadSchema.index({ candidateUserId: 1, lastMessageAt: -1 });

export const ChatThread =
  models.ChatThread || model<IChatThread>("ChatThread", ChatThreadSchema);
