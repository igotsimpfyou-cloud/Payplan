import { parseAmt } from './formatters.js';
import { parseLocalDate } from './dateHelpers.js';

export const BUDGET_CATEGORIES = [
  'utilities',
  'subscription',
  'insurance',
  'loan',
  'rent',
  'groceries',
  'dining',
  'transport',
  'shopping',
  'other',
];

export const createDefaultBudgetCaps = () => BUDGET_CATEGORIES.reduce((acc, category) => {
  acc[category] = 0;
  return acc;
}, {});

export const monthKeyFromDate = (dateValue) => {
  const date = dateValue instanceof Date ? dateValue : parseLocalDate(dateValue);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export const normalizeBudgetsConfig = (rawBudgets) => {
  const defaultCaps = createDefaultBudgetCaps();

  if (!rawBudgets || typeof rawBudgets !== 'object' || Array.isArray(rawBudgets)) {
    return {
      version: 2,
      defaultCaps,
      monthlyCaps: {},
      exclusions: { excludeTransfers: true, excludeRefunds: true, excludedTransactionIds: [] },
    };
  }

  if (rawBudgets.version === 2) {
    return {
      version: 2,
      defaultCaps: { ...defaultCaps, ...rawBudgets.defaultCaps },
      monthlyCaps: rawBudgets.monthlyCaps || {},
      exclusions: {
        excludeTransfers: rawBudgets.exclusions?.excludeTransfers ?? true,
        excludeRefunds: rawBudgets.exclusions?.excludeRefunds ?? true,
        excludedTransactionIds: Array.isArray(rawBudgets.exclusions?.excludedTransactionIds)
          ? rawBudgets.exclusions.excludedTransactionIds
          : [],
      },
    };
  }

  return {
    version: 2,
    defaultCaps: { ...defaultCaps, ...rawBudgets },
    monthlyCaps: {},
    exclusions: { excludeTransfers: true, excludeRefunds: true, excludedTransactionIds: [] },
  };
};

export const resolveBudgetCapsForMonth = (budgetConfig, monthKey) => {
  const normalized = normalizeBudgetsConfig(budgetConfig);
  return {
    ...normalized.defaultCaps,
    ...(normalized.monthlyCaps[monthKey] || {}),
  };
};

export const upsertMonthlyBudgetCaps = (budgetConfig, monthKey, capsPatch) => {
  const normalized = normalizeBudgetsConfig(budgetConfig);
  const currentCaps = resolveBudgetCapsForMonth(normalized, monthKey);

  return {
    ...normalized,
    monthlyCaps: {
      ...normalized.monthlyCaps,
      [monthKey]: {
        ...currentCaps,
        ...capsPatch,
      },
    },
  };
};

const isTransferTransaction = (transaction) => {
  const haystack = `${transaction.type || ''} ${transaction.category || ''} ${transaction.merchant || ''} ${transaction.name || ''}`.toLowerCase();
  return haystack.includes('transfer');
};

const isRefundTransaction = (transaction) => {
  const amount = parseAmt(transaction.amount);
  if (amount < 0) return true;
  const haystack = `${transaction.type || ''} ${transaction.category || ''} ${transaction.merchant || ''} ${transaction.name || ''}`.toLowerCase();
  return haystack.includes('refund');
};

export const calculateBudgetActuals = ({ monthDate, budgetConfig, bills = [], receipts = [], syncedTransactions = [] }) => {
  const monthKey = monthKeyFromDate(monthDate);
  const capsByCategory = resolveBudgetCapsForMonth(budgetConfig, monthKey);
  const normalized = normalizeBudgetsConfig(budgetConfig);

  const spentByCategory = BUDGET_CATEGORIES.reduce((acc, category) => {
    acc[category] = 0;
    return acc;
  }, {});

  let totalIncome = 0;

  const matchesMonth = (dateValue) => monthKeyFromDate(dateValue) === monthKey;

  bills.forEach((bill) => {
    if (!matchesMonth(bill.dueDate)) return;
    const category = BUDGET_CATEGORIES.includes(bill.category) ? bill.category : 'other';
    spentByCategory[category] += parseAmt(bill.actualPaid ?? bill.amountEstimate ?? bill.amount);
  });

  receipts.forEach((receipt) => {
    if (!matchesMonth(receipt.date)) return;
    const category = BUDGET_CATEGORIES.includes(receipt.category) ? receipt.category : 'other';
    spentByCategory[category] += parseAmt(receipt.amount);
  });

  syncedTransactions.forEach((transaction) => {
    const date = transaction.date || transaction.postedAt || transaction.postedDate;
    if (!date || !matchesMonth(date)) return;
    if (normalized.exclusions.excludedTransactionIds.includes(transaction.id)) return;
    if (normalized.exclusions.excludeTransfers && isTransferTransaction(transaction)) return;
    if (normalized.exclusions.excludeRefunds && isRefundTransaction(transaction)) return;

    const amount = parseAmt(transaction.amount);
    const category = BUDGET_CATEGORIES.includes(transaction.category) ? transaction.category : 'other';

    if (amount >= 0) spentByCategory[category] += amount;
    else totalIncome += Math.abs(amount);
  });

  const perCategory = BUDGET_CATEGORIES.map((category) => {
    const assigned = parseAmt(capsByCategory[category]);
    const spent = parseAmt(spentByCategory[category]);
    const remaining = assigned - spent;
    const percent = assigned > 0 ? (spent / assigned) * 100 : spent > 0 ? 100 : 0;
    return { category, assigned, spent, remaining, percent };
  });

  const totals = perCategory.reduce((acc, row) => {
    acc.assigned += row.assigned;
    acc.spent += row.spent;
    acc.remaining += row.remaining;
    return acc;
  }, { assigned: 0, spent: 0, remaining: 0 });

  return {
    monthKey,
    perCategory,
    totals: {
      ...totals,
      totalIncome,
      spentPercent: totals.assigned > 0 ? (totals.spent / totals.assigned) * 100 : 0,
    },
  };
};
