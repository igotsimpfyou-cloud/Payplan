import React from 'react';
import {
  Plus,
  Calendar,
  DollarSign,
  Check,
  AlertCircle,
  Edit2,
  Trash2,
} from 'lucide-react';
import { parseAmt } from '../../utils/formatters';

export const OneTime = ({
  oneTimeBills,
  onAddOneTime,
  onEditOneTime,
  onDeleteOneTime,
  onToggleOneTimePaid,
}) => {
  const upcomingTotal = oneTimeBills
    .filter((b) => !b.paid)
    .reduce((s, b) => s + parseAmt(b.amount), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-black text-white">One-Time Bills</h2>
        <button
          onClick={onAddOneTime}
          className="px-6 py-3 bg-white hover:bg-emerald-50 text-emerald-600 rounded-xl font-semibold shadow-lg transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          Add One-Time Bill
        </button>
      </div>

      <div className="mb-6 bg-white/20 backdrop-blur-sm rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="text-white" size={24} />
          <div>
            <p className="text-white font-semibold">Upcoming Total</p>
            <p className="text-2xl font-black text-white">
              ${upcomingTotal.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {oneTimeBills.length ? (
          oneTimeBills.map((bill) => {
            const dueDate = new Date(bill.dueDate);
            const today = new Date();
            const isOverdue = !bill.paid && dueDate < today;
            return (
              <div
                key={bill.id}
                className={`bg-white rounded-2xl shadow-xl p-6 ${
                  isOverdue ? 'border-4 border-red-500' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => onToggleOneTimePaid(bill.id)}
                    className={`p-3 rounded-xl ${
                      bill.paid
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    <Check size={24} />
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3
                        className={`text-xl font-bold ${
                          bill.paid
                            ? 'text-green-800 line-through'
                            : 'text-slate-800'
                        }`}
                      >
                        {bill.name}
                      </h3>
                      {isOverdue && (
                        <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                          OVERDUE
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        Due: {new Date(bill.dueDate).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign size={14} />${bill.amount}
                      </span>
                      {bill.paid && bill.paidDate && (
                        <span className="text-green-600 flex items-center gap-1">
                          <Check size={14} />
                          Paid {new Date(bill.paidDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {bill.description && (
                      <p className="text-sm text-slate-600 italic">
                        {bill.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEditOneTime(bill)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete ${bill.name}?`))
                          onDeleteOneTime(bill.id);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <Calendar className="mx-auto mb-4 text-slate-300" size={64} />
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              No One-Time Bills
            </h3>
            <p className="text-slate-600 mb-6">
              Track non-recurring expenses like medical bills or repairs
            </p>
            <button
              onClick={onAddOneTime}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold"
            >
              Add Your First One-Time Bill
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OneTime;
