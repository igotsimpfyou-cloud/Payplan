import React, { useState } from 'react';
import { DollarSign, Clock, Trash2, Calendar, Edit2 } from 'lucide-react';
import { parseAmt } from '../../utils/formatters';
import { parseLocalDate, toYMD } from '../../utils/dateHelpers';

export const Income = ({
  paySchedule,
  onEditPaySchedule,
  nextPayDates,
  actualPayEntries,
  onAddActualPay,
  onDeleteActualPay,
  currentMonthInstances = [],
  onSubmitActual,
}) => {
  // Pay entry form state
  const [payDate, setPayDate] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [overtimeHours, setOvertimeHours] = useState('');

  // Variable bill actuals
  const thisMonthVars = currentMonthInstances.filter((i) => i.isVariable);
  const [varValues, setVarValues] = useState(() => {
    const obj = {};
    thisMonthVars.forEach((i) => {
      obj[i.id] = i.actualPaid != null ? i.actualPaid : '';
    });
    return obj;
  });

  const handleAddPay = () => {
    if (!payDate || !payAmount) return;
    onAddActualPay(payDate, payAmount, overtimeHours);
    setPayDate('');
    setPayAmount('');
    setOvertimeHours('');
  };

  const sortedPayEntries = [...(actualPayEntries || [])].sort(
    (a, b) => new Date(b.payDate) - new Date(a.payDate)
  );

  const perCheck = parseAmt(paySchedule?.payAmount);

  return (
    <div className="space-y-4">
      {/* Pay Schedule Card */}
      <div className="bg-white rounded-2xl shadow-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Calendar size={18} className="text-emerald-600" />
            Pay Schedule
          </h3>
          <button
            onClick={onEditPaySchedule}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
          >
            {paySchedule ? 'Edit' : 'Set Up'}
          </button>
        </div>

        {paySchedule ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-400 mb-1">Frequency</p>
                <p className="font-bold text-slate-700 text-sm capitalize">{paySchedule.frequency}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-400 mb-1">Per Check</p>
                <p className="font-bold text-emerald-600 text-sm">${perCheck.toFixed(2)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-400 mb-1">Next Pay</p>
                <p className="font-bold text-slate-700 text-sm">
                  {nextPayDates.length > 0
                    ? nextPayDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : '—'}
                </p>
              </div>
            </div>

            {/* Upcoming pay dates */}
            {nextPayDates.length > 1 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {nextPayDates.slice(0, 6).map((d, i) => (
                  <span
                    key={i}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      i === 0
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <DollarSign size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-slate-400 text-sm">Set up your pay schedule to track income</p>
          </div>
        )}
      </div>

      {/* Log Actual Pay */}
      <div className="bg-white rounded-2xl shadow-lg p-5">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
          <DollarSign size={18} className="text-emerald-600" />
          Log Actual Pay
        </h3>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div>
            <label className="text-xs font-semibold text-slate-500">Date</label>
            <input
              type="date"
              className="w-full mt-1 px-3 py-2 border-2 rounded-xl text-sm"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Amount</label>
            <input
              type="number"
              step="0.01"
              placeholder="$0.00"
              className="w-full mt-1 px-3 py-2 border-2 rounded-xl text-sm"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">OT Hrs</label>
            <input
              type="number"
              step="0.5"
              placeholder="0"
              className="w-full mt-1 px-3 py-2 border-2 rounded-xl text-sm"
              value={overtimeHours}
              onChange={(e) => setOvertimeHours(e.target.value)}
            />
          </div>
        </div>
        <button
          onClick={handleAddPay}
          disabled={!payDate || !payAmount}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-semibold transition-colors"
        >
          Log Pay
        </button>

        {/* Pay History */}
        {sortedPayEntries.length > 0 && (
          <div className="mt-4 pt-3 border-t">
            <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Pay History</h4>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {sortedPayEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium text-sm text-slate-700">
                        {parseLocalDate(entry.payDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                      {entry.overtimeHours > 0 && (
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock size={10} />
                          {entry.overtimeHours} OT hrs
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-600">
                      ${parseAmt(entry.amount).toFixed(2)}
                    </span>
                    <button
                      onClick={() => onDeleteActualPay(entry.id)}
                      className="p-1 text-red-400 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Variable Bills - Submit Actuals */}
      {thisMonthVars.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-5">
          <h3 className="font-bold text-slate-800 mb-1">Variable Bills</h3>
          <p className="text-xs text-slate-400 mb-3">Enter actual amounts for variable bills this month</p>
          <div className="space-y-2">
            {thisMonthVars.map((i) => (
              <div
                key={i.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm text-slate-700 truncate">{i.name}</p>
                  <p className="text-xs text-slate-400">
                    Due {parseLocalDate(i.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {' · '}Est. ${parseAmt(i.amountEstimate).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Actual"
                    className="px-2 py-1.5 border-2 rounded-lg w-24 text-sm"
                    value={varValues[i.id] ?? ''}
                    onChange={(e) =>
                      setVarValues({ ...varValues, [i.id]: e.target.value })
                    }
                  />
                  <button
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
                    onClick={() => onSubmitActual(i.id, varValues[i.id])}
                  >
                    Save
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Income;
