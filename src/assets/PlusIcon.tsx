import { SVGProps } from "react";

export function PlusIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
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
        strokeWidth={3}
        d="M12 4v16m8-8H4"
      />
    </svg>
  );
}
