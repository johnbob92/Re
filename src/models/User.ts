import { Schema, models, model, Types } from "mongoose";
import type { AccountStatus, RecruiterType, UserRole } from "@/types";

export interface IUser {
  _id: Types.ObjectId;
  email: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  status: AccountStatus;
  avatarUrl?: string;
  phone?: string;
  /** Multi-tenant scope: admin who owns this account (for recruiters/candidates) */
  adminId?: Types.ObjectId;
  /** For recruiters only */
  recruiterType?: RecruiterType;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    username: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["superadmin", "admin", "recruiter", "candidate"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "invited", "declined", "deleted"],
      default: "active",
      index: true,
    },
    avatarUrl: String,
    phone: String,
    adminId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    recruiterType: { type: String, enum: ["hr", "tech"] },
    lastLoginAt: Date,
  },
  { timestamps: true }
);

// Fast login + uniqueness
UserSchema.index({ email: 1 }, { unique: true });
// SuperAdmin managing page filters
UserSchema.index({ role: 1, status: 1, createdAt: -1 });
// Admin scoping lists
UserSchema.index({ adminId: 1, role: 1, status: 1 });
UserSchema.index({ username: "text", email: "text" });

export const User = models.User || model<IUser>("User", UserSchema);
