import React, { useState } from 'react';
import Modal from '../ui/Modal';

export const OneTimeForm = ({ bill, onSubmit, onCancel }) => {
  const [form, setForm] = useState(
    bill || { name: '', amount: '', dueDate: '', description: '' }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <Modal
      isOpen
      onClose={onCancel}
      title={bill ? 'Edit One-Time Bill' : 'Add One-Time Bill'}
      maxWidth="max-w-md"
      closeButtonLabel="Close one-time bill form"
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
          <label className="text-sm font-semibold">Amount</label>
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
          <label className="text-sm font-semibold">Due Date</label>
          <input
            type="date"
            className="w-full mt-1 px-3 py-2 border-2 rounded-xl"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="text-sm font-semibold">
            Description (Optional)
          </label>
          <textarea
            rows={3}
            className="w-full mt-1 px-3 py-2 border-2 rounded-xl"
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
          />
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
            {bill ? 'Update' : 'Add'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default OneTimeForm;
