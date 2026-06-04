import { SVGProps } from "react";

export function ListViewIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
      className={["block", className].filter(Boolean).join(" ")}
      {...props}
    >
      <circle cx="6" cy="7" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="6" cy="12" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="6" cy="17" r="1.25" fill="currentColor" stroke="none" />
      <path strokeLinecap="round" strokeWidth={2} d="M10 7h10M10 12h10M10 17h10" />
    </svg>
  );
}
