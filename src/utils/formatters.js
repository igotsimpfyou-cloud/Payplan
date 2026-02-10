/**
 * Formatting utility functions for PayPlan Pro
 */

export const parseAmt = (v) => parseFloat(v || 0) || 0;

export const formatCurrency = (amount) => {
  return `$${parseAmt(amount).toFixed(2)}`;
};

export const formatDate = (date, options = {}) => {
  return new Date(date).toLocaleDateString('en-US', options);
};

export const formatDateShort = (date) => {
  return formatDate(date, { month: 'short', day: 'numeric' });
};

export const formatDateLong = (date) => {
  return formatDate(date, { month: 'long', day: 'numeric', year: 'numeric' });
};

export const formatMonth = (date) => {
  return formatDate(date, { month: 'long', year: 'numeric' });
};
