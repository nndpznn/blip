import * as Crypto from 'expo-crypto';

/**
 * Hermes has no WebCrypto. Without it supabase-js builds its PKCE verifier from Math.random() and
 * downgrades the challenge from S256 to `plain`, both of which weaken sign-in. Provide the pieces it
 * uses (`getRandomValues`, `subtle.digest`) from expo-crypto. Must be imported before the Supabase
 * client is created.
 */
type WebCryptoLike = {
  getRandomValues?: unknown;
  randomUUID?: unknown;
  subtle?: unknown;
};

const g = globalThis as unknown as { crypto?: WebCryptoLike };

if (!g.crypto) g.crypto = {};
const c = g.crypto;

if (!c.getRandomValues) c.getRandomValues = Crypto.getRandomValues;
if (!c.subtle) {
  c.subtle = {
    digest: (algorithm: string, data: BufferSource) =>
      Crypto.digest(algorithm.toUpperCase() as Crypto.CryptoDigestAlgorithm, data),
  };
}
