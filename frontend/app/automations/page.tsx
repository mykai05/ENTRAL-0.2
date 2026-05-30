import Link from "next/link";
import React from "react";
import { ArrowLeft } from "lucide-react";
import { AppHeader } from "../../components/AppHeader";
import { AutomationConsole } from "../../components/AutomationConsole";

export default function AutomationsPage() {
  return (
    <main className="dashboard-shell">
      <AppHeader title="Task Automation" subtitle="Create, schedule, and monitor browser-based work." actions={(
        <Link href="/dashboard" className="button button-secondary">
          <ArrowLeft aria-hidden="true" size={20} />
          Command Center
        </Link>
      )} />
      <AutomationConsole />
    </main>
  );
}
