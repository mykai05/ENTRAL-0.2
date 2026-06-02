import React from "react";
import { AuthCard } from "../../components/AuthCard";
import { SignupForm } from "../../components/SignupForm";

export default function SignupPage() {
  return (
    <AuthCard
      title="Create account"
      subtitle="Create a verified private beta account after reviewing ENTRAL's safety context."
      footerText="Already have an account?"
      footerLabel="Sign in"
      footerHref="/login"
    >
      <SignupForm />
    </AuthCard>
  );
}
