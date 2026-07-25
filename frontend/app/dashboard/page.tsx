import React, { Suspense } from "react";
import { DashboardClient } from "../../components/DashboardClient";

export default function DashboardPage() {
  return (
    <Suspense fallback={<main className="command-center-page command-center-loading" role="status">Loading Dashboard...</main>}>
      <DashboardClient initialDestination="dashboard" />
    </Suspense>
  );
}
