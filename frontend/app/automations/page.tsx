import Link from "next/link";
import React from "react";
import { ArrowLeft } from "lucide-react";
import { AppHeader } from "../../components/AppHeader";
import { AutomationConsole } from "../../components/AutomationConsole";

export default function AutomationsPage() {
  return (
    <main className="dashboard-shell">
      <AppHeader title="Automations" subtitle="Run and monitor browser jobs." actions={(
        <Link href="/dashboard" className="button button-secondary">
          <ArrowLeft aria-hidden="true" size={20} />
          Dashboard
        </Link>
      )} />
      <AutomationConsole />
    </main>
  );
}
