import React from "react";
import { AppHeader } from "../../components/AppHeader";
import { ChatWindow } from "../../components/ChatWindow";

export default function ChatPage() {
  return (
    <main className="dashboard-shell">
      <AppHeader title="Communications" subtitle="Focused conversation history and screen-aware assistance. Use the Command Center for hierarchy control." />
      <ChatWindow />
    </main>
  );
}
