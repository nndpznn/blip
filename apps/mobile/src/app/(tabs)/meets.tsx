import {
  initialCursor,
  nextCursor,
  type MeetCursor,
  type MeetRecord,
  type MeetSort,
} from '@blip/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { CreateMeetButton } from '@/components/CreateMeetButton';
import { MeetCard } from '@/components/MeetCard';
import { displayName, fetchAttendeeSummary, fetchMeetPage, fetchProfiles, type PublicProfile } from '@/lib/meets';
import { colors } from '@/theme';

const SORTS: Array<{ value: MeetSort; label: string }> = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'recent', label: 'Recent' },
];

export default function MeetsTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, loading: authLoading } = useAuth();

  const [sort, setSort] = useState<MeetSort>('upcoming');
  const [showPast, setShowPast] = useState(false);
  const [meets, setMeets] = useState<MeetRecord[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [attending, setAttending] = useState<Set<string>>(new Set());
  const [profiles, setProfiles] = useState<Record<string, PublicProfile>>({});
  const [error, setError] = useState<string | null>(null);
  const [firstLoading, setFirstLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  // Paging state lives in refs so scroll-triggered loads never see stale values.
  const cursorRef = useRef<MeetCursor | null>(null);
  const loadingRef = useRef(false);
  const generationRef = useRef(0); // bumped when the query changes so late responses are discarded
  const knownOrganizers = useRef<Set<string>>(new Set());

  const loadPage = useCallback(
    async (isFirstPage: boolean) => {
      const cursor = cursorRef.current;
      if (!cursor || loadingRef.current) return;
      const generation = generationRef.current;
      loadingRef.current = true;
      if (!isFirstPage) setLoadingMore(true);

      try {
        const { meets: page, error: fetchError } = await fetchMeetPage(cursor, sort);
        if (generation !== generationRef.current) return;
        if (fetchError) {
          setError('Could not load meets.');
          cursorRef.current = null;
          setHasMore(false);
          return;
        }
        setError(null);

        const next = nextCursor(cursor, sort, showPast, page.length);
        cursorRef.current = next;
        setHasMore(next !== null);
        setMeets((prev) => (isFirstPage ? page : [...prev, ...page]));
        if (page.length === 0) return;

        const newOrganizerIds = [...new Set(page.map((m) => m.organizerId).filter((id) => id && !knownOrganizers.current.has(id)))];
        newOrganizerIds.forEach((id) => knownOrganizers.current.add(id));
        const [summary, organizerProfiles] = await Promise.all([
          fetchAttendeeSummary(page.map((m) => m.id)),
          fetchProfiles(newOrganizerIds),
        ]);
        if (generation !== generationRef.current) return;

        setCounts((prev) => {
          const merged = { ...prev };
          for (const m of page) merged[String(m.id)] = summary[String(m.id)]?.count ?? 0;
          return merged;
        });
        setAttending((prev) => {
          const merged = new Set(prev);
          for (const m of page) if (summary[String(m.id)]?.attending) merged.add(String(m.id));
          return merged;
        });
        setProfiles((prev) => ({ ...prev, ...organizerProfiles }));
      } finally {
        if (generation === generationRef.current) {
          loadingRef.current = false;
          setFirstLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    [sort, showPast],
  );

  const restart = useCallback(() => {
    generationRef.current += 1;
    loadingRef.current = false;
    cursorRef.current = initialCursor(sort, showPast);
    knownOrganizers.current = new Set();
    void loadPage(true);
  }, [sort, showPast, loadPage]);

  // Reload when coming back to this tab (e.g. after creating or deleting a meet).
  const focusedBefore = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focusedBefore.current && !authLoading) restart();
      focusedBefore.current = true;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading]),
  );

  // (Re)start from page one when the query changes. Wait for auth so "attending" is right.
  // Depend on the user's id, not the object, which is replaced whenever the session refreshes.
  useEffect(() => {
    if (authLoading) return;
    restart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id, sort, showPast]);

  if (authLoading || (firstLoading && meets.length === 0)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={{ color: colors.textMuted }}>Connecting to Blip…</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={meets}
      keyExtractor={(m) => String(m.id)}
      contentContainerStyle={{ paddingBottom: 16 }}
      stickyHeaderIndices={[0]}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      ListHeaderComponent={
        <View style={{ backgroundColor: colors.background, paddingTop: insets.top + 6, paddingBottom: 10, paddingHorizontal: 16, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {SORTS.map((s) => (
              <Chip key={s.value} label={s.label} active={sort === s.value} onPress={() => setSort(s.value)} />
            ))}
            <Chip label="Past meets" active={showPast} onPress={() => setShowPast((v) => !v)} />
            <View style={{ flex: 1 }} />
            <CreateMeetButton style={{ width: 36, height: 36, borderRadius: 18 }} />
          </View>
          {error && <Text style={{ color: colors.accent }}>{error}</Text>}
        </View>
      }
      renderItem={({ item }) => (
        <View style={{ marginHorizontal: 16 }}>
        <MeetCard
          meet={item}
          organizerName={displayName(profiles[item.organizerId])}
          attendeeCount={counts[String(item.id)]}
          attending={attending.has(String(item.id))}
          onPress={() => router.push({ pathname: '/meet/[id]', params: { id: String(item.id) } })}
        />
        </View>
      )}
      ListEmptyComponent={
        !error ? <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 40 }}>No meets here yet.</Text> : undefined
      }
      ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.accent} style={{ margin: 16 }} /> : undefined}
      onEndReachedThreshold={0.6}
      onEndReached={() => {
        if (hasMore) void loadPage(false);
      }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={colors.accent}
          onRefresh={() => {
            setRefreshing(true);
            restart();
          }}
        />
      }
    />
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: active ? colors.accent : colors.border,
        backgroundColor: active ? 'rgba(248,113,113,0.15)' : 'transparent',
      }}
    >
      <Text style={{ color: active ? colors.accent : colors.textMuted, fontWeight: '600', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}
