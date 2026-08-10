import { Schema, models, model, Types } from "mongoose";
import type { UserRole } from "@/types";

export interface IAuditLog {
  _id: Types.ObjectId;
  actorId: Types.ObjectId;
  actorRole: UserRole;
  adminId?: Types.ObjectId;
  action: string;
  entityType: string;
  entityId?: Types.ObjectId;
  summary: string;
  meta?: Record<string, unknown>;
  ip?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    actorRole: {
      type: String,
      enum: ["superadmin", "admin", "recruiter", "candidate"],
      required: true,
      index: true,
    },
    adminId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: Schema.Types.ObjectId, index: true },
    summary: { type: String, required: true },
    meta: Schema.Types.Mixed,
    ip: String,
  },
  { timestamps: true }
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ adminId: 1, createdAt: -1 });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });

export const AuditLog =
  models.AuditLog || model<IAuditLog>("AuditLog", AuditLogSchema);
