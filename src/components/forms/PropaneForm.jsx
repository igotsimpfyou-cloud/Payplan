import React from 'react';
import { parseAmt } from '../../utils/formatters';

export const PropaneForm = ({ onSubmit, onCancel }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const gallons = parseAmt(fd.get('gallons'));
    const pricePerGal = parseAmt(fd.get('pricePerGal'));
    onSubmit({
      date: fd.get('date'),
      gallons: gallons.toFixed(2),
      pricePerGal: pricePerGal.toFixed(2),
      totalCost: (gallons * pricePerGal).toFixed(2),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">Add Propane Fill</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                Fill Date
              </label>
              <input
                type="date"
                name="date"
                required
                className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">
                Gallons Delivered
              </label>
              <input
                type="number"
                step="0.1"
                name="gallons"
                required
                className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">
                Price per Gallon
              </label>
              <input
                type="number"
                step="0.01"
                name="pricePerGal"
                required
                className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
              />
            </div>
            <div className="flex gap-3 pt-4">
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
                Add Fill
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PropaneForm;
