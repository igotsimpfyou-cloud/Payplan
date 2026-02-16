import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBudgetActuals,
  monthKeyFromDate,
  normalizeBudgetsConfig,
  resolveBudgetCapsForMonth,
  upsertMonthlyBudgetCaps,
} from '../budgetEngine.js';

test('normalizes legacy budget object into phase 1C config', () => {
  const normalized = normalizeBudgetsConfig({ rent: 1000, groceries: 400 });

  assert.equal(normalized.version, 2);
  assert.equal(normalized.defaultCaps.rent, 1000);
  assert.equal(normalized.defaultCaps.groceries, 400);
  assert.equal(normalized.defaultCaps.other, 0);
  assert.equal(normalized.exclusions.excludeTransfers, true);
});

test('resolves month-specific caps and keeps history snapshots', () => {
  const normalized = normalizeBudgetsConfig({ rent: 1200 });
  const monthKey = monthKeyFromDate('2026-02-14');
  const updated = upsertMonthlyBudgetCaps(normalized, monthKey, { rent: 1400, groceries: 350 });

  const febCaps = resolveBudgetCapsForMonth(updated, monthKey);
  const marCaps = resolveBudgetCapsForMonth(updated, '2026-03');

  assert.equal(febCaps.rent, 1400);
  assert.equal(febCaps.groceries, 350);
  assert.equal(marCaps.rent, 1200);
});

test('calculates plan-vs-actual and excludes transfer/refund transactions', () => {
  const monthDate = new Date(2026, 1, 1);
  const budgetConfig = upsertMonthlyBudgetCaps(
    normalizeBudgetsConfig({ rent: 1200, groceries: 300 }),
    '2026-02',
    { groceries: 400 }
  );

  const results = calculateBudgetActuals({
    monthDate,
    budgetConfig,
    bills: [{ dueDate: '2026-02-03', category: 'rent', amount: 1200 }],
    receipts: [{ date: '2026-02-06', category: 'groceries', amount: 120 }],
    syncedTransactions: [
      { id: 't-1', postedAt: '2026-02-10', category: 'groceries', amount: 50, name: 'Store' },
      { id: 't-2', postedAt: '2026-02-11', category: 'other', amount: 100, name: 'Transfer to savings' },
      { id: 't-3', postedAt: '2026-02-12', category: 'other', amount: -20, name: 'Refund from merchant' },
    ],
  });

  const groceries = results.perCategory.find((x) => x.category === 'groceries');
  const rent = results.perCategory.find((x) => x.category === 'rent');

  assert.equal(groceries.assigned, 400);
  assert.equal(groceries.spent, 170);
  assert.equal(rent.spent, 1200);
  assert.equal(results.totals.spent, 1370);
  assert.equal(results.totals.totalIncome, 0);
});
