"use client";

import { ChatPanel } from "@/components/chat/ChatPanel";

export default function AdminChatPage() {
  return (
    <ChatPanel
      title="Team Chat Oversight"
      subtitle="Read-only view of recruiter ↔ candidate conversations in your organization"
      counterpartLabel="both"
      readOnly
    />
  );
}
