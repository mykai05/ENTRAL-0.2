import Link from "next/link";
import React from "react";
import { ArrowLeft } from "lucide-react";
import { AdminDashboard } from "../../components/AdminDashboard";
import { AppHeader } from "../../components/AppHeader";

export default function AdminPage() {
  return (
    <main className="dashboard-shell">
      <AppHeader title="Governance" subtitle="Manage policies, audit logs, and autonomy controls." actions={(
        <Link href="/dashboard" className="button button-secondary">
          <ArrowLeft aria-hidden="true" size={20} />
          Dashboard
        </Link>
      )} />
      <AdminDashboard />
    </main>
  );
}
