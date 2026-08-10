import { Schema, models, model, Types } from "mongoose";

export interface IChatMessage {
  _id: Types.ObjectId;
  threadId: Types.ObjectId;
  senderId: Types.ObjectId;
  body: string;
  readBy: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    threadId: {
      type: Schema.Types.ObjectId,
      ref: "ChatThread",
      required: true,
      index: true,
    },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    body: { type: String, required: true, trim: true, maxlength: 4000 },
    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

ChatMessageSchema.index({ threadId: 1, createdAt: 1 });

export const ChatMessage =
  models.ChatMessage || model<IChatMessage>("ChatMessage", ChatMessageSchema);
