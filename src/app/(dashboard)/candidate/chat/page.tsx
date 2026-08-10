"use client";

import { ChatPanel } from "@/components/chat/ChatPanel";

export default function CandidateChatPage() {
  return (
    <ChatPanel
      title="Chat"
      subtitle="Message your recruiter about scheduling, interviews, and next steps"
      counterpartLabel="recruiter"
    />
  );
}
