import { Schema, models, model, Types } from "mongoose";
import type { InterviewStage, InterviewStatus } from "@/types";

export interface IInterview {
  _id: Types.ObjectId;
  candidateId: Types.ObjectId;
  candidateUserId: Types.ObjectId;
  recruiterId: Types.ObjectId;
  adminId: Types.ObjectId;
  stage: InterviewStage;
  status: InterviewStatus;
  scheduledAt: Date;
  endsAt?: Date;
  calendlyEventUri?: string;
  googleCalendarEventId?: string;
  googleMeetLink?: string;
  reminderSentAt?: Date;
  waitingSentAt?: Date;
  joinNotifiedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InterviewSchema = new Schema<IInterview>(
  {
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: "CandidateProfile",
      required: true,
      index: true,
    },
    candidateUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    recruiterId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    adminId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    stage: { type: String, enum: ["hr", "tech", "final"], required: true, index: true },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled", "no_show", "rescheduled"],
      default: "scheduled",
      index: true,
    },
    scheduledAt: { type: Date, required: true, index: true },
    endsAt: Date,
    calendlyEventUri: String,
    googleCalendarEventId: String,
    googleMeetLink: String,
    reminderSentAt: Date,
    waitingSentAt: Date,
    joinNotifiedAt: Date,
    notes: String,
  },
  { timestamps: true }
);

// Recruiter scheduled page + calendar range queries
InterviewSchema.index({ recruiterId: 1, stage: 1, scheduledAt: 1 });
InterviewSchema.index({ adminId: 1, stage: 1, scheduledAt: 1 });
InterviewSchema.index({ candidateUserId: 1, scheduledAt: 1 });
// Cron job: find interviews needing 15-min reminders
InterviewSchema.index({ status: 1, scheduledAt: 1, reminderSentAt: 1 });

export const Interview =
  models.Interview || model<IInterview>("Interview", InterviewSchema);
