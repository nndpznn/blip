/**
 * Returns a safe relative path for post-auth redirects.
 * Rejects protocol-relative and absolute URLs.
 */
export function safeNextPath(
	next: string | null | undefined,
	fallback = '/map'
): string {
	if (!next || !next.startsWith('/') || next.startsWith('//')) {
		return fallback
	}
	return next
}
