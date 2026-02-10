import React, { useState } from 'react';
import { X } from 'lucide-react';

const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'semimonthly', label: 'Semi-monthly' },
  { value: 'monthly', label: 'Monthly' },
];

export const PayScheduleForm = ({ defaultValue, onCancel, onSubmit }) => {
  const [form, setForm] = useState(
    defaultValue || { frequency: 'biweekly', payAmount: '', nextPayDate: '' }
  );

  const handleSubmit = () => {
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Pay Schedule</h2>
            <button
              className="p-2 rounded-lg hover:bg-slate-100"
              onClick={onCancel}
            >
              <X size={20} />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold">Frequency</label>
              <select
                className="w-full mt-1 px-3 py-2 border-2 rounded-xl"
                value={form.frequency}
                onChange={(e) =>
                  setForm({ ...form, frequency: e.target.value })
                }
              >
                {FREQUENCIES.map((freq) => (
                  <option key={freq.value} value={freq.value}>
                    {freq.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold">
                Pay Amount (per check)
              </label>
              <input
                type="number"
                step="0.01"
                className="w-full mt-1 px-3 py-2 border-2 rounded-xl"
                value={form.payAmount}
                onChange={(e) =>
                  setForm({ ...form, payAmount: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Next Pay Date</label>
              <input
                type="date"
                className="w-full mt-1 px-3 py-2 border-2 rounded-xl"
                value={form.nextPayDate}
                onChange={(e) =>
                  setForm({ ...form, nextPayDate: e.target.value })
                }
                required
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold"
                onClick={onCancel}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-white font-semibold"
                onClick={handleSubmit}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayScheduleForm;
