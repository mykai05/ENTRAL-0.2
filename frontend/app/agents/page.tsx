import Link from "next/link";
import React from "react";
import { ArrowLeft } from "lucide-react";
import { AgentDashboard } from "../../components/AgentDashboard";
import { AppHeader } from "../../components/AppHeader";

export default function AgentsPage() {
  return (
    <main className="dashboard-shell">
      <AppHeader title="Agent Management" subtitle="Create, schedule, configure, and review agents. The live chain-of-command visualization stays on the dashboard." actions={(
        <Link href="/dashboard" className="button button-secondary">
          <ArrowLeft aria-hidden="true" size={20} />
          Command Center
        </Link>
      )} />
      <AgentDashboard />
    </main>
  );
}
