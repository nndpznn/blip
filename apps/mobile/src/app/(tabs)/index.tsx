import {
  MAP_TEXT_FONT,
  groupMeetsByLocation,
  locationKey,
  meetsToFeatureCollection,
  type MeetRecord,
} from '@blip/shared';
import { Camera, GeoJSONSource, Layer, Map, type CameraRef, type GeoJSONSourceRef } from '@maplibre/maplibre-react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CreateMeetButton } from '@/components/CreateMeetButton';
import { MeetCard } from '@/components/MeetCard';
import { fetchUpcomingMapMeets } from '@/lib/meets';
import { useMapStyle } from '@/lib/mapStyle';
import { colors } from '@/theme';

/** San Francisco, same default as the web map. [lng, lat] */
const DEFAULT_CENTER: [number, number] = [-122.4194, 37.7749];

export default function MapTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapStyle = useMapStyle();
  const cameraRef = useRef<CameraRef>(null);
  const sourceRef = useRef<GeoJSONSourceRef>(null);

  const [meets, setMeets] = useState<MeetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Reload whenever the tab is focused so meets created or deleted elsewhere show up.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      fetchUpcomingMapMeets().then(({ meets: rows, error: fetchError }) => {
        if (cancelled) return;
        setMeets(rows);
        setError(fetchError ? 'Could not load meets.' : null);
        setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const features = useMemo(() => meetsToFeatureCollection(meets), [meets]);
  const groups = useMemo(() => groupMeetsByLocation(meets), [meets]);
  const selected = selectedKey ? (groups.get(selectedKey) ?? []) : [];

  return (
    <View style={{ flex: 1 }}>
      <Map
        style={{ flex: 1 }}
        mapStyle={mapStyle}
        logo={false}
        onPress={() => setSelectedKey(null)}
      >
        <Camera ref={cameraRef} initialViewState={{ center: DEFAULT_CENTER, zoom: 10 }} />

        <GeoJSONSource
          ref={sourceRef}
          id="meets"
          data={features}
          cluster
          clusterRadius={50}
          clusterMaxZoom={14}
          onPress={async (event) => {
            const feature = event.nativeEvent.features[0];
            if (!feature || feature.geometry.type !== 'Point') return;
            const coordinates = feature.geometry.coordinates as [number, number];
            const props = feature.properties ?? {};

            if (typeof props.cluster_id === 'number') {
              // A cluster: zoom in until it breaks apart.
              setSelectedKey(null);
              const zoom = await sourceRef.current?.getClusterExpansionZoom(props.cluster_id);
              cameraRef.current?.easeTo({ center: coordinates, zoom: (zoom ?? 12) + 0.5, duration: 400 });
              return;
            }
            // A single place (possibly several meets there).
            setSelectedKey(typeof props.key === 'string' ? props.key : locationKey(coordinates));
          }}
        >
          <Layer
            id="clusters"
            type="circle"
            filter={['has', 'point_count']}
            paint={{
              'circle-color': colors.accent,
              'circle-radius': ['step', ['get', 'point_count'], 16, 10, 22, 30, 28],
              'circle-opacity': 0.9,
            }}
          />
          <Layer
            id="cluster-count"
            type="symbol"
            filter={['has', 'point_count']}
            layout={{ 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 14, 'text-font': MAP_TEXT_FONT }}
            paint={{ 'text-color': '#ffffff' }}
          />
          <Layer
            id="meet-points"
            type="circle"
            filter={['!', ['has', 'point_count']]}
            paint={{
              'circle-color': colors.accent,
              'circle-radius': 8,
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
            }}
          />
        </GeoJSONSource>
      </Map>

      <CreateMeetButton style={{ position: 'absolute', top: insets.top + 8, right: 16, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }} />

      {loading && (
        <View pointerEvents="none" style={{ position: 'absolute', top: insets.top + 12, alignSelf: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )}
      {error && (
        <View style={{ position: 'absolute', top: insets.top + 12, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.8)', padding: 10, borderRadius: 10 }}>
          <Text style={{ color: colors.accent }}>{error}</Text>
        </View>
      )}
      {!loading && !error && meets.length === 0 && (
        <View pointerEvents="none" style={{ position: 'absolute', top: insets.top + 12, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.7)', padding: 10, borderRadius: 10 }}>
          <Text style={{ color: colors.textMuted }}>No upcoming meets yet</Text>
        </View>
      )}

      {selected.length > 0 && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 12 }}>
          <FlatList
            data={selected}
            horizontal
            keyExtractor={(m) => String(m.id)}
            contentContainerStyle={{ paddingHorizontal: 12, gap: 10 }}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable style={{ width: 300, backgroundColor: 'rgba(13,13,13,0.95)', borderRadius: 14 }}>
                <MeetCard
                  meet={item}
                  onPress={() => router.push({ pathname: '/meet/[id]', params: { id: String(item.id) } })}
                />
              </Pressable>
            )}
          />
        </View>
      )}
    </View>
  );
}
