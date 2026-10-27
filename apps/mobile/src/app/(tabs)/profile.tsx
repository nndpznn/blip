import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { fetchProfile, isHexColor, saveProfile, type ProfileRow } from '@/lib/profiles';
import { colors } from '@/theme';

const SWATCHES = ['#f87171', '#fb923c', '#facc15', '#4ade80', '#38bdf8', '#818cf8', '#c084fc', '#f472b6'];

const input = {
  color: colors.text,
  backgroundColor: colors.surface,
  borderColor: colors.border,
  borderWidth: 1,
  borderRadius: 12,
  padding: 12,
  fontSize: 16,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: colors.textMuted, fontSize: 13 }}>{label}</Text>
      {children}
    </View>
  );
}

export default function ProfileTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, loading, signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState('');
  const [fullname, setFullname] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [color, setColor] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const fillForm = (p: ProfileRow) => {
    setUsername(p.username ?? '');
    setFullname(p.fullname ?? '');
    setHeadline(p.headline ?? '');
    setBio(p.bio ?? '');
    setColor(p.profile_color ?? '');
    setFormError(null);
  };

  const userId = user?.id;
  useEffect(() => {
    if (loading) return;
    if (!userId) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    let cancelled = false;
    setProfileLoading(true);
    fetchProfile(userId).then(({ profile: p, error }) => {
      if (cancelled) return;
      setProfile(p);
      setLoadError(error);
      if (p) fillForm(p);
      setProfileLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, loading, reloadKey]);

  if (loading || profileLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  // Guests can browse the map and meets but not use profile features (same rule as the web app).
  if (!user) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>Sign in to see your profile</Text>
        <Text style={{ color: colors.textMuted, textAlign: 'center' }}>
          You can browse the map and meets without an account. Sign in to attend, create meets and edit your profile.
        </Text>
        <Link href="/sign-in" asChild>
          <Pressable style={{ backgroundColor: colors.accent, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 }}>
            <Text style={{ color: '#000', fontWeight: '700' }}>Sign in</Text>
          </Pressable>
        </Link>
        <Link href="/issue" asChild>
          <Pressable>
            <Text style={{ color: colors.accent, marginTop: 8 }}>Report an issue</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
        <Text style={{ color: colors.text, fontSize: 18 }}>{loadError ? "Couldn't load your profile." : 'Profile not found.'}</Text>
        <Pressable onPress={() => setReloadKey((k) => k + 1)} style={{ backgroundColor: colors.accent, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 }}>
          <Text style={{ color: '#000', fontWeight: '700' }}>Retry</Text>
        </Pressable>
        <Pressable onPress={signOut}>
          <Text style={{ color: colors.textMuted }}>Sign out</Text>
        </Pressable>
      </View>
    );
  }

  const save = async () => {
    if (saving) return;
    if (!username.trim()) {
      setFormError('Username is required.');
      return;
    }
    if (color.trim() && !isHexColor(color)) {
      setFormError('Profile color must look like #f87171.');
      return;
    }
    setFormError(null);
    setSaving(true);
    const result = await saveProfile(user.id, { username, fullname, headline, bio, profile_color: color.trim() });
    setSaving(false);
    if (result.usernameTaken) {
      setFormError(`Username "${username.trim()}" is already taken. Please choose a different one.`);
      return;
    }
    if (result.error || !result.profile) {
      setFormError(result.error ?? 'Could not save your profile.');
      return;
    }
    setProfile(result.profile);
    fillForm(result.profile);
    setEditing(false);
  };

  const accent = isHexColor(color) ? color : colors.accent;

  return (
    <ScrollView contentContainerStyle={{ padding: 18, paddingTop: insets.top + 12, gap: 14, paddingBottom: 60 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <View style={{ borderRadius: 16, padding: 18, backgroundColor: accent, gap: 4 }}>
        <Text style={{ color: '#000', fontSize: 22, fontWeight: '800' }}>{profile.username || profile.fullname || 'Your profile'}</Text>
        {profile.fullname ? <Text style={{ color: '#000', fontWeight: '600' }}>{profile.fullname}</Text> : null}
        {profile.headline ? <Text style={{ color: '#000' }}>{profile.headline}</Text> : null}
        {profile.bio ? <Text style={{ color: '#000', marginTop: 6 }}>{profile.bio}</Text> : null}
      </View>
      <Text style={{ color: colors.textMuted }}>{user.email}</Text>

      {editing ? (
        <View style={{ gap: 12 }}>
          <Field label="username">
            <TextInput value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} style={input} />
          </Field>
          <Field label="name">
            <TextInput value={fullname} onChangeText={setFullname} style={input} />
          </Field>
          <Field label="headline">
            <TextInput value={headline} onChangeText={setHeadline} style={input} />
          </Field>
          <Field label="bio">
            <TextInput value={bio} onChangeText={setBio} multiline style={[input, { minHeight: 90, textAlignVertical: 'top' }]} />
          </Field>
          <Field label="profile card color">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {SWATCHES.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setColor(c)}
                  style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c, borderWidth: color.toLowerCase() === c ? 3 : 0, borderColor: colors.text }}
                />
              ))}
            </View>
            <TextInput value={color} onChangeText={setColor} autoCapitalize="none" autoCorrect={false} placeholder="#f87171" placeholderTextColor={colors.textMuted} style={input} />
          </Field>
          {formError && <Text style={{ color: colors.accent }}>{formError}</Text>}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={() => {
                fillForm(profile);
                setEditing(false);
              }}
              style={{ flex: 1, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}
            >
              <Text style={{ color: colors.text, fontWeight: '600' }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={save}
              disabled={saving}
              style={{ flex: 1, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, opacity: saving ? 0.6 : 1 }}
            >
              {saving ? <ActivityIndicator color="#000" /> : <Text style={{ color: '#000', fontWeight: '700' }}>Save</Text>}
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable onPress={() => setEditing(true)} style={{ height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.text, fontWeight: '600' }}>Edit profile</Text>
        </Pressable>
      )}

      <Pressable
        onPress={() => router.push({ pathname: '/user/[id]', params: { id: user.id } })}
        style={{ height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}
      >
        <Text style={{ color: colors.text, fontWeight: '600' }}>My meets</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/issue')} style={{ height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}>
        <Text style={{ color: colors.text, fontWeight: '600' }}>Report an issue</Text>
      </Pressable>
      <Pressable
        onPress={() => Alert.alert('Sign out?', undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: signOut }])}
        style={{ height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ color: colors.accent, fontWeight: '600' }}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}
