/**
 * Pure helpers for the OAuth redirect handling. The redirect comes back as
 * `blip://auth-callback?code=...` (PKCE) or `...?error=...&error_description=...`.
 */
export type OAuthRedirectResult =
  | { kind: 'code'; code: string }
  | { kind: 'error'; message: string }
  | { kind: 'none' };

export function parseOAuthRedirect(url: string): OAuthRedirectResult {
  let params: URLSearchParams;
  try {
    const parsed = new URL(url);
    params = new URLSearchParams(parsed.search);
    // Some providers return errors in the fragment instead of the query string.
    if (parsed.hash.startsWith('#')) {
      new URLSearchParams(parsed.hash.slice(1)).forEach((v, k) => {
        if (!params.has(k)) params.set(k, v);
      });
    }
  } catch {
    return { kind: 'none' };
  }
  const error = params.get('error_description') ?? params.get('error');
  if (error) return { kind: 'error', message: error };
  const code = params.get('code');
  return code ? { kind: 'code', code } : { kind: 'none' };
}
