import {
  encodeToGoogleMaps,
  formatAddress,
  formatMeetWhen,
  meetFetchStatus,
  type MeetLoadStatus,
  type MeetRecord,
} from '@blip/shared';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Pressable, ScrollView, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { displayName, fetchAttendeeSummary, fetchMeetById, fetchProfiles, type PublicProfile } from '@/lib/meets';
import { deleteMeet } from '@/lib/meetWrite';
import { setRsvp } from '@/lib/rsvp';
import { colors } from '@/theme';

const WIDTH = Dimensions.get('window').width;

export default function MeetDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  // The result is tagged with the id it was for, so a stale result never shows for a new id.
  const [result, setResult] = useState<{ id: string; meet: MeetRecord | null; status: MeetLoadStatus } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [organizer, setOrganizer] = useState<PublicProfile | undefined>();
  const [count, setCount] = useState(0);
  const [attending, setAttending] = useState(false);
  const [rsvpBusy, setRsvpBusy] = useState(false);

  // Refetch silently when returning to this screen (e.g. after editing), without flashing the loader.
  const focusedBefore = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focusedBefore.current) setReloadKey((k) => k + 1);
      focusedBefore.current = true;
    }, []),
  );

  const status: MeetLoadStatus = result && result.id === id ? result.status : 'loading';
  const meet = status === 'ready' ? result!.meet : null;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetchMeetById(id).then(({ data, error }) => {
      if (cancelled) return;
      const s = meetFetchStatus(error, data != null);
      if (s === 'error') console.warn('Error fetching the meet:', error);
      setResult({ id, meet: s === 'ready' ? data : null, status: s });
    });
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  // Organizer, attendee count and whether the signed-in user is attending.
  useEffect(() => {
    if (!meet) return;
    let cancelled = false;
    Promise.all([fetchProfiles([meet.organizerId]), fetchAttendeeSummary([meet.id])]).then(([profiles, summary]) => {
      if (cancelled) return;
      setOrganizer(profiles[meet.organizerId]);
      setCount(summary[String(meet.id)]?.count ?? 0);
      setAttending(summary[String(meet.id)]?.attending ?? false);
    });
    return () => {
      cancelled = true;
    };
  }, [meet, user?.id]);

  const toggleRsvp = useCallback(async () => {
    if (!meet || rsvpBusy) return;
    if (!user) {
      router.push('/sign-in');
      return;
    }
    setRsvpBusy(true);
    const next = !attending;
    const { error, changed } = await setRsvp(user.id, meet.id, next);
    setRsvpBusy(false);
    if (error) {
      console.warn('Error updating RSVP:', error);
      return;
    }
    if (changed) setCount((c) => (next ? c + 1 : Math.max(0, c - 1)));
    setAttending(next);
  }, [meet, user, attending, rsvpBusy, router]);

  const confirmDelete = () => {
    if (!meet) return;
    Alert.alert('Delete meet?', 'This permanently removes the meet and its images.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await deleteMeet(meet.id, meet.images ?? []);
          if (error) {
            Alert.alert('Could not delete', 'Could not delete this meet. Please try again.');
            return;
          }
          router.back();
        },
      },
    ]);
  };

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Stack.Screen options={{ title: 'Meet' }} />
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={{ color: colors.textMuted }}>Loading meet…</Text>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
        <Stack.Screen options={{ title: 'Meet' }} />
        <Text style={{ color: colors.text, fontSize: 18 }}>Couldn&apos;t load this meet.</Text>
        <Text style={{ color: colors.textMuted }}>Check your connection and try again.</Text>
        <Pressable
          onPress={() => {
            setResult(null);
            setReloadKey((k) => k + 1);
          }}
          style={{ backgroundColor: colors.accent, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 }}
        >
          <Text style={{ color: '#000', fontWeight: '700' }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!meet) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Stack.Screen options={{ title: 'Meet' }} />
        <Text style={{ color: colors.text, fontSize: 18, textAlign: 'center' }}>
          Meet data not found. Maybe it&apos;s TOO underground...
        </Text>
      </View>
    );
  }

  const images = meet.images ?? [];
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <Stack.Screen options={{ title: 'Meet' }} />
      {images.length > 0 && (
        <FlatList
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(url, i) => `${i}-${url}`}
          renderItem={({ item }) => <Image source={{ uri: item }} style={{ width: WIDTH, height: 260 }} contentFit="cover" />}
        />
      )}

      <View style={{ padding: 18, gap: 10 }}>
        <Text style={{ color: colors.text, fontSize: 26, fontWeight: '800' }}>{meet.title}</Text>
        <Text style={{ color: colors.accent, fontWeight: '600', fontSize: 16 }}>{formatMeetWhen(meet)}</Text>

        <Pressable
          onPress={() => Linking.openURL(encodeToGoogleMaps(meet.location.name, meet.location.coordinates))}
          style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 12 }}
        >
          <Text style={{ color: colors.text, fontWeight: '600' }}>{meet.location.name}</Text>
          <Text style={{ color: colors.textMuted }}>{formatAddress(meet.location.address)}</Text>
          <Text style={{ color: colors.accent, marginTop: 4, fontSize: 13 }}>Open in Google Maps</Text>
        </Pressable>

        {meet.body ? <Text style={{ color: colors.text, fontSize: 16, lineHeight: 23 }}>{meet.body}</Text> : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <Pressable onPress={() => router.push({ pathname: '/user/[id]', params: { id: meet.organizerId } })}>
            <Text style={{ color: colors.textMuted }}>
              Organized by <Text style={{ color: colors.accent }}>{displayName(organizer)}</Text>
            </Text>
          </Pressable>
          <Text style={{ color: colors.textMuted }}>{count} going</Text>
        </View>

        <Pressable
          disabled={rsvpBusy}
          onPress={toggleRsvp}
          style={{
            marginTop: 6,
            height: 48,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: attending ? colors.accent : 'rgba(255,255,255,0.15)',
            opacity: rsvpBusy ? 0.6 : 1,
          }}
        >
          <Text style={{ color: attending ? '#000' : colors.text, fontWeight: '700' }}>
            {!user ? 'Sign in to attend' : attending ? 'Attending!' : 'Attend'}
          </Text>
        </Pressable>

        {user?.id === meet.organizerId && (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={() => router.push({ pathname: '/meet/edit/[id]', params: { id: String(meet.id) } })}
              style={{ flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}
            >
              <Text style={{ color: colors.text, fontWeight: '600' }}>Edit</Text>
            </Pressable>
            <Pressable
              onPress={confirmDelete}
              style={{ flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.accent }}
            >
              <Text style={{ color: colors.accent, fontWeight: '600' }}>Delete</Text>
            </Pressable>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
