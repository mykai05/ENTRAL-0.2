import React from "react";
import { AdminDashboard } from "../../components/AdminDashboard";
import { AppHeader } from "../../components/AppHeader";

export default function AdminPage() {
  return (
    <main className="dashboard-shell">
      <AppHeader title="Governance & Audit" subtitle="Review policies, audit logs, and background-agent controls." />
      <AdminDashboard />
    </main>
  );
}
