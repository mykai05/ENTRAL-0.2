import Link from "next/link";
import React from "react";
import { ArrowLeft } from "lucide-react";
import { AdminDashboard } from "../../components/AdminDashboard";
import { AppHeader } from "../../components/AppHeader";

export default function AdminPage() {
  return (
    <main className="dashboard-shell">
      <AppHeader title="Governance & Audit" subtitle="Review policies, audit logs, and background-agent controls." actions={(
        <Link href="/dashboard" className="button button-secondary">
          <ArrowLeft aria-hidden="true" size={20} />
          Command Center
        </Link>
      )} />
      <AdminDashboard />
    </main>
  );
}
