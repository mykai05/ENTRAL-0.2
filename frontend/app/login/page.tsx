import { Suspense } from "react";
import React from "react";
import { AuthCard } from "../../components/AuthCard";
import { LoginForm } from "../../components/LoginForm";

export default function LoginPage() {
  return (
    <AuthCard
      title="Sign in"
      subtitle="Access your ENTRAL Command Center."
      footerText="New to Entral?"
      footerLabel="Create an account"
      footerHref="/signup"
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
