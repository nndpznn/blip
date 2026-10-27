import { isMeetInFuture, type MeetRecord, type MeetRow } from '@blip/shared';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Switch, Text, View } from 'react-native';

import { MeetCard } from '@/components/MeetCard';
import { displayName, fetchAttendeeSummary, fetchMeetsByOrganizer, type AttendeeSummary } from '@/lib/meets';
import { fetchProfile, isHexColor, type ProfileRow } from '@/lib/profiles';
import { colors } from '@/theme';

export default function UserProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [meets, setMeets] = useState<MeetRecord[]>([]);
  const [summary, setSummary] = useState<AttendeeSummary>({});
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [showPast, setShowPast] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      let cancelled = false;
      Promise.all([fetchProfile(id), fetchMeetsByOrganizer(id)]).then(async ([p, m]) => {
        if (cancelled) return;
        if (p.error || m.error) {
          setStatus('error');
          return;
        }
        setProfile(p.profile);
        setMeets(m.meets);
        const s = await fetchAttendeeSummary(m.meets.map((x) => x.id));
        if (cancelled) return;
        setSummary(s);
        setStatus('ready');
      });
      return () => {
        cancelled = true;
      };
    }, [id]),
  );

  const visible = useMemo(
    () => meets.filter((m) => isMeetInFuture(m as unknown as MeetRow) !== showPast),
    [meets, showPast],
  );

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Stack.Screen options={{ title: 'Profile' }} />
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  if (status === 'error' || !profile) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Stack.Screen options={{ title: 'Profile' }} />
        <Text style={{ color: colors.text, fontSize: 18, textAlign: 'center' }}>
          {status === 'error' ? "Couldn't load this profile." : 'User not found.'}
        </Text>
      </View>
    );
  }

  const accent = profile.profile_color && isHexColor(profile.profile_color) ? profile.profile_color : colors.accent;

  return (
    <FlatList
      data={visible}
      keyExtractor={(m) => String(m.id)}
      contentContainerStyle={{ padding: 16, gap: 14 }}
      ListHeaderComponent={
        <View style={{ gap: 12, marginBottom: 4 }}>
          <Stack.Screen options={{ title: profile.username ?? 'Profile' }} />
          <View style={{ borderRadius: 16, padding: 18, backgroundColor: accent, gap: 4 }}>
            <Text style={{ color: '#000', fontSize: 22, fontWeight: '800' }}>{displayName(profile)}</Text>
            {profile.fullname && profile.username ? <Text style={{ color: '#000', fontWeight: '600' }}>{profile.fullname}</Text> : null}
            {profile.headline ? <Text style={{ color: '#000' }}>{profile.headline}</Text> : null}
            {profile.bio ? <Text style={{ color: '#000', marginTop: 6 }}>{profile.bio}</Text> : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.textMuted }}>Show past meets</Text>
            <Switch value={showPast} onValueChange={setShowPast} trackColor={{ true: colors.accent }} />
          </View>
        </View>
      }
      renderItem={({ item }) => (
        <MeetCard
          meet={item}
          organizerName={displayName(profile)}
          attendeeCount={summary[String(item.id)]?.count}
          attending={summary[String(item.id)]?.attending}
          onPress={() => router.push({ pathname: '/meet/[id]', params: { id: String(item.id) } })}
        />
      )}
      ListEmptyComponent={<Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 40 }}>No {showPast ? 'past' : 'upcoming'} meets.</Text>}
    />
  );
}
