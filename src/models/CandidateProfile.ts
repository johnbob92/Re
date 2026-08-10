import { Schema, models, model, Types } from "mongoose";
import type { CandidateStatus } from "@/types";

export interface ICandidateProfile {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  adminId?: Types.ObjectId;
  recruiterId?: Types.ObjectId;
  techRecruiterId?: Types.ObjectId;
  name: string;
  email: string;
  whatsapp?: string;
  phone?: string;
  birthday?: Date;
  location?: string;
  linkedinUrl?: string;
  resumeUrl?: string;
  recordingUrl?: string;
  techStack: string[];
  majorStack?: string;
  experienceYears: number;
  status: CandidateStatus;
  /** Cached scheduled times for fast list rendering */
  hrScheduledAt?: Date;
  techScheduledAt?: Date;
  finalScheduledAt?: Date;
  statusHistory: {
    status: CandidateStatus;
    at: Date;
    by?: Types.ObjectId;
    note?: string;
  }[];
  lastAssessmentComment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CandidateProfileSchema = new Schema<ICandidateProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    adminId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    recruiterId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    techRecruiterId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, index: true },
    whatsapp: String,
    phone: String,
    birthday: Date,
    location: String,
    linkedinUrl: String,
    resumeUrl: String,
    recordingUrl: String,
    techStack: { type: [String], default: [] },
    majorStack: String,
    experienceYears: { type: Number, default: 0, index: true },
    status: {
      type: String,
      enum: [
        "need_to_connect",
        "connected",
        "declined",
        "scheduled",
        "hr_pass",
        "hr_failed",
        "tech_pass",
        "tech_failed",
        "final_pass",
        "final_failed",
        "offer_sent",
        "hired",
      ],
      default: "need_to_connect",
      index: true,
    },
    hrScheduledAt: Date,
    techScheduledAt: Date,
    finalScheduledAt: Date,
    statusHistory: [
      {
        status: String,
        at: { type: Date, default: Date.now },
        by: { type: Schema.Types.ObjectId, ref: "User" },
        note: String,
      },
    ],
    lastAssessmentComment: String,
  },
  { timestamps: true }
);

/**
 * Scale indexes for 500–1000 candidates / recruiter and multi-admin dashboards.
 * Compound indexes support common filter patterns without collection scans.
 */
CandidateProfileSchema.index({ adminId: 1, status: 1, updatedAt: -1 });
CandidateProfileSchema.index({ recruiterId: 1, status: 1, hrScheduledAt: 1 });
CandidateProfileSchema.index({ techRecruiterId: 1, status: 1, techScheduledAt: 1 });
CandidateProfileSchema.index({ adminId: 1, createdAt: -1 });
CandidateProfileSchema.index({
  name: "text",
  email: "text",
  location: "text",
  majorStack: "text",
});
// Pipeline analytics
CandidateProfileSchema.index({ adminId: 1, status: 1, experienceYears: 1 });

export const CandidateProfile =
  models.CandidateProfile ||
  model<ICandidateProfile>("CandidateProfile", CandidateProfileSchema);
