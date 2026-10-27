import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseOAuthRedirect } from './oauth';

test('reads the PKCE code from the redirect', () => {
  assert.deepEqual(parseOAuthRedirect('blip://auth-callback?code=abc123'), { kind: 'code', code: 'abc123' });
});

test('prefers an error over a code and uses the readable description', () => {
  const r = parseOAuthRedirect('blip://auth-callback?error=access_denied&error_description=User+cancelled&code=x');
  assert.deepEqual(r, { kind: 'error', message: 'User cancelled' });
});

test('finds errors returned in the URL fragment', () => {
  const r = parseOAuthRedirect('blip://auth-callback#error=server_error&error_description=Boom');
  assert.deepEqual(r, { kind: 'error', message: 'Boom' });
});

test('returns none when there is neither a code nor an error', () => {
  assert.deepEqual(parseOAuthRedirect('blip://auth-callback'), { kind: 'none' });
});

test('returns none for garbage input', () => {
  assert.deepEqual(parseOAuthRedirect('not a url'), { kind: 'none' });
});
