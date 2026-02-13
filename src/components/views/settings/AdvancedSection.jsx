import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
import { parseMMDDYYYY } from '../../../utils/billDatabase';
import LearnMoreToggle from './LearnMoreToggle';
import SectionCard from './SectionCard';

const AdvancedSection = ({ bills = [], onDeduplicateBills, onMarkPastBillsPaid }) => {
  const [result, setResult] = useState(null);

  const stats = useMemo(() => {
    const billsByNameMonth = {};
    bills.forEach((bill) => {
      const dueDate = parseMMDDYYYY(bill.dueDate);
      if (!dueDate) return;
      const monthKey = `${bill.name}-${dueDate.getFullYear()}-${dueDate.getMonth()}`;
      billsByNameMonth[monthKey] = (billsByNameMonth[monthKey] || 0) + 1;
    });

    const duplicateCount = Object.values(billsByNameMonth)
      .filter((count) => count > 1)
      .reduce((sum, count) => sum + count - 1, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pastUnpaidCount = bills.filter((bill) => {
      if (bill.paid) return false;
      const dueDate = parseMMDDYYYY(bill.dueDate);
      return dueDate && dueDate < today;
    }).length;

    return { duplicateCount, pastUnpaidCount };
  }, [bills]);

  if (!bills.length) return null;

  const handleDeduplicate = () => {
    if (stats.duplicateCount === 0) return;
    const confirmed = window.confirm(
      `Remove ${stats.duplicateCount} duplicate bill${stats.duplicateCount !== 1 ? 's' : ''}? This cannot be undone unless you restore from backup.`
    );
    if (!confirmed) return;

    const removed = onDeduplicateBills();
    setResult({ type: 'dedupe', count: removed });
    setTimeout(() => setResult(null), 3000);
  };

  const handleMarkPastPaid = () => {
    if (stats.pastUnpaidCount === 0) return;
    const confirmed = window.confirm(
      `Mark ${stats.pastUnpaidCount} past-due unpaid bill${stats.pastUnpaidCount !== 1 ? 's' : ''} as paid? This updates payment history in bulk.`
    );
    if (!confirmed) return;

    const marked = onMarkPastBillsPaid();
    setResult({ type: 'markPaid', count: marked });
    setTimeout(() => setResult(null), 3000);
  };

  return (
    <SectionCard
      id="advanced"
      title="Advanced"
      summary="High-impact bulk actions. Review carefully before confirming."
      className="mb-6 border-2 border-amber-200"
    >
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex items-start gap-2">
        <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
        <p>
          These actions can change many records at once. Create a backup first if you may need to undo.
        </p>
      </div>

      <div className="space-y-4 mt-4">
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-slate-800">Remove duplicate bills</div>
              <div className="text-sm text-slate-600">
                {stats.duplicateCount > 0
                  ? `${stats.duplicateCount} duplicate bill${stats.duplicateCount !== 1 ? 's' : ''} found`
                  : 'No duplicates found'}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Consequence: duplicate entries are permanently removed from current data.
              </div>
            </div>
            <button
              onClick={handleDeduplicate}
              disabled={stats.duplicateCount === 0}
              className={`px-4 py-2 rounded-xl font-semibold transition-colors ${
                stats.duplicateCount > 0
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Trash2 size={16} className="inline mr-1" /> Remove Duplicates
            </button>
          </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-slate-800">Mark past-due bills as paid</div>
              <div className="text-sm text-slate-600">
                {stats.pastUnpaidCount > 0
                  ? `${stats.pastUnpaidCount} past-due unpaid bill${stats.pastUnpaidCount !== 1 ? 's' : ''} found`
                  : 'No past-due unpaid bills found'}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Consequence: payment status is updated in bulk and may affect reports.
              </div>
            </div>
            <button
              onClick={handleMarkPastPaid}
              disabled={stats.pastUnpaidCount === 0}
              className={`px-4 py-2 rounded-xl font-semibold transition-colors ${
                stats.pastUnpaidCount > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              Mark All Paid
            </button>
          </div>
        </div>

        {result && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
            <CheckCircle2 className="text-green-500" size={20} />
            <span className="text-green-700 text-sm font-medium">
              {result.type === 'dedupe'
                ? `Removed ${result.count} duplicate bill${result.count !== 1 ? 's' : ''}`
                : `Marked ${result.count} bill${result.count !== 1 ? 's' : ''} as paid`}
            </span>
          </div>
        )}
      </div>

      <LearnMoreToggle
        className="mt-4"
        summary="Need more context on when to run these actions?"
      >
        <ul className="list-disc list-inside space-y-1">
          <li>Run dedupe after imports if the same bill appears multiple times for the same month.</li>
          <li>Run mark-paid only when you know these older bills were actually paid outside this app.</li>
          <li>Best practice: export a backup immediately before running either action.</li>
        </ul>
      </LearnMoreToggle>
    </SectionCard>
  );
};

export default AdvancedSection;
