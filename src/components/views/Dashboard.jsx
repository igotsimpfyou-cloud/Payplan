import React from 'react';
import { DollarSign, TrendingUp } from 'lucide-react';
import { parseAmt } from '../../utils/formatters';

export const Dashboard = ({
  overview,
  paySchedule,
  billInstances,
  nextPayDates,
  perCheckEnvelopeSum,
}) => {
  const fourCheckPlan = React.useMemo(() => {
    const checks = nextPayDates.slice(0, 4);
    if (!checks.length) return { checks: [], groups: [] };
    const groups = [1, 2, 3, 4].map((idx) =>
      billInstances
        .filter((i) => i.assignedCheck === idx)
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    );
    return { checks, groups };
  }, [billInstances, nextPayDates]);

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Monthly Income Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-emerald-100 rounded-xl">
              <DollarSign className="text-emerald-600" size={24} />
            </div>
            <div className="flex-1">
              <p className="text-slate-500 text-sm">
                {new Date().toLocaleDateString('en-US', { month: 'long' })}{' '}
                Income
              </p>
              <p className="text-3xl font-black text-slate-800">
                ${overview.monthlyIncome.toFixed(2)}
              </p>
              {overview.paychecksThisMonth > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  {overview.paychecksThisMonth} paycheck
                  {overview.paychecksThisMonth !== 1 ? 's' : ''} this month
                </p>
              )}
            </div>
          </div>
          {overview.nextPaycheckDate && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-500">Next paycheck:</p>
              <p className="text-sm font-semibold text-emerald-600">
                {overview.nextPaycheckDate.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  timeZone: 'UTC',
                })}
                {overview.daysUntilNextPaycheck !== null && (
                  <span className="text-slate-500 ml-1">
                    ({overview.daysUntilNextPaycheck} day
                    {overview.daysUntilNextPaycheck !== 1 ? 's' : ''})
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Monthly Expenses Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-red-100 rounded-xl">
              <TrendingUp className="text-red-600" size={24} />
            </div>
            <div>
              <p className="text-slate-500 text-sm">Monthly Expenses</p>
              <p className="text-3xl font-black text-slate-800">
                ${overview.totalMonthly.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Leftover Per Check Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          {(() => {
            const perCheck = parseAmt(paySchedule?.payAmount);
            const g1 = billInstances
              .filter((i) => i.assignedCheck === 1)
              .reduce((s, i) => s + parseAmt(i.amountEstimate), 0);
            const g2 = billInstances
              .filter((i) => i.assignedCheck === 2)
              .reduce((s, i) => s + parseAmt(i.amountEstimate), 0);
            const leftover1 = perCheck - perCheckEnvelopeSum - g1;
            const leftover2 = perCheck - perCheckEnvelopeSum - g2;
            return (
              <>
                <h3 className="text-lg font-bold mb-3">Leftover Per Check</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 rounded-xl">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">
                        Check 1 Leftover
                      </span>
                      <span
                        className={`text-xl font-bold ${
                          leftover1 >= 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        ${leftover1.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">
                        Check 2 Leftover
                      </span>
                      <span
                        className={`text-xl font-bold ${
                          leftover2 >= 0 ? 'text-blue-600' : 'text-red-600'
                        }`}
                      >
                        ${leftover2.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border-2 border-slate-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-slate-700">
                        Total Monthly
                      </span>
                      <span
                        className={`text-xl font-bold ${
                          overview.leftover >= 0
                            ? 'text-slate-800'
                            : 'text-red-600'
                        }`}
                      >
                        ${overview.leftover.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Next 4 Checks */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h3 className="text-xl font-bold mb-4">Next 4 Checks</h3>
        {!fourCheckPlan.checks.length ? (
          <p className="text-slate-600">Set your pay schedule in Settings.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fourCheckPlan.checks.map((d, idx) => {
              const bucket = fourCheckPlan.groups[idx] || [];
              const total = bucket.reduce(
                (s, i) => s + parseAmt(i.amountEstimate),
                0
              );
              const free =
                parseAmt(paySchedule?.payAmount) - perCheckEnvelopeSum - total;
              return (
                <div key={idx} className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">
                      Check {idx + 1} •{' '}
                      {new Date(d).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                    <div
                      className={`font-bold ${
                        free >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      Free: ${free.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-sm text-slate-600 mt-1">
                    {bucket.length} bills • Total ${total.toFixed(2)}
                  </div>
                  <div className="mt-2 space-y-1">
                    {bucket.slice(0, 5).map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>{b.name}</span>
                        <span>${parseAmt(b.amountEstimate).toFixed(2)}</span>
                      </div>
                    ))}
                    {bucket.length > 5 && (
                      <div className="text-xs text-slate-500 mt-1">
                        +{bucket.length - 5} more...
                      </div>
                    )}
                  </div>
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
