"use client";

import { ChatPanel } from "@/components/chat/ChatPanel";

export default function RecruiterChatPage() {
  return (
    <ChatPanel
      title="Chat"
      subtitle="Message your candidates in real time"
      counterpartLabel="candidate"
    />
  );
}
