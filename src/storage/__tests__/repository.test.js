import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldSeedFromLegacy } from '../repository.js';

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
