import React, { useId } from "react";

type LogoProps = {
  className?: string;
};

export function Logo({ className = "" }: LogoProps) {
  const rawId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const metalId = `entral-logo-metal-${rawId}`;
  const cyanId = `entral-logo-cyan-${rawId}`;
  const coreId = `entral-logo-core-${rawId}`;
  const glowId = `entral-logo-glow-${rawId}`;
  const softGlowId = `entral-logo-soft-glow-${rawId}`;

  return (
    <svg
      aria-hidden="true"
      className={`logo-mark ${className}`}
      fill="none"
      viewBox="0 0 96 96"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={metalId} x1="20" x2="76" y1="13" y2="83" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="0.25" stopColor="#9FAAB0" />
          <stop offset="0.52" stopColor="#F8FFFF" />
          <stop offset="0.78" stopColor="#657176" />
          <stop offset="1" stopColor="#EAF9FF" />
        </linearGradient>
        <linearGradient id={cyanId} x1="15" x2="81" y1="78" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00F0FF" />
          <stop offset="0.55" stopColor="#B9FBFF" />
          <stop offset="1" stopColor="#00BFFF" />
        </linearGradient>
        <radialGradient id={coreId} cx="0" cy="0" r="1" gradientTransform="matrix(0 28 -28 0 48 48)" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F8FFFF" />
          <stop offset="0.34" stopColor="#00F0FF" />
          <stop offset="1" stopColor="#05242C" />
        </radialGradient>
        <filter id={glowId} x="-35%" y="-35%" width="170%" height="170%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="2.4" result="blur" />
          <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0 0 0 0 0 0.94 0 0 0 0 1 0 0 0 0.92 0" result="cyanBlur" />
          <feMerge>
            <feMergeNode in="cyanBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={softGlowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      <circle cx="48" cy="48" r="34" className="logo-aura" filter={`url(#${softGlowId})`} />
      <circle cx="48" cy="48" r="35.5" className="logo-shell" />

      <g className="logo-compass" stroke={`url(#${metalId})`} strokeLinejoin="round">
        <path d="M48 5.8 54.6 30 48 37.6 41.4 30 48 5.8Z" />
        <path d="M48 90.2 41.4 66 48 58.4 54.6 66 48 90.2Z" />
        <path d="M5.8 48 30 41.4 37.6 48 30 54.6 5.8 48Z" />
        <path d="M90.2 48 66 54.6 58.4 48 66 41.4 90.2 48Z" />
      </g>

      <g className="logo-ringwork" stroke={`url(#${metalId})`} strokeLinecap="round">
        <path d="M23.4 25.8A35.5 35.5 0 0 1 42.2 13.1" />
        <path d="M53.8 13.1a35.5 35.5 0 0 1 18.8 12.7" />
        <path d="M82.9 42.2a35.5 35.5 0 0 1-4.8 22.6" />
        <path d="M64.8 78.1a35.5 35.5 0 0 1-22.6 4.8" />
        <path d="M31.2 78.1a35.5 35.5 0 0 1-18.1-18.6" />
        <path d="M13.1 42.2a35.5 35.5 0 0 1 4.8-16.4" />
        <path d="M30.4 21.2a29.3 29.3 0 0 1 11.4-4.5" />
        <path d="M54.2 16.7a29.3 29.3 0 0 1 11.4 4.5" />
        <path d="M74.8 37.6a29.3 29.3 0 0 1 0 20.8" />
        <path d="M65.6 74.8a29.3 29.3 0 0 1-11.4 4.5" />
        <path d="M41.8 79.3a29.3 29.3 0 0 1-11.4-4.5" />
        <path d="M21.2 65.6a29.3 29.3 0 0 1-4.5-11.4" />
      </g>

      <g className="logo-orbits" stroke={`url(#${cyanId})`} filter={`url(#${glowId})`} strokeLinecap="round">
        <ellipse cx="48" cy="48" rx="30.5" ry="10.8" transform="rotate(-18 48 48)" />
        <ellipse cx="48" cy="48" rx="30.5" ry="10.8" transform="rotate(57 48 48)" />
        <ellipse cx="48" cy="48" rx="30.5" ry="10.8" transform="rotate(123 48 48)" />
      </g>

      <circle cx="48" cy="48" r="17.2" className="logo-core" fill={`url(#${coreId})`} />
      <path className="logo-e" d="M39 38.2h19.2M39 48h16.4M39 57.8h19.2M39 38.2v19.6" stroke={`url(#${metalId})`} strokeLinecap="round" strokeLinejoin="round" />

      <g className="logo-nodes" filter={`url(#${glowId})`}>
        <circle cx="48" cy="28.1" r="3.4" />
        <circle cx="67.7" cy="48" r="3.4" />
        <circle cx="48" cy="67.9" r="3.4" />
        <circle cx="28.3" cy="48" r="3.4" />
      </g>
    </svg>
  );
}
