import * as React from "react";

export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sd-logo-g" x1="0" y1="0" x2="40" y2="40">
          <stop offset="0%" stopColor="oklch(0.78 0.16 162)" />
          <stop offset="100%" stopColor="oklch(0.66 0.13 230)" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#sd-logo-g)" opacity="0.14" />
      <rect
        x="2"
        y="2"
        width="36"
        height="36"
        rx="10"
        stroke="url(#sd-logo-g)"
        strokeWidth="1.5"
        opacity="0.5"
      />
      {/* candlesticks */}
      <g stroke="url(#sd-logo-g)" strokeWidth="2" strokeLinecap="round">
        <line x1="13" y1="12" x2="13" y2="28" />
        <line x1="20" y1="9" x2="20" y2="26" />
        <line x1="27" y1="14" x2="27" y2="30" />
      </g>
      <g fill="url(#sd-logo-g)">
        <rect x="11.5" y="16" width="3" height="6" rx="1" />
        <rect x="18.5" y="13" width="3" height="8" rx="1" />
        <rect x="25.5" y="18" width="3" height="7" rx="1" />
      </g>
    </svg>
  );
}
