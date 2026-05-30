import React from "react";
import { AuthCard } from "../../components/AuthCard";
import { SignupForm } from "../../components/SignupForm";

export default function SignupPage() {
  return (
    <AuthCard
      title="Create account"
      subtitle="Create your operator account and open the Command Center."
      footerText="Already have an account?"
      footerLabel="Sign in"
      footerHref="/login"
    >
      <SignupForm />
    </AuthCard>
  );
}
