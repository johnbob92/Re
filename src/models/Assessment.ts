import { Schema, models, model, Types } from "mongoose";
import type { AssessmentDecision, InterviewStage } from "@/types";

export interface IAssessment {
  _id: Types.ObjectId;
  interviewId?: Types.ObjectId;
  candidateId: Types.ObjectId;
  recruiterId: Types.ObjectId;
  adminId: Types.ObjectId;
  stage: InterviewStage;
  recordingUrl?: string;
  // Shared / HR fields
  englishLevel?: number;
  communication?: number;
  logistics?: number;
  adaptability?: number;
  confidence?: number;
  problemSolving?: number;
  availableUsEastern?: boolean;
  interestedInRole?: boolean;
  // Tech fields
  technicalSkills?: {
    cloudArchitecture?: number;
    backend?: number;
    frontend?: number;
    overall?: number;
  };
  comment?: string;
  decision: AssessmentDecision;
  decidedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AssessmentSchema = new Schema<IAssessment>(
  {
    interviewId: { type: Schema.Types.ObjectId, ref: "Interview" },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: "CandidateProfile",
      required: true,
      index: true,
    },
    recruiterId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    adminId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    stage: { type: String, enum: ["hr", "tech", "final"], required: true, index: true },
    recordingUrl: String,
    englishLevel: { type: Number, min: 0, max: 10 },
    communication: { type: Number, min: 0, max: 10 },
    logistics: { type: Number, min: 0, max: 10 },
    adaptability: { type: Number, min: 0, max: 10 },
    confidence: { type: Number, min: 0, max: 10 },
    problemSolving: { type: Number, min: 0, max: 10 },
    availableUsEastern: Boolean,
    interestedInRole: Boolean,
    technicalSkills: {
      cloudArchitecture: { type: Number, min: 0, max: 10 },
      backend: { type: Number, min: 0, max: 10 },
      frontend: { type: Number, min: 0, max: 10 },
      overall: { type: Number, min: 0, max: 10 },
    },
    comment: String,
    decision: {
      type: String,
      enum: ["pass", "fail", "pending"],
      default: "pending",
      index: true,
    },
    decidedAt: Date,
  },
  { timestamps: true }
);

// One active assessment per candidate+stage (fast upsert)
AssessmentSchema.index({ candidateId: 1, stage: 1 }, { unique: true });
AssessmentSchema.index({ recruiterId: 1, stage: 1, decision: 1, updatedAt: -1 });
AssessmentSchema.index({ adminId: 1, decision: 1, updatedAt: -1 });

export const Assessment =
  models.Assessment || model<IAssessment>("Assessment", AssessmentSchema);
