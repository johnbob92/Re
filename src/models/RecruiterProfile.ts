import { Schema, models, model, Types } from "mongoose";
import type { RecruiterStatus, RecruiterType, SalaryType } from "@/types";

export interface IRecruiterProfile {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  adminId: Types.ObjectId;
  name: string;
  location?: string;
  email: string;
  phone?: string;
  recruiterType: RecruiterType;
  status: RecruiterStatus;
  salaryType: SalaryType;
  salaryRate: number;
  paid: boolean;
  activeStartDate?: Date;
  calendlyUrl?: string;
  googleMeetDefaultLink?: string;
  /** Denormalized counters for fast performance views */
  hiredTotal: number;
  hiredWeekly: number;
  hiredMonthly: number;
  performanceUpdatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RecruiterProfileSchema = new Schema<IRecruiterProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    adminId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    location: String,
    email: { type: String, required: true, lowercase: true },
    phone: String,
    recruiterType: { type: String, enum: ["hr", "tech"], required: true, index: true },
    status: {
      type: String,
      enum: ["active", "decline", "invited"],
      default: "invited",
      index: true,
    },
    salaryType: { type: String, enum: ["monthly", "hourly"], default: "monthly" },
    salaryRate: { type: Number, default: 0 },
    paid: { type: Boolean, default: false, index: true },
    activeStartDate: Date,
    calendlyUrl: String,
    googleMeetDefaultLink: String,
    hiredTotal: { type: Number, default: 0 },
    hiredWeekly: { type: Number, default: 0 },
    hiredMonthly: { type: Number, default: 0 },
    performanceUpdatedAt: Date,
  },
  { timestamps: true }
);

// Admin recruiter table: filter + sort under one admin
RecruiterProfileSchema.index({ adminId: 1, status: 1, recruiterType: 1 });
RecruiterProfileSchema.index({ adminId: 1, hiredTotal: -1 });
RecruiterProfileSchema.index({ name: "text", email: "text", location: "text" });

export const RecruiterProfile =
  models.RecruiterProfile ||
  model<IRecruiterProfile>("RecruiterProfile", RecruiterProfileSchema);
