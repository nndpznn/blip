/** Public (EXPO_PUBLIC_*) config, read once. Fails loudly with a clear message if the app is misconfigured. */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing ${name}. Copy apps/mobile/.env.example to apps/mobile/.env and fill it in.`);
  }
  return value;
}

export const env = {
  supabaseUrl: required('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: required('EXPO_PUBLIC_SUPABASE_ANON_KEY', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  /** Sign in with Apple needs the Apple Services ID + Supabase provider; off until that is configured. */
  appleSignInEnabled: process.env.EXPO_PUBLIC_ENABLE_APPLE_SIGN_IN === 'true',
} as const;
