import Link from "next/link";
import React from "react";
import { ArrowLeft } from "lucide-react";
import { AppHeader } from "../../components/AppHeader";
import { ChatWindow } from "../../components/ChatWindow";

export default function ChatPage() {
  return (
    <main className="dashboard-shell">
      <AppHeader title="Assistant" subtitle="Conversations are saved to your account." actions={(
        <Link href="/dashboard" className="button button-secondary">
          <ArrowLeft aria-hidden="true" size={20} />
          Dashboard
        </Link>
      )} />
      <ChatWindow />
    </main>
  );
}
