/** How a character counter should look: plenty of room, close to the limit, or past it. */
export type CounterTone = "normal" | "warn" | "over";

/** Characters left before `max` (negative once over the limit). */
export function charsRemaining(value: string, max: number): number {
	return max - value.length;
}

/** Warn in the last 10% of the limit (at least the last 3 characters). */
export function counterTone(remaining: number, max: number): CounterTone {
	if (remaining < 0) return "over";
	return remaining <= Math.max(3, Math.ceil(max * 0.1)) ? "warn" : "normal";
}
