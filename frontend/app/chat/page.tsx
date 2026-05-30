import Link from "next/link";
import React from "react";
import { ArrowLeft } from "lucide-react";
import { AppHeader } from "../../components/AppHeader";
import { ChatWindow } from "../../components/ChatWindow";

export default function ChatPage() {
  return (
    <main className="dashboard-shell">
      <AppHeader title="Communications" subtitle="Focused conversation history and screen-aware assistance. Use the Command Center for hierarchy control." actions={(
        <Link href="/dashboard" className="button button-secondary">
          <ArrowLeft aria-hidden="true" size={20} />
          Command Center
        </Link>
      )} />
      <ChatWindow />
    </main>
  );
}
