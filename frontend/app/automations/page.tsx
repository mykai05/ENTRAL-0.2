import React from "react";
import { AppHeader } from "../../components/AppHeader";
import { AutomationConsole } from "../../components/AutomationConsole";

export default function AutomationsPage() {
  return (
    <main className="dashboard-shell">
      <AppHeader title="Task Automation" subtitle="Create, schedule, and monitor browser-based work." />
      <AutomationConsole />
    </main>
  );
}
