import Link from "next/link";
import React from "react";
import { Logo } from "./Logo";

type BrandMarkProps = {
  href?: string;
  label?: string;
};

export function BrandMark({ href = "/", label = "Entral home" }: BrandMarkProps) {
  return (
    <Link href={href} className="brand-mark" aria-label={label}>
      <Logo />
      <span>ENTRAL</span>
    </Link>
  );
}
