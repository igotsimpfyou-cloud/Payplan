import React, { useState, useMemo } from 'react';
import { Check, Calendar, DollarSign, Clock, Receipt, RefreshCw, AlertTriangle, Filter, ChevronDown, X } from 'lucide-react';
import { parseAmt } from '../../utils/formatters';
import { parseLocalDate, formatPayDatesAsMonthCheck, getMonthCheckLabel } from '../../utils/dateHelpers';
import { uiSpacing, uiTap, uiType } from '../../constants/uiPresets';

// Bill Edit Modal
const BillEditModal = ({ bill, nextPayDates, onSave, onClose }) => {
  const [assignedCheck, setAssignedCheck] = useState(bill.assignedCheck || 1);
  const [paidDate, setPaidDate] = useState(bill.paidDate || '');
  const [actualPaid, setActualPaid] = useState(
    bill.actualPaid != null ? bill.actualPaid.toString() : ''
  );

  // Get Month.Check# labels for all pay dates
  const payDateLabels = formatPayDatesAsMonthCheck(nextPayDates);

  // Check if this is a variable/estimated bill
  const isVariable = bill.isVariable || bill.amountEstimate !== bill.amount;

  const handleSave = () => {
    onSave({
      ...bill,
      assignedCheck,
      assignedPayDate: nextPayDates[assignedCheck - 1]
        ? new Date(nextPayDates[assignedCheck - 1]).toISOString().split('T')[0]
        : bill.assignedPayDate,
      paidDate: paidDate || null,
      paid: !!paidDate,
      actualPaid: actualPaid ? parseAmt(actualPaid) : null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-slate-800">Edit Bill</h3>
          <button onClick={onClose} className={`text-slate-400 hover:text-slate-600 ${uiTap.iconControl}`}>
            <X size={24} />
          </button>
        </div>

        <div className="mb-4">
          <div className="text-lg font-semibold text-slate-800">{bill.name}</div>
          <div className={`text-slate-500 ${uiType.helperText}`}>
            Due: {parseLocalDate(bill.dueDate).toLocaleDateString()} •
            ${parseAmt(bill.amountEstimate).toFixed(2)}
          </div>
        </div>

        <div className="space-y-4">
          {/* Assign to Check */}
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-2">
              Assign to Paycheck
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((checkNum) => {
                const labelInfo = payDateLabels[checkNum - 1];
                return (
                  <button
                    key={checkNum}
                    onClick={() => setAssignedCheck(checkNum)}
                    className={`p-2.5 sm:p-3 rounded-xl font-semibold text-center transition-all ${uiTap.control} ${
                      assignedCheck === checkNum
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 active:bg-slate-300'
                    }`}
                  >
                    <div className="text-base sm:text-lg">{labelInfo?.label || `#${checkNum}`}</div>
                    {nextPayDates[checkNum - 1] && (
                      <div className={`opacity-75 ${uiType.helperText}`}>
                        {new Date(nextPayDates[checkNum - 1]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Paid Date */}
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-2">
              Date Paid (leave empty if unpaid)
            </label>
            <input
              type="date"
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
              className="w-full px-4 py-3 border-2 rounded-xl focus:border-emerald-500 focus:outline-none"
            />
            {paidDate && (
              <button
                onClick={() => setPaidDate('')}
                className={`mt-2 text-red-600 hover:text-red-700 ${uiType.helperText}`}
              >
                Clear paid date (mark as unpaid)
              </button>
            )}
          </div>

          {/* Actual Amount Paid */}
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-2">
              Actual Amount Paid
              {isVariable && <span className="text-amber-600 ml-1">(estimated bill)</span>}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input
                type="number"
                step="0.01"
                value={actualPaid}
                onChange={(e) => setActualPaid(e.target.value)}
                placeholder={parseAmt(bill.amountEstimate).toFixed(2)}
                className="w-full pl-8 pr-4 py-3 border-2 rounded-xl focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <p className={`text-slate-500 mt-1 ${uiType.helperText}`}>
              Estimated: ${parseAmt(bill.amountEstimate).toFixed(2)}
              {actualPaid && (
                <span className={`ml-2 font-medium ${parseAmt(actualPaid) > parseAmt(bill.amountEstimate) ? 'text-red-600' : 'text-green-600'}`}>
                  ({parseAmt(actualPaid) > parseAmt(bill.amountEstimate) ? '+' : ''}
                  ${(parseAmt(actualPaid) - parseAmt(bill.amountEstimate)).toFixed(2)})
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className={`flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors ${uiTap.control}`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className={`flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors ${uiTap.control}`}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export const Checklist = ({
  currentMonthInstances,
  allBills = [],  // All bills for month switching
  onToggleInstancePaid,
  onReassignChecks,
  onUpdateInstance,
  nextPayDates = [],
}) => {
  const [showUnpaidOnly, setShowUnpaidOnly] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Generate list of months to show (current + next 5 months)
  const availableMonths = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      months.push({ key, label, date });
    }
    return months;
  }, []);

  // Get bills for selected month
  const monthBills = useMemo(() => {
    // Use allBills if available, otherwise fall back to currentMonthInstances
    const billsSource = allBills.length > 0 ? allBills : currentMonthInstances;

    const [year, month] = selectedMonth.split('-').map(Number);

    return billsSource
      .filter(bill => {
        const dueDate = parseLocalDate(bill.dueDate);
        return dueDate.getFullYear() === year && dueDate.getMonth() === month - 1;
      })
      .map(bill => ({
        ...bill,
        // Normalize field names for display
        amountEstimate: bill.amountEstimate ?? bill.amount,
      }));
  }, [allBills, currentMonthInstances, selectedMonth]);

  // Calculate due status for each bill
  const getBillStatus = (bill) => {
    if (bill.paid) return 'paid';
    const dueDate = parseLocalDate(bill.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) return 'overdue';
    if (daysUntil <= 3) return 'due-soon';
    return 'upcoming';
  };

  // Filter and sort bills
  const filteredBills = useMemo(() => {
    let bills = [...monthBills];
    if (showUnpaidOnly) {
      bills = bills.filter(b => !b.paid);
    }
    // Sort: overdue first, then due-soon, then by date
    return bills.sort((a, b) => {
      const statusOrder = { overdue: 0, 'due-soon': 1, upcoming: 2, paid: 3 };
      const statusA = statusOrder[getBillStatus(a)];
      const statusB = statusOrder[getBillStatus(b)];
      if (statusA !== statusB) return statusA - statusB;
      return parseLocalDate(a.dueDate) - parseLocalDate(b.dueDate);
    });
  }, [monthBills, showUnpaidOnly]);

  // Count unpaid and urgent
  const unpaidCount = monthBills.filter(b => !b.paid).length;
  const overdueCount = monthBills.filter(b => getBillStatus(b) === 'overdue').length;
  const dueSoonCount = monthBills.filter(b => getBillStatus(b) === 'due-soon').length;

  // Check if viewing current month
  const isCurrentMonth = useMemo(() => {
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return selectedMonth === currentKey;
  }, [selectedMonth]);

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
    const dueDate = parseLocalDate(bill.dueDate);
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
    <div className={uiSpacing.pageStack}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">Checklist</h2>
            {/* Month Selector */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className={`px-3 py-1.5 rounded-lg bg-white/20 text-white font-semibold border-0 focus:ring-2 focus:ring-white/50 cursor-pointer ${uiTap.control}`}
            >
              {availableMonths.map(m => (
                <option key={m.key} value={m.key} className="text-slate-800">
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <p className={`text-emerald-100 mt-1 ${uiType.helperText}`}>
            {unpaidCount} unpaid • {monthBills.length} total
            {overdueCount > 0 && <span className="text-red-300 font-bold"> • {overdueCount} overdue</span>}
            {dueSoonCount > 0 && <span className="text-amber-300"> • {dueSoonCount} due soon</span>}
            {!isCurrentMonth && <span className="text-blue-200"> • Viewing future month</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowUnpaidOnly(!showUnpaidOnly)}
            className={`px-3 py-2 rounded-xl font-semibold flex items-center gap-2 text-sm ${uiTap.control} ${
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
            className={`px-3 py-2 rounded-xl bg-white/20 text-white hover:bg-white/30 font-semibold flex items-center gap-2 text-sm ${uiTap.control}`}
          >
            <RefreshCw size={16} />
            Re-assign
          </button>
        </div>
      </div>

      {/* Bills List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredBills.length ? (
          filteredBills.map((i) => {
            const status = getBillStatus(i);
            return (
              <div
                key={i.id}
                className={`rounded-xl p-4 sm:p-5 shadow flex items-start gap-3 ${getCardStyle(status)}`}
              >
                <button
                  onClick={() => onToggleInstancePaid(i.id)}
                  className={`p-2 rounded-lg transition-colors ${uiTap.iconControl} ${
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
                  <div className={`text-slate-600 flex flex-wrap gap-x-4 gap-y-2 ${uiType.helperText}`}>
                    <span>
                      <Calendar size={14} className="inline mr-1" />
                      Due {parseLocalDate(i.dueDate).toLocaleDateString()}
                    </span>
                    <span className="font-medium">
                      <DollarSign size={14} className="inline mr-1" />
                      ${parseAmt(i.actualPaid ?? i.amountEstimate).toFixed(2)}
                      {i.actualPaid == null && <span className="text-slate-400 text-xs ml-1">(est)</span>}
                    </span>
                    {i.assignedPayDate && (
                      <button
                        onClick={() => setEditingBill(i)}
                        className={`text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 ${uiTap.control}`}
                      >
                        <Clock size={14} />
                        {getMonthCheckLabel(i.assignedPayDate, nextPayDates) || `Check #${i.assignedCheck}`}
                        <ChevronDown size={12} />
                      </button>
                    )}
                    {i.paidDate && (
                      <span className="text-green-600">
                        Paid {parseLocalDate(i.paidDate).toLocaleDateString()}
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

      {/* Edit Modal */}
      {editingBill && onUpdateInstance && (
        <BillEditModal
          bill={editingBill}
          nextPayDates={nextPayDates}
          onSave={onUpdateInstance}
          onClose={() => setEditingBill(null)}
        />
      )}
    </div>
  );
};

export default Checklist;
