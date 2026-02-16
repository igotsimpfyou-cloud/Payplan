import React, { useState } from 'react';
import Modal from '../ui/Modal';

const ASSET_TYPES = [
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'auto', label: 'Auto Loan' },
  { value: 'student', label: 'Student Loan' },
  { value: 'personal', label: 'Personal Loan' },
  { value: 'credit', label: 'Credit Card' },
  { value: 'other', label: 'Other' },
];

const PAYMENT_FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
];

export const AssetForm = ({ asset, onSubmit, onCancel }) => {
  const [form, setForm] = useState(
    asset || {
      name: '',
      type: 'mortgage',
      loanAmount: '',
      currentBalance: '',
      loanTerm: '',
      interestRate: '',
      paymentAmount: '',
      paymentFrequency: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      createBill: false,
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <Modal
      isOpen
      onClose={onCancel}
      title={asset ? 'Edit Asset' : 'Add Asset'}
      maxWidth="max-w-md"
      closeButtonLabel="Close asset form"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-sm font-semibold">Name</label>
              <input
                className="w-full mt-1 px-3 py-2 border-2 rounded-xl"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Type</label>
              <select
                className="w-full mt-1 px-3 py-2 border-2 rounded-xl"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {ASSET_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold">Loan Amount</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full mt-1 px-3 py-2 border-2 rounded-xl"
                  value={form.loanAmount}
                  onChange={(e) =>
                    setForm({ ...form, loanAmount: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="text-sm font-semibold">Current Balance</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full mt-1 px-3 py-2 border-2 rounded-xl"
                  value={form.currentBalance}
                  onChange={(e) =>
                    setForm({ ...form, currentBalance: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="text-sm font-semibold">
                  Loan Term (months)
                </label>
                <input
                  type="number"
                  className="w-full mt-1 px-3 py-2 border-2 rounded-xl"
                  value={form.loanTerm}
                  onChange={(e) =>
                    setForm({ ...form, loanTerm: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="text-sm font-semibold">
                  Interest Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full mt-1 px-3 py-2 border-2 rounded-xl"
                  value={form.interestRate}
                  onChange={(e) =>
                    setForm({ ...form, interestRate: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="text-sm font-semibold">Payment Amount</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full mt-1 px-3 py-2 border-2 rounded-xl"
                  value={form.paymentAmount}
                  onChange={(e) =>
                    setForm({ ...form, paymentAmount: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="text-sm font-semibold">
                  Payment Frequency
                </label>
                <select
                  className="w-full mt-1 px-3 py-2 border-2 rounded-xl"
                  value={form.paymentFrequency}
                  onChange={(e) =>
                    setForm({ ...form, paymentFrequency: e.target.value })
                  }
                >
                  {PAYMENT_FREQUENCIES.map((freq) => (
                    <option key={freq.value} value={freq.value}>
                      {freq.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold">Start Date</label>
              <input
                type="date"
                className="w-full mt-1 px-3 py-2 border-2 rounded-xl"
                value={form.startDate}
                onChange={(e) =>
                  setForm({ ...form, startDate: e.target.value })
                }
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.createBill}
                onChange={(e) =>
                  setForm({ ...form, createBill: e.target.checked })
                }
              />
              <span className="text-sm font-semibold">
                Create linked recurring bill
              </span>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold"
              >
                {asset ? 'Update' : 'Add'}
              </button>
            </div>
      </form>
    </Modal>
  );
};

export default AssetForm;
