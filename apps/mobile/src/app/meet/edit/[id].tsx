import { meetFetchStatus, type MeetLoadStatus, type MeetRecord } from '@blip/shared';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { MeetForm } from '@/components/MeetForm';
import { fetchMeetById } from '@/lib/meets';
import { updateMeet } from '@/lib/meetWrite';
import { colors } from '@/theme';

type MeetRow = MeetRecord & { links?: string | null };

export default function EditMeet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [result, setResult] = useState<{ id: string; meet: MeetRow | null; status: MeetLoadStatus } | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetchMeetById(id).then(({ data, error }) => {
      if (cancelled) return;
      const status = meetFetchStatus(error, data != null);
      setResult({ id, meet: status === 'ready' ? (data as MeetRow) : null, status });
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const status: MeetLoadStatus = result && result.id === id ? result.status : 'loading';
  const meet = status === 'ready' ? result!.meet : null;

  if (loading || status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  // Only the organizer may edit (RLS enforces this server-side too).
  if (!meet || !user || meet.organizerId !== user.id) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Stack.Screen options={{ title: 'Edit meet' }} />
        <Text style={{ color: colors.text, fontSize: 18, textAlign: 'center' }}>
          {status === 'error' ? "Couldn't load this meet." : 'You can only edit meets you organize.'}
        </Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Edit meet' }} />
      <MeetForm
        initial={{
          title: meet.title,
          body: meet.body,
          links: meet.links ?? '',
          location: meet.location,
          date: meet.date,
          startTime: meet.startTime,
          endTime: meet.endTime,
          images: meet.images ?? [],
        }}
        userId={user.id}
        submitLabel="Save changes"
        onSubmit={async (draft) => {
          const { error } = await updateMeet(user.id, meet.id, draft);
          if (error) return error;
          router.back();
          return null;
        }}
      />
    </>
  );
}
