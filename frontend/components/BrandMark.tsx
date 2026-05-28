import Link from "next/link";
import React from "react";
import { Logo } from "./Logo";

type BrandMarkProps = {
  href?: string;
};

export function BrandMark({ href = "/" }: BrandMarkProps) {
  return (
    <Link href={href} className="brand-mark" aria-label="Entral home">
      <Logo />
      <span>Entral</span>
    </Link>
  );
}
