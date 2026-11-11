import { charsRemaining, counterTone, type CounterTone } from '@blip/shared';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors } from '@/theme';

const TONE_COLOR: Record<CounterTone, string> = {
  normal: 'rgba(255,255,255,0.4)',
  warn: '#fbbf24',
  over: '#ef4444',
};

/**
 * A TextInput that shows how many characters are left in its bottom-right corner (turns amber near the
 * limit and red once over). The counter never intercepts touches. This only displays the limit; pass
 * `maxLength` too when typing past it should be blocked.
 */
export function CounterInput({ value, max, style, multiline, ...props }: TextInputProps & { value: string; max: number }) {
  const remaining = charsRemaining(value, max);
  const tone = counterTone(remaining, max);
  return (
    <View>
      <TextInput
        value={value}
        multiline={multiline}
        placeholderTextColor={colors.textMuted}
        style={[style, multiline ? { paddingBottom: 26 } : { paddingRight: 48 }]}
        {...props}
      />
      <Text
        pointerEvents="none"
        accessibilityLabel={remaining < 0 ? `${-remaining} characters over the limit` : `${remaining} characters left`}
        style={[styles.counter, { color: TONE_COLOR[tone], fontWeight: tone === 'over' ? '700' : '400' }]}
      >
        {remaining}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  counter: { position: 'absolute', right: 12, bottom: 8, fontSize: 12, fontVariant: ['tabular-nums'] },
});
