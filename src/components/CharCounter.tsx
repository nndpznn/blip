import type { ReactNode } from "react"
import { charsRemaining, counterTone, type CounterTone } from "@blip/shared"

const TONE_CLASS: Record<CounterTone, string> = {
	normal: "text-default-400",
	warn: "text-warning",
	over: "text-danger font-semibold",
}

/**
 * Wraps a text field and shows how many characters are left in its bottom-right corner.
 * Pass the same `max` the field enforces. Give the wrapped input right padding (single line) or
 * bottom padding (multi-line) so typed text never runs underneath the counter.
 */
export default function CharCounter({ value, max, children }: { value: string; max: number; children: ReactNode }) {
	const remaining = charsRemaining(value, max)
	return (
		<div className="relative">
			{children}
			<span
				className={`pointer-events-none absolute bottom-1 right-3 text-xs tabular-nums ${TONE_CLASS[counterTone(remaining, max)]}`}
				aria-label={remaining < 0 ? `${-remaining} characters over the limit` : `${remaining} characters left`}
			>
				{remaining}
			</span>
		</div>
	)
}
