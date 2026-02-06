/**
 * Date utility functions for PayPlan Pro
 */

export const toYMD = (d) => {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Parse a YYYY-MM-DD string as local midnight (not UTC)
// This fixes timezone issues where "2024-02-15" becomes Feb 14th in some timezones
export const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

// Normalize a date to local midnight for consistent comparisons
export const toLocalMidnight = (d) => {
  const dt = new Date(d);
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
};

export const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);

export const addMonths = (d, n) => {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
};

export const sameMonth = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

export const idForInstance = (name, dueDate) =>
  `${name.replace(/\s+/g, '_')}_${toYMD(dueDate)}`;
