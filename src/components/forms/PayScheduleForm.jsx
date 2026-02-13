import React, { useState } from 'react';
import Modal from '../ui/Modal';

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
    <Modal
      isOpen
      onClose={onCancel}
      title="Pay Schedule"
      maxWidth="max-w-md"
      closeButtonLabel="Close pay schedule form"
    >
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
    </Modal>
  );
};

export default PayScheduleForm;
