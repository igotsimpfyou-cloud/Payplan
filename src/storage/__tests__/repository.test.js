import test from 'node:test';
import assert from 'node:assert/strict';
import { hydrateLocalStorageFromElectronStorage, shouldSeedFromLegacy } from '../repository.js';

test('seeds from legacy when primary data is null and never seeded before', () => {
  assert.equal(shouldSeedFromLegacy(null, false), true);
});

test('seeds from legacy when primary array is empty and never seeded before', () => {
  assert.equal(shouldSeedFromLegacy([], false), true);
});

test('does not seed from legacy once collection is marked as seeded', () => {
  assert.equal(shouldSeedFromLegacy([], true), false);
  assert.equal(shouldSeedFromLegacy(null, true), false);
});

test('does not seed from legacy when primary already has records', () => {
  assert.equal(shouldSeedFromLegacy([{ id: 1 }], false), false);
});


test('hydrates localStorage from electron storage bridge', async () => {
  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;

  const writes = new Map();
  globalThis.localStorage = {
    setItem: (key, value) => {
      writes.set(key, value);
    },
  };

  globalThis.window = {
    electronStorage: {
      getAll: async () => ({
        plain: 'value',
        object: { foo: 'bar' },
        missing: null,
      }),
    },
  };

  await hydrateLocalStorageFromElectronStorage();

  assert.equal(writes.get('plain'), 'value');
  assert.equal(writes.get('object'), JSON.stringify({ foo: 'bar' }));
  assert.equal(writes.has('missing'), false);

  globalThis.window = originalWindow;
  globalThis.localStorage = originalLocalStorage;
});
