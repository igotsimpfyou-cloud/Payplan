import React, { useState, useMemo } from 'react';
import { Check, Calendar, DollarSign, Clock, Receipt, RefreshCw, AlertTriangle, Filter } from 'lucide-react';
import { parseAmt } from '../../utils/formatters';

export const Checklist = ({
  currentMonthInstances,
  onToggleInstancePaid,
  onReassignChecks,
}) => {
  const [showUnpaidOnly, setShowUnpaidOnly] = useState(false);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate due status for each bill
  const getBillStatus = (bill) => {
    if (bill.paid) return 'paid';
    const dueDate = new Date(bill.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) return 'overdue';
    if (daysUntil <= 3) return 'due-soon';
    return 'upcoming';
  };

  // Filter and sort bills
  const filteredBills = useMemo(() => {
    let bills = [...currentMonthInstances];
    if (showUnpaidOnly) {
      bills = bills.filter(b => !b.paid);
    }
    // Sort: overdue first, then due-soon, then by date
    return bills.sort((a, b) => {
      const statusOrder = { overdue: 0, 'due-soon': 1, upcoming: 2, paid: 3 };
      const statusA = statusOrder[getBillStatus(a)];
      const statusB = statusOrder[getBillStatus(b)];
      if (statusA !== statusB) return statusA - statusB;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
  }, [currentMonthInstances, showUnpaidOnly]);

  // Count unpaid and urgent
  const unpaidCount = currentMonthInstances.filter(b => !b.paid).length;
  const overdueCount = currentMonthInstances.filter(b => getBillStatus(b) === 'overdue').length;
  const dueSoonCount = currentMonthInstances.filter(b => getBillStatus(b) === 'due-soon').length;

  const getCardStyle = (status) => {
    switch (status) {
      case 'overdue':
        return 'bg-red-50 border-2 border-red-400';
      case 'due-soon':
        return 'bg-amber-50 border-2 border-amber-300';
      case 'paid':
        return 'bg-green-50 border border-green-200';
      default:
        return 'bg-white';
    }
  };

  const getDaysLabel = (bill) => {
    if (bill.paid) return null;
    const dueDate = new Date(bill.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) {
      return (
        <span className="text-xs font-bold px-2 py-0.5 bg-red-500 text-white rounded-full flex items-center gap-1">
          <AlertTriangle size={12} />
          {Math.abs(daysUntil)}d OVERDUE
        </span>
      );
    }
    if (daysUntil === 0) {
      return (
        <span className="text-xs font-bold px-2 py-0.5 bg-red-500 text-white rounded-full animate-pulse">
          DUE TODAY
        </span>
      );
    }
    if (daysUntil <= 3) {
      return (
        <span className="text-xs font-bold px-2 py-0.5 bg-amber-500 text-white rounded-full">
          {daysUntil}d left
        </span>
      );
    }
    return null;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {new Date().toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}{' '}
            Checklist
          </h2>
          <p className="text-emerald-100 text-sm">
            {unpaidCount} unpaid
            {overdueCount > 0 && <span className="text-red-300 font-bold"> • {overdueCount} overdue</span>}
            {dueSoonCount > 0 && <span className="text-amber-300"> • {dueSoonCount} due soon</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowUnpaidOnly(!showUnpaidOnly)}
            className={`px-3 py-2 rounded-xl font-semibold flex items-center gap-2 text-sm ${
              showUnpaidOnly
                ? 'bg-white text-emerald-600'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <Filter size={16} />
            {showUnpaidOnly ? 'Showing Unpaid' : 'Show All'}
          </button>
          <button
            onClick={onReassignChecks}
            className="px-3 py-2 rounded-xl bg-white/20 text-white hover:bg-white/30 font-semibold flex items-center gap-2 text-sm"
          >
            <RefreshCw size={16} />
            Re-assign
          </button>
        </div>
      </div>

      {/* Bills List */}
      <div className="grid grid-cols-1 gap-3">
        {filteredBills.length ? (
          filteredBills.map((i) => {
            const status = getBillStatus(i);
            return (
              <div
                key={i.id}
                className={`rounded-xl p-4 shadow flex items-start gap-3 ${getCardStyle(status)}`}
              >
                <button
                  onClick={() => onToggleInstancePaid(i.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    i.paid
                      ? 'bg-green-500 text-white'
                      : status === 'overdue'
                      ? 'bg-red-200 text-red-600 hover:bg-red-300'
                      : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                  }`}
                  title={i.paid ? 'Mark unpaid' : 'Mark paid'}
                >
                  <Check size={18} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <div
                      className={`font-semibold ${
                        i.paid ? 'line-through text-green-700' :
                        status === 'overdue' ? 'text-red-800' : 'text-slate-800'
                      }`}
                    >
                      {i.name}
                    </div>
                    {getDaysLabel(i)}
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
                  <div className="text-sm text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                    <span>
                      <Calendar size={14} className="inline mr-1" />
                      {new Date(i.dueDate).toLocaleDateString()}
                    </span>
                    <span className="font-medium">
                      <DollarSign size={14} className="inline mr-1" />
                      ${parseAmt(i.actualPaid ?? i.amountEstimate).toFixed(2)}
                      {i.actualPaid == null && <span className="text-slate-400 text-xs ml-1">(est)</span>}
                    </span>
                    {i.assignedPayDate && (
                      <span>
                        <Clock size={14} className="inline mr-1" />
                        Check {i.assignedCheck}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <Receipt className="mx-auto mb-4 text-slate-300" size={64} />
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              {showUnpaidOnly ? 'All Bills Paid!' : 'No Bills This Month'}
            </h3>
          </div>
        )}
      </div>
    </div>
  );
};

export default Checklist;
