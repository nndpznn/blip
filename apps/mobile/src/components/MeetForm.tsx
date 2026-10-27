import DateTimePicker from '@react-native-community/datetimepicker';
import {
  MEET_IMAGE_MAX_BYTES,
  MEET_IMAGE_MAX_COUNT,
  MEET_TITLE_MAX_LENGTH,
  filesWithinMeetImageLimit,
  fromColumns,
  isMeetImageOverLimit,
  toDateColumn,
  toTimeColumn,
  validateMeetForm,
  type LocationData,
} from '@blip/shared';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { removeUploadedImages, uploadMeetImage, type MeetDraft, type PendingImage } from '@/lib/meetWrite';
import { colors } from '@/theme';

import { PlacePicker } from './PlacePicker';

type ImageSlot =
  | { key: string; kind: 'existing'; url: string }
  | { key: string; kind: 'pending'; image: PendingImage; size: number };

export interface MeetFormInitial {
  title: string;
  body: string;
  links: string;
  location: LocationData | null;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  images: string[];
}

export const EMPTY_MEET: MeetFormInitial = {
  title: '',
  body: '',
  links: '',
  location: null,
  date: null,
  startTime: null,
  endTime: null,
  images: [],
};

type PickerField = 'date' | 'start' | 'end';

const formatTime = (d: Date) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

let slotCounter = 0;
const nextKey = () => `slot-${++slotCounter}`;

const labelStyle = { color: colors.text, fontSize: 16, fontWeight: '700' as const, marginTop: 18, marginBottom: 6 };
const inputStyle = {
  color: colors.text,
  backgroundColor: colors.surface,
  borderColor: colors.border,
  borderWidth: 1,
  borderRadius: 12,
  padding: 12,
  fontSize: 16,
};

