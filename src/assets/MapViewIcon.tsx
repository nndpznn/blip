import { SVGProps } from "react";

export function MapViewIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
      className={["block", className].filter(Boolean).join(" ")}
      {...props}
    >
      <rect x="4" y="4" width="16" height="16" rx="1.5" strokeWidth={2} />
      <path strokeWidth={1.5} d="M12 4v16M4 12h16" />
      <circle cx="15" cy="9" r="1.75" fill="currentColor" stroke="none" />
    </svg>
  );
}
