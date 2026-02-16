import React, { useState } from 'react';
import { DollarSign, Clock, Trash2, Calendar, Edit2, ArrowRight, ListChecks } from 'lucide-react';
import { parseAmt } from '../../utils/formatters';
import { parseLocalDate, toYMD } from '../../utils/dateHelpers';
import { uiSpacing, uiTap, uiType } from '../../constants/uiPresets';

export const Income = ({
  paySchedule,
  onEditPaySchedule,
  nextPayDates,
  actualPayEntries,
  onAddActualPay,
  onDeleteActualPay,
  currentMonthInstances = [],
  onSubmitActual,
  onEditTemplate,
}) => {
  // Pay entry form state
  const [payDate, setPayDate] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [overtimeHours, setOvertimeHours] = useState('');

  // Variable bill actuals
  const thisMonthVars = currentMonthInstances.filter((i) => i.isVariable);

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
    <div className={uiSpacing.pageStack}>
      {/* Pay Schedule Card */}
      <div className={`bg-white ${uiSpacing.card}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`${uiType.sectionTitle} text-slate-800 flex items-center gap-2`}>
            <Calendar size={18} className="text-emerald-600" />
            Pay Schedule
          </h3>
          <button
            onClick={onEditPaySchedule}
            className={`px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold ${uiTap.control}`}
          >
            {paySchedule ? 'Edit' : 'Set Up'}
          </button>
        </div>

        {paySchedule ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className={`text-slate-400 mb-1 ${uiType.helperText}`}>Frequency</p>
                <p className="font-bold text-slate-700 text-sm capitalize">{paySchedule.frequency}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className={`text-slate-400 mb-1 ${uiType.helperText}`}>Per Check</p>
                <p className="font-bold text-emerald-600 text-sm">${perCheck.toFixed(2)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className={`text-slate-400 mb-1 ${uiType.helperText}`}>Next Pay</p>
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
          <div className="text-center py-6 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/60">
            <DollarSign size={32} className="mx-auto text-emerald-400 mb-2" />
            <p className="text-slate-700 text-sm font-semibold">Set up your pay schedule first</p>
            <p className={`text-slate-500 mt-1 mb-3 ${uiType.helperText}`}>
              Add your frequency and paycheck amount to unlock paycheck forecasts.
            </p>
            <button
              onClick={onEditPaySchedule}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold ${uiTap.control}`}
            >
              Set pay schedule <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Log Actual Pay */}
      <div className={`bg-white ${uiSpacing.card}`}>
        <h3 className={`${uiType.sectionTitle} text-slate-800 flex items-center gap-2 mb-4`}>
          <DollarSign size={18} className="text-emerald-600" />
          Log Actual Pay
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div>
            <label className={`font-semibold text-slate-500 ${uiType.helperText}`}>Date</label>
            <input
              type="date"
              className={`w-full mt-1 px-3 py-2 border-2 rounded-xl text-sm ${uiTap.control}`}
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
            />
          </div>
          <div>
            <label className={`font-semibold text-slate-500 ${uiType.helperText}`}>Amount</label>
            <input
              type="number"
              step="0.01"
              placeholder="$0.00"
              className={`w-full mt-1 px-3 py-2 border-2 rounded-xl text-sm ${uiTap.control}`}
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
            />
          </div>
          <div>
            <label className={`font-semibold text-slate-500 ${uiType.helperText}`}>OT Hrs</label>
            <input
              type="number"
              step="0.5"
              placeholder="0"
              className={`w-full mt-1 px-3 py-2 border-2 rounded-xl text-sm ${uiTap.control}`}
              value={overtimeHours}
              onChange={(e) => setOvertimeHours(e.target.value)}
            />
          </div>
        </div>
        <button
          onClick={handleAddPay}
          disabled={!payDate || !payAmount || !paySchedule}
          className={`w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-semibold transition-colors ${uiTap.control}`}
        >
          Log Pay
        </button>

        {!paySchedule && (
          <p className={`text-amber-600 mt-2 flex items-center gap-1.5 ${uiType.helperText}`}>
            <ListChecks size={12} />
            Complete pay schedule setup to start logging actual pay.
          </p>
        )}

        {/* Pay History */}
        {sortedPayEntries.length > 0 && (
          <div className="mt-5 pt-4 border-t">
            <h4 className={`font-semibold text-slate-400 uppercase mb-3 ${uiType.helperText}`}>Pay History</h4>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {sortedPayEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
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
                      className={`p-1 text-red-400 hover:bg-red-50 rounded ${uiTap.iconControl}`}
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
        <div className={`bg-white ${uiSpacing.card}`}>
          <h3 className={`${uiType.sectionTitle} text-slate-800 mb-1`}>Variable Bills</h3>
          <p className={`text-slate-400 mb-4 ${uiType.helperText}`}>Enter actual amounts for variable bills this month</p>
          <div className={uiSpacing.sectionStack}>
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
                <button
                  className={`px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center gap-1.5 flex-shrink-0 ${uiTap.control}`}
                  onClick={() => onEditTemplate(i.templateId)}
                >
                  <Edit2 size={14} /> Update
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Income;
