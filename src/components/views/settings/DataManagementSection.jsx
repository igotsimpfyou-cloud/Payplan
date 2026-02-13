import React, { useMemo } from 'react';
import { Database } from 'lucide-react';
import { parseMMDDYYYY } from '../../../utils/billDatabase';
import LearnMoreToggle from './LearnMoreToggle';
import SectionCard from './SectionCard';

const DataManagementSection = ({ bills = [] }) => {
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pastDueUnpaid = bills.filter((bill) => {
      if (bill.paid) return false;
      const dueDate = parseMMDDYYYY(bill.dueDate);
      return dueDate && dueDate < today;
    }).length;

    return {
      total: bills.length,
      paid: bills.filter((bill) => bill.paid).length,
      unpaid: bills.filter((bill) => !bill.paid).length,
      pastDueUnpaid,
    };
  }, [bills]);

  return (
    <SectionCard
      id="data-management"
      title="Data Management"
      summary="Review your bill data health and routine maintenance status."
      className="mb-6"
    >
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 mb-3 text-slate-800 font-semibold">
          <Database size={18} />
          Current data snapshot
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="rounded-lg bg-white p-3 border border-slate-200">
            <div className="text-slate-500">Total bills</div>
            <div className="font-bold text-slate-800">{stats.total}</div>
          </div>
          <div className="rounded-lg bg-white p-3 border border-slate-200">
            <div className="text-slate-500">Marked paid</div>
            <div className="font-bold text-emerald-700">{stats.paid}</div>
          </div>
          <div className="rounded-lg bg-white p-3 border border-slate-200">
            <div className="text-slate-500">Still unpaid</div>
            <div className="font-bold text-blue-700">{stats.unpaid}</div>
          </div>
          <div className="rounded-lg bg-white p-3 border border-slate-200">
            <div className="text-slate-500">Past due unpaid</div>
            <div className="font-bold text-amber-700">{stats.pastDueUnpaid}</div>
          </div>
        </div>
      </div>

      <LearnMoreToggle
        className="mt-4"
        summary="Run exports regularly and review past-due counts so your reminders and payment records stay reliable."
      >
        <p>
          If the numbers above look unexpected, review entries for incorrect due dates or duplicate imports.
          Use the Advanced section only when you are confident you want bulk changes applied.
        </p>
      </LearnMoreToggle>
    </SectionCard>
  );
};

export default DataManagementSection;
