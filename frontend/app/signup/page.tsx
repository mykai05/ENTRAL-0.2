import React from "react";
import { AuthCard } from "../../components/AuthCard";
import { CurlSnippet } from "../../components/CurlSnippet";
import { SignupForm } from "../../components/SignupForm";

export default function SignupPage() {
  return (
    <AuthCard
      title="Create account"
      subtitle="Set up your first team workspace."
      footerText="Already have an account?"
      footerLabel="Sign in"
      footerHref="/login"
    >
      <SignupForm />
      <CurlSnippet
        authenticated={false}
        body={{
          name: "Ada Lovelace",
          email: "ada@example.com",
          password: "correct-horse-battery-staple"
        }}
        method="POST"
        path="/signup"
        title="Signup"
      />
    </AuthCard>
  );
}
