import React from "react";
import { AuthCard } from "../../components/AuthCard";
import { SignupForm } from "../../components/SignupForm";

export default function SignupPage() {
  const isDemoMode = process.env.NEXT_PUBLIC_ENTRAL_RUNTIME_MODE === "demo";

  return (
    <AuthCard
      modeLabel={isDemoMode ? "Local demo action" : "Real account action"}
      title="Create account"
      subtitle={isDemoMode ? "Create a temporary local demo account." : "Create a verified private beta account after reviewing ENTRAL's safety context."}
      footerText="Need the beta brief?"
      footerLabel="Review Entral"
      footerHref="/onboarding"
    >
      <SignupForm />
    </AuthCard>
  );
}
