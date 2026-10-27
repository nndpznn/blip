import { formatAddress, formatMeetWhen, type MeetRecord } from '@blip/shared';
import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/theme';

interface Props {
  meet: MeetRecord;
  organizerName?: string;
  attendeeCount?: number;
  attending?: boolean;
  onPress: () => void;
}

/** Image banner across the top with the details below. About 250pt tall. */
const IMAGE_HEIGHT = 153;

export function MeetCard({ meet, organizerName, attendeeCount, attending, onPress }: Props) {
  const cover = meet.images?.[0];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 14,
        overflow: 'hidden',
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {cover ? (
        <Image source={{ uri: cover }} style={{ height: IMAGE_HEIGHT, width: '100%' }} contentFit="cover" transition={150} />
      ) : (
        <View style={{ height: IMAGE_HEIGHT, width: '100%', backgroundColor: 'rgba(248,113,113,0.12)' }} />
      )}
      <View style={{ paddingHorizontal: 12, paddingVertical: 10, gap: 2 }}>
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }} numberOfLines={1}>
          {meet.title}
        </Text>
        <Text style={{ color: colors.accent, fontWeight: '600', fontSize: 14 }} numberOfLines={1}>
          {formatMeetWhen(meet)}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 14 }} numberOfLines={1}>
          {formatAddress(meet.location?.address ?? '')}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
          <Text style={{ color: colors.textMuted, fontSize: 12, flexShrink: 1 }} numberOfLines={1}>
            {organizerName ? `by ${organizerName}` : ' '}
          </Text>
          <Text style={{ color: attending ? colors.accent : colors.textMuted, fontSize: 12, fontWeight: attending ? '700' : '400' }}>
            {attending ? 'Attending · ' : ''}
            {attendeeCount ?? 0} going
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
