import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createChunkedStorage, type KeyValueStore } from './chunkedStorage';

function memoryStore() {
  const data = new Map<string, string>();
  const store: KeyValueStore = {
    getItemAsync: async (k) => data.get(k) ?? null,
    setItemAsync: async (k, v) => void data.set(k, v),
    deleteItemAsync: async (k) => void data.delete(k),
  };
  return { data, store };
}

test('round-trips a value larger than one chunk', async () => {
  const { store, data } = memoryStore();
  const storage = createChunkedStorage(store, 10);
  const value = 'x'.repeat(95);
  await storage.setItem('sb-token', value);
  assert.equal(await storage.getItem('sb-token'), value);
  assert.equal(data.get('sb-token'), 'chunks:10');
});

test('returns null for a key that was never set', async () => {
  const { store } = memoryStore();
  assert.equal(await createChunkedStorage(store).getItem('nope'), null);
});

test('stores an empty string', async () => {
  const { store } = memoryStore();
  const storage = createChunkedStorage(store, 10);
  await storage.setItem('k', '');
  assert.equal(await storage.getItem('k'), '');
});

test('overwriting with a shorter value removes the leftover chunks', async () => {
  const { store, data } = memoryStore();
  const storage = createChunkedStorage(store, 10);
  await storage.setItem('k', 'a'.repeat(50));
  await storage.setItem('k', 'b'.repeat(15));
  assert.equal(await storage.getItem('k'), 'b'.repeat(15));
  assert.deepEqual([...data.keys()].sort(), ['k', 'k.0', 'k.1']);
});

test('removeItem deletes the record and every chunk', async () => {
  const { store, data } = memoryStore();
  const storage = createChunkedStorage(store, 10);
  await storage.setItem('k', 'a'.repeat(35));
  await storage.removeItem('k');
  assert.equal(data.size, 0);
  assert.equal(await storage.getItem('k'), null);
});

test('a missing chunk reads back as null instead of a corrupted value', async () => {
  const { store, data } = memoryStore();
  const storage = createChunkedStorage(store, 10);
  await storage.setItem('k', 'a'.repeat(35));
  data.delete('k.2');
  assert.equal(await storage.getItem('k'), null);
});

test('a half-finished write (no count record yet) is not visible', async () => {
  const { store, data } = memoryStore();
  data.set('k.0', 'orphan');
  assert.equal(await createChunkedStorage(store, 10).getItem('k'), null);
});
