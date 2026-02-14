import React, { useMemo } from 'react';
import { DollarSign, AlertTriangle, Check, Clock, ArrowRight } from 'lucide-react';
import { parseAmt } from '../../utils/formatters';
import { parseLocalDate, toYMD } from '../../utils/dateHelpers';
import { uiSpacing, uiType } from '../../constants/uiPresets';
import { Button } from '../ui/Button';

export const Dashboard = ({
  overview,
  paySchedule,
  billInstances,
  currentMonthInstances = [],
  bills = [],
  scannedReceipts = [],
  actualPayEntries = [],
  nextPayDates,
  perCheckEnvelopeSum,
  onToggleInstancePaid,
  onNavigateToChecklist,
}) => {
  const allBills = bills.length > 0 ? bills : billInstances;
  const perCheck = parseAmt(paySchedule?.payAmount);

  // Safe to spend: next paycheck amount minus all bills assigned to that check
  // (including already-paid bills so spending doesn't get added back after payment)
  const safeToSpend = useMemo(() => {
    if (!nextPayDates.length || !perCheck) return null;

    const nextCheckDate = nextPayDates[0];
    const dateStr = toYMD(nextCheckDate);
    const actualEntry = actualPayEntries.find(entry => entry.payDate === dateStr);
    const checkAmount = actualEntry ? parseAmt(actualEntry.amount) : perCheck;

    // Bills assigned to check 1 (next paycheck)
    const billsForNextCheck = allBills.filter((b) => b.assignedCheck === 1);

    const paidBillsTotal = billsForNextCheck
      .filter((b) => b.paid)
      .reduce((sum, b) => sum + parseAmt(b.actualPaid ?? b.amountEstimate ?? b.amount), 0);

    const toPayBillsTotal = billsForNextCheck
      .filter((b) => !b.paid)
      .reduce((sum, b) => sum + parseAmt(b.actualPaid ?? b.amountEstimate ?? b.amount), 0);

    const billsTotal = paidBillsTotal + toPayBillsTotal;

    // Receipts in this pay period
    const receiptTotal = scannedReceipts
      .filter(r => {
        const d = parseLocalDate(r.date);
        return d && d <= nextCheckDate;
      })
      .reduce((sum, r) => sum + parseAmt(r.amount), 0);

    return {
      amount: checkAmount - perCheckEnvelopeSum - billsTotal - receiptTotal,
      checkAmount,
      billsTotal,
      paidBillsTotal,
      toPayBillsTotal,
      envelopeTotal: perCheckEnvelopeSum,
    };
  }, [allBills, nextPayDates, paySchedule, perCheckEnvelopeSum, scannedReceipts, actualPayEntries, perCheck]);

  // Upcoming bills: unpaid bills due in the next 14 days
  const upcomingBills = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const twoWeeksOut = new Date(today);
    twoWeeksOut.setDate(twoWeeksOut.getDate() + 14);

    return allBills
      .filter((b) => {
        if (b.paid) return false;
        const due = parseLocalDate(b.dueDate);
        return due && due >= today && due <= twoWeeksOut;
      })
      .sort((a, b) => parseLocalDate(a.dueDate) - parseLocalDate(b.dueDate))
      .slice(0, 8);
  }, [allBills]);

  // Overdue bills
  const overdueBills = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return allBills.filter((b) => {
      if (b.paid) return false;
      const due = parseLocalDate(b.dueDate);
      return due && due < today;
    });
  }, [allBills]);

  const isNegative = safeToSpend && safeToSpend.amount < 0;

  return (
    <div className={uiSpacing.pageStack}>
      {/* Overdue Alert */}
      {overdueBills.length > 0 && (
        <div className="bg-red-500 text-white rounded-2xl p-4 shadow-lg flex items-start gap-3">
          <AlertTriangle className="flex-shrink-0 mt-0.5" size={22} />
          <div>
            <h3 className="font-bold">
              {overdueBills.length} Overdue Bill{overdueBills.length !== 1 ? 's' : ''}
            </h3>
            <p className={`text-red-100 ${uiType.helperText}`}>
              {overdueBills.map(b => b.name).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Safe to Spend - Hero Card */}
      <div className={`rounded-2xl shadow-xl p-6 text-center ${
        isNegative
          ? 'bg-gradient-to-br from-red-500 to-red-700'
          : 'bg-gradient-to-br from-emerald-500 to-teal-600'
      }`}>
        <p className={`text-white/80 font-medium mb-1 ${uiType.helperText}`}>Safe to Spend</p>
        <p className="text-white text-4xl sm:text-5xl font-black">
          ${safeToSpend ? Math.abs(safeToSpend.amount).toFixed(2) : '—'}
        </p>
        {isNegative && (
          <p className={`text-white/80 mt-1 font-medium ${uiType.helperText}`}>over budget</p>
        )}
        {safeToSpend && (
          <div className="flex justify-center gap-4 mt-4 text-white/70 text-xs">
            <span>Paycheck ${safeToSpend.checkAmount.toFixed(0)}</span>
            <span>-</span>
            <span>Bills ${safeToSpend.billsTotal.toFixed(0)}</span>
            <span>(Paid ${safeToSpend.paidBillsTotal.toFixed(0)} · To pay ${safeToSpend.toPayBillsTotal.toFixed(0)})</span>
            {safeToSpend.envelopeTotal > 0 && (
              <>
                <span>-</span>
                <span>Envelopes ${safeToSpend.envelopeTotal.toFixed(0)}</span>
              </>
            )}
          </div>
        )}
        {!safeToSpend && (
          <p className={`text-white/60 mt-2 ${uiType.helperText}`}>Set up your pay schedule to get started</p>
        )}
      </div>

      {/* Next Paycheck */}
      {overview.nextPaycheckDate && (
        <div className={`bg-white ${uiSpacing.card} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 rounded-xl">
              <DollarSign size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className={`text-slate-500 ${uiType.helperText}`}>Next Paycheck</p>
              <p className="font-bold text-slate-800">
                {overview.nextPaycheckDate.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg text-emerald-600">${perCheck.toFixed(2)}</p>
            {overview.daysUntilNextPaycheck !== null && (
              <p className="text-xs text-slate-400 flex items-center gap-1 justify-end">
                <Clock size={10} />
                {overview.daysUntilNextPaycheck === 0
                  ? 'Today!'
                  : `${overview.daysUntilNextPaycheck}d away`}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Upcoming Bills */}
      <div className={`bg-white ${uiSpacing.card}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-800">Upcoming Bills</h3>
          <Button
            onClick={onNavigateToChecklist}
            variant="ghost"
            size="xs"
            className="text-emerald-600 hover:text-emerald-700"
            icon={ArrowRight}
            iconSize={12}
          >
            View All
          </Button>
        </div>

        {upcomingBills.length === 0 ? (
          <p className={`text-slate-400 text-center py-4 ${uiType.helperText}`}>
            No bills due in the next 2 weeks
          </p>
        ) : (
          <div className={uiSpacing.sectionStack}>
            {upcomingBills.map((bill) => {
              const due = parseLocalDate(bill.dueDate);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const daysUntil = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
              const isUrgent = daysUntil <= 3;

              return (
                <Button
                  key={bill.id}
                  onClick={() => onToggleInstancePaid(bill.id)}
                  variant="ghost"
                  className="w-full !justify-between p-2.5 rounded-xl hover:bg-slate-50"
                  title="Click to mark paid"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-slate-300 flex items-center justify-center">
                    </span>
                    <div className="min-w-0">
                      <span className={`font-medium text-slate-700 truncate block ${uiType.helperText}`}>
                        {bill.name}
                      </span>
                      <span className={`text-xs ${isUrgent ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                        {daysUntil === 0
                          ? 'Due today'
                          : daysUntil === 1
                          ? 'Due tomorrow'
                          : `Due in ${daysUntil}d`}
                        {' · '}
                        {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <span className="font-semibold text-slate-800 text-sm ml-2 flex-shrink-0">
                    ${parseAmt(bill.amountEstimate ?? bill.amount).toFixed(2)}
                  </span>
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {/* Monthly Snapshot */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl shadow-lg p-3 text-center">
          <p className={`text-slate-400 mb-1 ${uiType.helperText}`}>Income</p>
          <p className="font-bold text-emerald-600">${overview.monthlyIncome.toFixed(0)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-3 text-center">
          <p className={`text-slate-400 mb-1 ${uiType.helperText}`}>Bills</p>
          <p className="font-bold text-red-500">${overview.totalMonthly.toFixed(0)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-3 text-center">
          <p className={`text-slate-400 mb-1 ${uiType.helperText}`}>Net</p>
          <p className={`font-bold ${overview.leftover >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            {overview.leftover >= 0 ? '+' : ''}${overview.leftover.toFixed(0)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
