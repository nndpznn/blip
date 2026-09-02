/** Returns a new array with the item at `index` swapped with `index - 1` (move toward start). */
export function moveItemUp<T>(arr: T[], index: number): T[] {
	if (index <= 0 || index >= arr.length) return [...arr];
	const next = [...arr];
	[next[index - 1], next[index]] = [next[index], next[index - 1]];
	return next;
}

/** Returns a new array with the item at `index` swapped with `index + 1` (move toward end). */
export function moveItemDown<T>(arr: T[], index: number): T[] {
	if (index < 0 || index >= arr.length - 1) return [...arr];
	const next = [...arr];
	[next[index], next[index + 1]] = [next[index + 1], next[index]];
	return next;
}
