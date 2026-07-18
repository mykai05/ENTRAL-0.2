import React, { type ButtonHTMLAttributes, type ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  isLoading?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({ children, className = "", disabled, isLoading = false, type = "button", variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      aria-busy={isLoading || undefined}
      className={`button button-${variant} ${className}`}
      disabled={disabled || isLoading}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
