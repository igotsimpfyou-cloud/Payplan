import React from 'react';
import { X } from 'lucide-react';
import { parseAmt } from '../../utils/formatters';

const CATEGORIES = ['utilities', 'subscription', 'insurance', 'loan', 'rent', 'other'];

export const Analytics = ({
  overview,
  currentMonthInstances,
  budgets,
  debtPayoff,
  onAddDebt,
  onRemoveDebt,
}) => {
  const thisMonthByCategory = CATEGORIES.map((cat) => {
    const sum = currentMonthInstances
      .filter((i) => i.category === cat)
      .reduce((s, i) => s + parseAmt(i.actualPaid ?? i.amountEstimate), 0);
    return { cat, sum, cap: parseAmt(budgets[cat] || 0) };
  });

  return (
    <div>
      <h2 className="text-3xl font-black text-white mb-6">
        Financial Analytics
      </h2>

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
                  ? Math.min(
                      (overview.totalMonthly / overview.monthlyIncome) * 100,
                      100
                    )
                  : 0
              }%`,
            }}
          >
            {overview.monthlyIncome > 0
              ? ((overview.totalMonthly / overview.monthlyIncome) * 100).toFixed(
                  0
                )
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
                  <div className="font-semibold capitalize">{cat}</div>
                  <div
                    className={`text-sm ${
                      over ? 'text-red-600 font-bold' : 'text-slate-700'
                    }`}
                  >
                    ${sum.toFixed(2)} / ${cap.toFixed(2)}
                  </div>
                </div>
                <div className="h-3 bg-white rounded-full overflow-hidden border">
                  <div
                    className={`h-full ${
                      over ? 'bg-red-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {over && (
                  <div className="text-xs text-red-600 mt-1">
                    Over by ${(sum - cap).toFixed(2)}
                  </div>
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
              const monthsToPayoff =
                debt.payment > 0 ? Math.ceil(debt.balance / debt.payment) : 0;
              const totalInterest =
                debt.payment > 0
                  ? debt.payment * monthsToPayoff - debt.balance
                  : 0;
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
                  <p className="text-sm text-slate-600">
                    Payment: ${debt.payment.toFixed(2)}/mo
                  </p>
                  <p className="text-sm font-semibold text-emerald-600 mt-2">
                    Payoff: {monthsToPayoff} months | Interest: $
                    {totalInterest.toFixed(2)}
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
