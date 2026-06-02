import { Suspense } from "react";
import React from "react";
import { AuthCard } from "../../components/AuthCard";
import { AuthLoadingFallback } from "../../components/AuthLoadingFallback";
import { VerifyEmailForm } from "../../components/VerifyEmailForm";

export default function VerifyEmailPage() {
  return (
    <AuthCard
      title="Verify email"
      subtitle="Confirm your email before entering the private beta command center."
      footerText="Already verified?"
      footerLabel="Sign in"
      footerHref="/login"
    >
      <Suspense fallback={<AuthLoadingFallback label="Loading verification form..." />}>
        <VerifyEmailForm />
      </Suspense>
    </AuthCard>
  );
}
