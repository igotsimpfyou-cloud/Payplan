import React, { useState } from 'react';
import { parseAmt } from '../../utils/formatters';

export const SubmitActuals = ({ currentMonthInstances, onSubmitActual }) => {
  const thisMonthVars = currentMonthInstances.filter((i) => i.isVariable);
  const [values, setValues] = useState(() => {
    const obj = {};
    thisMonthVars.forEach((i) => {
      obj[i.id] = i.actualPaid != null ? i.actualPaid : '';
    });
    return obj;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white">
          Submit Actuals (Variable Bills)
        </h2>
        <div className="text-emerald-100 text-sm">
          Updates last year's same month to keep estimates accurate.
        </div>
      </div>
      {thisMonthVars.length ? (
        <div className="grid grid-cols-1 gap-3">
          {thisMonthVars.map((i) => (
            <div
              key={i.id}
              className="bg-white rounded-xl p-4 shadow flex items-center justify-between gap-3"
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
                  className="px-3 py-2 border-2 rounded-xl w-40"
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
  );
};

export default SubmitActuals;
