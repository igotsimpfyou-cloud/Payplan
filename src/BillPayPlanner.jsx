import React, { useState, useEffect, useRef } from 'react';
import {
  DollarSign, Calendar, Plus, Check, AlertCircle, Trash2, Edit2, X, Clock, TrendingUp, Home,
  Settings, List, BarChart3, ChevronRight, ChevronLeft, RefreshCw, Building2, Receipt, Download,
  Upload, Flame
} from 'lucide-react';

const BillPayPlanner = () => {
  const [view, setView] = useState('dashboard');
  const [bills, setBills] = useState([]);
  const [assets, setAssets] = useState([]);
  const [oneTimeBills, setOneTimeBills] = useState([]);
  const [paySchedule, setPaySchedule] = useState(null);
  const [propaneFills, setPropaneFills] = useState([]);
  const [editingBill, setEditingBill] = useState(null);
  const [editingAsset, setEditingAsset] = useState(null);
  const [editingOneTime, setEditingOneTime] = useState(null);
  const [showBillForm, setShowBillForm] = useState(false);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [showOneTimeForm, setShowOneTimeForm] = useState(false);
  const [showPayScheduleForm, setShowPayScheduleForm] = useState(false);
  const [showHistoricalForm, setShowHistoricalForm] = useState(null);
  const [showAmortizationView, setShowAmortizationView] = useState(null);
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const [clearDataCountdown, setClearDataCountdown] = useState(5);
  const [showPropaneForm, setShowPropaneForm] = useState(false);
  const [collapseCheck1, setCollapseCheck1] = useState(false);
  const [collapseCheck2, setCollapseCheck2] = useState(false);
  const [billsViewMode, setBillsViewMode] = useState('monthly'); // 'monthly' or 'stream'
  const [emergencyFund, setEmergencyFund] = useState({ target: 0, current: 0 });
  const [debtPayoff, setDebtPayoff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calendarConnected, setCalendarConnected] = useState(false);

  // === NEW: Budgets & Envelopes ===
  const [budgets, setBudgets] = useState(() => {
    const v = localStorage.getItem('budgets');
    return v ? JSON.parse(v) : { utilities: 0, subscription: 0, insurance: 0, loan: 0, rent: 0, other: 0 };
  });
  const [envelopes, setEnvelopes] = useState(() => {
    const v = localStorage.getItem('envelopes');
    return v ? JSON.parse(v) : [
      { id: 1, name: 'Groceries', perCheck: 0 },
      { id: 2, name: 'Gas', perCheck: 0 },
      { id: 3, name: 'Fun', perCheck: 0 },
    ];
  });

  useEffect(() => localStorage.setItem('budgets', JSON.stringify(budgets)), [budgets]);
  useEffect(() => localStorage.setItem('envelopes', JSON.stringify(envelopes)), [envelopes]);

  // Backup / Restore
  const backupFileInputRef = useRef(null);

  // Backup/Restore functions
  const exportBackup = () => {
    const payload = {
      app: 'PayPlan Pro',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: { bills, assets, oneTimeBills, paySchedule, calendarConnected, budgets, envelopes, emergencyFund, debtPayoff, propaneFills },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payplan-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const applyBackup = async (payload) => {
    const d = payload?.data ?? payload;
    const newBills = Array.isArray(d?.bills) ? d.bills : [];
    const newAssets = Array.isArray(d?.assets) ? d.assets : [];
    const newOneTimeBills = Array.isArray(d?.oneTimeBills) ? d.oneTimeBills : [];
    const newPaySchedule = d?.paySchedule ?? null;
    const newCalendarConnected = !!d?.calendarConnected;
    const newBudgets = d?.budgets ?? budgets;
    const newEnvelopes = d?.envelopes ?? envelopes;
    const newEmergency = d?.emergencyFund ?? { target: 0, current: 0 };
    const newDebt = d?.debtPayoff ?? [];

    // Update state
    setBills(newBills);
    setAssets(newAssets);
    setOneTimeBills(newOneTimeBills);
    setPaySchedule(newPaySchedule);
    setCalendarConnected(newCalendarConnected);
    setBudgets(newBudgets);
    setEnvelopes(newEnvelopes);
    setEmergencyFund(newEmergency);
    setDebtPayoff(newDebt);

    // Persist to localStorage
    localStorage.setItem('bills', JSON.stringify(newBills));
    localStorage.setItem('assets', JSON.stringify(newAssets));
    localStorage.setItem('oneTimeBills', JSON.stringify(newOneTimeBills));
    localStorage.setItem('paySchedule', JSON.stringify(newPaySchedule));
    localStorage.setItem('calendarConnected', JSON.stringify(newCalendarConnected));
    localStorage.setItem('budgets', JSON.stringify(newBudgets));
    localStorage.setItem('envelopes', JSON.stringify(newEnvelopes));
    localStorage.setItem('emergencyFund', JSON.stringify(newEmergency));
    localStorage.setItem('debtPayoff', JSON.stringify(newDebt));
  };

  const importBackupFromFile = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      if (!payload.app || payload.app !== 'PayPlan Pro') {
        alert('Invalid backup file. Please select a valid PayPlan Pro backup.');
        return;
      }
      await applyBackup(payload);
      alert('Backup restored successfully! Your data has been loaded.');
    } catch (error) {
      console.error('Backup restore error:', error);
      alert('Error restoring backup: ' + error.message + '\n\nPlease make sure you selected a valid backup file.');
    }
  };

  // Load data from persistent storage
  useEffect(() => {
    loadData();
  }, []);

  // Countdown timer for clear data modal
  useEffect(() => {
    let timer;
    if (showClearDataModal && clearDataCountdown > 0) {
      timer = setTimeout(() => {
        setClearDataCountdown(clearDataCountdown - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [showClearDataModal, clearDataCountdown]);

  const loadData = async () => {
    try {
      const billsData = localStorage.getItem('bills');
      const assetsData = localStorage.getItem('assets');
      const oneTimeData = localStorage.getItem('oneTimeBills');
      const scheduleData = localStorage.getItem('paySchedule');
      const calendarData = localStorage.getItem('calendarConnected');
      const propaneData = localStorage.getItem('propaneFills');
      const emergencyData = localStorage.getItem('emergencyFund');
      const debtData = localStorage.getItem('debtPayoff');
      const budgetsData = localStorage.getItem('budgets');
      const envelopesData = localStorage.getItem('envelopes');

      if (billsData) {
        let loadedBills = JSON.parse(billsData);
        // Migration: Add nextDueDate if missing
        let needsSave = false;
        loadedBills = loadedBills.map(bill => {
          if (!bill.nextDueDate && bill.dueDate) {
            const today = new Date();
            const dueDay = parseInt(bill.dueDate);
            let nextDue = new Date(today.getFullYear(), today.getMonth(), dueDay);
            if (nextDue < today) {
              nextDue.setMonth(nextDue.getMonth() + 1);
            }
            needsSave = true;
            return { ...bill, nextDueDate: nextDue.toISOString().split('T')[0] };
          }
          return bill;
        });
        setBills(loadedBills);
        if (needsSave) localStorage.setItem('bills', JSON.stringify(loadedBills));
      }
      if (assetsData) setAssets(JSON.parse(assetsData));
      if (oneTimeData) setOneTimeBills(JSON.parse(oneTimeData));
      if (scheduleData) setPaySchedule(JSON.parse(scheduleData));
      if (calendarData) setCalendarConnected(JSON.parse(calendarData));
      if (propaneData) setPropaneFills(JSON.parse(propaneData));
      if (emergencyData) setEmergencyFund(JSON.parse(emergencyData));
      if (debtData) setDebtPayoff(JSON.parse(debtData));
      if (budgetsData) setBudgets(JSON.parse(budgetsData));
      if (envelopesData) setEnvelopes(JSON.parse(envelopesData));
    } catch (error) {
      console.log('No existing data found', error);
    }
    setLoading(false);
  };

  const saveBills = async (updatedBills) => {
    setBills(updatedBills);
    localStorage.setItem('bills', JSON.stringify(updatedBills));
  };

  const saveAssets = async (updatedAssets) => {
    setAssets(updatedAssets);
    localStorage.setItem('assets', JSON.stringify(updatedAssets));
  };

  const saveOneTimeBills = async (updatedOneTime) => {
    setOneTimeBills(updatedOneTime);
    localStorage.setItem('oneTimeBills', JSON.stringify(updatedOneTime));
  };

  const savePaySchedule = async (schedule) => {
    setPaySchedule(schedule);
    localStorage.setItem('paySchedule', JSON.stringify(schedule));
  };

  const savePropaneFills = async (fills) => {
    setPropaneFills(fills);
    localStorage.setItem('propaneFills', JSON.stringify(fills));
  };

  const addPropaneFill = async (fill) => {
    const newFill = { ...fill, id: Date.now() };
    await savePropaneFills([...propaneFills, newFill]);
  };

  const deletePropaneFill = async (id) => {
    await savePropaneFills(propaneFills.filter(f => f.id !== id));
  };

  const addBill = async (billData) => {
    const today = new Date();
    const dueDay = parseInt(billData.dueDate);
    let nextDue = new Date(today.getFullYear(), today.getMonth(), dueDay);
    if (nextDue < today) {
      nextDue.setMonth(nextDue.getMonth() + 1);
    }

    const newBill = {
      id: Date.now(),
      ...billData,
      reminderDays: parseInt(billData.reminderDays || 0, 10),
      nextDueDate: nextDue.toISOString().split('T')[0],
      paidThisMonth: false,
      lastPaid: null,
      lastPaidDate: null,
      historicalPayments: billData.historicalPayments || []
    };
    await saveBills([...bills, newBill]);
    setShowBillForm(false);
  };

  const addAsset = async (assetData) => {
    const newAsset = {
      id: Date.now(),
      ...assetData,
      startDate: assetData.startDate || new Date().toISOString().split('T')[0]
    };
    await saveAssets([...assets, newAsset]);

    if (assetData.createBill) {
      const newBill = {
        id: Date.now() + 1,
        name: assetData.name,
        amount: assetData.paymentAmount,
        dueDate: new Date(assetData.startDate).getDate().toString(),
        frequency: assetData.paymentFrequency,
        category: 'loan',
        autopay: false,
        isVariable: false,
        payFromCheck: 'auto',
        paidThisMonth: false,
        reminderDays: 0
      };
      await saveBills([...bills, newBill]);
    }

    setShowAssetForm(false);
  };

  const addOneTimeBill = async (billData) => {
    const newBill = {
      id: Date.now(),
      ...billData,
      paid: false,
      addedDate: new Date().toISOString()
    };
    await saveOneTimeBills([...oneTimeBills, newBill]);
    setShowOneTimeForm(false);
  };

  const updateBill = async (billData) => {
    const updatedBills = bills.map(b =>
      b.id === editingBill.id ? { ...b, ...billData, reminderDays: parseInt(billData.reminderDays || 0, 10) } : b
    );
    await saveBills(updatedBills);
    setEditingBill(null);
  };

  const updateAsset = async (assetData) => {
    const updatedAssets = assets.map(a =>
      a.id === editingAsset.id ? { ...a, ...assetData } : a
    );
    await saveAssets(updatedAssets);
    setEditingAsset(null);
  };

  const updateOneTimeBill = async (billData) => {
    const updatedOneTime = oneTimeBills.map(b =>
      b.id === editingOneTime.id ? { ...b, ...billData } : b
    );
    await saveOneTimeBills(updatedOneTime);
    setEditingOneTime(null);
  };

  const deleteBill = async (billId) => {
    await saveBills(bills.filter(b => b.id !== billId));
  };

  const deleteAsset = async (assetId) => {
    await saveAssets(assets.filter(a => a.id !== assetId));
  };

  const deleteOneTimeBill = async (billId) => {
    await saveOneTimeBills(oneTimeBills.filter(b => b.id !== billId));
  };

  const resetMonthlyBills = async () => {
    if (!confirm('Reset all bills for a new month? This will mark all recurring bills as unpaid.')) {
      return;
    }
    const resetBills = bills.map(b => ({
      ...b,
      paidThisMonth: false
    }));
    await saveBills(resetBills);
    alert('All bills have been reset for the new month!');
  };

  const clearAllData = () => {
    setShowClearDataModal(true);
    setClearDataCountdown(5);
  };

  const confirmClearAllData = () => {
    setBills([]);
    setAssets([]);
    setOneTimeBills([]);
    setPaySchedule(null);
    setCalendarConnected(false);
    setPropaneFills([]);
    setEmergencyFund({ target: 0, current: 0 });
    setDebtPayoff([]);
    setBudgets({ utilities: 0, subscription: 0, insurance: 0, loan: 0, rent: 0, other: 0 });
    setEnvelopes([]);

    localStorage.removeItem('bills');
    localStorage.removeItem('assets');
    localStorage.removeItem('oneTimeBills');
    localStorage.removeItem('paySchedule');
    localStorage.removeItem('calendarConnected');
    localStorage.removeItem('propaneFills');
    localStorage.removeItem('emergencyFund');
    localStorage.removeItem('debtPayoff');
    localStorage.removeItem('budgets');
    localStorage.removeItem('envelopes');

    setShowClearDataModal(false);
    alert('✓ All data cleared!');
    window.location.reload();
  };

  // === Notifications & Reminders ===
  const canNotify = () => ('Notification' in window);
  const requestNotifyPermission = async () => {
    if (!canNotify()) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const res = await Notification.requestPermission();
    return res === 'granted';
  };
  const toYMD = (d) => {
    const dt = new Date(d);
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
  const pushBillNotify = (bill) => {
    try {
      new Notification('Upcoming bill', {
        body: `${bill.name} due on ${toYMD(bill.nextDueDate)} for $${parseFloat(bill.amount).toFixed(2)}`,
        silent: false
      });
    } catch { /* noop */ }
  };
  const dueSoon = (bill) => {
    if (!bill.nextDueDate || !bill.reminderDays) return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const due = new Date(bill.nextDueDate); due.setHours(0, 0, 0, 0);
    const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));
    return diffDays === parseInt(bill.reminderDays, 10);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!(await requestNotifyPermission())) return;
      bills.forEach(b => {
        if (!cancelled && dueSoon(b) && !b.paidThisMonth) {
          pushBillNotify(b);
        }
      });
    })();
    const now = new Date();
    const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0) - now;
    const t = setTimeout(() => {
      bills.forEach(b => {
        if (dueSoon(b) && !b.paidThisMonth) pushBillNotify(b);
      });
    }, Math.max(1000, msUntilMidnight));
    return () => { cancelled = true; clearTimeout(t); };
  }, [bills]);

  // ICS export
  const exportUpcomingICS = () => {
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PayPlan Pro//Bills//EN'];
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const in30 = new Date(); in30.setDate(in30.getDate() + 30);

    const addEvent = (b, dateStr) => {
      const dt = new Date(dateStr);
      const dtStart = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 9, 0, 0);
      const stamp = dtStart.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const uid = `${b.id}-${stamp}@payplanpro`;
      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${now}`,
        `DTSTART:${stamp}`,
        `SUMMARY:${b.name} - $${parseFloat(b.amount).toFixed(2)}`,
        `DESCRIPTION:Category: ${b.category}${b.autopay ? ' (Autopay)' : ''}`,
        'END:VEVENT'
      );
    };

    bills.forEach(b => {
      if (!b.nextDueDate) return;
      const due = new Date(b.nextDueDate);
      if (due <= in30) addEvent(b, b.nextDueDate);
      if (b.reminderDays) {
        const remind = new Date(due); remind.setDate(remind.getDate() - parseInt(b.reminderDays, 10));
        if (remind <= in30 && remind >= new Date()) addEvent(b, toYMD(remind));
      }
    });

    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `payplan-upcoming-${toYMD(new Date())}.ics`; a.click();
    URL.revokeObjectURL(url);
  };

  const togglePaid = async (billId) => {
    const updatedBills = bills.map(b => {
      if (b.id === billId) {
        // Autopay lock (confirm)
        if (b.autopay) {
          const ok = confirm('This bill is on Auto-pay. Mark as paid/unpaid anyway?');
          if (!ok) return b;
        }
        const nowPaid = !b.paidThisMonth;
        let updates = {
          ...b,
          paidThisMonth: nowPaid,
          lastPaid: nowPaid ? new Date().toISOString() : b.lastPaid,
          lastPaidDate: nowPaid ? new Date().toISOString().split('T')[0] : b.lastPaidDate
        };

        // Advance nextDueDate when marking as paid
        if (nowPaid && b.nextDueDate) {
          const currentDue = new Date(b.nextDueDate);
          let nextDue = new Date(currentDue);

          if (b.frequency === 'monthly') {
            nextDue.setMonth(nextDue.getMonth() + 1);
          } else if (b.frequency === 'weekly') {
            nextDue.setDate(nextDue.getDate() + 7);
          } else if (b.frequency === 'biweekly') {
            nextDue.setDate(nextDue.getDate() + 14);
          } else if (b.frequency === 'quarterly') {
            nextDue.setMonth(nextDue.getMonth() + 3);
          } else if (b.frequency === 'annual') {
            nextDue.setFullYear(nextDue.getFullYear() + 1);
          }

          updates.nextDueDate = nextDue.toISOString().split('T')[0];
        }

        return updates;
      }
      return b;
    });
    await saveBills(updatedBills);
  };

  const toggleOneTimePaid = async (billId) => {
    const updatedOneTime = oneTimeBills.map(b =>
      b.id === billId
        ? { ...b, paid: !b.paid, paidDate: !b.paid ? new Date().toISOString() : null }
        : b
    );
    await saveOneTimeBills(updatedOneTime);
  };

  const addHistoricalPayment = async (billId, payment) => {
    const updatedBills = bills.map(b => {
      if (b.id === billId) {
        const historicalPayments = [...(b.historicalPayments || []), payment];
        const average = historicalPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0) / historicalPayments.length;
        return {
          ...b,
          historicalPayments,
          amount: average.toFixed(2),
          isVariable: true
        };
      }
      return b;
    });
    await saveBills(updatedBills);
  };

  const deleteHistoricalPayment = async (billId, paymentIndex) => {
    const updatedBills = bills.map(b => {
      if (b.id === billId) {
        const historicalPayments = b.historicalPayments.filter((_, idx) => idx !== paymentIndex);
        const average = historicalPayments.length > 0
          ? historicalPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0) / historicalPayments.length
          : b.amount;
        return {
          ...b,
          historicalPayments,
          amount: average.toFixed(2)
        };
      }
      return b;
    });
    await saveBills(updatedBills);
  };

  // Calculate amortization schedule for an asset
  const calculateAmortization = (asset) => {
    const principal = parseFloat(asset.loanAmount);
    const annualRate = parseFloat(asset.interestRate) / 100;
    const payment = parseFloat(asset.paymentAmount);

    let periodsPerYear;
    switch (asset.paymentFrequency) {
      case 'weekly': periodsPerYear = 52; break;
      case 'biweekly': periodsPerYear = 26; break;
      case 'monthly': periodsPerYear = 12; break;
      case 'quarterly': periodsPerYear = 4; break;
      case 'annual': periodsPerYear = 1; break;
      default: periodsPerYear = 12;
    }

    const periodicRate = annualRate / periodsPerYear;

    let balance = principal;
    const schedule = [];
    let period = 0;
    let totalInterest = 0;

    const startDate = new Date(asset.startDate);

    while (balance > 0.01 && period < 1000) {
      period++;

      const interestPayment = balance * periodicRate;
      const principalPayment = Math.min(payment - interestPayment, balance);
      const totalPayment = interestPayment + principalPayment;

      balance -= principalPayment;
      totalInterest += interestPayment;

      const paymentDate = new Date(startDate);
      switch (asset.paymentFrequency) {
        case 'weekly':
          paymentDate.setDate(startDate.getDate() + (period * 7));
          break;
        case 'biweekly':
          paymentDate.setDate(startDate.getDate() + (period * 14));
          break;
        case 'monthly':
          paymentDate.setMonth(startDate.getMonth() + period);
          break;
        case 'quarterly':
          paymentDate.setMonth(startDate.getMonth() + (period * 3));
          break;
        case 'annual':
          paymentDate.setFullYear(startDate.getFullYear() + period);
          break;
      }

      schedule.push({
        period,
        date: paymentDate.toISOString().split('T')[0],
        payment: totalPayment,
        principal: principalPayment,
        interest: interestPayment,
        balance: Math.max(0, balance)
      });
    }

    return {
      schedule,
      totalInterest,
      totalPayments: period,
      payoffDate: schedule[schedule.length - 1]?.date
    };
  };

  // Google Calendar Integration (placeholder)
  const connectGoogleCalendar = async () => {
    const connected = !calendarConnected;
    setCalendarConnected(connected);
    localStorage.setItem('calendarConnected', JSON.stringify(connected));
    if (connected) {
      alert('Calendar connected! (Demo mode)');
    }
  };

  const syncToCalendar = async () => {
    alert('Syncing bills to calendar... (Demo mode)');
  };

  // Calculate which paycheck pays which bills based on dates
  const getPaycheckAssignments = () => {
    if (!paySchedule || !paySchedule.nextPayDate) return { check1: [], check2: [], payDates: [] };

    const nextPay = new Date(paySchedule.nextPayDate);

    const payDates = [nextPay];
    for (let i = 1; i < 4; i++) {
      const nextDate = new Date(payDates[i - 1]);
      switch (paySchedule.frequency) {
        case 'weekly':
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case 'biweekly':
          nextDate.setDate(nextDate.getDate() + 14);
          break;
        case 'semimonthly':
          if (nextDate.getDate() <= 15) {
            nextDate.setDate(15);
          } else {
            nextDate.setMonth(nextDate.getMonth() + 1);
            nextDate.setDate(1);
          }
          break;
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
      }
      payDates.push(new Date(nextDate));
    }

    const check1Date = payDates[0];
    const check2Date = payDates[1];

    const check1Bills = [];
    const check2Bills = [];

    bills.forEach(bill => {
      const dueDay = parseInt(bill.dueDate);

      if (bill.payFromCheck === 'check1') {
        check1Bills.push(bill);
      } else if (bill.payFromCheck === 'check2') {
        check2Bills.push(bill);
      } else {
        const check1Month = check1Date.getMonth();
        const check1Year = check1Date.getFullYear();
        const check2Month = check2Date.getMonth();
        const check2Year = check2Date.getFullYear();

        let dueDateForCheck1 = new Date(check1Year, check1Month, dueDay);
        let dueDateForCheck2 = new Date(check2Year, check2Month, dueDay);

        if (dueDay < check1Date.getDate()) {
          dueDateForCheck1.setMonth(dueDateForCheck1.getMonth() + 1);
        }
        if (dueDay < check2Date.getDate()) {
          dueDateForCheck2.setMonth(dueDateForCheck2.getMonth() + 1);
        }

        bill._originalCheck = (check1Date < dueDateForCheck1 && dueDateForCheck1 <= check2Date) ? 1 : 2;
        bill._dueDate = bill._originalCheck === 1 ? dueDateForCheck1 : dueDateForCheck2;

        if (bill._originalCheck === 1) {
          check1Bills.push(bill);
        } else {
          check2Bills.push(bill);
        }
      }
    });

    if (paySchedule) {
      const perCheck = parseFloat(paySchedule.payAmount);
      let check1Total = check1Bills.reduce((sum, b) => sum + parseFloat(b.amount), 0);
      let check2Total = check2Bills.reduce((sum, b) => sum + parseFloat(b.amount), 0);
      let leftover1 = perCheck - check1Total;
      let leftover2 = perCheck - check2Total;

      if (leftover1 - leftover2 > 200) {
        const movable = check2Bills.filter(b =>
          !b.autopay &&
          b.payFromCheck === 'auto' &&
          parseInt(b.dueDate) > check1Date.getDate()
        );

        let bestBill = null;
        let bestDiff = Infinity;

        for (const bill of movable) {
          const billAmt = parseFloat(bill.amount);
          const newLeftover1 = leftover1 - billAmt;
          const newLeftover2 = leftover2 + billAmt;
          const newDifference = Math.abs(newLeftover1 - newLeftover2);
          if (newDifference < Math.abs(leftover1 - leftover2) && newDifference <= 200) {
            if (newDifference < bestDiff) {
              bestDiff = newDifference;
              bestBill = bill;
            }
          }
        }

        if (bestBill) {
          const fromIndex = check2Bills.indexOf(bestBill);
          check2Bills.splice(fromIndex, 1);
          check1Bills.push(bestBill);
        }
      }
    }

    return {
      check1: check1Bills,
      check2: check2Bills,
      payDates: payDates.slice(0, 2)
    };
  };

  // Helpers for analytics
  const perCheckEnvelopeSum = () => envelopes.reduce((s, e) => s + (parseFloat(e.perCheck) || 0), 0);

  const monthlyCategorySpend = () => {
    const factor = (freq) => {
      if (freq === 'monthly') return 1;
      if (freq === 'weekly') return 4.33;
      if (freq === 'biweekly') return 2.17;
      if (freq === 'quarterly') return 1 / 3;
      if (freq === 'annual') return 1 / 12;
      return 1;
    };
    const spend = {};
    bills.forEach(b => {
      const amt = parseFloat(b.amount || 0) * factor(b.frequency);
      spend[b.category] = (spend[b.category] || 0) + amt;
    });
    const now = new Date();
    oneTimeBills.forEach(o => {
      if (!o.paid) {
        const d = new Date(o.dueDate);
        if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
          spend[o.category || 'other'] = (spend[o.category || 'other'] || 0) + parseFloat(o.amount || 0);
        }
      }
    });
    return spend;
  };

  // Calculate financial overview
  const calculateOverview = () => {
    const monthlyBills = bills.reduce((sum, bill) => {
      if (bill.frequency === 'monthly') return sum + parseFloat(bill.amount);
      if (bill.frequency === 'weekly') return sum + (parseFloat(bill.amount) * 4.33);
      if (bill.frequency === 'biweekly') return sum + (parseFloat(bill.amount) * 2.17);
      if (bill.frequency === 'quarterly') return sum + (parseFloat(bill.amount) / 3);
      if (bill.frequency === 'annual') return sum + (parseFloat(bill.amount) / 12);
      return sum;
    }, 0);

    const upcomingOneTime = oneTimeBills
      .filter(b => !b.paid)
      .reduce((sum, bill) => sum + parseFloat(bill.amount), 0);

    const totalMonthly = monthlyBills;

    let monthlyIncome = 0;
    let paychecksThisMonth = 0;
    let nextPaycheckDate = null;
    let daysUntilNextPaycheck = null;

    if (paySchedule && paySchedule.nextPayDate) {
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      const payAmount = parseFloat(paySchedule.payAmount);

      const nextPay = new Date(paySchedule.nextPayDate);
      const payDates = [nextPay];

      for (let i = 1; i < 8; i++) {
        const nextDate = new Date(payDates[i - 1]);

        switch (paySchedule.frequency) {
          case 'weekly':
            nextDate.setDate(nextDate.getDate() + 7);
            break;
          case 'biweekly':
            nextDate.setDate(nextDate.getDate() + 14);
            break;
          case 'semimonthly':
            if (nextDate.getDate() <= 15) {
              nextDate.setDate(15);
            } else {
              nextDate.setMonth(nextDate.getMonth() + 1);
              nextDate.setDate(1);
            }
            break;
          case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
        }

        payDates.push(new Date(nextDate));
      }

      paychecksThisMonth = payDates.filter(date =>
        date.getMonth() === currentMonth && date.getFullYear() === currentYear
      ).length;

      monthlyIncome = payAmount * paychecksThisMonth;

      nextPaycheckDate = payDates.find(date => date >= today);
      if (nextPaycheckDate) {
        const timeDiff = nextPaycheckDate.getTime() - today.getTime();
        daysUntilNextPaycheck = Math.ceil(timeDiff / (1000 * 3600 * 24));
      }
    }

    const leftover = monthlyIncome - totalMonthly;

    return {
      monthlyBills,
      totalMonthly,
      upcomingOneTime,
      monthlyIncome,
      leftover,
      paychecksThisMonth,
      nextPaycheckDate,
      daysUntilNextPaycheck
    };
  };

  const overview = calculateOverview();

  // Form Components
  const BillForm = ({ bill, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState(bill || {
      name: '',
      amount: '',
      dueDate: '',
      frequency: 'monthly',
      category: 'utilities',
      autopay: false,
      isVariable: false,
      payFromCheck: 'auto',
      reminderDays: 0
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      onSubmit(formData);
    };

    const historicalCount = bill?.historicalPayments?.length || 0;
    const isVariableBill = formData.isVariable || historicalCount > 0;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">{bill ? 'Edit Bill' : 'Add New Bill'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Bill Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                  required
                />
              </div>

              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="isVariable"
                  checked={formData.isVariable}
                  onChange={(e) => setFormData({ ...formData, isVariable: e.target.checked })}
                  className="w-5 h-5"
                />
                <label htmlFor="isVariable" className="text-sm font-semibold">
                  Variable amount (like water, electricity)
                </label>
              </div>

              {isVariableBill && historicalCount > 0 && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3 mb-4">
                  <p className="text-sm text-blue-800">
                    📊 <strong>Estimated amount:</strong> ${formData.amount || '0.00'} (based on {historicalCount} month{historicalCount !== 1 ? 's' : ''})
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Add more historical payments to improve accuracy
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-2">
                  {isVariableBill ? 'Estimated Amount (or enter manually)' : 'Amount'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                  required
                />
                {isVariableBill && (
                  <p className="text-xs text-slate-500 mt-1">
                    This will be automatically updated based on historical payments
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Due Date (Day of Month)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Frequency</label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                >
                  <option value="utilities">Utilities</option>
                  <option value="subscription">Subscription</option>
                  <option value="insurance">Insurance</option>
                  <option value="loan">Loan</option>
                  <option value="rent">Rent/Mortgage</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autopay"
                  checked={formData.autopay}
                  onChange={(e) => setFormData({ ...formData, autopay: e.target.checked })}
                  className="w-5 h-5"
                />
                <label htmlFor="autopay" className="text-sm font-semibold">Auto-pay enabled</label>
              </div>
              {formData.autopay && (
                <p className="text-xs text-amber-600 mt-1">Autopay lock: manual pay toggle will be disabled (or require confirmation).</p>
              )}

              {/* Reminder lead time */}
              <div>
                <label className="block text-sm font-semibold mb-2">Reminder (days before due)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.reminderDays || 0}
                  onChange={(e) => setFormData({ ...formData, reminderDays: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                />
                <p className="text-xs text-slate-500 mt-1">Uses browser notifications (no email/SMS).</p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Pay From Paycheck</label>
                <select
                  value={formData.payFromCheck}
                  onChange={(e) => setFormData({ ...formData, payFromCheck: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                >
                  <option value="auto">Auto (based on due date)</option>
                  <option value="check1">First Paycheck (1st-15th)</option>
                  <option value="check2">Second Paycheck (16th-31st)</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Auto will assign based on your due date and pay schedule
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors"
                >
                  {bill ? 'Update' : 'Add'} Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  const AssetForm = ({ asset, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState(asset || {
      name: '',
      type: 'mortgage',
      loanAmount: '',
      currentBalance: '',
      loanTerm: '',
      interestRate: '',
      paymentAmount: '',
      paymentFrequency: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      createBill: true
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      onSubmit(formData);
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">{asset ? 'Edit Asset' : 'Add New Asset'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Asset Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                >
                  <option value="mortgage">Mortgage</option>
                  <option value="auto">Auto Loan</option>
                  <option value="student">Student Loan</option>
                  <option value="personal">Personal Loan</option>
                  <option value="credit">Credit Card</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Total Loan Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.loanAmount}
                  onChange={(e) => setFormData({ ...formData, loanAmount: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Current Balance Remaining</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.currentBalance}
                  onChange={(e) => setFormData({ ...formData, currentBalance: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Loan Term (months)</label>
                <input
                  type="number"
                  value={formData.loanTerm}
                  onChange={(e) => setFormData({ ...formData, loanTerm: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Interest Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.interestRate}
                  onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Payment Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.paymentAmount}
                  onChange={(e) => setFormData({ ...formData, paymentAmount: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="createBill"
                  checked={formData.createBill}
                  onChange={(e) => setFormData({ ...formData, createBill: e.target.checked })}
                  className="w-5 h-5"
                />
                <label htmlFor="createBill" className="text-sm font-semibold">Add as recurring bill</label>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Payment Frequency</label>
                <select
                  value={formData.paymentFrequency}
                  onChange={(e) => setFormData({ ...formData, paymentFrequency: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Start Date</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors"
                >
                  {asset ? 'Update' : 'Add'} Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  const OneTimeBillForm = ({ bill, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState(bill || {
      name: '',
      amount: '',
      dueDate: '',
      description: '',
      category: 'other'
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      onSubmit(formData);
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">{bill ? 'Edit One-Time Bill' : 'Add One-Time Bill'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Bill Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Due Date</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                >
                  <option value="utilities">Utilities</option>
                  <option value="subscription">Subscription</option>
                  <option value="insurance">Insurance</option>
                  <option value="loan">Loan</option>
                  <option value="rent">Rent/Mortgage</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors"
                >
                  {bill ? 'Update' : 'Add'} Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  const PayScheduleForm = ({ schedule, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState(schedule || {
      frequency: 'biweekly',
      payAmount: '',
      nextPayDate: '',
      payDates: []
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      onSubmit(formData);
      onCancel();
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">Pay Schedule</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Pay Frequency</label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="semimonthly">Semi-monthly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Pay Amount (per paycheck)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.payAmount}
                  onChange={(e) => setFormData({ ...formData, payAmount: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Next Pay Date</label>
                <input
                  type="date"
                  value={formData.nextPayDate}
                  onChange={(e) => setFormData({ ...formData, nextPayDate: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  When is your next paycheck? (e.g., this Friday)
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  const HistoricalPaymentsForm = ({ bill, onClose }) => {
    const [newPayment, setNewPayment] = useState({ date: '', amount: '' });

    const handleAddPayment = (e) => {
      e.preventDefault();
      const currentPayments = bill.historicalPayments || [];
      if (currentPayments.length >= 12) {
        alert('Maximum 12 months of historical data. Delete an old entry to add a new one.');
        return;
      }
      addHistoricalPayment(bill.id, newPayment);
      setNewPayment({ date: '', amount: '' });
    };

    const historicalPayments = bill.historicalPayments || [];
    const average = historicalPayments.length > 0
      ? historicalPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0) / historicalPayments.length
      : 0;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Payment History - {bill.name}</h2>
                <p className="text-sm text-slate-600">Track up to 12 months to estimate future bills</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg" title="Close">
                <X size={24} />
              </button>
            </div>

            {historicalPayments.length > 0 && (
              <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-blue-50 border-2 border-emerald-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Current Estimated Amount</p>
                    <p className="text-3xl font-black text-emerald-600">${average.toFixed(2)}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Based on {historicalPayments.length} month{historicalPayments.length !== 1 ? 's' : ''} of data
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-600">Data completeness</p>
                    <div className="flex gap-1 mt-2">
                      {[...Array(12)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-8 rounded ${i < historicalPayments.length ? 'bg-emerald-500' : 'bg-slate-200'}`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{historicalPayments.length}/12 months</p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleAddPayment} className="mb-6 p-4 bg-slate-50 rounded-xl">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Plus size={18} />
                Add Payment ({12 - historicalPayments.length} slots remaining)
              </h3>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-slate-600 mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={newPayment.date}
                    onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-slate-600 mb-1">Amount Paid</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Amount"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold self-end"
                  disabled={historicalPayments.length >= 12}
                  title="Add payment"
                >
                  Add
                </button>
              </div>
              {historicalPayments.length >= 12 && (
                <p className="text-xs text-amber-600 mt-2">
                  ⚠️ Maximum 12 months reached. Delete an old payment to add a new one.
                </p>
              )}
            </form>

            <div className="space-y-2">
              <h3 className="font-semibold mb-3">Payment History</h3>
              {historicalPayments.length > 0 ? (
                <div className="space-y-2">
                  {historicalPayments
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map((payment, idx) => {
                      const originalIdx = historicalPayments.findIndex(p => p === payment);
                      return (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 rounded-lg">
                              <Calendar size={16} className="text-emerald-600" />
                            </div>
                            <div>
                              <span className="font-semibold">{new Date(payment.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                              <span className="ml-4 text-slate-600">${parseFloat(payment.amount).toFixed(2)}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => deleteHistoricalPayment(bill.id, originalIdx)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete this payment"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-50 rounded-xl">
                  <BarChart3 className="mx-auto mb-3 text-slate-300" size={48} />
                  <p className="text-slate-500 font-semibold">No historical payments yet</p>
                  <p className="text-slate-400 text-sm mt-1">
                    Add your past payments to generate an estimated amount
                  </p>
                </div>
              )}
            </div>

            {historicalPayments.length > 1 && (
              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="p-3 bg-blue-50 rounded-xl text-center">
                  <p className="text-xs text-slate-600">Lowest</p>
                  <p className="text-lg font-bold text-blue-600">
                    ${Math.min(...historicalPayments.map(p => parseFloat(p.amount))).toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl text-center">
                  <p className="text-xs text-slate-600">Average</p>
                  <p className="text-lg font-bold text-emerald-600">
                    ${average.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-red-50 rounded-xl text-center">
                  <p className="text-xs text-slate-600">Highest</p>
                  <p className="text-lg font-bold text-red-600">
                    ${Math.max(...historicalPayments.map(p => parseFloat(p.amount))).toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const AmortizationView = ({ asset, onClose }) => {
    const amortization = calculateAmortization(asset);

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Amortization Schedule - {asset.name}</h2>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg" title="Close">
                <X size={24} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-emerald-50 p-4 rounded-xl">
                <p className="text-sm text-slate-600">Total Interest</p>
                <p className="text-2xl font-bold text-emerald-700">${amortization.totalInterest.toFixed(2)}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-xl">
                <p className="text-sm text-slate-600">Total Payments</p>
                <p className="text-2xl font-bold text-blue-700">{amortization.totalPayments}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-xl">
                <p className="text-sm text-slate-600">Payoff Date</p>
                <p className="text-2xl font-bold text-purple-700">
                  {new Date(amortization.payoffDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-2 text-left">#</th>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-right">Payment</th>
                    <th className="px-4 py-2 text-right">Principal</th>
                    <th className="px-4 py-2 text-right">Interest</th>
                    <th className="px-4 py-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {amortization.schedule.map((row) => (
                    <tr key={row.period} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2">{row.period}</td>
                      <td className="px-4 py-2">{new Date(row.date).toLocaleDateString()}</td>
                      <td className="px-4 py-2 text-right">${row.payment.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right">${row.principal.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right">${row.interest.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right font-semibold">${row.balance.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 flex items-center justify-center">
        <div className="text-white text-2xl font-bold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-2">PayPlan Pro</h1>
            <p className="text-emerald-100 text-lg">Your complete financial planning dashboard</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setView('dashboard')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${view === 'dashboard'
              ? 'bg-white text-emerald-600 shadow-lg'
              : 'bg-white/20 text-white hover:bg-white/30'}`}
            title="Dashboard"
          >
            <Home size={20} />
            Dashboard
          </button>
          <button
            onClick={() => setView('bills')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${view === 'bills'
              ? 'bg-white text-emerald-600 shadow-lg'
              : 'bg-white/20 text-white hover:bg-white/30'}`}
            title="Bills"
          >
            <Receipt size={20} />
            Bills
          </button>
          <button
            onClick={() => setView('assets')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${view === 'assets'
              ? 'bg-white text-emerald-600 shadow-lg'
              : 'bg-white/20 text-white hover:bg-white/30'}`}
            title="Assets"
          >
            <Building2 size={20} />
            Assets
          </button>
          <button
            onClick={() => setView('onetime')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${view === 'onetime'
              ? 'bg-white text-emerald-600 shadow-lg'
              : 'bg-white/20 text-white hover:bg-white/30'}`}
            title="One-time"
          >
            <Calendar size={20} />
            One-Time
          </button>
          <button
            onClick={() => setView('propane')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${view === 'propane'
              ? 'bg-white text-emerald-600 shadow-lg'
              : 'bg-white/20 text-white hover:bg-white/30'}`}
            title="Propane"
          >
            <Flame size={20} />
            Propane
          </button>
          <button
            onClick={() => setView('analytics')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${view === 'analytics'
              ? 'bg-white text-emerald-600 shadow-lg'
              : 'bg-white/20 text-white hover:bg-white/30'}`}
            title="Analytics"
          >
            <BarChart3 size={20} />
            Analytics
          </button>
          <button
            onClick={() => setView('settings')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${view === 'settings'
              ? 'bg-white text-emerald-600 shadow-lg'
              : 'bg-white/20 text-white hover:bg-white/30'}`}
            title="Settings"
          >
            <Settings size={20} />
            Settings
          </button>
        </div>

        {/* Dashboard View */}
        {view === 'dashboard' && (
          <div>
            {/* Financial Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-emerald-100 rounded-xl">
                    <DollarSign className="text-emerald-600" size={24} />
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-500 text-sm">
                      {new Date().toLocaleDateString('en-US', { month: 'long' })} Income
                    </p>
                    <p className="text-3xl font-black text-slate-800">
                      ${overview.monthlyIncome.toFixed(2)}
                    </p>
                    {overview.paychecksThisMonth > 0 && (
                      <p className="text-xs text-slate-500 mt-1">
                        {overview.paychecksThisMonth} paycheck{overview.paychecksThisMonth !== 1 ? 's' : ''} this month
                      </p>
                    )}
                  </div>
                </div>
                {overview.nextPaycheckDate && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-500">Next paycheck:</p>
                    <p className="text-sm font-semibold text-emerald-600">
                      {overview.nextPaycheckDate.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        timeZone: 'UTC'
                      })}
                      {overview.daysUntilNextPaycheck !== null && (
                        <span className="text-slate-500 ml-1">
                          ({overview.daysUntilNextPaycheck} day{overview.daysUntilNextPaycheck !== 1 ? 's' : ''})
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-red-100 rounded-xl">
                    <TrendingUp className="text-red-600" size={24} />
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm">Monthly Expenses</p>
                    <p className="text-3xl font-black text-slate-800">
                      ${overview.totalMonthly.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-xl p-6">
                {(() => {
                  const assignments = getPaycheckAssignments();
                  const check1Total = assignments.check1.reduce((sum, b) => sum + parseFloat(b.amount), 0);
                  const check2Total = assignments.check2.reduce((sum, b) => sum + parseFloat(b.amount), 0);
                  const perCheck = paySchedule ? parseFloat(paySchedule.payAmount) : 0;
                  const reserves = perCheckEnvelopeSum();
                  const leftover1 = (perCheck - reserves) - check1Total;
                  const leftover2 = (perCheck - reserves) - check2Total;

                  return (
                    <>
                      <h3 className="text-lg font-bold mb-3">Leftover Per Check</h3>
                      <div className="space-y-3">
                        <div className="p-3 bg-emerald-50 rounded-xl">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">Check 1 Leftover</span>
                            <span className={`text-xl font-bold ${leftover1 >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              ${leftover1.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">Reserved envelopes per check: ${reserves.toFixed(2)}</p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-xl">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">Check 2 Leftover</span>
                            <span className={`text-xl font-bold ${leftover2 >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                              ${leftover2.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">Reserved envelopes per check: ${reserves.toFixed(2)}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border-2 border-slate-200">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold text-slate-700">Total Monthly</span>
                            <span className={`text-xl font-bold ${overview.leftover >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                              ${overview.leftover.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold mb-4">Paycheck Breakdown</h3>
                {(() => {
                  const assignments = getPaycheckAssignments();
                  const check1Total = assignments.check1.reduce((sum, b) => sum + parseFloat(b.amount), 0);
                  const check2Total = assignments.check2.reduce((sum, b) => sum + parseFloat(b.amount), 0);

                  const today = new Date();
                  const currentMonth = today.getMonth();
                  const currentYear = today.getFullYear();
                  let payDatesThisMonth = [];

                  if (paySchedule && paySchedule.nextPayDate) {
                    const nextPay = new Date(paySchedule.nextPayDate);
                    const allPayDates = [nextPay];

                    for (let i = 1; i < 8; i++) {
                      const nextDate = new Date(allPayDates[i - 1]);
                      switch (paySchedule.frequency) {
                        case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
                        case 'biweekly': nextDate.setDate(nextDate.getDate() + 14); break;
                        case 'semimonthly':
                          if (nextDate.getDate() <= 15) {
                            nextDate.setDate(15);
                          } else {
                            nextDate.setMonth(nextDate.getMonth() + 1);
                            nextDate.setDate(1);
                          }
                          break;
                        case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
                      }
                      allPayDates.push(new Date(nextDate));
                    }

                    payDatesThisMonth = allPayDates.filter(date =>
                      date.getMonth() === currentMonth && date.getFullYear() === currentYear
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {payDatesThisMonth.length > 0 && (
                        <div className="p-3 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl border-2 border-emerald-200">
                          <div className="text-xs text-slate-600 mb-2">
                            📅 Pay dates this month:
                          </div>
                          <div className="space-y-1">
                            {payDatesThisMonth.map((date, idx) => (
                              <div key={idx} className="text-sm font-semibold text-slate-800">
                                • {date.toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  month: 'short',
                                  day: 'numeric',
                                  timeZone: 'UTC'
                                })}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="p-3 bg-emerald-50 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-slate-700">First Paycheck (1st-15th)</span>
                          <span className="text-emerald-600 font-bold">
                            ${check1Total.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600">
                          {assignments.check1.length} bills • Due before 16th
                        </div>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-slate-700">Second Paycheck (16th-31st)</span>
                          <span className="text-blue-600 font-bold">
                            ${check2Total.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600">
                          {assignments.check2.length} bills • Due after 15th
                        </div>
                      </div>
                      {paySchedule && (
                        <div className="p-3 bg-slate-50 rounded-xl border-2 border-slate-200">
                          <div className="text-xs text-slate-500 mb-1">Per Paycheck Income</div>
                          <div className="text-2xl font-bold text-slate-800">
                            ${parseFloat(paySchedule.payAmount).toFixed(2)}
                          </div>
                          <div className="text-xs text-slate-600 mt-1">
                            Free after envelopes — Check 1: ${((parseFloat(paySchedule.payAmount) - perCheckEnvelopeSum()) - check1Total).toFixed(2)} •
                            {' '}Check 2: ${((parseFloat(paySchedule.payAmount) - perCheckEnvelopeSum()) - check2Total).toFixed(2)}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold mb-4">Assets Overview</h3>
                <div className="space-y-3">
                  {assets.slice(0, 5).map(asset => (
                    <div key={asset.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <span className="font-semibold">{asset.name}</span>
                      <span className="text-slate-600">${asset.paymentAmount}</span>
                    </div>
                  ))}
                  {assets.length === 0 && (
                    <p className="text-slate-500 text-center py-4">No assets added yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bills View */}
        {view === 'bills' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {billsViewMode === 'monthly'
                  ? new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) + ' Bills'
                  : 'Bill Stream'
                }
              </h2>
              <div className="flex gap-3">
                <div className="flex bg-white/20 rounded-xl p-1">
                  <button
                    onClick={() => setBillsViewMode('monthly')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${billsViewMode === 'monthly'
                      ? 'bg-white text-emerald-600'
                      : 'text-white hover:bg-white/20'
                      }`}
                    title="Monthly"
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillsViewMode('stream')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${billsViewMode === 'stream'
                      ? 'bg-white text-emerald-600'
                      : 'text-white hover:bg-white/20'
                      }`}
                    title="Stream"
                  >
                    Stream
                  </button>
                </div>
                {billsViewMode === 'monthly' && (
                  <button
                    onClick={resetMonthlyBills}
                    className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-xl font-semibold shadow-lg transition-colors flex items-center gap-2"
                    title="Reset current month"
                  >
                    <RefreshCw size={20} />
                    Reset Month
                  </button>
                )}
                <button
                  onClick={exportUpcomingICS}
                  className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-xl font-semibold shadow-lg transition-colors flex items-center gap-2"
                  title="Export upcoming bills to calendar (.ics)"
                >
                  <Calendar size={20} />
                  Export ICS
                </button>
                <button
                  onClick={() => setShowBillForm(true)}
                  className="px-6 py-3 bg-white hover:bg-emerald-50 text-emerald-600 rounded-xl font-semibold shadow-lg transition-colors flex items-center gap-2"
                  title="Add bill"
                >
                  <Plus size={20} />
                  Add Bill
                </button>
              </div>
            </div>

            {/* Monthly Checklist View */}
            {billsViewMode === 'monthly' && bills.length > 0 && (() => {
              const assignments = getPaycheckAssignments();
              const formatDate = (date) => {
                if (!date) return '';
                const d = new Date(date);
                return d.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  timeZone: 'UTC'
                });
              };

              return (
                <div className="space-y-6">
                  {/* First Paycheck Bills */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => setCollapseCheck1(!collapseCheck1)}>
                      <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                        <DollarSign size={24} />
                        {assignments.payDates[0] && formatDate(assignments.payDates[0])}
                      </h3>
                      <ChevronRight size={24} className={`text-white transition-transform ${collapseCheck1 ? '' : 'rotate-90'}`} />
                    </div>
                    {!collapseCheck1 && (
                      <>
                        <p className="text-white/70 text-sm mb-6">
                          Bills to pay with your next paycheck
                        </p>
                        <div className="grid grid-cols-1 gap-4">
                          {assignments.check1.map(bill => (
                            <div key={bill.id} className="bg-white rounded-xl shadow-lg p-4">
                              <div className="flex items-start gap-3">
                                <button
                                  onClick={() => togglePaid(bill.id)}
                                  className={`p-2 rounded-lg transition-colors flex-shrink-0 ${bill.paidThisMonth
                                    ? 'bg-green-500 text-white'
                                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                    }`}
                                  title={bill.paidThisMonth ? 'Mark unpaid' : 'Mark paid'}
                                >
                                  <Check size={20} />
                                </button>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <h3 className={`text-lg font-bold ${bill.paidThisMonth ? 'text-green-600 line-through' : 'text-slate-800'}`}>
                                      {bill.name}
                                    </h3>
                                    {bill.isVariable && (
                                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">
                                        VARIABLE
                                      </span>
                                    )}
                                    {bill.autopay && (
                                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                                        AUTO-PAY
                                      </span>
                                    )}
                                    {bill.reminderDays > 0 && (
                                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                                        REMIND {bill.reminderDays}d
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                                    <span className="flex items-center gap-1">
                                      <DollarSign size={14} />
                                      ${bill.amount}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Calendar size={14} />
                                      Due: Day {bill.dueDate}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock size={14} />
                                      {bill.frequency}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex gap-2 flex-shrink-0">
                                  {!bill.autopay && bill.payFromCheck === 'auto' && parseInt(bill.dueDate) > (assignments.payDates[0]?.getDate() || 0) && (
                                    <button
                                      onClick={() => {
                                        const updated = bills.map(b =>
                                          b.id === bill.id ? { ...b, payFromCheck: 'check2' } : b
                                        );
                                        setBills(updated);
                                        localStorage.setItem('bills', JSON.stringify(updated));
                                      }}
                                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                      title="Move to Check 2 (Pay Later)"
                                    >
                                      <ChevronRight size={16} />
                                    </button>
                                  )}
                                  {bill.payFromCheck === 'check1' && (
                                    <button
                                      onClick={() => {
                                        const updated = bills.map(b =>
                                          b.id === bill.id ? { ...b, payFromCheck: 'auto' } : b
                                        );
                                        setBills(updated);
                                        localStorage.setItem('bills', JSON.stringify(updated));
                                      }}
                                      className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                                      title="Reset to Auto"
                                    >
                                      <RefreshCw size={16} />
                                    </button>
                                  )}
                                  {bill.isVariable && (
                                    <button
                                      onClick={() => setShowHistoricalForm(bill)}
                                      className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                      title="View payment history"
                                    >
                                      <BarChart3 size={16} />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setEditingBill(bill)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit bill"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm(`Delete ${bill.name}?`)) {
                                        deleteBill(bill.id);
                                      }
                                    }}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete bill"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                          {assignments.check1.length === 0 && (
                            <p className="text-white/70 text-center py-8 text-sm">No bills due before your next paycheck</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Second Paycheck Bills */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => setCollapseCheck2(!collapseCheck2)}>
                      <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                        <DollarSign size={24} />
                        {assignments.payDates[1] && formatDate(assignments.payDates[1])}
                      </h3>
                      <ChevronRight size={24} className={`text-white transition-transform ${collapseCheck2 ? '' : 'rotate-90'}`} />
                    </div>
                    {!collapseCheck2 && (
                      <>
                        <p className="text-white/70 text-sm mb-6">
                          Bills to pay with your following paycheck
                        </p>
                        <div className="grid grid-cols-1 gap-4">
                          {assignments.check2.map(bill => (
                            <div key={bill.id} className="bg-white rounded-xl shadow-lg p-4">
                              <div className="flex items-start gap-3">
                                <button
                                  onClick={() => togglePaid(bill.id)}
                                  className={`p-2 rounded-lg transition-colors flex-shrink-0 ${bill.paidThisMonth
                                    ? 'bg-green-500 text-white'
                                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                    }`}
                                  title={bill.paidThisMonth ? 'Mark unpaid' : 'Mark paid'}
                                >
                                  <Check size={20} />
                                </button>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <h3 className={`text-lg font-bold ${bill.paidThisMonth ? 'text-green-600 line-through' : 'text-slate-800'}`}>
                                      {bill.name}
                                    </h3>
                                    {bill.isVariable && (
                                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">
                                        VARIABLE
                                      </span>
                                    )}
                                    {bill.autopay && (
                                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                                        AUTO-PAY
                                      </span>
                                    )}
                                    {bill.reminderDays > 0 && (
                                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                                        REMIND {bill.reminderDays}d
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                                    <span className="flex items-center gap-1">
                                      <DollarSign size={14} />
                                      ${bill.amount}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Calendar size={14} />
                                      Due: Day {bill.dueDate}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock size={14} />
                                      {bill.frequency}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex gap-2 flex-shrink-0">
                                  {!bill.autopay && bill.payFromCheck === 'auto' && parseInt(bill.dueDate) > (assignments.payDates[0]?.getDate() || 0) && (
                                    <button
                                      onClick={() => {
                                        const updated = bills.map(b =>
                                          b.id === bill.id ? { ...b, payFromCheck: 'check1' } : b
                                        );
                                        setBills(updated);
                                        localStorage.setItem('bills', JSON.stringify(updated));
                                      }}
                                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                      title="Move to Check 1 (Pay Early)"
                                    >
                                      <ChevronLeft size={16} />
                                    </button>
                                  )}
                                  {bill.payFromCheck === 'check2' && (
                                    <button
                                      onClick={() => {
                                        const updated = bills.map(b =>
                                          b.id === bill.id ? { ...b, payFromCheck: 'auto' } : b
                                        );
                                        setBills(updated);
                                        localStorage.setItem('bills', JSON.stringify(updated));
                                      }}
                                      className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                                      title="Reset to Auto"
                                    >
                                      <RefreshCw size={16} />
                                    </button>
                                  )}
                                  {bill.isVariable && (
                                    <button
                                      onClick={() => setShowHistoricalForm(bill)}
                                      className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                      title="View payment history"
                                    >
                                      <BarChart3 size={16} />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setEditingBill(bill)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit bill"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm(`Delete ${bill.name}?`)) {
                                        deleteBill(bill.id);
                                      }
                                    }}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete bill"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                          {assignments.check2.length === 0 && (
                            <p className="text-white/70 text-center py-8 text-sm">No bills due before your second paycheck</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Bill Stream View */}
            {billsViewMode === 'stream' && bills.length > 0 && (() => {
              if (!paySchedule || !paySchedule.nextPayDate) {
                return (
                  <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                    <p className="text-slate-600">Set up your pay schedule first to see bill stream</p>
                  </div>
                );
              }

              const paychecks = [];
              let currentDate = new Date(paySchedule.nextPayDate);
              for (let i = 0; i < 3; i++) {
                paychecks.push(new Date(currentDate));
                switch (paySchedule.frequency) {
                  case 'weekly': currentDate.setDate(currentDate.getDate() + 7); break;
                  case 'biweekly': currentDate.setDate(currentDate.getDate() + 14); break;
                  case 'semimonthly':
                    currentDate.setDate(currentDate.getDate() <= 15 ? 15 : 1);
                    if (currentDate.getDate() === 1) currentDate.setMonth(currentDate.getMonth() + 1);
                    break;
                  case 'monthly': currentDate.setMonth(currentDate.getMonth() + 1); break;
                }
              }

              const assignments = getPaycheckAssignments();

              const check3Bills = [];
              const check2Date = paychecks[1];
              const check3Date = paychecks[2];

              bills.forEach(bill => {
                if (bill.payFromCheck === 'check1' || bill.payFromCheck === 'check2') return;

                const dueDay = parseInt(bill.dueDate);
                const check2Month = check2Date.getMonth();
                const check2Year = check2Date.getFullYear();
                const check3Month = check3Date.getMonth();
                const check3Year = check3Date.getFullYear();

                let billDueCheck2Month = new Date(check2Year, check2Month, dueDay);
                if (dueDay < check2Date.getDate()) {
                  billDueCheck2Month.setMonth(billDueCheck2Month.getMonth() + 1);
                }

                let billDueCheck3Month = new Date(check3Year, check3Month, dueDay);
                if (dueDay < check3Date.getDate()) {
                  billDueCheck3Month.setMonth(billDueCheck3Month.getMonth() + 1);
                }

                const inCheck2Window = billDueCheck2Month > check2Date && billDueCheck2Month <= check3Date;
                const inCheck3Window = billDueCheck3Month > check2Date;

                if (!inCheck2Window && inCheck3Window) {
                  check3Bills.push(bill);
                }
              });

              const streamData = [
                { paycheck: paychecks[0], bills: assignments.check1 },
                { paycheck: paychecks[1], bills: assignments.check2 },
                { paycheck: paychecks[2], bills: check3Bills }
              ];

              return (
                <div className="space-y-6">
                  {streamData.map(({ paycheck, bills: assignedBills }, idx) => {
                    const total = assignedBills.reduce((sum, b) => sum + parseFloat(b.amount), 0);
                    const perCheck = parseFloat(paySchedule.payAmount);
                    const leftover = (perCheck - perCheckEnvelopeSum()) - total;

                    return (
                      <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-2xl font-bold text-white">
                            {paycheck.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </h3>
                          <div className="text-right">
                            <p className="text-white/70 text-sm">Bills: ${total.toFixed(2)}</p>
                            <p className={`text-lg font-bold ${leftover >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                              Free after envelopes: ${leftover.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {assignedBills.map(bill => (
                            <div key={bill.id + (bill.effectiveDueDate || bill.nextDueDate)} className="bg-white rounded-xl p-4 flex items-center gap-3">
                              <button
                                onClick={() => togglePaid(bill.id)}
                                className={`p-2 rounded-lg transition-colors flex-shrink-0 ${bill.paidThisMonth
                                  ? 'bg-green-500 text-white'
                                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                  }`}
                                title={bill.paidThisMonth ? 'Mark unpaid' : 'Mark paid'}
                              >
                                <Check size={20} />
                              </button>
                              <div className="flex-1">
                                <p className={`font-semibold ${bill.paidThisMonth ? 'line-through text-green-600' : 'text-slate-800'}`}>
                                  {bill.name}
                                </p>
                                <p className="text-sm text-slate-600">
                                  {new Date(bill.effectiveDueDate || bill.nextDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <p className="text-lg font-bold text-slate-800">${bill.amount}</p>
                                {bill.autopay && (
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded">AUTO</span>
                                )}
                                <button
                                  onClick={() => setEditingBill(bill)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Edit bill"
                                >
                                  <Edit2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))}
                          {assignedBills.length === 0 && (
                            <p className="text-white/70 text-center py-4 text-sm">No bills due before next paycheck</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {bills.length === 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                <Receipt className="mx-auto mb-4 text-slate-300" size={64} />
                <h3 className="text-xl font-bold text-slate-800 mb-2">No Bills Yet</h3>
                <p className="text-slate-600 mb-6">Start by adding your first recurring bill</p>
                <button
                  onClick={() => setShowBillForm(true)}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold"
                  title="Add your first bill"
                >
                  Add Your First Bill
                </button>
              </div>
            )}
          </div>
        )}

        {/* Assets View */}
        {view === 'assets' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-black text-white">Assets & Loans</h2>
              <button
                onClick={() => setShowAssetForm(true)}
                className="px-6 py-3 bg-white hover:bg-emerald-50 text-emerald-600 rounded-xl font-semibold shadow-lg transition-colors flex items-center gap-2"
                title="Add asset"
              >
                <Plus size={20} />
                Add Asset
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {assets.map(asset => {
                const amortization = calculateAmortization(asset);
                return (
                  <div key={asset.id} className="bg-white rounded-2xl shadow-xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-100 rounded-xl">
                        <Building2 className="text-blue-600" size={24} />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-2xl font-bold text-slate-800">{asset.name}</h3>
                          <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full uppercase">
                            {asset.type}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-xs text-slate-500">Loan Amount</p>
                            <p className="text-lg font-bold text-slate-800">${parseFloat(asset.loanAmount).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Payment</p>
                            <p className="text-lg font-bold text-slate-800">${parseFloat(asset.paymentAmount).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Interest Rate</p>
                            <p className="text-lg font-bold text-slate-800">{asset.interestRate}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Payoff Date</p>
                            <p className="text-lg font-bold text-slate-800">
                              {new Date(amortization.payoffDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => setShowAmortizationView(asset)}
                          className="text-blue-600 hover:text-blue-700 font-semibold text-sm flex items-center gap-1"
                          title="View amortization schedule"
                        >
                          View Amortization Schedule
                          <ChevronRight size={16} />
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingAsset(asset)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit asset"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete ${asset.name}?`)) {
                              deleteAsset(asset.id);
                            }
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete asset"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {assets.length === 0 && (
                <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                  <Building2 className="mx-auto mb-4 text-slate-300" size={64} />
                  <h3 className="text-xl font-bold text-slate-800 mb-2">No Assets Yet</h3>
                  <p className="text-slate-600 mb-6">Track loans, mortgages, and other financed assets</p>
                  <button
                    onClick={() => setShowAssetForm(true)}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold"
                    title="Add your first asset"
                  >
                    Add Your First Asset
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* One-Time Bills View */}
        {view === 'onetime' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-black text-white">One-Time Bills</h2>
              <button
                onClick={() => setShowOneTimeForm(true)}
                className="px-6 py-3 bg-white hover:bg-emerald-50 text-emerald-600 rounded-xl font-semibold shadow-lg transition-colors flex items-center gap-2"
                title="Add one-time bill"
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
                  <p className="text-2xl font-black text-white">${overview.upcomingOneTime.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {oneTimeBills.length > 0 ? (
                oneTimeBills.map(bill => {
                  const dueDate = new Date(bill.dueDate);
                  const today = new Date();
                  const isOverdue = !bill.paid && dueDate < today;

                  return (
                    <div key={bill.id} className={`bg-white rounded-2xl shadow-xl p-6 ${isOverdue ? 'border-4 border-red-500' : ''}`}>
                      <div className="flex items-start gap-4">
                        <button
                          onClick={() => toggleOneTimePaid(bill.id)}
                          className={`p-3 rounded-xl transition-colors ${bill.paid
                            ? 'bg-green-500 text-white'
                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            }`}
                          title={bill.paid ? 'Mark unpaid' : 'Mark paid'}
                        >
                          <Check size={24} />
                        </button>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className={`text-xl font-bold ${bill.paid ? 'text-green-800 line-through' : 'text-slate-800'}`}>
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
                              <DollarSign size={14} />
                              ${bill.amount}
                            </span>
                            {bill.category && (
                              <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded">
                                {bill.category}
                              </span>
                            )}
                            {bill.paid && bill.paidDate && (
                              <span className="text-green-600 flex items-center gap-1">
                                <Check size={14} />
                                Paid {new Date(bill.paidDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          {bill.description && (
                            <p className="text-sm text-slate-600 italic">{bill.description}</p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingOneTime(bill)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit one-time bill"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete ${bill.name}?`)) {
                                deleteOneTimeBill(bill.id);
                              }
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete one-time bill"
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
                  <h3 className="text-xl font-bold text-slate-800 mb-2">No One-Time Bills</h3>
                  <p className="text-slate-600 mb-6">Track non-recurring expenses like medical bills or repairs</p>
                  <button
                    onClick={() => setShowOneTimeForm(true)}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold"
                    title="Add your first one-time bill"
                  >
                    Add Your First One-Time Bill
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Propane View */}
        {view === 'propane' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-black text-white">Propane Usage Tracker</h2>
              <button onClick={() => setShowPropaneForm(true)} className="px-6 py-3 bg-white hover:bg-emerald-50 text-emerald-600 rounded-xl font-semibold shadow-lg transition-colors flex items-center gap-2" title="Add fill">
                <Plus size={20} />
                Add Fill
              </button>
            </div>

            {propaneFills.length > 0 && (() => {
              const sorted = [...propaneFills].sort((a, b) => new Date(b.date) - new Date(a.date));
              const latest = sorted[0];
              const totalGallons = propaneFills.reduce((sum, f) => sum + parseFloat(f.gallons), 0);
              const totalCost = propaneFills.reduce((sum, f) => sum + parseFloat(f.totalCost), 0);
              const avgPricePerGal = totalCost / totalGallons;

              const fillsWithUsage = sorted.map((fill, idx) => {
                if (idx === sorted.length - 1) return { ...fill, daysLasted: null, dailyUsage: null };
                const nextFill = sorted[idx + 1];
                const days = Math.floor((new Date(fill.date) - new Date(nextFill.date)) / (1000 * 60 * 60 * 24));
                const dailyUsage = parseFloat(fill.gallons) / days;
                return { ...fill, daysLasted: days, dailyUsage };
              });

              return (
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl shadow-xl p-6">
                    <h3 className="text-xl font-bold mb-4">Latest Fill</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-slate-500">Date</p>
                        <p className="text-lg font-bold">{new Date(latest.date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Gallons</p>
                        <p className="text-lg font-bold text-emerald-600">{latest.gallons}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Price/Gal</p>
                        <p className="text-lg font-bold">${latest.pricePerGal}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Total Cost</p>
                        <p className="text-lg font-bold text-red-600">${latest.totalCost}</p>
                      </div>
                    </div>
                    {fillsWithUsage[0].daysLasted && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-slate-600">Lasted <span className="font-bold">{fillsWithUsage[0].daysLasted} days</span> • Avg <span className="font-bold">{fillsWithUsage[0].dailyUsage.toFixed(1)} gal/day</span></p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-2xl shadow-xl p-6">
                      <p className="text-sm text-slate-500 mb-1">Total Spent (All Time)</p>
                      <p className="text-3xl font-black text-red-600">${totalCost.toFixed(2)}</p>
                    </div>
                    <div className="bg-white rounded-2xl shadow-xl p-6">
                      <p className="text-sm text-slate-500 mb-1">Total Gallons</p>
                      <p className="text-3xl font-black text-emerald-600">{totalGallons.toFixed(0)}</p>
                    </div>
                    <div className="bg-white rounded-2xl shadow-xl p-6">
                      <p className="text-sm text-slate-500 mb-1">Avg Price/Gal</p>
                      <p className="text-3xl font-black text-slate-800">${avgPricePerGal.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-xl p-6">
                    <h3 className="text-xl font-bold mb-4">Fill History</h3>
                    <div className="space-y-2">
                      {fillsWithUsage.map(fill => (
                        <div key={fill.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                          <div className="flex-1">
                            <p className="font-semibold">{new Date(fill.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                            <p className="text-sm text-slate-600">
                              {fill.gallons} gal @ ${fill.pricePerGal}/gal = ${fill.totalCost}
                              {fill.daysLasted && ` • Lasted ${fill.daysLasted} days (${fill.dailyUsage.toFixed(1)} gal/day)`}
                            </p>
                          </div>
                          <button onClick={() => deletePropaneFill(fill.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Delete fill">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {propaneFills.length === 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                <Flame className="mx-auto mb-4 text-slate-300" size={64} />
                <h3 className="text-xl font-bold text-slate-800 mb-2">No Fills Tracked Yet</h3>
                <p className="text-slate-600 mb-6">Start tracking your propane fills to see usage patterns and costs</p>
              </div>
            )}
          </div>
        )}

        {/* Analytics View */}
        {view === 'analytics' && (
          <div>
            <h2 className="text-3xl font-black text-white mb-6">Financial Analytics</h2>

            {/* Income vs Expenses */}
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
              <h3 className="text-xl font-bold mb-4">Income vs Expenses</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center p-4 bg-emerald-50 rounded-xl">
                  <p className="text-xs text-slate-600 mb-1">Monthly Income</p>
                  <p className="text-xl md:text-2xl font-bold text-emerald-600 break-all">${overview.monthlyIncome.toFixed(2)}</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-xl">
                  <p className="text-xs text-slate-600 mb-1">Monthly Expenses</p>
                  <p className="text-xl md:text-2xl font-bold text-red-600 break-all">${overview.totalMonthly.toFixed(2)}</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <p className="text-xs text-slate-600 mb-1">Net Savings</p>
                  <p className={`text-xl md:text-2xl font-bold break-all ${overview.leftover >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    ${overview.leftover.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="h-8 bg-slate-100 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 flex items-center justify-center text-white text-xs font-bold"
                  style={{ width: `${Math.min((overview.totalMonthly / (overview.monthlyIncome || 1)) * 100, 100)}%` }}
                >
                  {overview.monthlyIncome > 0 ? ((overview.totalMonthly / overview.monthlyIncome) * 100).toFixed(0) : 0}%
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2 text-center">
                {overview.totalMonthly > overview.monthlyIncome ? '⚠️ Spending exceeds income' : '✓ Under budget'}
              </p>
            </div>

            {/* Emergency Fund */}
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Emergency Fund</h3>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    const target = window.prompt('Target emergency fund amount:', emergencyFund.target);
                    const current = window.prompt('Current saved amount:', emergencyFund.current);
                    if (target !== null && current !== null) {
                      const fund = { target: parseFloat(target) || 0, current: parseFloat(current) || 0 };
                      setEmergencyFund(fund);
                      localStorage.setItem('emergencyFund', JSON.stringify(fund));
                    }
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  Update
                </button>
              </div>
              {emergencyFund.target > 0 ? (
                <>
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-600">Progress: ${emergencyFund.current.toFixed(2)} / ${emergencyFund.target.toFixed(2)}</span>
                      <span className="font-bold text-emerald-600">{((emergencyFund.current / emergencyFund.target) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-6 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500"
                        style={{ width: `${Math.min((emergencyFund.current / emergencyFund.target) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">
                    {emergencyFund.current >= emergencyFund.target
                      ? '🎉 Goal reached!'
                      : `$${(emergencyFund.target - emergencyFund.current).toFixed(2)} to go`}
                  </p>
                </>
              ) : (
                <p className="text-slate-500 text-center py-4">Set your emergency fund goal to start tracking</p>
              )}
            </div>

            {/* Category Budgets */}
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Category Budgets</h3>
                <button
                  type="button"
                  onClick={() => {
                    const cats = ['utilities', 'subscription', 'insurance', 'loan', 'rent', 'other'];
                    const next = { ...budgets };
                    cats.forEach(c => {
                      const v = window.prompt(`Monthly cap for "${c}" (0 for none):`, String(next[c] ?? 0));
                      if (v !== null) next[c] = parseFloat(v) || 0;
                    });
                    setBudgets(next);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold"
                >
                  Edit Caps
                </button>
              </div>
              {(() => {
                const spend = monthlyCategorySpend();
                const cats = Object.keys(budgets);
                if (!cats.length) return <p className="text-slate-500">No budgets set.</p>;
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {cats.map(c => {
                      const cap = budgets[c] || 0;
                      const used = spend[c] || 0;
                      const pct = cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 0;
                      const over = cap > 0 && used > cap;
                      return (
                        <div key={c} className={`p-4 rounded-xl ${over ? 'bg-red-50 border-2 border-red-200' : 'bg-slate-50'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold capitalize">{c}</span>
                            <span className={`text-sm font-bold ${over ? 'text-red-600' : 'text-slate-700'}`}>
                              ${used.toFixed(2)}{cap > 0 && ` / $${cap.toFixed(2)}`}
                            </span>
                          </div>
                          {cap > 0 ? (
                            <>
                              <div className="h-3 bg-white rounded-full overflow-hidden">
                                <div className={`h-full ${over ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                              </div>
                              {over && <p className="text-xs text-red-600 mt-1">Over budget by ${(used - cap).toFixed(2)}</p>}
                            </>
                          ) : (
                            <p className="text-xs text-slate-500">No cap set</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Debt Payoff */}
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Debt Payoff Tracker</h3>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    const name = window.prompt('Debt name (e.g., Credit Card):');
                    if (!name) return;
                    const balance = window.prompt('Current balance:');
                    if (!balance) return;
                    const rate = window.prompt('Interest rate % (e.g., 18.5):');
                    if (!rate) return;
                    const payment = window.prompt('Monthly payment:');
                    if (!payment) return;

                    const debt = {
                      id: Date.now(),
                      name,
                      balance: parseFloat(balance),
                      rate: parseFloat(rate),
                      payment: parseFloat(payment)
                    };
                    const updated = [...debtPayoff, debt];
                    setDebtPayoff(updated);
                    localStorage.setItem('debtPayoff', JSON.stringify(updated));
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  Add Debt
                </button>
              </div>
              {debtPayoff.length > 0 ? (
                <div className="space-y-3">
                  {debtPayoff.map(debt => {
                    const monthsToPayoff = Math.ceil(debt.balance / debt.payment);
                    const totalInterest = (debt.payment * monthsToPayoff) - debt.balance;
                    return (
                      <div key={debt.id} className="p-4 bg-slate-50 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold">{debt.name}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              const updated = debtPayoff.filter(d => d.id !== debt.id);
                              setDebtPayoff(updated);
                              localStorage.setItem('debtPayoff', JSON.stringify(updated));
                            }}
                            className="text-red-600 hover:bg-red-50 p-1 rounded transition-colors"
                            title="Remove"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        <p className="text-sm text-slate-600">Balance: ${debt.balance.toFixed(2)} @ {debt.rate}%</p>
                        <p className="text-sm text-slate-600">Payment: ${debt.payment.toFixed(2)}/mo</p>
                        <p className="text-sm font-semibold text-emerald-600 mt-2">
                          Payoff: {monthsToPayoff} months | Interest: ${totalInterest.toFixed(2)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-4">Add debts to track payoff timeline</p>
              )}
            </div>

            {/* Export Section */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold mb-4">Export Reports</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    const csv = `PayPlan Pro Export - ${new Date().toLocaleDateString()}\n\n` +
                      `Monthly Income,$${overview.monthlyIncome.toFixed(2)}\n` +
                      `Monthly Expenses,$${overview.totalMonthly.toFixed(2)}\n` +
                      `Net Savings,$${overview.leftover.toFixed(2)}\n\n` +
                      `Bills:\nName,Amount,Due Date,Frequency\n` +
                      bills.map(b => `${b.name},$${b.amount},${b.dueDate},${b.frequency}`).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `payplan-export-${Date.now()}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors"
                  title="Export CSV"
                >
                  📊 Export CSV
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    const data = { bills, assets, oneTimeBills, paySchedule, emergencyFund, debtPayoff, propaneFills, budgets, envelopes };
                    const json = JSON.stringify(data, null, 2);
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `payplan-backup-${Date.now()}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
                  title="Backup JSON"
                >
                  💾 Backup JSON
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings View */}
        {view === 'settings' && (
          <div>
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => setView('dashboard')}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                title="Back to dashboard"
              >
                <Home className="text-white" size={24} />
              </button>
              <h2 className="text-3xl font-black text-white">Settings</h2>
            </div>

            <div className="space-y-4">
              {/* Pay Schedule */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Pay Schedule</h3>
                    <p className="text-slate-600 text-sm">Configure when and how much you get paid</p>
                  </div>
                  <button
                    onClick={() => setShowPayScheduleForm(true)}
                    className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl font-semibold transition-colors"
                    title={paySchedule ? 'Edit pay schedule' : 'Set up pay schedule'}
                  >
                    {paySchedule ? 'Edit' : 'Set Up'}
                  </button>
                </div>

                {paySchedule && (
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">Frequency:</span>
                        <span className="font-bold text-slate-800 ml-2 capitalize">{paySchedule.frequency}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Pay Amount:</span>
                        <span className="font-bold text-slate-800 ml-2">${paySchedule.payAmount}</span>
                      </div>
                      {paySchedule.nextPayDate && (
                        <div className="col-span-2">
                          <span className="text-slate-500">Next Pay Date:</span>
                          <span className="font-bold text-emerald-600 ml-2">
                            {new Date(paySchedule.nextPayDate).toLocaleDateString('en-US', {
                              weekday: 'long',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Google Calendar */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Google Calendar Integration</h3>
                    <p className="text-slate-600 text-sm">Sync your bills and payment dates to your calendar</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {calendarConnected && (
                      <button
                        onClick={syncToCalendar}
                        className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl font-semibold transition-colors flex items-center gap-2"
                        title="Sync now"
                      >
                        <RefreshCw size={16} />
                        Sync Now
                      </button>
                    )}
                    <button
                      onClick={connectGoogleCalendar}
                      className={`px-4 py-2 rounded-xl font-semibold transition-colors ${calendarConnected
                        ? 'bg-green-100 text-green-700'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      title={calendarConnected ? 'Connected' : 'Connect (demo)'}
                    >
                      {calendarConnected ? '✓ Connected' : 'Connect'}
                    </button>
                  </div>
                </div>

                {calendarConnected && (
                  <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                    <p className="text-green-800 text-sm">
                      ✓ Calendar is connected. Your bills and payment dates will sync automatically.
                    </p>
                  </div>
                )}
              </div>

              {/* Envelope Planning */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Envelope Planning</h3>
                    <p className="text-slate-600 text-sm">Reserve amounts from each paycheck</p>
                  </div>
                  <button
                    onClick={() => {
                      const name = window.prompt('Envelope name (e.g., Groceries):');
                      if (!name) return;
                      const perCheck = parseFloat(window.prompt('Amount per paycheck:') || '0');
                      const next = [...envelopes, { id: Date.now(), name, perCheck: isNaN(perCheck) ? 0 : perCheck }];
                      setEnvelopes(next);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold"
                    title="Add envelope"
                  >
                    Add Envelope
                  </button>
                </div>
                {envelopes.length ? (
                  <div className="space-y-2">
                    {envelopes.map(env => (
                      <div key={env.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">{env.name}</span>
                          <span className="text-slate-600 text-sm">${parseFloat(env.perCheck || 0).toFixed(2)} / check</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const v = window.prompt(`New per-check amount for "${env.name}":`, String(env.perCheck));
                              if (v === null) return;
                              const amt = parseFloat(v) || 0;
                              setEnvelopes(envelopes.map(e => e.id === env.id ? { ...e, perCheck: amt } : e));
                            }}
                            className="px-3 py-1 text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg text-sm font-semibold"
                            title="Edit envelope"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setEnvelopes(envelopes.filter(e => e.id !== env.id))}
                            className="px-3 py-1 text-red-700 bg-red-100 hover:bg-red-200 rounded-lg text-sm font-semibold"
                            title="Remove envelope"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="mt-2 text-sm text-slate-600">
                      Total reserved per check: <span className="font-bold text-slate-800">${perCheckEnvelopeSum().toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500">No envelopes yet.</p>
                )}
              </div>

              {/* Backup & Restore */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-slate-800">Backup & Restore</h3>
                  <p className="text-slate-600 text-sm">Export your data or restore from a backup file</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={exportBackup}
                    className="flex-1 px-4 py-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                    title="Export backup"
                  >
                    <Download size={18} />
                    Export Backup
                  </button>
                  <button
                    onClick={() => backupFileInputRef.current?.click()}
                    className="flex-1 px-4 py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                    title="Restore from backup"
                  >
                    <Upload size={18} />
                    Restore Backup
                  </button>
                  <input
                    ref={backupFileInputRef}
                    type="file"
                    accept=".json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        importBackupFromFile(file);
                        e.target.value = '';
                      }
                    }}
                    className="hidden"
                  />
                </div>

                <div className="mt-4 bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
                  <p className="text-amber-800 text-sm">
                    <strong>Note:</strong> Backups contain all your bills, assets, one-time bills, and settings. Keep your backup files secure.
                  </p>
                </div>
              </div>

              {/* Clear All Data */}
              <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-red-200">
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-red-600">Danger Zone</h3>
                  <p className="text-slate-600 text-sm">Permanently delete all your data</p>
                </div>

                <button
                  onClick={clearAllData}
                  className="w-full px-4 py-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                  title="Clear all data"
                >
                  <Trash2 size={18} />
                  Clear All Data
                </button>

                <div className="mt-4 bg-red-50 border-2 border-red-200 rounded-xl p-4">
                  <p className="text-red-800 text-sm">
                    <strong>⚠️ Warning:</strong> This will permanently delete ALL bills, assets, one-time bills, and settings. This action cannot be undone. Make a backup first if you want to keep your data!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showBillForm && (
        <BillForm
          onSubmit={addBill}
          onCancel={() => setShowBillForm(false)}
        />
      )}

      {editingBill && (
        <BillForm
          bill={editingBill}
          onSubmit={updateBill}
          onCancel={() => setEditingBill(null)}
        />
      )}

      {showAssetForm && (
        <AssetForm
          onSubmit={addAsset}
          onCancel={() => setShowAssetForm(false)}
        />
      )}

      {editingAsset && (
        <AssetForm
          asset={editingAsset}
          onSubmit={updateAsset}
          onCancel={() => setEditingAsset(null)}
        />
      )}

      {showOneTimeForm && (
        <OneTimeBillForm
          onSubmit={addOneTimeBill}
          onCancel={() => setShowOneTimeForm(false)}
        />
      )}

      {editingOneTime && (
        <OneTimeBillForm
          bill={editingOneTime}
          onSubmit={updateOneTimeBill}
          onCancel={() => setEditingOneTime(null)}
        />
      )}

      {showPayScheduleForm && (
        <PayScheduleForm
          schedule={paySchedule}
          onSubmit={savePaySchedule}
          onCancel={() => setShowPayScheduleForm(false)}
        />
      )}

      {showHistoricalForm && (
        <HistoricalPaymentsForm
          bill={showHistoricalForm}
          onClose={() => setShowHistoricalForm(null)}
        />
      )}

      {showAmortizationView && (
        <AmortizationView
          asset={showAmortizationView}
          onClose={() => setShowAmortizationView(null)}
        />
      )}

      {/* Propane Fill Form */}
      {showPropaneForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">Add Propane Fill</h2>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const gallons = parseFloat(formData.get('gallons'));
                const pricePerGal = parseFloat(formData.get('pricePerGal'));
                addPropaneFill({
                  date: formData.get('date'),
                  gallons: gallons.toFixed(2),
                  pricePerGal: pricePerGal.toFixed(2),
                  totalCost: (gallons * pricePerGal).toFixed(2)
                });
                setShowPropaneForm(false);
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Fill Date</label>
                  <input type="date" name="date" required className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Gallons Delivered</label>
                  <input type="number" step="0.1" name="gallons" required className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Price per Gallon</label>
                  <input type="number" step="0.01" name="pricePerGal" required className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none" />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowPropaneForm(false)} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold">Add Fill</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Data Modal */}
      {showClearDataModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertCircle className="text-red-600" size={32} />
                </div>
                <h2 className="text-2xl font-bold text-red-600">Clear All Data?</h2>
              </div>

              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
                <p className="text-red-800 font-semibold mb-2">
                  ⚠️ This will permanently delete:
                </p>
                <ul className="text-red-700 text-sm space-y-1 ml-4">
                  <li>• All recurring bills</li>
                  <li>• All assets and loans</li>
                  <li>• All one-time bills</li>
                  <li>• Your pay schedule</li>
                  <li>• All settings</li>
                </ul>
                <p className="text-red-800 font-semibold mt-3">
                  This action cannot be undone!
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowClearDataModal(false);
                    setClearDataCountdown(5);
                  }}
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmClearAllData}
                  disabled={clearDataCountdown > 0}
                  className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-colors ${clearDataCountdown > 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                >
                  {clearDataCountdown > 0 ? `Wait ${clearDataCountdown}s...` : 'Yes, Delete Everything'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillPayPlanner;