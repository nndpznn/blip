import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/theme';

/** "+" that opens the create-meet screen (guests are sent to sign in by that screen). */
export function CreateMeetButton({ style }: { style?: StyleProp<ViewStyle> }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityLabel="Create meet"
      onPress={() => router.push('/meet/new')}
      hitSlop={8}
      style={[
        {
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.accent,
        },
        style,
      ]}
    >
      <Ionicons name="add" size={26} color="#000" />
    </Pressable>
  );
}
