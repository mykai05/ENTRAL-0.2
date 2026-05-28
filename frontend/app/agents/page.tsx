import Link from "next/link";
import React from "react";
import { ArrowLeft } from "lucide-react";
import { AgentDashboard } from "../../components/AgentDashboard";
import { AppHeader } from "../../components/AppHeader";
import { NeuronsGraph } from "../../components/NeuronsGraph";

export default function AgentsPage() {
  return (
    <main className="dashboard-shell">
      <AppHeader title="Agents" subtitle="Coordinate specialized assistants and task queues." actions={(
        <Link href="/dashboard" className="button button-secondary">
          <ArrowLeft aria-hidden="true" size={20} />
          Dashboard
        </Link>
      )} />
      <NeuronsGraph />
      <AgentDashboard />
    </main>
  );
}
