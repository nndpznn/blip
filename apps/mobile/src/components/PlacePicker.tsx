import { searchPlaces, type LocationData, type PlaceSuggestion } from '@blip/shared';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { colors } from '@/theme';

const DEBOUNCE_MS = 350;

export const placeToLocation = (s: PlaceSuggestion): LocationData => ({
  name: s.name,
  address: s.address,
  mapbox_id: null,
  coordinates: s.coordinates,
  metadata: { category: s.category || 'address', is_poi: s.category != null },
});

/** Search-as-you-type California place picker (Photon). Shows the chosen place until changed. */
export function PlacePicker({
  value,
  onChange,
}: {
  value: LocationData | null;
  onChange: (location: LocationData | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setFailed(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const found = await searchPlaces(q, { signal: controller.signal });
        setResults(found);
        setFailed(false);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setFailed(true);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  if (value) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '600' }}>{value.name}</Text>
          <Text style={{ color: colors.textMuted }}>{value.address}</Text>
        </View>
        <Pressable
          onPress={() => {
            onChange(null);
            setQuery('');
          }}
        >
          <Text style={{ color: colors.accent, fontWeight: '600' }}>Change</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ gap: 6 }}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search for a place or address"
        placeholderTextColor={colors.textMuted}
        autoCorrect={false}
        style={{ color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16 }}
      />
      {searching && <ActivityIndicator color={colors.accent} />}
      {failed && <Text style={{ color: colors.accent }}>Search failed. Check your connection and keep typing to retry.</Text>}
      {results.map((s) => (
        <Pressable
          key={s.id}
          onPress={() => {
            onChange(placeToLocation(s));
            setResults([]);
          }}
          style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 12 }}
        >
          <Text style={{ color: colors.text, fontWeight: '600' }}>{s.name}</Text>
          <Text style={{ color: colors.textMuted }} numberOfLines={1}>
            {s.address}
          </Text>
        </Pressable>
      ))}
      {!searching && !failed && query.trim().length >= 2 && results.length === 0 && (
        <Text style={{ color: colors.textMuted }}>No places found in California.</Text>
      )}
    </View>
  );
}
