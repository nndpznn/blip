import { SVGProps } from "react";

export function ChevronLeftIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
      className={["block", className].filter(Boolean).join(" ")}
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 19l-7-7 7-7"
      />
    </svg>
  );
}
