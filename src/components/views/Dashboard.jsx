import React from 'react';
import { DollarSign, TrendingUp, AlertTriangle, CheckCircle, Clock, Wallet, Check } from 'lucide-react';
import { parseAmt } from '../../utils/formatters';

export const Dashboard = ({
  overview,
  paySchedule,
  billInstances,
  nextPayDates,
  perCheckEnvelopeSum,
  onToggleInstancePaid,
}) => {
  const fourCheckPlan = React.useMemo(() => {
    const checks = nextPayDates.slice(0, 4);
    if (!checks.length) return { checks: [], groups: [], totals: [], leftovers: [] };
    const perCheck = parseAmt(paySchedule?.payAmount);
    const groups = [1, 2, 3, 4].map((idx) =>
      billInstances
        .filter((i) => i.assignedCheck === idx)
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    );
    const totals = groups.map(g => g.reduce((s, i) => s + parseAmt(i.amountEstimate), 0));
    const leftovers = totals.map(t => perCheck - perCheckEnvelopeSum - t);
    return { checks, groups, totals, leftovers };
  }, [billInstances, nextPayDates, paySchedule, perCheckEnvelopeSum]);

  // Check for underfunded checks
  const underfundedChecks = fourCheckPlan.leftovers
    .map((l, i) => ({ check: i + 1, amount: l }))
    .filter(c => c.amount < 0);

  const perCheck = parseAmt(paySchedule?.payAmount);

  return (
    <div className="space-y-6">
      {/* Underfunding Alert Banner */}
      {underfundedChecks.length > 0 && (
        <div className="bg-red-500 text-white rounded-2xl p-4 shadow-lg flex items-start gap-3">
          <AlertTriangle className="flex-shrink-0 mt-0.5" size={24} />
          <div>
            <h3 className="font-bold text-lg">Underfunded Checks!</h3>
            <p className="text-red-100 text-sm">
              {underfundedChecks.map(c => (
                <span key={c.check} className="mr-3">
                  Check {c.check}: <strong>${Math.abs(c.amount).toFixed(2)} short</strong>
                </span>
              ))}
            </p>
            <p className="text-red-200 text-xs mt-1">
              Consider moving bills to other checks or reducing expenses.
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Monthly Income Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-5 hover:shadow-xl transition-shadow">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl shadow-md">
              <DollarSign className="text-white" size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-500 text-sm font-medium">
                {new Date().toLocaleDateString('en-US', { month: 'long' })} Income
              </p>
              <p className="text-2xl md:text-3xl font-black text-slate-800 truncate">
                ${overview.monthlyIncome.toFixed(2)}
              </p>
              {overview.paychecksThisMonth > 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  {overview.paychecksThisMonth} paycheck{overview.paychecksThisMonth !== 1 ? 's' : ''} this month
                </p>
              )}
            </div>
          </div>
          {overview.nextPaycheckDate && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
              <Clock size={14} className="text-slate-400" />
              <p className="text-sm">
                <span className="text-slate-500">Next:</span>{' '}
                <span className="font-semibold text-emerald-600">
                  {overview.nextPaycheckDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                {overview.daysUntilNextPaycheck !== null && (
                  <span className="text-slate-400 text-xs ml-1">
                    ({overview.daysUntilNextPaycheck}d)
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Monthly Expenses Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-5 hover:shadow-xl transition-shadow">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gradient-to-br from-red-400 to-red-600 rounded-xl shadow-md">
              <TrendingUp className="text-white" size={24} />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">Monthly Expenses</p>
              <p className="text-2xl md:text-3xl font-black text-slate-800">
                ${overview.totalMonthly.toFixed(2)}
              </p>
            </div>
          </div>
          {/* Expense ratio bar */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Budget usage</span>
              <span>{overview.monthlyIncome > 0 ? Math.round((overview.totalMonthly / overview.monthlyIncome) * 100) : 0}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  overview.totalMonthly > overview.monthlyIncome ? 'bg-red-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min((overview.totalMonthly / overview.monthlyIncome) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Net Monthly Card */}
        <div className={`rounded-2xl shadow-lg border p-5 hover:shadow-xl transition-shadow ${
          overview.leftover >= 0 ? 'bg-white border-slate-100' : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl shadow-md ${
              overview.leftover >= 0
                ? 'bg-gradient-to-br from-blue-400 to-blue-600'
                : 'bg-gradient-to-br from-red-400 to-red-600'
            }`}>
              <Wallet className="text-white" size={24} />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">Net Monthly</p>
              <p className={`text-2xl md:text-3xl font-black ${
                overview.leftover >= 0 ? 'text-blue-600' : 'text-red-600'
              }`}>
                {overview.leftover >= 0 ? '+' : ''}${overview.leftover.toFixed(2)}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              {overview.leftover >= 0 ? (
                <>
                  <CheckCircle size={14} className="text-emerald-500" />
                  <span className="text-xs text-emerald-600 font-medium">On track</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={14} className="text-red-500" />
                  <span className="text-xs text-red-600 font-medium">Over budget</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Next 4 Checks */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-5">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>Next 4 Checks</span>
          {perCheck > 0 && (
            <span className="text-sm font-normal text-slate-400">
              (${perCheck.toFixed(2)} each)
            </span>
          )}
        </h3>
        {!fourCheckPlan.checks.length ? (
          <div className="text-center py-8">
            <Wallet className="mx-auto text-slate-300 mb-3" size={48} />
            <p className="text-slate-500">Set your pay schedule in Settings.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fourCheckPlan.checks.map((d, idx) => {
              const bucket = fourCheckPlan.groups[idx] || [];
              const total = fourCheckPlan.totals[idx];
              const free = fourCheckPlan.leftovers[idx];
              const isUnderfunded = free < 0;

              return (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    isUnderfunded
                      ? 'bg-red-50 border-red-300'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        isUnderfunded ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
                      }`}>
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-semibold text-slate-800">
                          {new Date(d).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        isUnderfunded ? 'text-red-600' : 'text-emerald-600'
                      }`}>
                        {isUnderfunded ? '-' : '+'}${Math.abs(free).toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-500">leftover</div>
                    </div>
                  </div>

                  {isUnderfunded && (
                    <div className="flex items-center gap-1 text-xs text-red-600 bg-red-100 rounded-lg px-2 py-1 mb-2">
                      <AlertTriangle size={12} />
                      <span>Underfunded by ${Math.abs(free).toFixed(2)}</span>
                    </div>
                  )}

                  <div className="text-sm text-slate-500 mb-2">
                    {bucket.length} bill{bucket.length !== 1 ? 's' : ''} • ${total.toFixed(2)} total
                  </div>

                  {bucket.length > 0 && (
                    <div className="space-y-1 pt-2 border-t border-slate-200">
                      {bucket.slice(0, 4).map((b) => (
                        <button
                          key={b.id}
                          onClick={() => onToggleInstancePaid(b.id)}
                          className={`w-full flex items-center justify-between text-sm p-1.5 rounded-lg transition-colors ${
                            b.paid
                              ? 'bg-green-100 hover:bg-green-200'
                              : 'hover:bg-slate-100'
                          }`}
                          title={b.paid ? 'Click to mark unpaid' : 'Click to mark paid'}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                              b.paid ? 'bg-green-500 text-white' : 'border-2 border-slate-300'
                            }`}>
                              {b.paid && <Check size={12} />}
                            </span>
                            <span className={`truncate ${b.paid ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                              {b.name}
                            </span>
                          </div>
                          <span className={`font-medium ml-2 flex-shrink-0 ${b.paid ? 'text-slate-400' : 'text-slate-800'}`}>
                            ${parseAmt(b.amountEstimate).toFixed(2)}
                          </span>
                        </button>
                      ))}
                      {bucket.length > 4 && (
                        <div className="text-xs text-slate-400 pt-1">
                          +{bucket.length - 4} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
