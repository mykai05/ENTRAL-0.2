import React, { Suspense } from "react";
import { DashboardClient } from "../../components/DashboardClient";

export default function InfrastructurePage() {
  return (
    <Suspense fallback={<main className="command-center-page command-center-loading" role="status">Loading Infrastructure...</main>}>
      <DashboardClient initialDestination="infrastructure" />
    </Suspense>
  );
}
