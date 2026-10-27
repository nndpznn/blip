/**
 * Supabase stores the whole session as one JSON string, which can be several KB.
 * SecureStore is designed for small values (Expo warns above ~2 KB), so this adapter
 * splits a value across numbered keys and stores a small "chunk count" record last,
 * so a half-finished write never reads back as a complete value.
 *
 * Pure (the store is injected) so it can be unit tested without a device.
 */
export interface KeyValueStore {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

/** Characters per chunk (ASCII-safe; keeps values well under the ~2 KB guidance). */
export const CHUNK_SIZE = 1000;

const META_PREFIX = 'chunks:';

const chunkKey = (key: string, i: number) => `${key}.${i}`;

export function createChunkedStorage(store: KeyValueStore, chunkSize: number = CHUNK_SIZE) {
  async function readCount(key: string): Promise<number | null> {
    const meta = await store.getItemAsync(key);
    if (meta == null || !meta.startsWith(META_PREFIX)) return null;
    const n = Number(meta.slice(META_PREFIX.length));
    return Number.isInteger(n) && n >= 0 ? n : null;
  }

  async function removeChunks(key: string, count: number) {
    for (let i = 0; i < count; i++) await store.deleteItemAsync(chunkKey(key, i));
  }

  return {
    async getItem(key: string): Promise<string | null> {
      const count = await readCount(key);
      if (count == null) return null;
      let value = '';
      for (let i = 0; i < count; i++) {
        const part = await store.getItemAsync(chunkKey(key, i));
        if (part == null) return null; // incomplete: treat as signed out rather than returning garbage
        value += part;
      }
      return value;
    },

    async setItem(key: string, value: string): Promise<void> {
      const previous = (await readCount(key)) ?? 0;
      const count = Math.max(1, Math.ceil(value.length / chunkSize));
      for (let i = 0; i < count; i++) {
        await store.setItemAsync(chunkKey(key, i), value.slice(i * chunkSize, (i + 1) * chunkSize));
      }
      await store.setItemAsync(key, `${META_PREFIX}${count}`);
      if (previous > count) {
        for (let i = count; i < previous; i++) await store.deleteItemAsync(chunkKey(key, i));
      }
    },

    async removeItem(key: string): Promise<void> {
      const count = await readCount(key);
      await store.deleteItemAsync(key);
      if (count != null) await removeChunks(key, count);
    },
  };
}
