import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';

import { useAuth, type SignInResult } from '@/auth/AuthProvider';
import { env } from '@/lib/env';
import { colors } from '@/theme';

export default function SignIn() {
  const router = useRouter();
  const { user, signInWithGoogle, signInWithApple } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios' && env.appleSignInEnabled) {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
    }
  }, []);

  // Close the modal once a session exists.
  useEffect(() => {
    if (user) router.back();
  }, [user, router]);

  const run = async (signIn: () => Promise<SignInResult>) => {
    setBusy(true);
    setError(null);
    const result = await signIn();
    setBusy(false);
    if (!result.ok && !result.cancelled) setError(result.message);
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: 12, padding: 24 }}>
      <Text style={{ color: colors.accent, fontSize: 36, fontWeight: '800', textAlign: 'center' }}>Blip</Text>
      <Text style={{ color: colors.textMuted, textAlign: 'center', marginBottom: 12 }}>
        Sign in to attend meets, create your own and edit your profile.
      </Text>

      {appleAvailable && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
          cornerRadius={10}
          style={{ height: 48 }}
          onPress={() => run(signInWithApple)}
        />
      )}

      <Pressable
        disabled={busy}
        onPress={() => run(signInWithGoogle)}
        style={{ backgroundColor: colors.accent, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.6 : 1 }}
      >
        {busy ? <ActivityIndicator color="#000" /> : <Text style={{ color: '#000', fontWeight: '700' }}>Continue with Google</Text>}
      </Pressable>

      <Pressable onPress={() => router.back()} style={{ height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.textMuted }}>Browse as guest</Text>
      </Pressable>

      {error && <Text style={{ color: colors.accent, textAlign: 'center' }}>{error}</Text>}
    </View>
  );
}
