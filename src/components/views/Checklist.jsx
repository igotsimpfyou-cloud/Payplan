import React from 'react';
import { Check, Calendar, DollarSign, Clock, Receipt, RefreshCw } from 'lucide-react';
import { parseAmt } from '../../utils/formatters';

export const Checklist = ({
  currentMonthInstances,
  onToggleInstancePaid,
  onReassignChecks,
}) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white">
          {new Date().toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          })}{' '}
          Checklist
        </h2>
        <button
          onClick={onReassignChecks}
          className="px-4 py-2 rounded-xl bg-white/20 text-white hover:bg-white/30 font-semibold flex items-center gap-2"
        >
          <RefreshCw size={16} />
          Re-assign
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {currentMonthInstances.length ? (
          currentMonthInstances.map((i) => (
            <div
              key={i.id}
              className="bg-white rounded-xl p-4 shadow flex items-start gap-3"
            >
              <button
                onClick={() => onToggleInstancePaid(i.id)}
                className={`p-2 rounded-lg ${
                  i.paid
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                }`}
                title={i.paid ? 'Mark unpaid' : 'Mark paid'}
              >
                <Check size={18} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`font-semibold ${
                      i.paid ? 'line-through text-green-700' : 'text-slate-800'
                    }`}
                  >
                    {i.name}
                  </div>
                  {i.isVariable && (
                    <span className="text-xs font-bold px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
                      VAR
                    </span>
                  )}
                  {i.autopay && (
                    <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                      AUTO
                    </span>
                  )}
                </div>
                <div className="text-sm text-slate-600 flex flex-wrap gap-4">
                  <span>
                    <Calendar size={14} className="inline mr-1" />{' '}
                    {new Date(i.dueDate).toLocaleDateString()}
                  </span>
                  <span>
                    <DollarSign size={14} className="inline mr-1" /> Est. $
                    {parseAmt(i.amountEstimate).toFixed(2)}
                  </span>
                  {i.actualPaid != null && (
                    <span>Actual ${parseAmt(i.actualPaid).toFixed(2)}</span>
                  )}
                  {i.assignedPayDate && (
                    <span>
                      <Clock size={14} className="inline mr-1" /> Check{' '}
                      {i.assignedCheck} •{' '}
                      {new Date(i.assignedPayDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <Receipt className="mx-auto mb-4 text-slate-300" size={64} />
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              No Bills This Month
            </h3>
          </div>
        )}
      </div>
    </div>
  );
};

export default Checklist;
