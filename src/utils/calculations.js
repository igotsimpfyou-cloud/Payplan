/**
 * Calculation utility functions for PayPlan Pro
 */

import { parseAmt } from './formatters';
import { toYMD } from './dateHelpers';

export const calculateAmortization = (asset) => {
  const principal = parseAmt(asset.currentBalance || asset.loanAmount);
  const annualRate = parseAmt(asset.interestRate) / 100;
  const payment = parseAmt(asset.paymentAmount);

  let periodsPerYear;
  switch (asset.paymentFrequency) {
    case 'weekly': periodsPerYear = 52; break;
    case 'biweekly': periodsPerYear = 26; break;
    case 'monthly': periodsPerYear = 12; break;
    case 'quarterly': periodsPerYear = 4; break;
    case 'annual': periodsPerYear = 1; break;
    default: periodsPerYear = 12;
  }

  const periodicRate = annualRate / periodsPerYear;
  let balance = principal;
  const schedule = [];
  let period = 0;
  let totalInterest = 0;
  const startDate = new Date(asset.startDate);

  while (balance > 0.01 && period < 1000) {
    period++;
    const interestPayment = balance * periodicRate;
    const principalPayment = Math.min(payment - interestPayment, balance);
    const totalPayment = interestPayment + principalPayment;
    balance -= principalPayment;
    totalInterest += interestPayment;

    const paymentDate = new Date(startDate);
    switch (asset.paymentFrequency) {
      case 'weekly': paymentDate.setDate(startDate.getDate() + (period * 7)); break;
      case 'biweekly': paymentDate.setDate(startDate.getDate() + (period * 14)); break;
      case 'monthly': paymentDate.setMonth(startDate.getMonth() + period); break;
      case 'quarterly': paymentDate.setMonth(startDate.getMonth() + (period * 3)); break;
      case 'annual': paymentDate.setFullYear(startDate.getFullYear() + period); break;
      default: paymentDate.setMonth(startDate.getMonth() + period);
    }

    schedule.push({
      period,
      date: toYMD(paymentDate),
      payment: totalPayment,
      principal: principalPayment,
      interest: interestPayment,
      balance: Math.max(0, balance)
    });
  }

  return { schedule, totalInterest, totalPayments: period, payoffDate: schedule[schedule.length - 1]?.date };
};

export const calculateNextPayDates = (paySchedule) => {
  if (!paySchedule?.nextPayDate) return [];

  const dates = [];
  const freq = paySchedule.frequency || 'biweekly';
  let d = new Date(paySchedule.nextPayDate);
  dates.push(new Date(d));

  for (let i = 0; i < 10; i++) {
    const x = new Date(d);
    switch (freq) {
      case 'weekly': x.setDate(x.getDate() + 7); break;
      case 'biweekly': x.setDate(x.getDate() + 14); break;
      case 'semimonthly':
        if (x.getDate() <= 15) x.setDate(15);
        else { x.setMonth(x.getMonth() + 1); x.setDate(1); }
        break;
      case 'monthly': x.setMonth(x.getMonth() + 1); break;
      default: x.setDate(x.getDate() + 14);
    }
    dates.push(x);
    d = x;
  }
  return dates;
};

export const monthlyTotal = (instances) =>
  instances.reduce((s, i) => s + parseAmt(i.actualPaid ?? i.amountEstimate), 0);
