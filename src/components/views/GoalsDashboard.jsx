import React, { useMemo } from 'react';
import { Target, CreditCard, TrendingDown, TrendingUp, Building, PieChart, ArrowRight } from 'lucide-react';
import { parseAmt } from '../../utils/formatters';
import { calculateDebtPayoff } from '../../utils/calculations';

export const GoalsDashboard = ({
  debtPayoff = [],
  assets = [],
  investments = [],
  onNavigateToSetup,
  onNavigateToAnalytics,
}) => {
  // Debt summary
  const debtSummary = useMemo(() => {
    if (!debtPayoff.length) return null;
    const totalBalance = debtPayoff.reduce((s, d) => s + parseAmt(d.balance), 0);
    const totalPayment = debtPayoff.reduce((s, d) => s + parseAmt(d.payment), 0);

    // Find the last payoff date
    let latestPayoff = null;
    let totalInterest = 0;
    debtPayoff.forEach(debt => {
      const payoff = calculateDebtPayoff(debt);
      if (isFinite(payoff.months)) {
        totalInterest += payoff.totalInterest;
        if (payoff.payoffDate) {
          const d = new Date(payoff.payoffDate + 'T00:00:00');
          if (!latestPayoff || d > latestPayoff) latestPayoff = d;
        }
      }
    });

    return { totalBalance, totalPayment, totalInterest, latestPayoff, count: debtPayoff.length };
  }, [debtPayoff]);

  // Investment summary
  const investmentSummary = useMemo(() => {
    if (!investments.length) return null;
    let totalValue = 0;
    let totalCost = 0;
    investments.forEach(h => {
      const price = h.lastKnownPrice || parseAmt(h.purchasePrice);
      const shares = parseAmt(h.shares);
      totalValue += price * shares;
      totalCost += parseAmt(h.purchasePrice) * shares;
    });
    const gain = totalValue - totalCost;
    const gainPct = totalCost > 0 ? (gain / totalCost) * 100 : 0;
    return { totalValue, totalCost, gain, gainPct, count: investments.length };
  }, [investments]);

  // Asset summary
  const assetSummary = useMemo(() => {
    if (!assets.length) return null;
    const totalValue = assets.reduce((s, a) => {
      return s + parseAmt(a.currentValue || a.loanAmount || 0);
    }, 0);
    const totalOwed = assets.reduce((s, a) => {
      return s + parseAmt(a.currentBalance || 0);
    }, 0);
    const equity = totalValue - totalOwed;
    return { totalValue, totalOwed, equity, count: assets.length };
  }, [assets]);

  // Net worth = investments + asset equity - debts
  const netWorth = useMemo(() => {
    const investVal = investmentSummary?.totalValue || 0;
    const assetEquity = assetSummary?.equity || 0;
    const debtTotal = debtSummary?.totalBalance || 0;
    return investVal + assetEquity - debtTotal;
  }, [investmentSummary, assetSummary, debtSummary]);

  const hasAnyData = debtSummary || investmentSummary || assetSummary;

  return (
    <div className="space-y-4">
      {/* Net Worth Hero */}
      <div className={`rounded-2xl shadow-xl p-6 text-center ${
        netWorth >= 0
          ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
          : 'bg-gradient-to-br from-red-500 to-rose-600'
      }`}>
        <p className="text-white/80 text-sm font-medium mb-1">Estimated Net Worth</p>
        <p className="text-white text-4xl font-black">
          {netWorth < 0 ? '-' : ''}${Math.abs(netWorth).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </p>
        {hasAnyData && (
          <div className="flex justify-center gap-4 mt-3 text-white/70 text-xs">
            {investmentSummary && <span>Investments ${investmentSummary.totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>}
            {assetSummary && <span>Equity ${assetSummary.equity.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>}
            {debtSummary && <span>Debt -${debtSummary.totalBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>}
          </div>
        )}
        {!hasAnyData && (
          <p className="text-white/60 text-sm mt-2">Add debts, assets, or investments in Setup to track net worth</p>
        )}
      </div>

      {/* Debt Freedom Progress */}
      {debtSummary && (
        <div className="bg-white rounded-2xl shadow-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <CreditCard size={18} className="text-red-500" />
              Debt Freedom
            </h3>
            {onNavigateToSetup && (
              <button
                onClick={onNavigateToSetup}
                className="text-xs text-emerald-600 font-semibold flex items-center gap-1 hover:text-emerald-700"
              >
                Manage <ArrowRight size={12} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="bg-red-50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500 mb-0.5">Total Owed</p>
              <p className="font-bold text-red-600 text-sm">
                ${debtSummary.totalBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500 mb-0.5">Monthly</p>
              <p className="font-bold text-amber-600 text-sm">
                ${debtSummary.totalPayment.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500 mb-0.5">Interest</p>
              <p className="font-bold text-blue-600 text-sm">
                ${debtSummary.totalInterest.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          {/* Individual debt bars */}
          <div className="space-y-2">
            {debtPayoff.map(debt => {
              const payoff = calculateDebtPayoff(debt);
              const isInfinite = !isFinite(payoff.months);
              const paidPct = debt.loanAmount > 0
                ? Math.max(0, ((debt.loanAmount - parseAmt(debt.balance)) / debt.loanAmount) * 100)
                : 0;

              return (
                <div key={debt.id} className="p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700">{debt.name}</span>
                    <span className="text-sm font-bold text-red-600">
                      ${parseAmt(debt.balance).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  {debt.loanAmount > 0 && (
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mb-1">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                        style={{ width: `${paidPct}%` }}
                      />
                    </div>
                  )}
                  <div className="flex gap-3 text-xs text-slate-500">
                    <span>{debt.rate}% APR</span>
                    <span>${parseAmt(debt.payment).toFixed(0)}/mo</span>
                    {!isInfinite && payoff.months > 0 && (
                      <span className="text-emerald-600 font-medium flex items-center gap-0.5">
                        <TrendingDown size={11} />
                        {payoff.months}mo left
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {debtSummary.latestPayoff && (
            <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
              <p className="text-xs text-slate-500">Estimated debt-free by</p>
              <p className="font-bold text-emerald-700">
                {debtSummary.latestPayoff.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Investment Portfolio */}
      {investmentSummary && (
        <div className="bg-white rounded-2xl shadow-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-600" />
              Investment Portfolio
            </h3>
            {onNavigateToSetup && (
              <button
                onClick={onNavigateToSetup}
                className="text-xs text-emerald-600 font-semibold flex items-center gap-1 hover:text-emerald-700"
              >
                Manage <ArrowRight size={12} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500 mb-0.5">Value</p>
              <p className="font-bold text-blue-600 text-sm">
                ${investmentSummary.totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500 mb-0.5">Cost Basis</p>
              <p className="font-bold text-slate-600 text-sm">
                ${investmentSummary.totalCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className={`rounded-xl p-3 text-center ${
              investmentSummary.gain >= 0 ? 'bg-emerald-50' : 'bg-red-50'
            }`}>
              <p className="text-xs text-slate-500 mb-0.5">Gain/Loss</p>
              <p className={`font-bold text-sm ${
                investmentSummary.gain >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {investmentSummary.gain >= 0 ? '+' : ''}
                ${investmentSummary.gain.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          {/* Individual holdings */}
          <div className="space-y-1.5">
            {investments.slice(0, 5).map(h => {
              const price = h.lastKnownPrice || parseAmt(h.purchasePrice);
              const shares = parseAmt(h.shares);
              const value = price * shares;
              const cost = parseAmt(h.purchasePrice) * shares;
              const gain = value - cost;
              return (
                <div key={h.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <div>
                    <span className="font-semibold text-sm text-slate-800">{h.symbol}</span>
                    <span className="text-xs text-slate-400 ml-2">{shares} shares</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium text-sm text-slate-700">${value.toFixed(0)}</span>
                    <span className={`text-xs ml-2 ${gain >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {gain >= 0 ? '+' : ''}{((gain / cost) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
            {investments.length > 5 && (
              <p className="text-xs text-slate-400 text-center pt-1">
                +{investments.length - 5} more holdings
              </p>
            )}
          </div>
        </div>
      )}

      {/* Assets */}
      {assetSummary && (
        <div className="bg-white rounded-2xl shadow-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Building size={18} className="text-purple-600" />
              Financed Assets
            </h3>
            {onNavigateToSetup && (
              <button
                onClick={onNavigateToSetup}
                className="text-xs text-emerald-600 font-semibold flex items-center gap-1 hover:text-emerald-700"
              >
                Manage <ArrowRight size={12} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500 mb-0.5">Value</p>
              <p className="font-bold text-purple-600 text-sm">
                ${assetSummary.totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="bg-red-50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500 mb-0.5">Owed</p>
              <p className="font-bold text-red-600 text-sm">
                ${assetSummary.totalOwed.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500 mb-0.5">Equity</p>
              <p className="font-bold text-emerald-600 text-sm">
                ${assetSummary.equity.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Retirement Planning CTA */}
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl shadow-lg p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">Retirement Planning</h3>
            <p className="text-white/80 text-sm">
              Run Monte Carlo simulations to project your retirement readiness
            </p>
          </div>
          {onNavigateToAnalytics && (
            <button
              onClick={onNavigateToAnalytics}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl font-semibold text-sm flex items-center gap-1.5 transition-colors"
            >
              Open <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {!hasAnyData && (
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <Target size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-bold text-slate-700 mb-1">Set Up Your Financial Goals</h3>
          <p className="text-slate-400 text-sm mb-4">
            Track debts, investments, and assets to see your complete financial picture.
          </p>
          {onNavigateToSetup && (
            <button
              onClick={onNavigateToSetup}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-colors"
            >
              Go to Setup
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default GoalsDashboard;
