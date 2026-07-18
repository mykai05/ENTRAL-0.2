import React from "react";
import { AgentDashboard } from "../../components/AgentDashboard";
import { AppHeader } from "../../components/AppHeader";

export default function AgentsPage() {
  return (
    <main className="dashboard-shell">
      <AppHeader title="Agent Management" subtitle="Create, schedule, configure, and review agents." />
      <AgentDashboard />
    </main>
  );
}
