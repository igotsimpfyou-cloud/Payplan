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

// Parse a date string as local midnight (not UTC)
// Handles both YYYY-MM-DD and MMDDYYYY formats
// This fixes timezone issues where "2024-02-15" becomes Feb 14th in some timezones
export const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;

  // Check if it's MMDDYYYY format (8 digits, no dashes)
  if (/^\d{8}$/.test(dateStr)) {
    const mm = parseInt(dateStr.substring(0, 2), 10);
    const dd = parseInt(dateStr.substring(2, 4), 10);
    const yyyy = parseInt(dateStr.substring(4, 8), 10);
    return new Date(yyyy, mm - 1, dd);
  }

  // Otherwise assume YYYY-MM-DD format
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
