/**
 * Escapes `%`, `_` and `\` so a username can be used as a literal `ilike` pattern.
 * Usernames are compared case-insensitively ("Nolan" == "nolan"), so an exact
 * case-insensitive match is `ilike` with this pattern.
 */
export function ilikeLiteral(value: string): string {
	return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}
