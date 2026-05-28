import React from "react";

type LogoProps = {
  className?: string;
};

export function Logo({ className = "" }: LogoProps) {
  return (
    <svg
      aria-hidden="true"
      className={`logo-mark ${className}`}
      fill="none"
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect className="logo-shell" height="62" rx="18" width="62" x="1" y="1" />
      <path className="logo-neuron-ring" d="M18 32c0-9 5.8-16 14-16s14 7 14 16-5.8 16-14 16-14-7-14-16Z" />
      <path className="logo-e" d="M24 20h17M24 32h14M24 44h18M24 20v24" strokeLinecap="round" strokeLinejoin="round" />
      <path className="logo-network" d="M43 20l8 7-7 6 8 11M44 33l-12-1M51 27l-13 5" strokeLinecap="round" strokeLinejoin="round" />
      <circle className="logo-node logo-node-core" cx="32" cy="32" r="4" />
      <circle className="logo-node" cx="43" cy="20" r="3" />
      <circle className="logo-node" cx="51" cy="27" r="3" />
      <circle className="logo-node" cx="44" cy="33" r="3" />
      <circle className="logo-node" cx="52" cy="44" r="3" />
    </svg>
  );
}
