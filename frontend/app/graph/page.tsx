import React, { Suspense } from "react";
import { DashboardClient } from "../../components/DashboardClient";

export default function GraphPage() {
  return (
    <Suspense fallback={<main className="command-center-page command-center-loading" role="status">Loading Universe Graph...</main>}>
      <DashboardClient initialDestination="graph" />
    </Suspense>
  );
}
