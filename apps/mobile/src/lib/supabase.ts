import './cryptoPolyfill';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';

import { createChunkedStorage } from './chunkedStorage';
import { env } from './env';

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: createChunkedStorage(SecureStore),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // there is no browser URL to read; the OAuth redirect is handled in AuthProvider
    flowType: 'pkce', // the same flow the web app uses
  },
});

// Only refresh tokens while the app is in the foreground (recommended for React Native).
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
