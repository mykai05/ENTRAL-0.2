import { Suspense } from "react";
import React from "react";
import { AuthCard } from "../../components/AuthCard";
import { AuthLoadingFallback } from "../../components/AuthLoadingFallback";
import { LoginForm } from "../../components/LoginForm";

export default function LoginPage() {
  const isDemoMode = process.env.NEXT_PUBLIC_ENTRAL_RUNTIME_MODE === "demo";

  return (
    <AuthCard
      modeLabel={isDemoMode ? "Local demo action" : "Real account action"}
      title="Sign in"
      subtitle={isDemoMode ? "Access the temporary ENTRAL demo workspace." : "Access your ENTRAL Command Center."}
      footerText="New to Entral?"
      footerLabel="Create an account"
      footerHref="/signup"
    >
      <Suspense fallback={<AuthLoadingFallback label="Loading sign-in form..." />}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
