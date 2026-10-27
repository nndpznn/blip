import type { Session, User } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';

import { parseOAuthRedirect } from './oauth';

// Lets the auth browser session close itself when the redirect comes back.
WebBrowser.maybeCompleteAuthSession();

/** Deep link Supabase redirects to after Google sign-in. Must be in Supabase's allowed redirect URLs. */
const REDIRECT_URL = Linking.createURL('auth-callback', { scheme: 'blip' });

export type SignInResult = { ok: true } | { ok: false; cancelled?: boolean; message: string };

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  /** True until the stored session has been read. Guests are `!loading && !user`. */
  loading: boolean;
  signInWithGoogle: () => Promise<SignInResult>;
  /** Only works once the Apple provider is configured in Supabase (see EXPO_PUBLIC_ENABLE_APPLE_SIGN_IN). */
  signInWithApple: () => Promise<SignInResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<SignInResult> => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: REDIRECT_URL, skipBrowserRedirect: true },
    });
    if (error || !data.url) return { ok: false, message: error?.message ?? 'Could not start Google sign-in.' };

    const result = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT_URL);
    if (result.type !== 'success') return { ok: false, cancelled: true, message: 'Sign-in was cancelled.' };

    const parsed = parseOAuthRedirect(result.url);
    if (parsed.kind === 'error') return { ok: false, message: parsed.message };
    if (parsed.kind === 'none') return { ok: false, message: 'Sign-in did not return a code.' };

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(parsed.code);
    return exchangeError ? { ok: false, message: exchangeError.message } : { ok: true };
  }, []);

  const signInWithApple = useCallback(async (): Promise<SignInResult> => {
    if (Platform.OS !== 'ios' || !env.appleSignInEnabled) {
      return { ok: false, message: 'Sign in with Apple is not available yet.' };
    }
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) return { ok: false, message: 'Apple did not return an identity token.' };
      const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken });
      return error ? { ok: false, message: error.message } : { ok: true };
    } catch (e) {
      if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') {
        return { ok: false, cancelled: true, message: 'Sign-in was cancelled.' };
      }
      return { ok: false, message: e instanceof Error ? e.message : 'Apple sign-in failed.' };
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user: session?.user ?? null, session, loading, signInWithGoogle, signInWithApple, signOut }),
    [session, loading, signInWithGoogle, signInWithApple, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
