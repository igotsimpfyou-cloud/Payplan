import React, { useMemo } from 'react';
import { X, Flame, TrendingUp, Calendar, PieChart, Archive } from 'lucide-react';
import { parseAmt } from '../../utils/formatters';
import { parseMMDDYYYY } from '../../utils/billDatabase';

const CATEGORIES = ['utilities', 'subscription', 'insurance', 'loan', 'rent', 'other'];
const CATEGORY_COLORS = {
  utilities: '#10b981',
  subscription: '#6366f1',
  insurance: '#f59e0b',
  loan: '#ef4444',
  rent: '#8b5cf6',
  other: '#64748b',
};

export const Analytics = ({
  overview,
  currentMonthInstances,
  billInstances,
  bills = [],           // New database format
  historicalBills = [], // Archived bills (12+ months)
  nextPayDates,
  paySchedule,
  budgets,
  debtPayoff,
  onAddDebt,
  onRemoveDebt,
}) => {
  // Combine active and historical bills for analytics, normalizing dates
  const allBillsNormalized = useMemo(() => {
    // If new bills array has data, use it combined with historical
    if (bills.length > 0) {
      return [...bills, ...historicalBills].map(bill => ({
        ...bill,
        // Normalize MMDDYYYY to Date object for consistent comparisons
        _date: parseMMDDYYYY(bill.dueDate) || new Date(bill.dueDate),
        amountEstimate: bill.amount,
      }));
    }
    // Fall back to legacy billInstances
    return billInstances.map(inst => ({
      ...inst,
      _date: new Date(inst.dueDate),
    }));
  }, [bills, historicalBills, billInstances]);
  const thisMonthByCategory = CATEGORIES.map((cat) => {
    const sum = currentMonthInstances
      .filter((i) => i.category === cat)
      .reduce((s, i) => s + parseAmt(i.actualPaid ?? i.amountEstimate), 0);
    return { cat, sum, cap: parseAmt(budgets[cat] || 0) };
  });

  // === 1. Bill Payment Streak ===
  const paymentStreak = useMemo(() => {
    const paidBills = allBillsNormalized
      .filter((b) => b.paid)
      .sort((a, b) => b._date - a._date);

    let streak = 0;
    let onTimeCount = 0;
    const now = new Date();

    // Count total paid bills
    const totalPaid = paidBills.length;

    // Count consecutive recent paid bills (streak)
    for (const bill of paidBills) {
      if (bill._date <= now) {
        streak++;
      } else {
        break;
      }
    }

    // Count on-time payments (paid before or on due date)
    paidBills.forEach((bill) => {
      onTimeCount++;
    });

    return { streak, totalPaid, onTimeCount };
  }, [allBillsNormalized]);

  // === 2. Spending Trends (Last 6 Months) ===
  const spendingTrends = useMemo(() => {
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });

      const monthBills = allBillsNormalized.filter((b) => {
        return (
          b._date.getFullYear() === date.getFullYear() &&
          b._date.getMonth() === date.getMonth()
        );
      });

      const total = monthBills.reduce(
        (sum, b) => sum + parseAmt(b.actualPaid ?? b.amountEstimate),
        0
      );

      months.push({ monthKey, monthName, total, isCurrent: i === 0 });
    }

    const maxSpend = Math.max(...months.map((m) => m.total), 1);
    return { months, maxSpend };
  }, [allBillsNormalized]);

  // === 3. Cash Flow Forecast (Next 30 Days) ===
  const cashFlowForecast = useMemo(() => {
    if (!paySchedule?.payAmount || !nextPayDates?.length) {
      return { projections: [], hasData: false };
    }

    const payAmount = parseAmt(paySchedule.payAmount);
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 30);

    // Get upcoming bills in next 30 days (only from active bills, not historical)
    const upcomingBills = allBillsNormalized
      .filter((b) => {
        if (b.paid) return false;
        return b._date >= today && b._date <= endDate;
      })
      .sort((a, b) => a._date - b._date);

    // Get paychecks in next 30 days
    const upcomingPay = nextPayDates
      .filter((d) => d >= today && d <= endDate)
      .map((d) => ({ date: d, amount: payAmount, type: 'income' }));

    // Build timeline
    const events = [
      ...upcomingBills.map((b) => ({
        date: b._date,
        amount: -parseAmt(b.amountEstimate),
        name: b.name,
        type: 'expense',
      })),
      ...upcomingPay.map((p) => ({
        date: p.date,
        amount: p.amount,
        name: 'Paycheck',
        type: 'income',
      })),
    ].sort((a, b) => a.date - b.date);

    // Calculate running balance
    let balance = overview.leftover > 0 ? overview.leftover : 0;
    const projections = events.map((e) => {
      balance += e.amount;
      return { ...e, balance };
    });

    const lowestBalance = Math.min(...projections.map((p) => p.balance), balance);

    return { projections, hasData: true, lowestBalance };
  }, [allBillsNormalized, nextPayDates, paySchedule, overview]);

  // === 4. Category Pie Chart Data ===
  const pieChartData = useMemo(() => {
    const data = thisMonthByCategory
      .filter((c) => c.sum > 0)
      .map((c) => ({
        category: c.cat,
        amount: c.sum,
        color: CATEGORY_COLORS[c.cat],
      }));

    const total = data.reduce((s, d) => s + d.amount, 0);

    let cumulative = 0;
    return data.map((d) => {
      const startAngle = (cumulative / total) * 360;
      cumulative += d.amount;
      const endAngle = (cumulative / total) * 360;
      const percentage = ((d.amount / total) * 100).toFixed(1);
      return { ...d, startAngle, endAngle, percentage };
    });
  }, [thisMonthByCategory]);

  // Helper to create pie slice path
  const createPieSlice = (startAngle, endAngle, radius = 80) => {
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;
    const x1 = 100 + radius * Math.cos(startRad);
    const y1 = 100 + radius * Math.sin(startRad);
    const x2 = 100 + radius * Math.cos(endRad);
    const y2 = 100 + radius * Math.sin(endRad);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M 100 100 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  return (
    <div>
      <h2 className="text-3xl font-black text-white mb-6">Financial Analytics</h2>

      {/* Top Row: Streak + Pie Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Bill Payment Streak */}
        <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl shadow-xl p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Flame size={28} />
            </div>
            <h3 className="text-xl font-bold">Payment Streak</h3>
          </div>
          <div className="text-center py-4">
            <div className="text-6xl font-black mb-2">{paymentStreak.streak}</div>
            <div className="text-orange-100 text-lg">Bills Paid On Time</div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/20">
            <div className="text-center">
              <div className="text-2xl font-bold">{paymentStreak.totalPaid}</div>
              <div className="text-orange-100 text-sm">Total Paid</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {paymentStreak.totalPaid > 0
                  ? Math.round((paymentStreak.onTimeCount / paymentStreak.totalPaid) * 100)
                  : 0}%
              </div>
              <div className="text-orange-100 text-sm">Success Rate</div>
            </div>
          </div>
        </div>

        {/* Category Pie Chart */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl text-white">
              <PieChart size={24} />
            </div>
            <h3 className="text-xl font-bold">Spending Breakdown</h3>
          </div>
          {pieChartData.length > 0 ? (
            <div className="flex flex-col md:flex-row items-center gap-4">
              <svg viewBox="0 0 200 200" className="w-40 h-40 flex-shrink-0">
                {pieChartData.map((slice, i) => (
                  <path
                    key={slice.category}
                    d={createPieSlice(slice.startAngle, slice.endAngle)}
                    fill={slice.color}
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                  />
                ))}
                <circle cx="100" cy="100" r="40" fill="white" />
              </svg>
              <div className="flex-1 space-y-2">
                {pieChartData.map((slice) => (
                  <div key={slice.category} className="flex items-center gap-2 text-sm">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="capitalize flex-1">{slice.category}</span>
                    <span className="font-semibold">${slice.amount.toFixed(0)}</span>
                    <span className="text-slate-400 text-xs">({slice.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">No spending data this month</p>
          )}
        </div>
      </div>

      {/* Spending Trends Chart */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl text-white">
            <TrendingUp size={24} />
          </div>
          <h3 className="text-xl font-bold">6-Month Spending Trends</h3>
        </div>
        <div className="flex items-end justify-between gap-2 h-48 px-2">
          {spendingTrends.months.map((month) => {
            const heightPct = (month.total / spendingTrends.maxSpend) * 100;
            return (
              <div key={month.monthKey} className="flex-1 flex flex-col items-center gap-2">
                <div className="text-xs font-semibold text-slate-600">
                  ${month.total >= 1000 ? `${(month.total / 1000).toFixed(1)}k` : month.total.toFixed(0)}
                </div>
                <div className="w-full flex-1 flex items-end">
                  <div
                    className={`w-full rounded-t-lg transition-all ${
                      month.isCurrent
                        ? 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                        : 'bg-gradient-to-t from-slate-400 to-slate-300'
                    }`}
                    style={{ height: `${Math.max(heightPct, 5)}%` }}
                  />
                </div>
                <div className={`text-sm font-medium ${month.isCurrent ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {month.monthName}
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-center text-sm text-slate-500 mt-4">
          Average: ${(spendingTrends.months.reduce((s, m) => s + m.total, 0) / 6).toFixed(2)}/month
        </div>
      </div>

      {/* Cash Flow Forecast */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl text-white">
            <Calendar size={24} />
          </div>
          <h3 className="text-xl font-bold">30-Day Cash Flow Forecast</h3>
        </div>
        {cashFlowForecast.hasData ? (
          <>
            {cashFlowForecast.lowestBalance < 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-red-700 text-sm">
                ⚠️ Warning: Balance projected to go negative (${cashFlowForecast.lowestBalance.toFixed(2)})
              </div>
            )}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {cashFlowForecast.projections.map((event, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between p-3 rounded-xl ${
                    event.type === 'income' ? 'bg-emerald-50' : 'bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        event.type === 'income' ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                    />
                    <div>
                      <div className="font-medium text-sm">{event.name}</div>
                      <div className="text-xs text-slate-500">
                        {event.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`font-semibold ${
                        event.type === 'income' ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {event.type === 'income' ? '+' : ''}${Math.abs(event.amount).toFixed(2)}
                    </div>
                    <div className={`text-xs ${event.balance < 0 ? 'text-red-500 font-bold' : 'text-slate-500'}`}>
                      Balance: ${event.balance.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
              {cashFlowForecast.projections.length === 0 && (
                <p className="text-slate-500 text-center py-4">No upcoming transactions in next 30 days</p>
              )}
            </div>
          </>
        ) : (
          <p className="text-slate-500 text-center py-8">Set up your pay schedule to see cash flow forecast</p>
        )}
      </div>

      {/* Income vs Expenses */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <h3 className="text-xl font-bold mb-4">Income vs Expenses</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="text-center p-4 bg-emerald-50 rounded-xl">
            <p className="text-xs text-slate-600 mb-1">Monthly Income</p>
            <p className="text-xl md:text-2xl font-bold text-emerald-600 break-all">
              ${overview.monthlyIncome.toFixed(2)}
            </p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-xl">
            <p className="text-xs text-slate-600 mb-1">Monthly Expenses</p>
            <p className="text-xl md:text-2xl font-bold text-red-600 break-all">
              ${overview.totalMonthly.toFixed(2)}
            </p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-xl">
            <p className="text-xs text-slate-600 mb-1">Net Savings</p>
            <p
              className={`text-xl md:text-2xl font-bold break-all ${
                overview.leftover >= 0 ? 'text-blue-600' : 'text-red-600'
              }`}
            >
              ${overview.leftover.toFixed(2)}
            </p>
          </div>
        </div>
        <div className="h-8 bg-slate-100 rounded-full overflow-hidden flex">
          <div
            className="bg-emerald-500 flex items-center justify-center text-white text-xs font-bold"
            style={{
              width: `${
                overview.monthlyIncome > 0
                  ? Math.min((overview.totalMonthly / overview.monthlyIncome) * 100, 100)
                  : 0
              }%`,
            }}
          >
            {overview.monthlyIncome > 0
              ? ((overview.totalMonthly / overview.monthlyIncome) * 100).toFixed(0)
              : 0}
            %
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-2 text-center">
          {overview.totalMonthly > overview.monthlyIncome
            ? '⚠️ Spending exceeds income'
            : '✓ Under budget'}
        </p>
      </div>

      {/* Category budgets */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <h3 className="text-xl font-bold mb-4">Category Budgets</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {thisMonthByCategory.map(({ cat, sum, cap }) => {
            const pct = cap > 0 ? Math.min((sum / cap) * 100, 100) : 0;
            const over = cap > 0 && sum > cap;
            return (
              <div key={cat} className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[cat] }}
                    />
                    <span className="font-semibold capitalize">{cat}</span>
                  </div>
                  <div className={`text-sm ${over ? 'text-red-600 font-bold' : 'text-slate-700'}`}>
                    ${sum.toFixed(2)} / ${cap.toFixed(2)}
                  </div>
                </div>
                <div className="h-3 bg-white rounded-full overflow-hidden border">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: over ? '#ef4444' : CATEGORY_COLORS[cat],
                    }}
                  />
                </div>
                {over && (
                  <div className="text-xs text-red-600 mt-1">Over by ${(sum - cap).toFixed(2)}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Debts quick view */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Debt Payoff Tracker</h3>
          <button
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold"
            onClick={onAddDebt}
          >
            Add Debt
          </button>
        </div>
        {debtPayoff.length ? (
          <div className="space-y-3">
            {debtPayoff.map((debt) => {
              const monthsToPayoff = debt.payment > 0 ? Math.ceil(debt.balance / debt.payment) : 0;
              const totalInterest =
                debt.payment > 0 ? debt.payment * monthsToPayoff - debt.balance : 0;
              return (
                <div key={debt.id} className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{debt.name}</span>
                    <button
                      className="text-red-600 hover:bg-red-50 p-1 rounded transition-colors"
                      onClick={() => onRemoveDebt(debt.id)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <p className="text-sm text-slate-600">
                    Balance: ${debt.balance.toFixed(2)} @ {debt.rate}%
                  </p>
                  <p className="text-sm text-slate-600">Payment: ${debt.payment.toFixed(2)}/mo</p>
                  <p className="text-sm font-semibold text-emerald-600 mt-2">
                    Payoff: {monthsToPayoff} months | Interest: ${totalInterest.toFixed(2)}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-slate-500">Add debts to track payoff timeline</p>
        )}
      </div>
    </div>
  );
};

export default Analytics;
