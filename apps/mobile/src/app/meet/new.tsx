import { Redirect, Stack, useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { EMPTY_MEET, MeetForm } from '@/components/MeetForm';
import { createMeet } from '@/lib/meetWrite';
import { colors } from '@/theme';

export default function NewMeet() {
  const router = useRouter();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  if (!user) return <Redirect href="/sign-in" />;

  return (
    <>
      <Stack.Screen options={{ title: 'New meet' }} />
      <MeetForm
        initial={EMPTY_MEET}
        userId={user.id}
        submitLabel="Create meet"
        onSubmit={async (draft) => {
          const { id, error } = await createMeet(user.id, draft);
          if (error || id == null) return error ?? 'Could not save the meet.';
          router.replace({ pathname: '/meet/[id]', params: { id: String(id) } });
          return null;
        }}
      />
    </>
  );
}