/** Shared create/edit form. `onSubmit` receives a validated draft whose images are already uploaded. */
export function MeetForm({
  initial,
  userId,
  submitLabel,
  onSubmit,
}: {
  initial: MeetFormInitial;
  userId: string;
  submitLabel: string;
  onSubmit: (draft: MeetDraft) => Promise<string | null>;
}) {
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [links, setLinks] = useState(initial.links);
  const [location, setLocation] = useState<LocationData | null>(initial.location);
  const [date, setDate] = useState<Date | null>(fromColumns(initial.date));
  const [startTime, setStartTime] = useState<Date | null>(initial.startTime ? fromColumns(initial.date ?? '1970-01-01', initial.startTime) : null);
  const [endTime, setEndTime] = useState<Date | null>(initial.endTime ? fromColumns(initial.date ?? '1970-01-01', initial.endTime) : null);
  const [slots, setSlots] = useState<ImageSlot[]>(initial.images.map((url) => ({ key: nextKey(), kind: 'existing', url })));
  // Which date/time picker is expanded, and the value it currently shows. A field stays empty until the user picks.
  const [active, setActive] = useState<PickerField | null>(null);
  const [draft, setDraft] = useState<Date>(new Date());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickImages = async () => {
    if (slots.length >= MEET_IMAGE_MAX_COUNT) {
      Alert.alert('Too many images', `A meet can have at most ${MEET_IMAGE_MAX_COUNT} images. Remove one to add another.`);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MEET_IMAGE_MAX_COUNT - slots.length,
      quality: 0.85,
    });
    if (result.canceled) return;

    const picked = result.assets.map((a) => ({
      name: a.fileName ?? a.uri.split('/').pop() ?? 'photo.jpg',
      size: a.fileSize ?? 0,
      image: { uri: a.uri, name: a.fileName ?? a.uri.split('/').pop() ?? 'photo.jpg', mimeType: a.mimeType ?? 'image/jpeg' },
    }));
    const underSize = picked.filter((p) => !isMeetImageOverLimit(p));
    const oversized = picked.filter((p) => isMeetImageOverLimit(p)).map((p) => p.name);
    const { accepted, skippedNames } = filesWithinMeetImageLimit(slots.length, underSize);

    if (oversized.length > 0) {
      Alert.alert('Images too large', `These exceed the ${MEET_IMAGE_MAX_BYTES / 1024 / 1024} MB limit and were not added:\n${oversized.join('\n')}`);
    } else if (skippedNames.length > 0) {
      Alert.alert('Too many images', `A meet can have at most ${MEET_IMAGE_MAX_COUNT} images. These were not added:\n${skippedNames.join('\n')}`);
    }
    setSlots((prev) => [...prev, ...accepted.map((p): ImageSlot => ({ key: nextKey(), kind: 'pending', image: p.image, size: p.size }))]);
  };

  const move = (index: number, delta: -1 | 1) =>
    setSlots((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const submit = async () => {
    if (saving) return;
    const validation = validateMeetForm({
      title,
      body,
      address: location?.address ?? null,
      date: date ? toDateColumn(date) : null,
      startTime: startTime ? toTimeColumn(startTime) : null,
      endTime: endTime ? toTimeColumn(endTime) : null,
    });
    if (validation) {
      setError(validation);
      return;
    }

    setError(null);
    setSaving(true);
    const uploaded: string[] = [];
    try {
      const finalImages: string[] = [];
      for (const slot of slots) {
        if (slot.kind === 'existing') {
          finalImages.push(slot.url);
          continue;
        }
        const { url, error: uploadError } = await uploadMeetImage(userId, slot.image);
        if (!url) throw new Error(uploadError ?? 'Image upload failed.');
        uploaded.push(url);
        finalImages.push(url);
      }

      const failure = await onSubmit({
        title,
        body,
        links,
        location: location!,
        date: toDateColumn(date!),
        startTime: toTimeColumn(startTime!),
        endTime: toTimeColumn(endTime!),
        images: finalImages,
      });
      if (failure) throw new Error(failure);
    } catch (err) {
      // Don't leave orphaned uploads behind when the save fails.
      if (uploaded.length > 0) await removeUploadedImages(uploaded);
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const setField = (field: PickerField, d: Date) => {
    if (field === 'date') setDate(d);
    else if (field === 'start') setStartTime(d);
    else setEndTime(d);
  };

  const togglePicker = (field: PickerField) => {
    if (active === field) {
      setActive(null);
      return;
    }
    const current = field === 'date' ? date : field === 'start' ? startTime : endTime;
    const fallback =
      field === 'date'
        ? new Date()
        : field === 'start'
          ? fromColumns('1970-01-01', '18:00')!
          : startTime
            ? new Date(startTime.getTime() + 60 * 60 * 1000)
            : fromColumns('1970-01-01', '20:00')!;
    setDraft(current ?? fallback);
    setActive(field);
  };

  const picker = (field: PickerField) =>
    active === field ? (
      <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, marginTop: 8, paddingBottom: 8 }}>
        <DateTimePicker
          mode={field === 'date' ? 'date' : 'time'}
          display={field === 'date' ? 'inline' : 'spinner'}
          themeVariant="dark"
          accentColor={colors.accent}
          value={draft}
          minimumDate={field === 'date' ? new Date() : undefined}
          onValueChange={(_, d) => {
            setDraft(d);
            setField(field, d);
            if (field === 'date') setActive(null);
          }}
        />
        <Pressable
          onPress={() => {
            setField(field, draft);
            setActive(null);
          }}
          style={{ alignSelf: 'flex-end', marginRight: 14, paddingVertical: 6, paddingHorizontal: 12 }}
        >
          <Text style={{ color: colors.accent, fontWeight: '700' }}>Done</Text>
        </Pressable>
      </View>
    ) : null;

  const fieldButton = (field: PickerField, value: Date | null, placeholder: string, format: (d: Date) => string) => (
    <Pressable
      onPress={() => togglePicker(field)}
      style={[inputStyle, { paddingVertical: 12, flex: 1, borderColor: active === field ? colors.accent : colors.border }]}
    >
      <Text style={{ color: value ? colors.text : colors.textMuted, fontSize: 16 }}>{value ? format(value) : placeholder}</Text>
    </Pressable>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 60 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <Text style={labelStyle}>
        Title <Text style={{ color: colors.textMuted, fontWeight: '400' }}>({MEET_TITLE_MAX_LENGTH} chars max)</Text>
      </Text>
      <TextInput value={title} onChangeText={setTitle} maxLength={MEET_TITLE_MAX_LENGTH + 10} style={inputStyle} placeholderTextColor={colors.textMuted} />

      <Text style={labelStyle}>Body</Text>
      <TextInput value={body} onChangeText={setBody} multiline style={[inputStyle, { minHeight: 110, textAlignVertical: 'top' }]} placeholderTextColor={colors.textMuted} />

      <Text style={labelStyle}>Location</Text>
      <PlacePicker value={location} onChange={setLocation} />

      <Text style={labelStyle}>Links (optional)</Text>
      <TextInput value={links} onChangeText={setLinks} autoCapitalize="none" autoCorrect={false} keyboardType="url" style={inputStyle} placeholderTextColor={colors.textMuted} />

      <Text style={labelStyle}>Date</Text>
      <View style={{ flexDirection: 'row' }}>
        {fieldButton('date', date, 'Select a date', (d) =>
          d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
        )}
      </View>
      {picker('date')}

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={labelStyle}>Start time</Text>
          <View style={{ flexDirection: 'row' }}>{fieldButton('start', startTime, 'Select', formatTime)}</View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={labelStyle}>End time</Text>
          <View style={{ flexDirection: 'row' }}>{fieldButton('end', endTime, 'Select', formatTime)}</View>
        </View>
      </View>
      {picker('start')}
      {picker('end')}

      <Text style={labelStyle}>Images</Text>
      <Text style={{ color: colors.textMuted, marginBottom: 8 }}>
        Max {MEET_IMAGE_MAX_BYTES / 1024 / 1024} MB each, up to {MEET_IMAGE_MAX_COUNT}. The first image is the thumbnail.
      </Text>
      {slots.map((slot, i) => (
        <View key={slot.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 8 }}>
          <Image source={{ uri: slot.kind === 'existing' ? slot.url : slot.image.uri }} style={{ width: 56, height: 56, borderRadius: 8 }} contentFit="cover" />
          <Text style={{ color: colors.textMuted, flex: 1 }} numberOfLines={1}>
            {slot.kind === 'existing' ? decodeURIComponent(slot.url.split('/').pop() ?? 'image') : slot.image.name}
          </Text>
          <Pressable disabled={i === 0} onPress={() => move(i, -1)} hitSlop={8}>
            <Text style={{ color: i === 0 ? colors.border : colors.text, fontSize: 20 }}>↑</Text>
          </Pressable>
          <Pressable disabled={i === slots.length - 1} onPress={() => move(i, 1)} hitSlop={8}>
            <Text style={{ color: i === slots.length - 1 ? colors.border : colors.text, fontSize: 20 }}>↓</Text>
          </Pressable>
          <Pressable onPress={() => setSlots((prev) => prev.filter((s) => s.key !== slot.key))} hitSlop={8}>
            <Text style={{ color: colors.accent, fontSize: 18 }}>✕</Text>
          </Pressable>
        </View>
      ))}
      <Pressable
        onPress={pickImages}
        disabled={slots.length >= MEET_IMAGE_MAX_COUNT}
        style={{ borderColor: colors.accent, borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center', opacity: slots.length >= MEET_IMAGE_MAX_COUNT ? 0.4 : 1 }}
      >
        <Text style={{ color: colors.accent, fontWeight: '700' }}>Add photos ({slots.length}/{MEET_IMAGE_MAX_COUNT})</Text>
      </Pressable>

      {error && <Text style={{ color: colors.accent, marginTop: 18, fontSize: 15 }}>{error}</Text>}

      <Pressable
        onPress={submit}
        disabled={saving}
        style={{ marginTop: 24, height: 50, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', opacity: saving ? 0.6 : 1 }}
      >
        {saving ? <ActivityIndicator color="#000" /> : <Text style={{ color: '#000', fontWeight: '700', fontSize: 16 }}>{submitLabel}</Text>}
      </Pressable>
    </ScrollView>
  );
}
