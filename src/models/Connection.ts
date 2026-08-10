import { Schema, models, model, Types } from "mongoose";

export interface IConnection {
  _id: Types.ObjectId;
  recruiterId: Types.ObjectId;
  candidateId: Types.ObjectId;
  adminId: Types.ObjectId;
  status: "pending" | "connected" | "declined";
  connectedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ConnectionSchema = new Schema<IConnection>(
  {
    recruiterId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: "CandidateProfile",
      required: true,
      index: true,
    },
    adminId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "connected", "declined"],
      default: "pending",
      index: true,
    },
    connectedAt: Date,
  },
  { timestamps: true }
);

ConnectionSchema.index({ recruiterId: 1, status: 1, updatedAt: -1 });
ConnectionSchema.index({ candidateId: 1, recruiterId: 1 }, { unique: true });

export const Connection =
  models.Connection || model<IConnection>("Connection", ConnectionSchema);
