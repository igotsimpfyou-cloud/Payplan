import React, { useState } from 'react';
import { DollarSign, Clock, Trash2 } from 'lucide-react';
import { parseAmt } from '../../utils/formatters';
import { toYMD } from '../../utils/dateHelpers';

export const SubmitActuals = ({
  currentMonthInstances,
  onSubmitActual,
  nextPayDates,
  actualPayEntries,
  onAddActualPay,
  onDeleteActualPay,
}) => {
  const thisMonthVars = currentMonthInstances.filter((i) => i.isVariable);
  const [values, setValues] = useState(() => {
    const obj = {};
    thisMonthVars.forEach((i) => {
      obj[i.id] = i.actualPaid != null ? i.actualPaid : '';
    });
    return obj;
  });

  // Pay entry form state
  const [payDate, setPayDate] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [overtimeHours, setOvertimeHours] = useState('');

  const handleAddPay = () => {
    if (!payDate || !payAmount) return;
    onAddActualPay(payDate, payAmount, overtimeHours);
    setPayDate('');
    setPayAmount('');
    setOvertimeHours('');
  };

  // Sort entries by date descending
  const sortedPayEntries = [...(actualPayEntries || [])].sort(
    (a, b) => new Date(b.payDate) - new Date(a.payDate)
  );

  return (
    <div className="space-y-6">
      {/* Actual Pay Entry Section */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <DollarSign className="text-emerald-600" size={24} />
          Log Actual Pay
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="text-sm font-semibold text-slate-600">Pay Date</label>
            <input
              type="date"
              className="w-full mt-1 px-3 py-2 border-2 rounded-xl"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-600">Actual Amount</label>
            <input
              type="number"
              step="0.01"
              placeholder="$0.00"
              className="w-full mt-1 px-3 py-2 border-2 rounded-xl"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-600">OT Hours (optional)</label>
            <input
              type="number"
              step="0.5"
              placeholder="0"
              className="w-full mt-1 px-3 py-2 border-2 rounded-xl"
              value={overtimeHours}
              onChange={(e) => setOvertimeHours(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAddPay}
              className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold"
            >
              Log Pay
            </button>
          </div>
        </div>

        {/* Pay History */}
        {sortedPayEntries.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <h4 className="text-sm font-semibold text-slate-600 mb-2">Pay History</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {sortedPayEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
                >
                  <div>
                    <span className="font-semibold">
                      {new Date(entry.payDate).toLocaleDateString()}
                    </span>
                    <span className="mx-2 text-emerald-600 font-bold">
                      ${parseAmt(entry.amount).toFixed(2)}
                    </span>
                    {entry.overtimeHours > 0 && (
                      <span className="text-sm text-slate-500 flex items-center gap-1 inline-flex">
                        <Clock size={14} />
                        {entry.overtimeHours} OT hrs
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => onDeleteActualPay(entry.id)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Variable Bills Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">
            Submit Actuals (Variable Bills)
          </h2>
          <div className="text-emerald-100 text-sm">
            Updates estimates based on history.
          </div>
        </div>
        {thisMonthVars.length ? (
          <div className="grid grid-cols-1 gap-3">
            {thisMonthVars.map((i) => (
              <div
                key={i.id}
                className="bg-white rounded-xl p-4 shadow flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div>
                  <div className="font-semibold">{i.name}</div>
                  <div className="text-sm text-slate-600">
                    Due {new Date(i.dueDate).toLocaleDateString()} • Est. $
                    {parseAmt(i.amountEstimate).toFixed(2)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Actual Paid"
                    className="px-3 py-2 border-2 rounded-xl w-32"
                    value={values[i.id] ?? ''}
                    onChange={(e) =>
                      setValues({ ...values, [i.id]: e.target.value })
                    }
                  />
                  <button
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                    onClick={() => onSubmitActual(i.id, values[i.id])}
                  >
                    Save
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-8 text-center text-slate-600">
            No variable bills this month.
          </div>
        )}
      </div>
    </div>
  );
};

export default SubmitActuals;
