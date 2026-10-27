import { Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { colors } from '@/theme';

// The form id is public by design (it ships in the web bundle too). Override per build if it is ever rotated.
const FORM_ID = process.env.EXPO_PUBLIC_FORMSPREE_FORM_ID || 'xgonjape';
const ENDPOINT = `https://formspree.io/f/${FORM_ID}`;

const MAX_NAME = 100;
const MAX_EMAIL = 254;
const MAX_MESSAGE = 5000;

const input = {
  color: colors.text,
  backgroundColor: colors.surface,
  borderColor: colors.border,
  borderWidth: 1,
  borderRadius: 12,
  padding: 12,
  fontSize: 16,
};

export default function Issue() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const submit = async () => {
    if (status === 'submitting') return;
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('Please fill in name, email, and message.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setStatus('submitting');
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim(), _gotcha: '' }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || 'Something went wrong. Please try again.');
        setStatus('error');
        return;
      }
      setStatus('success');
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 }}>
        <Stack.Screen options={{ title: 'Report an issue' }} />
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>Thanks!</Text>
        <Text style={{ color: colors.textMuted, textAlign: 'center' }}>Your message was sent. We&apos;ll take a look.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 18, gap: 12 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <Stack.Screen options={{ title: 'Report an issue' }} />
      <TextInput value={name} onChangeText={setName} maxLength={MAX_NAME} placeholder="Name" placeholderTextColor={colors.textMuted} style={input} />
      <TextInput
        value={email}
        onChangeText={setEmail}
        maxLength={MAX_EMAIL}
        placeholder="Email"
        placeholderTextColor={colors.textMuted}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        style={input}
      />
      <TextInput
        value={message}
        onChangeText={setMessage}
        maxLength={MAX_MESSAGE}
        placeholder="What went wrong, or what would you like to see?"
        placeholderTextColor={colors.textMuted}
        multiline
        style={[input, { minHeight: 140, textAlignVertical: 'top' }]}
      />
      {error ? <Text style={{ color: colors.accent }}>{error}</Text> : null}
      <Pressable
        onPress={submit}
        disabled={status === 'submitting'}
        style={{ height: 50, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', opacity: status === 'submitting' ? 0.6 : 1 }}
      >
        {status === 'submitting' ? <ActivityIndicator color="#000" /> : <Text style={{ color: '#000', fontWeight: '700', fontSize: 16 }}>Send</Text>}
      </Pressable>
    </ScrollView>
  );
}
