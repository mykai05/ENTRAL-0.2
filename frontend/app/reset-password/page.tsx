import { Suspense } from "react";
import React from "react";
import { AuthCard } from "../../components/AuthCard";
import { AuthLoadingFallback } from "../../components/AuthLoadingFallback";
import { ResetPasswordForm } from "../../components/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Set new password"
      subtitle="Complete account recovery from the secure link in your email."
      footerText="Need a new link?"
      footerLabel="Request reset"
      footerHref="/forgot-password"
    >
      <Suspense fallback={<AuthLoadingFallback label="Loading password reset form..." />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  );
}
