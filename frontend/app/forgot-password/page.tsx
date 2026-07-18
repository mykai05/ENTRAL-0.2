import React from "react";
import { AuthCard } from "../../components/AuthCard";
import { ForgotPasswordForm } from "../../components/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset password"
      subtitle="Request a single-use reset link for your ENTRAL account."
      footerText="Need the beta brief?"
      footerLabel="Review Entral"
      footerHref="/onboarding"
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
