export type MeetLoadStatus = "loading" | "ready" | "notFound" | "error";

/** Minimal shape of a Postgrest error; only `code` is read. */
export type MeetFetchError = { code?: string | null } | null | undefined;

/** `.single()` found zero rows. */
const NO_ROWS = "PGRST116";
/** Postgres rejected the id itself (e.g. a malformed uuid), so no such meet can exist. */
const INVALID_TEXT_REPRESENTATION = "22P02";

/**
 * Maps the result of fetching one meet to a page status.
 * A missing meet is permanent ("notFound"); anything else (network, RLS, server)
 * is "error" so the page can offer a retry instead of claiming the meet doesn't exist.
 */
export function meetFetchStatus(error: MeetFetchError, hasData: boolean): MeetLoadStatus {
	if (error) {
		const code = error.code ?? "";
		return code === NO_ROWS || code === INVALID_TEXT_REPRESENTATION ? "notFound" : "error";
	}
	return hasData ? "ready" : "notFound";
}
