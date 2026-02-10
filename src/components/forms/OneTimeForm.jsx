import React, { useState } from 'react';
import { X } from 'lucide-react';

export const OneTimeForm = ({ bill, onSubmit, onCancel }) => {
  const [form, setForm] = useState(
    bill || { name: '', amount: '', dueDate: '', description: '' }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">
              {bill ? 'Edit One-Time Bill' : 'Add One-Time Bill'}
            </h2>
            <button
              className="p-2 rounded-lg hover:bg-slate-100"
              onClick={onCancel}
            >
              <X size={20} />
            </button>
          </div>
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
        </div>
      </div>
    </div>
  );
};

export default OneTimeForm;
