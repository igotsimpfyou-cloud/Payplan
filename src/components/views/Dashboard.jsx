import React, { useMemo, useState } from 'react';
import {
  DollarSign,
  AlertTriangle,
  Clock,
  ArrowRight,
  Sparkles,
  CalendarDays,
  CheckCircle2,
  Circle,
  Wallet,
} from 'lucide-react';
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
  onNavigateToIncome,
  onNavigateToBillsSetup,
  onSnoozeBillOneDay,
  onAssignBillToNextPaycheck,
}) => {
  const [focusMode, setFocusMode] = useState(false);
  const allBills = bills.length > 0 ? bills : billInstances;
  const perCheck = parseAmt(paySchedule?.payAmount);

  const safeToSpend = useMemo(() => {
    if (!nextPayDates.length || !perCheck) return null;

    const nextCheckDate = nextPayDates[0];
    const dateStr = toYMD(nextCheckDate);
    const actualEntry = actualPayEntries.find((entry) => entry.payDate === dateStr);
    const checkAmount = actualEntry ? parseAmt(actualEntry.amount) : perCheck;
    const billsForNextCheck = allBills.filter((b) => b.assignedCheck === 1);

    const paidBillsTotal = billsForNextCheck
      .filter((b) => b.paid)
      .reduce((sum, b) => sum + parseAmt(b.actualPaid ?? b.amountEstimate ?? b.amount), 0);

    const toPayBillsTotal = billsForNextCheck
      .filter((b) => !b.paid)
      .reduce((sum, b) => sum + parseAmt(b.actualPaid ?? b.amountEstimate ?? b.amount), 0);

    const billsTotal = paidBillsTotal + toPayBillsTotal;

    const receiptTotal = scannedReceipts
      .filter((r) => {
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

  const overdueBills = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return allBills.filter((b) => {
      if (b.paid) return false;
      const due = parseLocalDate(b.dueDate);
      return due && due < today;
    });
  }, [allBills]);

  const timelineEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekOut = new Date(today);
    weekOut.setDate(weekOut.getDate() + 7);

    const billEvents = allBills
      .filter((b) => {
        if (b.paid) return false;
        const due = parseLocalDate(b.dueDate);
        return due && due <= weekOut;
      })
      .map((bill) => ({
        id: `bill-${bill.id}`,
        type: 'bill',
        date: parseLocalDate(bill.dueDate),
        label: bill.name,
        amount: parseAmt(bill.amountEstimate ?? bill.amount),
        overdue: parseLocalDate(bill.dueDate) < today,
        billId: bill.id,
      }));

    const paycheckEvents = (nextPayDates || [])
      .filter((d) => d <= weekOut)
      .map((d, index) => ({
        id: `pay-${index}-${d.toISOString()}`,
        type: 'paycheck',
        date: d,
        label: 'Paycheck',
        amount: perCheck,
        overdue: false,
      }));

    return [...billEvents, ...paycheckEvents]
      .sort((a, b) => a.date - b.date)
      .slice(0, 8);
  }, [allBills, nextPayDates, perCheck]);

  const setupItems = [
    {
      id: 'schedule',
      label: 'Set your pay schedule',
      complete: !!paySchedule?.payAmount,
      action: onNavigateToIncome,
      actionLabel: 'Set schedule',
    },
    {
      id: 'bills',
      label: 'Add your first recurring bill',
      complete: allBills.length > 0,
      action: onNavigateToBillsSetup,
      actionLabel: 'Add bills',
    },
    {
      id: 'assign',
      label: 'Assign at least one bill to a paycheck',
      complete: allBills.some((bill) => bill.assignedCheck),
      action: onNavigateToChecklist,
      actionLabel: 'Assign bills',
    },
    {
      id: 'paid',
      label: 'Mark your first bill as paid',
      complete: allBills.some((bill) => bill.paid),
      action: onNavigateToChecklist,
      actionLabel: 'Open checklist',
    },
  ];

  const setupCompleteCount = setupItems.filter((item) => item.complete).length;
  const setupPercent = Math.round((setupCompleteCount / setupItems.length) * 100);
  const isNegative = safeToSpend && safeToSpend.amount < 0;

  return (
    <div className={uiSpacing.pageStack}>
      <div className="flex items-center justify-between">
        <p className="text-white/90 text-sm font-semibold uppercase tracking-wide">Dashboard</p>
        <Button
          variant={focusMode ? 'secondary' : 'nav'}
          size="xs"
          className={focusMode ? '' : 'text-white border-white/40 hover:bg-white/25'}
          onClick={() => setFocusMode((prev) => !prev)}
          icon={Sparkles}
          iconSize={13}
        >
          {focusMode ? 'Focus mode on' : 'Focus mode'}
        </Button>
      </div>

      {setupCompleteCount < setupItems.length && (
        <div className="bg-white rounded-2xl shadow-xl p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="font-bold text-slate-800">Finish your setup</h3>
              <p className={`text-slate-500 ${uiType.helperText}`}>
                {setupCompleteCount}/{setupItems.length} complete · {setupPercent}% ready
              </p>
            </div>
            <Wallet size={18} className="text-emerald-600" />
          </div>
          <div className="h-2 bg-slate-100 rounded-full mb-4 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${setupPercent}%` }} />
          </div>
          <div className="space-y-2">
            {setupItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 p-2 rounded-xl bg-slate-50">
                <div className="flex items-center gap-2 min-w-0">
                  {item.complete ? (
                    <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                  ) : (
                    <Circle size={16} className="text-slate-300 flex-shrink-0" />
                  )}
                  <span className={`text-sm ${item.complete ? 'text-slate-500 line-through' : 'text-slate-700 font-medium'}`}>
                    {item.label}
                  </span>
                </div>
                {!item.complete && (
                  <Button size="xs" variant="ghost" className="text-emerald-700" onClick={item.action}>
                    {item.actionLabel}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {overdueBills.length > 0 && (
        <div className="bg-red-500 text-white rounded-2xl p-4 shadow-lg flex items-start gap-3">
          <AlertTriangle className="flex-shrink-0 mt-0.5" size={22} />
          <div>
            <h3 className="font-bold">
              {overdueBills.length} Overdue Bill{overdueBills.length !== 1 ? 's' : ''}
            </h3>
            <p className={`text-red-100 ${uiType.helperText}`}>
              {overdueBills.map((b) => b.name).join(', ')}
            </p>
          </div>
        </div>
      )}

      <div className={`rounded-2xl shadow-xl p-6 text-center ${
        isNegative ? 'bg-gradient-to-br from-red-500 to-red-700' : 'bg-gradient-to-br from-emerald-500 to-teal-600'
      }`}>
        <p className={`text-white/80 font-medium mb-1 ${uiType.helperText}`}>Safe to Spend</p>
        <p className="text-white text-4xl sm:text-5xl font-black">
          ${safeToSpend ? Math.abs(safeToSpend.amount).toFixed(2) : '—'}
        </p>
        {isNegative && (
          <p className={`text-white/80 mt-1 font-medium ${uiType.helperText}`}>over budget</p>
        )}
        {safeToSpend && (
          <div className="flex flex-wrap justify-center gap-2 mt-4 text-white/75 text-xs">
            <span className="px-2 py-1 rounded-full bg-white/15">Paycheck ${safeToSpend.checkAmount.toFixed(0)}</span>
            <span className="px-2 py-1 rounded-full bg-white/15">Bills ${safeToSpend.billsTotal.toFixed(0)}</span>
            <span className="px-2 py-1 rounded-full bg-white/15">Paid ${safeToSpend.paidBillsTotal.toFixed(0)}</span>
            <span className="px-2 py-1 rounded-full bg-white/15">To pay ${safeToSpend.toPayBillsTotal.toFixed(0)}</span>
            {safeToSpend.envelopeTotal > 0 && (
              <span className="px-2 py-1 rounded-full bg-white/15">Envelopes ${safeToSpend.envelopeTotal.toFixed(0)}</span>
            )}
          </div>
        )}
        {!safeToSpend && (
          <p className={`text-white/60 mt-2 ${uiType.helperText}`}>Set up your pay schedule to get started</p>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-800 flex items-center gap-2"><CalendarDays size={16} /> Today + next 7 days</h3>
          <Button onClick={onNavigateToChecklist} variant="ghost" size="xs" className="text-emerald-600" icon={ArrowRight} iconSize={12}>
            Open checklist
          </Button>
        </div>

        {timelineEvents.length === 0 ? (
          <p className={`text-slate-400 text-center py-4 ${uiType.helperText}`}>
            No scheduled bills or paychecks in the next week.
          </p>
        ) : (
          <div className="space-y-2">
            {timelineEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100">
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${event.overdue ? 'text-red-600' : 'text-slate-800'}`}>
                    {event.label}
                  </p>
                  <p className="text-xs text-slate-500">
                    {event.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    {event.overdue ? ' · overdue' : ` · ${event.type}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${event.type === 'paycheck' ? 'text-emerald-600' : 'text-slate-700'}`}>
                    {event.type === 'paycheck' ? '+' : '-'}${event.amount.toFixed(2)}
                  </span>
                  {event.type === 'bill' && (
                    <div className="flex items-center gap-1">
                      <Button size="xs" variant="ghost" className="text-emerald-700" onClick={() => onToggleInstancePaid(event.billId)}>
                        Mark paid
                      </Button>
                      <Button size="xs" variant="ghost" className="text-slate-600" onClick={() => onSnoozeBillOneDay(event.billId)}>
                        Snooze 1 day
                      </Button>
                      <Button size="xs" variant="ghost" className="text-blue-700" onClick={() => onAssignBillToNextPaycheck(event.billId)}>
                        Assign to paycheck
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!focusMode && overview.nextPaycheckDate && (
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
          <div className="text-center py-5">
            <p className={`text-slate-400 ${uiType.helperText}`}>No bills due in the next 2 weeks.</p>
            <Button onClick={onNavigateToBillsSetup} variant="ghost" size="xs" className="mt-2 text-emerald-700">
              Add a bill template
            </Button>
          </div>
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
                    <span className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-slate-300 flex items-center justify-center" />
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

      {!focusMode && (
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
      )}
    </div>
  );
};

export default Dashboard;
