import React, { useState } from 'react';
import Modal from '../ui/Modal';

const CATEGORIES = [
  { value: 'utilities', label: 'Utilities' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'loan', label: 'Loan' },
  { value: 'rent', label: 'Rent/Mortgage' },
  { value: 'other', label: 'Other' },
];

export const TemplateForm = ({ defaultValue, onCancel, onSubmit }) => {
  const [form, setForm] = useState(defaultValue || {
    name: '',
    amount: '',
    isVariable: false,
    category: 'utilities',
    autopay: false,
    dueDate: 1,
    frequency: 'monthly',
  });

  const handleSubmit = () => {
    onSubmit(form);
  };

  return (
    <Modal
      isOpen
      onClose={onCancel}
      title={defaultValue ? 'Edit Bill Template' : 'Add Bill Template'}
      maxWidth="max-w-md"
      closeButtonLabel="Close bill template form"
    >
      <div className="space-y-4">
        <div>
          <label className="text-sm font-semibold">Name</label>
          <input
            className="w-full mt-1 px-3 py-2 border-2 rounded-xl"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.isVariable}
            onChange={(e) =>
              setForm({ ...form, isVariable: e.target.checked })
            }
          />
          <span className="text-sm font-semibold">Variable amount</span>
        </div>
        <div>
          <label className="text-sm font-semibold">
            {form.isVariable ? 'Estimated Amount' : 'Amount'}
          </label>
          <input
            type="number"
            step="0.01"
            className="w-full mt-1 px-3 py-2 border-2 rounded-xl"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="text-sm font-semibold">Category</label>
          <select
            className="w-full mt-1 px-3 py-2 border-2 rounded-xl"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.autopay}
            onChange={(e) =>
              setForm({ ...form, autopay: e.target.checked })
            }
          />
          <span className="text-sm font-semibold">Auto-pay</span>
        </div>
        <div>
          <label className="text-sm font-semibold">Due Day (1-31)</label>
          <input
            type="number"
            min={1}
            max={31}
            className="w-full mt-1 px-3 py-2 border-2 rounded-xl"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
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
            {defaultValue ? 'Update' : 'Add'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default TemplateForm;
