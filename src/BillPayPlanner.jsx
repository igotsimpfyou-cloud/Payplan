import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { DollarSign, Calendar, Plus, Check, AlertCircle, Trash2, Edit2, X, Clock, TrendingUp, Home, Settings, List, BarChart3, ChevronRight, ChevronLeft, RefreshCw, Building2, Receipt, Download, Upload, Flame } from 'lucide-react';

/** ---------- helpers ---------- */
const fmtMoney = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const toMoney = v => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};
const safeUUID = () => (crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`);
const parseJSON = (s, fallback) => { try { return JSON.parse(s); } catch { return fallback; } };
const setLS = (patch) => Object.entries(patch).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v)));
const getLastDOM = (y, m) => new Date(y, m + 1, 0).getDate();
const addMonthsSafe = (d, n) => {
  const day = d.getDate();
  const t = new Date(d);
  t.setDate(1);
  t.setMonth(t.getMonth() + n);
  t.setDate(Math.min(day, getLastDOM(t.getFullYear(), t.getMonth())));
  return t;
};
const addDays = (d, n) => { const t = new Date(d); t.setDate(t.getDate() + n); return t; };
const isoDate = d => new Date(d).toISOString().split('T')[0];

/** semimonthly support with anchors (fallback to 1st & 15th) */
const nextSemiMonthly = (from, anchors) => {
  const d = new Date(from);
  const base = anchors?.map(a => new Date(a)).sort((a, b) => a - b);
  if (!base || base.length !== 2) {
    const a = new Date(d.getFullYear(), d.getMonth(), 1);
    const b = new Date(d.getFullYear(), d.getMonth(), 15);
    const list = [a, b, addMonthsSafe(a, 1)];
    return list.find(x => x >= d) || addMonthsSafe(a, 1);
  }
  // project anchors to current/next month
  const [a1, a2] = base;
  const m1 = new Date(d.getFullYear(), d.getMonth(), a1.getDate());
  const m2 = new Date(d.getFullYear(), d.getMonth(), a2.getDate());
  const m3 = new Date(d.getFullYear(), d.getMonth() + 1, a1.getDate());
  return [m1, m2, m3].find(x => x >= d) || m3;
};

/** ---------- confirmation modal ---------- */
const ConfirmContext = React.createContext(null);
const useConfirm = () => React.useContext(ConfirmContext);

const ConfirmProvider = ({ children }) => {
  const [state, setState] = useState(null);
  const confirm = (title, message) => new Promise((resolve) => setState({ title, message, resolve }));
  const onClose = (ans) => { state?.resolve(ans); setState(null); };
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onKeyDown={(e)=>e.key==='Escape'&&onClose(false)} tabIndex={-1}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-amber-100 rounded-full">
                  <AlertCircle className="text-amber-600" size={28} />
                </div>
                <h3 className="text-xl font-bold">{state.title}</h3>
              </div>
              <p className="text-slate-600 mb-6">{state.message}</p>
              <div className="flex gap-3">
                <button onClick={()=>onClose(false)} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold">Cancel</button>
                <button onClick={()=>onClose(true)} className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold">Confirm</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

/** ---------- main ---------- */
const BillPayPlanner = () => {
  const [view, setView] = useState('dashboard');
  const [bills, setBills] = useState([]);
  const [assets, setAssets] = useState([]);
  const [oneTimeBills, setOneTimeBills] = useState([]);
  const [paySchedule, setPaySchedule] = useState(null); // {frequency, payAmount, nextPayDate, anchors?}
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
  const [billsViewMode, setBillsViewMode] = useState('monthly');
  const [emergencyFund, setEmergencyFund] = useState({ target: 0, current: 0 });
  const [debtPayoff, setDebtPayoff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const backupFileInputRef = useRef(null);
  const confirm = useConfirm();

  /** backup */
  const exportBackup = () => {
    const payload = {
      app: 'PayPlan Pro',
      version: 2,
      exportedAt: new Date().toISOString(),
      data: { bills, assets, oneTimeBills, paySchedule, calendarConnected, propaneFills, emergencyFund, debtPayoff }
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `payplan-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 500);
  };

  const applyBackup = async (payload) => {
    const d = payload?.data ?? payload;
    const newBills = Array.isArray(d?.bills) ? d.bills : [];
    const newAssets = Array.isArray(d?.assets) ? d.assets : [];
    const newOneTimeBills = Array.isArray(d?.oneTimeBills) ? d.oneTimeBills : [];
    setBills(newBills); setAssets(newAssets); setOneTimeBills(newOneTimeBills);
    setPaySchedule(d?.paySchedule ?? null);
    setCalendarConnected(!!d?.calendarConnected);
    setPropaneFills(Array.isArray(d?.propaneFills)? d.propaneFills: []);
    setEmergencyFund(d?.emergencyFund ?? {target:0,current:0});
    setDebtPayoff(Array.isArray(d?.debtPayoff)? d.debtPayoff: []);
    setLS({
      bills:newBills, assets:newAssets, oneTimeBills:newOneTimeBills,
      paySchedule:d?.paySchedule ?? null, calendarConnected:!!d?.calendarConnected,
      propaneFills:Array.isArray(d?.propaneFills)? d.propaneFills: [],
      emergencyFund:d?.emergencyFund ?? {target:0,current:0},
      debtPayoff:Array.isArray(d?.debtPayoff)? d.debtPayoff: []
    });
  };

  const importBackupFromFile = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      if (payload?.app !== 'PayPlan Pro') { window.alert('Invalid backup'); return; }
      await applyBackup(payload);
      window.alert('Backup restored');
    } catch (e) { console.error(e); window.alert('Error restoring backup'); }
  };

  /** load */
  useEffect(() => {
    try {
      const billsData = parseJSON(localStorage.getItem('bills'), []);
      // migration: ensure nextDueDate
      const today = new Date();
      const migrated = billsData.map((bill) => {
        if (!bill.nextDueDate && bill?.dueDate) {
          const dueDay = parseInt(bill.dueDate);
          let nextDue = new Date(today.getFullYear(), today.getMonth(), Math.min(dueDay, 28));
          if (nextDue < today) nextDue = addMonthsSafe(nextDue, 1);
          return { ...bill, nextDueDate: isoDate(nextDue) };
        }
        return bill;
      });
      if (JSON.stringify(migrated) !== JSON.stringify(billsData)) localStorage.setItem('bills', JSON.stringify(migrated));
      setBills(migrated);

      setAssets(parseJSON(localStorage.getItem('assets'), []));
      setOneTimeBills(parseJSON(localStorage.getItem('oneTimeBills'), []));
      setPaySchedule(parseJSON(localStorage.getItem('paySchedule'), null));
      setCalendarConnected(!!parseJSON(localStorage.getItem('calendarConnected'), false));
      setPropaneFills(parseJSON(localStorage.getItem('propaneFills'), []));
      setEmergencyFund(parseJSON(localStorage.getItem('emergencyFund'), {target:0,current:0}));
      setDebtPayoff(parseJSON(localStorage.getItem('debtPayoff'), []));
    } catch (e) { console.warn('load error', e); }
    setLoading(false);
  }, []);

  /** countdown */
  useEffect(() => {
    if (!showClearDataModal) return;
    if (clearDataCountdown <= 0) return;
    const t = setTimeout(()=>setClearDataCountdown(s=>s-1), 1000);
    return ()=>clearTimeout(t);
  }, [showClearDataModal, clearDataCountdown]);

  /** saves */
  const saveBills = async (updated) => { setBills(updated); setLS({ bills: updated }); };
  const saveAssets = async (updated) => { setAssets(updated); setLS({ assets: updated }); };
  const saveOneTimeBills = async (updated) => { setOneTimeBills(updated); setLS({ oneTimeBills: updated }); };
  const savePaySchedule = async (schedule) => { setPaySchedule(schedule); setLS({ paySchedule: schedule }); };
  const savePropaneFills = async (fills) => { setPropaneFills(fills); setLS({ propaneFills: fills }); };

  /** propane */
  const addPropaneFill = async (fill) => {
    const newFill = { ...fill, id: safeUUID() };
    await savePropaneFills([...(propaneFills||[]), newFill]);
  };
  const deletePropaneFill = async (id) => { await savePropaneFills(propaneFills.filter(f=>f.id!==id)); };

  /** bill CRUD */
  const addBill = async (billData) => {
    const today = new Date();
    const dueDay = parseInt(billData.dueDate);
    let nextDue = new Date(today.getFullYear(), today.getMonth(), Math.min(dueDay, 28));
    if (nextDue < today) nextDue = addMonthsSafe(nextDue, 1);
    const newBill = {
      id: safeUUID(),
      ...billData,
      amount: toMoney(billData.amount),
      nextDueDate: isoDate(nextDue),
      paidThisMonth: false,
      lastPaid: null,
      historicalPayments: billData.historicalPayments || []
    };
    await saveBills([...bills, newBill]);
    setShowBillForm(false);
  };
  const updateBill = async (billData) => {
    const updated = bills.map(b => b.id === editingBill.id ? { ...b, ...billData, amount: toMoney(billData.amount) } : b);
    await saveBills(updated); setEditingBill(null);
  };
  const deleteBill = async (billId) => {
    if (await confirm('Delete Bill?', 'This will remove the bill and its history.')) {
      await saveBills(bills.filter(b=>b.id!==billId));
    }
  };

  /** asset CRUD */
  const addAsset = async (assetData) => {
    const newAsset = { id: safeUUID(), ...assetData, startDate: assetData.startDate || isoDate(new Date()) };
    await saveAssets([...assets, newAsset]);
    if (assetData.createBill) {
      const newBill = {
        id: safeUUID(),
        name: assetData.name,
        amount: toMoney(assetData.paymentAmount),
        dueDate: `${new Date(assetData.startDate).getDate()}`,
        frequency: assetData.paymentFrequency,
        category: 'loan',
        autopay: false,
        isVariable: false,
        payFromCheck: 'auto',
        paidThisMonth: false,
        nextDueDate: isoDate(new Date(assetData.startDate))
      };
      await saveBills([...bills, newBill]);
    }
    setShowAssetForm(false);
  };
  const updateAsset = async (assetData) => {
    const updated = assets.map(a => a.id === editingAsset.id ? { ...a, ...assetData } : a);
    await saveAssets(updated); setEditingAsset(null);
  };
  const deleteAsset = async (assetId) => {
    if (await confirm('Delete Asset?', 'This will remove the asset.')) {
      await saveAssets(assets.filter(a=>a.id!==assetId));
    }
  };

  /** one-time */
  const addOneTimeBill = async (billData) => {
    const newBill = {
      id: safeUUID(),
      ...billData,
      amount: toMoney(billData.amount),
      paid: false,
      addedDate: new Date().toISOString()
    };
    await saveOneTimeBills([...oneTimeBills, newBill]);
    setShowOneTimeForm(false);
  };
  const updateOneTimeBill = async (billData) => {
    const updated = oneTimeBills.map(b => b.id === editingOneTime.id ? { ...b, ...billData, amount: toMoney(billData.amount) } : b);
    await saveOneTimeBills(updated); setEditingOneTime(null);
  };
  const deleteOneTimeBill = async (billId) => {
    if (await confirm('Delete One-Time Bill?', 'This will remove the bill.')) {
      await saveOneTimeBills(oneTimeBills.filter(b=>b.id!==billId));
    }
  };

  /** reset */
  const resetMonthlyBills = async () => {
    if (!(await confirm('Reset Month?', 'Mark all recurring bills as unpaid for the new month.'))) return;
    const reset = bills.map(b => ({ ...b, paidThisMonth: false }));
    await saveBills(reset);
  };

  /** clear all */
  const clearAllData = () => { setShowClearDataModal(true); setClearDataCountdown(5); };
  const confirmClearAllData = () => {
    setBills([]); setAssets([]); setOneTimeBills([]); setPaySchedule(null);
    setCalendarConnected(false); setPropaneFills([]); setEmergencyFund({target:0,current:0}); setDebtPayoff([]);
    ['bills','assets','oneTimeBills','paySchedule','calendarConnected','propaneFills','emergencyFund','debtPayoff'].forEach(k=>localStorage.removeItem(k));
    setShowClearDataModal(false);
    window.location.reload();
  };

  /** toggles & history */
  const togglePaid = async (billId) => {
    const updated = bills.map(b => {
      if (b.id !== billId) return b;
      const nowPaid = !b.paidThisMonth;
      let nextDue = b.nextDueDate ? new Date(b.nextDueDate) : null;
      if (nowPaid && nextDue) {
        switch (b.frequency) {
          case 'monthly': nextDue = addMonthsSafe(nextDue, 1); break;
          case 'weekly': nextDue = addDays(nextDue, 7); break;
          case 'biweekly': nextDue = addDays(nextDue, 14); break;
          case 'quarterly': nextDue = addMonthsSafe(nextDue, 3); break;
          case 'annual': nextDue = addMonthsSafe(nextDue, 12); break;
          default: break;
        }
      }
      return {
        ...b,
        paidThisMonth: nowPaid,
        lastPaid: nowPaid ? new Date().toISOString() : b.lastPaid,
        lastPaidDate: nowPaid ? isoDate(new Date()) : b.lastPaidDate,
        nextDueDate: nextDue ? isoDate(nextDue) : b.nextDueDate
      };
    });
    await saveBills(updated);
  };

  const toggleOneTimePaid = async (billId) => {
    const updated = oneTimeBills.map(b =>
      b.id === billId ? { ...b, paid: !b.paid, paidDate: !b.paid ? new Date().toISOString() : null } : b
    );
    await saveOneTimeBills(updated);
  };

  const addHistoricalPayment = async (billId, payment) => {
    const updated = bills.map(b => {
      if (b.id !== billId) return b;
      const hist = [...(b.historicalPayments || []), payment].slice(-12);
      const avg = hist.reduce((s, p) => s + toMoney(p.amount), 0) / hist.length || 0;
      return { ...b, historicalPayments: hist, amount: Math.round(avg*100)/100, isVariable: true };
    });
    await saveBills(updated);
  };

  const deleteHistoricalPayment = async (billId, paymentIndex) => {
    const updated = bills.map(b => {
      if (b.id !== billId) return b;
      const hist = (b.historicalPayments||[]).filter((_,i)=>i!==paymentIndex);
      const avg = hist.length ? hist.reduce((s,p)=>s+toMoney(p.amount),0)/hist.length : toMoney(b.amount);
      return { ...b, historicalPayments: hist, amount: Math.round(avg*100)/100 };
    });
    await saveBills(updated);
  };

  /** amortization */
  const calculateAmortization = (asset) => {
    let principal = toMoney(asset.currentBalance || asset.loanAmount);
    const annualRate = (parseFloat(asset.interestRate) || 0) / 100;
    const payment = toMoney(asset.paymentAmount);
    let periodsPerYear = 12;
    switch(asset.paymentFrequency){
      case 'weekly': periodsPerYear=52; break;
      case 'biweekly': periodsPerYear=26; break;
      case 'quarterly': periodsPerYear=4; break;
      case 'annual': periodsPerYear=1; break;
      default: periodsPerYear=12;
    }
    const r = annualRate / periodsPerYear;
    if (payment <= principal * r) {
      return { schedule: [], totalInterest: 0, totalPayments: 0, payoffDate: asset.startDate };
    }
    const startDate = new Date(asset.startDate);
    const schedule = [];
    let period = 0; let totalInterest = 0;
    const round = v => Math.round(v*100)/100;

    while (principal > 0.01 && period < 2000) {
      period++;
      const interest = round(principal * r);
      let principalPay = round(payment - interest);
      if (principalPay <= 0) break;
      if (principalPay > principal) principalPay = principal;
      const totalPay = round(interest + principalPay);
      principal = round(principal - principalPay);
      let payDate = new Date(startDate);
      switch(asset.paymentFrequency){
        case 'weekly': payDate = addDays(payDate, 7*period); break;
        case 'biweekly': payDate = addDays(payDate, 14*period); break;
        case 'monthly': payDate = addMonthsSafe(payDate, period); break;
        case 'quarterly': payDate = addMonthsSafe(payDate, 3*period); break;
        case 'annual': payDate = addMonthsSafe(payDate, 12*period); break;
        default: payDate = addMonthsSafe(payDate, period);
      }
      totalInterest = round(totalInterest + interest);
      schedule.push({ period, date: isoDate(payDate), payment: totalPay, principal: principalPay, interest, balance: principal });
      if (period >= 1200) break;
    }
    return { schedule, totalInterest, totalPayments: period, payoffDate: schedule.at(-1)?.date };
  };

  /** calendar (demo) */
  const connectGoogleCalendar = async () => {
    const connected = !calendarConnected;
    setCalendarConnected(connected);
    setLS({ calendarConnected: connected });
    if (connected) window.alert('Calendar connected! (Demo)');
  };
  const syncToCalendar = async () => { window.alert('Syncing... (Demo)'); };

  /** paycheck assignments (pure, no mutation) */
  const computePayDates = useCallback((ps, count=4) => {
    if (!ps?.nextPayDate) return [];
    const dates = [];
    let cur = new Date(ps.nextPayDate);
    for (let i=0;i<count;i++){
      dates.push(new Date(cur));
      switch(ps.frequency){
        case 'weekly': cur = addDays(cur, 7); break;
        case 'biweekly': cur = addDays(cur, 14); break;
        case 'semimonthly': cur = nextSemiMonthly(addDays(cur, 1), ps.anchors); break;
        case 'monthly': cur = addMonthsSafe(cur, 1); break;
        default: cur = addMonthsSafe(cur, 1);
      }
    }
    return dates;
  },[]);

  const getPaycheckAssignments = useCallback((allBills, ps) => {
    if (!ps?.nextPayDate) return { check1:[], check2:[], payDates:[] };
    const [check1Date, check2Date] = computePayDates(ps, 2);
    const byCheck = { check1: [], check2: [] };

    allBills.forEach(bill => {
      const dueDay = parseInt(bill.dueDate);
      if (bill.payFromCheck === 'check1') { byCheck.check1.push(bill); return; }
      if (bill.payFromCheck === 'check2') { byCheck.check2.push(bill); return; }

      const c1 = new Date(check1Date); const c2 = new Date(check2Date);
      const d1 = new Date(c1.getFullYear(), c1.getMonth(), Math.min(dueDay, 28));
      const d2 = new Date(c2.getFullYear(), c2.getMonth(), Math.min(dueDay, 28));
      if (dueDay < c1.getDate()) d1.setMonth(d1.getMonth()+1);
      if (dueDay < c2.getDate()) d2.setMonth(d2.getMonth()+1);
      const origCheck = (c1 < d1 && d1 <= c2) ? 'check1' : 'check2';
      byCheck[origCheck].push({ ...bill, effectiveDueDate: origCheck==='check1' ? isoDate(d1) : isoDate(d2) });
    });

    // simple balance (no mutation of originals)
    const perCheck = toMoney(ps.payAmount);
    const sum = arr => arr.reduce((s,b)=>s+toMoney(b.amount),0);
    let c1Tot = sum(byCheck.check1), c2Tot = sum(byCheck.check2);
    let l1 = perCheck - c1Tot, l2 = perCheck - c2Tot;

    if (l1 - l2 > 200) {
      const movable = byCheck.check2.filter(b => !b.autopay && b.payFromCheck==='auto' && parseInt(b.dueDate) > (check1Date?.getDate()||0));
      let best = null; let bestDiff = Infinity;
      movable.forEach(b=>{
        const amt = toMoney(b.amount);
        const nl1 = l1 - amt, nl2 = l2 + amt;
        const nd = Math.abs(nl1 - nl2);
        if (nd < Math.abs(l1 - l2) && nd <= 200 && nd < bestDiff) { best = b; bestDiff = nd; }
      });
      if (best) {
        byCheck.check2 = byCheck.check2.filter(b=>b.id!==best.id);
        byCheck.check1 = [...byCheck.check1, best];
      }
    }

    return { check1: byCheck.check1, check2: byCheck.check2, payDates: [check1Date, check2Date] };
  }, [computePayDates]);

  /** overview */
  const calculateOverview = useCallback((allBills, otBills, ps) => {
    const monthlyBills = allBills.reduce((sum, bill) => {
      const amt = toMoney(bill.amount);
      switch(bill.frequency){
        case 'monthly': return sum + amt;
        case 'weekly': return sum + (amt * 4.33);
        case 'biweekly': return sum + (amt * 2.17);
        case 'quarterly': return sum + (amt / 3);
        case 'annual': return sum + (amt / 12);
        default: return sum;
      }
    }, 0);
    const upcomingOneTime = otBills.filter(b=>!b.paid).reduce((s,b)=>s+toMoney(b.amount),0);
    let monthlyIncome = 0, paychecksThisMonth = 0, nextPaycheckDate = null, daysUntilNextPaycheck = null;

    if (ps?.nextPayDate) {
      const today = new Date();
      const cm = today.getMonth(), cy = today.getFullYear();
      const payAmount = toMoney(ps.payAmount);
      const payDates = computePayDates(ps, 8);
      paychecksThisMonth = payDates.filter(d=>d.getMonth()===cm && d.getFullYear()===cy).length;
      monthlyIncome = payAmount * paychecksThisMonth;
      nextPaycheckDate = payDates.find(d=>d >= today) || null;
      if (nextPaycheckDate) {
        const diff = nextPaycheckDate.getTime() - today.getTime();
        daysUntilNextPaycheck = Math.ceil(diff/(1000*3600*24));
      }
    }
    const leftover = monthlyIncome - monthlyBills;
    return { monthlyBills, totalMonthly: monthlyBills, upcomingOneTime, monthlyIncome, leftover, paychecksThisMonth, nextPaycheckDate, daysUntilNextPaycheck };
  }, [computePayDates]);

  const assignments = useMemo(() => getPaycheckAssignments(bills, paySchedule), [bills, paySchedule, getPaycheckAssignments]);
  const overview = useMemo(() => calculateOverview(bills, oneTimeBills, paySchedule), [bills, oneTimeBills, paySchedule, calculateOverview]);

  /** ---- Forms (small UX polish: Esc closes, currency formatting) ---- */
  const ModalShell = ({ title, onClose, children, w='max-w-md' }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onKeyDown={(e)=>e.key==='Escape'&&onClose()} tabIndex={-1}>
      <div className={`bg-white rounded-2xl shadow-2xl ${w} w-full max-h-[90vh] overflow-y-auto`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">{title}</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg" aria-label="Close modal">
              <X size={20} />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );

  const BillForm = ({ bill, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState(bill || { name:'', amount:'', dueDate:'', frequency:'monthly', category:'utilities', autopay:false, isVariable:false, payFromCheck:'auto' });
    const historicalCount = bill?.historicalPayments?.length || 0;
    const isVariableBill = formData.isVariable || historicalCount > 0;
    const handleSubmit = (e) => { e.preventDefault(); onSubmit(formData); };
    return (
      <ModalShell title={bill ? 'Edit Bill' : 'Add New Bill'} onClose={onCancel}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Bill Name</label>
            <input type="text" value={formData.name} onChange={(e)=>setFormData({...formData, name:e.target.value})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none" required />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <input type="checkbox" id="isVariable" checked={formData.isVariable} onChange={(e)=>setFormData({...formData, isVariable:e.target.checked})} className="w-5 h-5" />
            <label htmlFor="isVariable" className="text-sm font-semibold">Variable amount</label>
          </div>
          {isVariableBill && historicalCount > 0 && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3">
              <p className="text-sm text-blue-800">📊 Estimated: {fmtMoney.format(toMoney(formData.amount))} (based on {historicalCount} month{historicalCount!==1?'s':''})</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold mb-2">{isVariableBill ? 'Estimated Amount' : 'Amount'}</label>
            <input type="number" step="0.01" value={formData.amount} onChange={(e)=>setFormData({...formData, amount:e.target.value})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none" required />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Due Date (Day of Month)</label>
            <input type="number" min="1" max="31" value={formData.dueDate} onChange={(e)=>setFormData({...formData, dueDate:e.target.value})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none" required />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Frequency</label>
            <select value={formData.frequency} onChange={(e)=>setFormData({...formData, frequency:e.target.value})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none">
              <option value="weekly">Weekly</option><option value="biweekly">Bi-weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annual">Annual</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Category</label>
            <select value={formData.category} onChange={(e)=>setFormData({...formData, category:e.target.value})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none">
              <option value="utilities">Utilities</option><option value="subscription">Subscription</option><option value="insurance">Insurance</option><option value="loan">Loan</option><option value="rent">Rent/Mortgage</option><option value="other">Other</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="autopay" checked={formData.autopay} onChange={(e)=>setFormData({...formData, autopay:e.target.checked})} className="w-5 h-5" />
            <label htmlFor="autopay" className="text-sm font-semibold">Auto-pay enabled</label>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Pay From Paycheck</label>
            <select value={formData.payFromCheck} onChange={(e)=>setFormData({...formData, payFromCheck:e.target.value})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none">
              <option value="auto">Auto</option><option value="check1">First Paycheck</option><option value="check2">Second Paycheck</option>
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onCancel} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold">{bill ? 'Update' : 'Add'} Bill</button>
          </div>
        </form>
      </ModalShell>
    );
  };

  const AssetForm = ({ asset, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState(asset || { name:'', type:'mortgage', loanAmount:'', currentBalance:'', loanTerm:'', interestRate:'', paymentAmount:'', paymentFrequency:'monthly', startDate: isoDate(new Date()), createBill:true });
    const handleSubmit = (e) => { e.preventDefault(); onSubmit(formData); };
    return (
      <ModalShell title={asset ? 'Edit Asset' : 'Add New Asset'} onClose={onCancel}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-semibold mb-2">Asset Name</label>
            <input type="text" value={formData.name} onChange={(e)=>setFormData({...formData, name:e.target.value})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none" required />
          </div>
          <div><label className="block text-sm font-semibold mb-2">Type</label>
            <select value={formData.type} onChange={(e)=>setFormData({...formData, type:e.target.value})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none">
              <option value="mortgage">Mortgage</option><option value="auto">Auto Loan</option><option value="student">Student Loan</option><option value="personal">Personal Loan</option><option value="credit">Credit Card</option><option value="other">Other</option>
            </select>
          </div>
          <div><label className="block text-sm font-semibold mb-2">Total Loan Amount</label>
            <input type="number" step="0.01" value={formData.loanAmount} onChange={(e)=>setFormData({...formData, loanAmount:e.target.value})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none" required />
          </div>
          <div><label className="block text-sm font-semibold mb-2">Current Balance Remaining</label>
            <input type="number" step="0.01" value={formData.currentBalance} onChange={(e)=>setFormData({...formData, currentBalance:e.target.value})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none" required />
          </div>
          <div><label className="block text-sm font-semibold mb-2">Loan Term (months)</label>
            <input type="number" value={formData.loanTerm} onChange={(e)=>setFormData({...formData, loanTerm:e.target.value})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none" required />
          </div>
          <div><label className="block text-sm font-semibold mb-2">Interest Rate (%)</label>
            <input type="number" step="0.01" value={formData.interestRate} onChange={(e)=>setFormData({...formData, interestRate:e.target.value})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none" required />
          </div>
          <div><label className="block text-sm font-semibold mb-2">Payment Amount</label>
            <input type="number" step="0.01" value={formData.paymentAmount} onChange={(e)=>setFormData({...formData, paymentAmount:e.target.value})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none" required />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="createBill" checked={formData.createBill} onChange={(e)=>setFormData({...formData, createBill:e.target.checked})} className="w-5 h-5" />
            <label htmlFor="createBill" className="text-sm font-semibold">Add as recurring bill</label>
          </div>
          <div><label className="block text-sm font-semibold mb-2">Payment Frequency</label>
            <select value={formData.paymentFrequency} onChange={(e)=>setFormData({...formData, paymentFrequency:e.target.value})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none">
              <option value="weekly">Weekly</option><option value="biweekly">Bi-weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annual">Annual</option>
            </select>
          </div>
          <div><label className="block text-sm font-semibold mb-2">Start Date</label>
            <input type="date" value={formData.startDate} onChange={(e)=>setFormData({...formData, startDate:e.target.value})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none" required />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onCancel} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold">{asset ? 'Update' : 'Add'} Asset</button>
          </div>
        </form>
      </ModalShell>
    );
  };

  const OneTimeBillForm = ({ bill, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState(bill || { name:'', amount:'', dueDate:'', description:'' });
    const handleSubmit = (e) => { e.preventDefault(); onSubmit(formData); };
    return (
      <ModalShell title={bill ? 'Edit One-Time Bill' : 'Add One-Time Bill'} onClose={onCancel}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-semibold mb-2">Bill Name</label>
            <input type="text" value={formData.name} onChange={(e)=>setFormData({...formData, name:e.target.value})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none" required />
          </div>
          <div><label className="block text-sm font-semibold mb-2">Amount</label>
            <input type="number" step="0.01" value={formData.amount} onChange={(e)=>setFormData({...formData, amount:e.target.value})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none" required />
          </div>
          <div><label className="block text-sm font-semibold mb-2">Due Date</label>
            <input type="date" value={formData.dueDate} onChange={(e)=>setFormData({...formData, dueDate:e.target.value})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none" required />
          </div>
          <div><label className="block text-sm font-semibold mb-2">Description (Optional)</label>
            <textarea value={formData.description} onChange={(e)=>setFormData({...formData, description:e.target.value})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none" rows="3" />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onCancel} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold">{bill ? 'Update' : 'Add'} Bill</button>
          </div>
        </form>
      </ModalShell>
    );
  };

  const PayScheduleForm = ({ schedule, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState(schedule || { frequency:'biweekly', payAmount:'', nextPayDate:'', anchors:[] });
    const handleSubmit = (e) => { e.preventDefault(); onSubmit(formData); onCancel(); };
    return (
      <ModalShell title="Pay Schedule" onClose={onCancel}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-semibold mb-2">Pay Frequency</label>
            <select value={formData.frequency} onChange={(e)=>setFormData({...formData, frequency:e.target.value})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none">
              <option value="weekly">Weekly</option><option value="biweekly">Bi-weekly</option><option value="semimonthly">Semi-monthly</option><option value="monthly">Monthly</option>
            </select>
          </div>
          <div><label className="block text-sm font-semibold mb-2">Pay Amount (per paycheck)</label>
            <input type="number" step="0.01" value={formData.payAmount} onChange={(e)=>setFormData({...formData, payAmount:e.target.value})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none" required />
          </div>
          <div><label className="block text-sm font-semibold mb-2">Next Pay Date</label>
            <input type="date" value={formData.nextPayDate} onChange={(e)=>setFormData({...formData, nextPayDate:e.target.value})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none" required />
            <p className="text-xs text-slate-500 mt-1">When is your next paycheck?</p>
          </div>
          {formData.frequency==='semimonthly' && (
            <div>
              <label className="block text-sm font-semibold mb-2">Anchors (optional)</label>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={formData.anchors?.[0]||''} onChange={(e)=>setFormData({...formData, anchors:[e.target.value, formData.anchors?.[1]||'']})} className="px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none" />
                <input type="date" value={formData.anchors?.[1]||''} onChange={(e)=>setFormData({...formData, anchors:[formData.anchors?.[0]||'', e.target.value]})} className="px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none" />
              </div>
              <p className="text-xs text-slate-500 mt-1">If blank, defaults to 1st & 15th each month.</p>
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onCancel} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold">Save Schedule</button>
          </div>
        </form>
      </ModalShell>
    );
  };

  const HistoricalPaymentsForm = ({ bill, onClose }) => {
    const [newPayment, setNewPayment] = useState({ date:'', amount:'' });
    const handleAddPayment = (e) => {
      e.preventDefault();
      const currentPayments = bill.historicalPayments || [];
      if (currentPayments.length >= 12) { window.alert('Max 12 months'); return; }
      addHistoricalPayment(bill.id, newPayment); setNewPayment({ date:'', amount:'' });
    };
    const hist = bill.historicalPayments || [];
    const average = hist.length ? hist.reduce((s,p)=>s+toMoney(p.amount),0)/hist.length : 0;
    return (
      <ModalShell title={`Payment History - ${bill.name}`} onClose={onClose} w="max-w-2xl">
        {/* estimate */}
        {hist.length>0 && (
          <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-blue-50 border-2 border-emerald-200 rounded-xl">
            <p className="text-sm text-slate-600 mb-1">Current Estimated Amount</p>
            <p className="text-3xl font-black text-emerald-600">{fmtMoney.format(average)}</p>
            <p className="text-xs text-slate-500 mt-1">Based on {hist.length} month{hist.length!==1?'s':''}</p>
          </div>
        )}
        {/* add */}
        <form onSubmit={handleAddPayment} className="mb-6 p-4 bg-slate-50 rounded-xl">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Plus size={18}/>Add Payment ({12 - hist.length} slots remaining)</h3>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-slate-600 mb-1">Payment Date</label>
              <input type="date" value={newPayment.date} onChange={(e)=>setNewPayment({...newPayment, date:e.target.value})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none" required />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-slate-600 mb-1">Amount Paid</label>
              <input type="number" step="0.01" value={newPayment.amount} onChange={(e)=>setNewPayment({...newPayment, amount:e.target.value})} className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none" required />
            </div>
            <button type="submit" className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold self-end" disabled={hist.length>=12}>Add</button>
          </div>
          {hist.length>=12 && <p className="text-xs text-amber-600 mt-2">Max 12 months reached.</p>}
        </form>
        {/* list */}
        <div className="space-y-2">
          <h3 className="font-semibold mb-3">Payment History</h3>
          {hist.length>0 ? (
            <div className="space-y-2">
              {[...hist].sort((a,b)=>new Date(b.date)-new Date(a.date)).map((p,idx)=>{
                const originalIdx = hist.findIndex(x=>x===p);
                return (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 rounded-lg"><Calendar size={16} className="text-emerald-600"/></div>
                      <div>
                        <span className="font-semibold">{new Date(p.date).toLocaleDateString('en-US',{month:'long',year:'numeric'})}</span>
                        <span className="ml-4 text-slate-600">{fmtMoney.format(toMoney(p.amount))}</span>
                      </div>
                    </div>
                    <button onClick={()=>deleteHistoricalPayment(bill.id, originalIdx)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 size={18}/></button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 bg-slate-50 rounded-xl">
              <BarChart3 className="mx-auto mb-3 text-slate-300" size={48} />
              <p className="text-slate-500 font-semibold">No historical payments yet</p>
            </div>
          )}
        </div>
        {/* stats */}
        {hist.length>1 && (
          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="p-3 bg-blue-50 rounded-xl text-center">
              <p className="text-xs text-slate-600">Lowest</p>
              <p className="text-lg font-bold text-blue-600">{fmtMoney.format(Math.min(...hist.map(p=>toMoney(p.amount))))}</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-center">
              <p className="text-xs text-slate-600">Average</p>
              <p className="text-lg font-bold text-emerald-600">{fmtMoney.format(average)}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-xl text-center">
              <p className="text-xs text-slate-600">Highest</p>
              <p className="text-lg font-bold text-red-600">{fmtMoney.format(Math.max(...hist.map(p=>toMoney(p.amount))))}</p>
            </div>
          </div>
        )}
      </ModalShell>
    );
  };

  const AmortizationView = ({ asset, onClose }) => {
    const amortization = calculateAmortization(asset);
    const [showAll, setShowAll] = useState(false);
    const rows = showAll ? amortization.schedule : amortization.schedule.slice(0, 200);
    return (
      <ModalShell title={`Amortization Schedule - ${asset.name}`} onClose={onClose} w="max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-emerald-50 p-4 rounded-xl">
            <p className="text-sm text-slate-600">Total Interest</p>
            <p className="text-2xl font-bold text-emerald-700">{fmtMoney.format(amortization.totalInterest)}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-xl">
            <p className="text-sm text-slate-600">Total Payments</p>
            <p className="text-2xl font-bold text-blue-700">{amortization.totalPayments}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-xl">
            <p className="text-sm text-slate-600">Payoff Date</p>
            <p className="text-2xl font-bold text-purple-700">{amortization.payoffDate ? new Date(amortization.payoffDate).toLocaleDateString() : '-'}</p>
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
              {rows.map(row=>(
                <tr key={row.period} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2">{row.period}</td>
                  <td className="px-4 py-2">{new Date(row.date).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-right">{fmtMoney.format(row.payment)}</td>
                  <td className="px-4 py-2 text-right">{fmtMoney.format(row.principal)}</td>
                  <td className="px-4 py-2 text-right">{fmtMoney.format(row.interest)}</td>
                  <td className="px-4 py-2 text-right font-semibold">{fmtMoney.format(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {amortization.schedule.length>200 && (
            <div className="mt-3 text-center">
              <button onClick={()=>setShowAll(!showAll)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold">
                {showAll ? 'Show first 200' : `Show all (${amortization.schedule.length})`}
              </button>
            </div>
          )}
        </div>
      </ModalShell>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 flex items-center justify-center">
        <div className="text-white text-2xl font-bold tracking-wide">Loading…</div>
      </div>
    );
  }

  /** ---------- UI ---------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-1 tracking-tight">PayPlan Pro</h1>
            <p className="text-emerald-100 text-lg">Your complete financial planning dashboard</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            ['dashboard', <Home size={20} key="i"/>, 'Dashboard'],
            ['bills', <Receipt size={20} key="i"/>, 'Bills'],
            ['assets', <Building2 size={20} key="i"/>, 'Assets'],
            ['onetime', <Calendar size={20} key="i"/>, 'One-Time'],
            ['propane', <Flame size={20} key="i"/>, 'Propane'],
            ['analytics', <BarChart3 size={20} key="i"/>, 'Analytics'],
            ['settings', <Settings size={20} key="i"/>, 'Settings']
          ].map(([id, icon, label])=>(
            <button key={id} onClick={()=>setView(id)}
              className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-white/60 ${view===id ? 'bg-white text-emerald-700 shadow-lg' : 'bg-white/15 text-white hover:bg-white/25'}`}
              aria-pressed={view===id}>
              {icon}{label}
            </button>
          ))}
        </div>

        {/* Dashboard */}
        {view === 'dashboard' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-emerald-100 rounded-xl"><DollarSign className="text-emerald-600" size={24}/></div>
                  <div className="flex-1">
                    <p className="text-slate-500 text-sm">{new Date().toLocaleDateString('en-US', { month:'long' })} Income</p>
                    <p className="text-3xl font-black text-slate-800">{fmtMoney.format(overview.monthlyIncome)}</p>
                    {overview.paychecksThisMonth>0 && <p className="text-xs text-slate-500 mt-1">{overview.paychecksThisMonth} paycheck{overview.paychecksThisMonth!==1?'s':''} this month</p>}
                  </div>
                </div>
                {overview.nextPaycheckDate && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-500">Next paycheck:</p>
                    <p className="text-sm font-semibold text-emerald-600">
                      {overview.nextPaycheckDate.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })}
                      {overview.daysUntilNextPaycheck!=null && <span className="text-slate-500 ml-1">({overview.daysUntilNextPaycheck} day{overview.daysUntilNextPaycheck!==1?'s':''})</span>}
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-red-100 rounded-xl"><TrendingUp className="text-red-600" size={24}/></div>
                  <div>
                    <p className="text-slate-500 text-sm">Monthly Expenses</p>
                    <p className="text-3xl font-black text-slate-800">{fmtMoney.format(overview.totalMonthly)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-xl p-6">
                {(() => {
                  const check1Total = assignments.check1.reduce((s,b)=>s+toMoney(b.amount),0);
                  const check2Total = assignments.check2.reduce((s,b)=>s+toMoney(b.amount),0);
                  const perCheck = paySchedule ? toMoney(paySchedule.payAmount) : 0;
                  const leftover1 = perCheck - check1Total;
                  const leftover2 = perCheck - check2Total;
                  return (
                    <>
                      <h3 className="text-lg font-bold mb-3">Leftover Per Check</h3>
                      <div className="space-y-3">
                        <div className="p-3 bg-emerald-50 rounded-xl flex justify-between"><span className="text-sm text-slate-600">Check 1 Leftover</span><span className={`text-xl font-bold ${leftover1>=0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtMoney.format(leftover1)}</span></div>
                        <div className="p-3 bg-blue-50 rounded-xl flex justify-between"><span className="text-sm text-slate-600">Check 2 Leftover</span><span className={`text-xl font-bold ${leftover2>=0 ? 'text-blue-600' : 'text-red-600'}`}>{fmtMoney.format(leftover2)}</span></div>
                        <div className="p-3 bg-slate-50 rounded-xl border-2 border-slate-200 flex justify-between"><span className="text-sm font-semibold text-slate-700">Total Monthly</span><span className={`text-xl font-bold ${overview.leftover>=0 ? 'text-slate-800':'text-red-600'}`}>{fmtMoney.format(overview.leftover)}</span></div>
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
                  const check1Total = assignments.check1.reduce((s,b)=>s+toMoney(b.amount),0);
                  const check2Total = assignments.check2.reduce((s,b)=>s+toMoney(b.amount),0);
                  const today = new Date(); const cm=today.getMonth(); const cy=today.getFullYear();
                  const payDatesThisMonth = paySchedule?.nextPayDate ? computePayDates(paySchedule,8).filter(d=>d.getMonth()===cm && d.getFullYear()===cy) : [];
                  return (
                    <div className="space-y-3">
                      {payDatesThisMonth.length>0 && (
                        <div className="p-3 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl border-2 border-emerald-200">
                          <div className="text-xs text-slate-600 mb-2">📅 Pay dates this month:</div>
                          <div className="space-y-1">{payDatesThisMonth.map((d,idx)=>(<div key={idx} className="text-sm font-semibold text-slate-800">• {d.toLocaleDateString('en-US',{weekday:'long', month:'short', day:'numeric'})}</div>))}</div>
                        </div>
                      )}
                      <div className="p-3 bg-emerald-50 rounded-xl">
                        <div className="flex items-center justify-between mb-1"><span className="font-semibold text-slate-700">First Paycheck</span><span className="text-emerald-600 font-bold">{fmtMoney.format(check1Total)}</span></div>
                        <div className="text-xs text-slate-600">{assignments.check1.length} bills</div>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-xl">
                        <div className="flex items-center justify-between mb-1"><span className="font-semibold text-slate-700">Second Paycheck</span><span className="text-blue-600 font-bold">{fmtMoney.format(check2Total)}</span></div>
                        <div className="text-xs text-slate-600">{assignments.check2.length} bills</div>
                      </div>
                      {paySchedule && (
                        <div className="p-3 bg-slate-50 rounded-xl border-2 border-slate-200">
                          <div className="text-xs text-slate-500 mb-1">Per Paycheck Income</div>
                          <div className="text-2xl font-bold text-slate-800">{fmtMoney.format(toMoney(paySchedule.payAmount))}</div>
                          <div className="text-xs text-slate-600 mt-1">Leftover Check 1: {fmtMoney.format(toMoney(paySchedule.payAmount)-check1Total)} • Leftover Check 2: {fmtMoney.format(toMoney(paySchedule.payAmount)-check2Total)}</div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold mb-4">Assets Overview</h3>
                <div className="space-y-3">
                  {assets.slice(0,5).map(a=>(
                    <div key={a.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <span className="font-semibold">{a.name}</span>
                      <span className="text-slate-600">{fmtMoney.format(toMoney(a.paymentAmount))}</span>
                    </div>
                  ))}
                  {assets.length===0 && <p className="text-slate-500 text-center py-4">No assets added yet</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bills */}
        {view === 'bills' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">{billsViewMode==='monthly' ? new Date().toLocaleDateString('en-US', { month:'long', year:'numeric' }) + ' Bills' : 'Bill Stream'}</h2>
              <div className="flex gap-3">
                <div className="flex bg-white/20 rounded-xl p-1">
                  <button onClick={()=>setBillsViewMode('monthly')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${billsViewMode==='monthly' ? 'bg-white text-emerald-600' : 'text-white hover:bg-white/20'}`} aria-pressed={billsViewMode==='monthly'}>Monthly</button>
                  <button onClick={()=>setBillsViewMode('stream')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${billsViewMode==='stream' ? 'bg-white text-emerald-600' : 'text-white hover:bg-white/20'}`} aria-pressed={billsViewMode==='stream'}>Stream</button>
                </div>
                {billsViewMode==='monthly' && (
                  <button onClick={resetMonthlyBills} className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-xl font-semibold shadow-lg transition-colors flex items-center gap-2">
                    <RefreshCw size={20}/>Reset Month
                  </button>
                )}
                <button onClick={()=>setShowBillForm(true)} className="px-6 py-3 bg-white hover:bg-emerald-50 text-emerald-700 rounded-xl font-semibold shadow-lg transition-colors flex items-center gap-2">
                  <Plus size={20}/>Add Bill
                </button>
              </div>
            </div>

            {/* Monthly Checklist */}
            {billsViewMode==='monthly' && bills.length>0 && (() => {
              const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-US', { month:'short', day:'numeric' }) : '';
              return (
                <div className="space-y-6">
                  {/* Check 1 */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={()=>setCollapseCheck1(!collapseCheck1)}>
                      <h3 className="text-2xl font-bold text-white flex items-center gap-2"><DollarSign size={24}/>{assignments.payDates[0] && formatDate(assignments.payDates[0])}</h3>
                      <ChevronRight size={24} className={`text-white transition-transform ${collapseCheck1 ? '' : 'rotate-90'}`} />
                    </div>
                    {!collapseCheck1 && (
                      <>
                        <p className="text-white/70 text-sm mb-6">Bills to pay with your next paycheck</p>
                        <div className="grid grid-cols-1 gap-4">
                          {assignments.check1.map(bill=>(
                            <div key={bill.id} className="bg-white rounded-xl shadow-lg p-4">
                              <div className="flex items-start gap-3">
                                <button
                                  onClick={()=>togglePaid(bill.id)}
                                  className={`p-2 rounded-lg transition-colors flex-shrink-0 ${bill.paidThisMonth ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                  aria-pressed={!!bill.paidThisMonth}>
                                  <Check size={20}/>
                                </button>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <h3 className={`text-lg font-bold ${bill.paidThisMonth ? 'text-green-600 line-through' : 'text-slate-800'}`}>{bill.name}</h3>
                                    {bill.isVariable && <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">VARIABLE</span>}
                                    {bill.autopay && <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">AUTO-PAY</span>}
                                  </div>
                                  <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                                    <span className="flex items-center gap-1"><DollarSign size={14}/>{fmtMoney.format(toMoney(bill.amount))}</span>
                                    <span className="flex items-center gap-1"><Calendar size={14}/>Due: Day {bill.dueDate}</span>
                                    <span className="flex items-center gap-1"><Clock size={14}/>{bill.frequency}</span>
                                  </div>
                                </div>
                                <div className="flex gap-2 flex-shrink-0">
                                  {!bill.autopay && bill.payFromCheck==='auto' && parseInt(bill.dueDate) > (assignments.payDates[0]?.getDate()||0) && (
                                    <button onClick={()=>{
                                      const updated = bills.map(b=>b.id===bill.id ? { ...b, payFromCheck:'check2' } : b);
                                      setBills(updated); setLS({ bills: updated });
                                    }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Move to Check 2"><ChevronRight size={16}/></button>
                                  )}
                                  {bill.payFromCheck==='check1' && (
                                    <button onClick={()=>{
                                      const updated = bills.map(b=>b.id===bill.id ? { ...b, payFromCheck:'auto' } : b);
                                      setBills(updated); setLS({ bills: updated });
                                    }} className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg" title="Reset to Auto"><RefreshCw size={16}/></button>
                                  )}
                                  {bill.isVariable && <button onClick={()=>setShowHistoricalForm(bill)} className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg" title="View payment history"><BarChart3 size={16}/></button>}
                                  <button onClick={()=>setEditingBill(bill)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16}/></button>
                                  <button onClick={()=>deleteBill(bill.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                                </div>
                              </div>
                            </div>
                          ))}
                          {assignments.check1.length===0 && <p className="text-white/70 text-center py-8 text-sm">No bills due before your next paycheck</p>}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Check 2 */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={()=>setCollapseCheck2(!collapseCheck2)}>
                      <h3 className="text-2xl font-bold text-white flex items-center gap-2"><DollarSign size={24}/>{assignments.payDates[1] && formatDate(assignments.payDates[1])}</h3>
                      <ChevronRight size={24} className={`text-white transition-transform ${collapseCheck2 ? '' : 'rotate-90'}`} />
                    </div>
                    {!collapseCheck2 && (
                      <>
                        <p className="text-white/70 text-sm mb-6">Bills to pay with your following paycheck</p>
                        <div className="grid grid-cols-1 gap-4">
                          {assignments.check2.map(bill=>(
                            <div key={bill.id} className="bg-white rounded-xl shadow-lg p-4">
                              <div className="flex items-start gap-3">
                                <button onClick={()=>togglePaid(bill.id)} className={`p-2 rounded-lg transition-colors flex-shrink-0 ${bill.paidThisMonth ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`} aria-pressed={!!bill.paidThisMonth}><Check size={20}/></button>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <h3 className={`text-lg font-bold ${bill.paidThisMonth ? 'text-green-600 line-through' : 'text-slate-800'}`}>{bill.name}</h3>
                                    {bill.isVariable && <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">VARIABLE</span>}
                                    {bill.autopay && <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">AUTO-PAY</span>}
                                  </div>
                                  <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                                    <span className="flex items-center gap-1"><DollarSign size={14}/>{fmtMoney.format(toMoney(bill.amount))}</span>
                                    <span className="flex items-center gap-1"><Calendar size={14}/>Due: Day {bill.dueDate}</span>
                                    <span className="flex items-center gap-1"><Clock size={14}/>{bill.frequency}</span>
                                  </div>
                                </div>
                                <div className="flex gap-2 flex-shrink-0">
                                  {!bill.autopay && bill.payFromCheck==='auto' && parseInt(bill.dueDate) > (assignments.payDates[0]?.getDate()||0) && (
                                    <button onClick={()=>{
                                      const updated = bills.map(b=>b.id===bill.id ? { ...b, payFromCheck:'check1' } : b);
                                      setBills(updated); setLS({ bills: updated });
                                    }} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Move to Check 1"><ChevronLeft size={16}/></button>
                                  )}
                                  {bill.payFromCheck==='check2' && (
                                    <button onClick={()=>{
                                      const updated = bills.map(b=>b.id===bill.id ? { ...b, payFromCheck:'auto' } : b);
                                      setBills(updated); setLS({ bills: updated });
                                    }} className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg" title="Reset to Auto"><RefreshCw size={16}/></button>
                                  )}
                                  {bill.isVariable && <button onClick={()=>setShowHistoricalForm(bill)} className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg" title="View payment history"><BarChart3 size={16}/></button>}
                                  <button onClick={()=>setEditingBill(bill)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16}/></button>
                                  <button onClick={()=>deleteBill(bill.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                                </div>
                              </div>
                            </div>
                          ))}
                          {assignments.check2.length===0 && <p className="text-white/70 text-center py-8 text-sm">No bills due before your second paycheck</p>}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Stream */}
            {billsViewMode==='stream' && bills.length>0 && (() => {
              if (!paySchedule?.nextPayDate) return (<div className="bg-white rounded-2xl shadow-xl p-8 text-center"><p className="text-slate-600">Set up your pay schedule first to see bill stream</p></div>);
              const paychecks = computePayDates(paySchedule, 3);
              const check3Bills = (() => {
                const [c1, c2, c3] = paychecks;
                return bills.filter(b=>{
                  if (b.payFromCheck==='check1' || b.payFromCheck==='check2') return false;
                  const dday = parseInt(b.dueDate);
                  const d2 = new Date(c2.getFullYear(), c2.getMonth(), Math.min(dday, 28));
                  if (dday < c2.getDate()) d2.setMonth(d2.getMonth()+1);
                  const d3 = new Date(c3.getFullYear(), c3.getMonth(), Math.min(dday, 28));
                  if (dday < c3.getDate()) d3.setMonth(d3.getMonth()+1);
                  const in2 = (d2 > c2 && d2 <= c3);
                  const in3 = (d3 > c2);
                  return !in2 && in3;
                });
              })();
              const streamData = [
                { paycheck: paychecks[0], bills: assignments.check1 },
                { paycheck: paychecks[1], bills: assignments.check2 },
                { paycheck: paychecks[2], bills: check3Bills }
              ];
              return (
                <div className="space-y-6">
                  {streamData.map(({paycheck, bills: assignedBills}, idx) => {
                    const total = assignedBills.reduce((s,b)=>s+toMoney(b.amount),0);
                    const perCheck = toMoney(paySchedule.payAmount);
                    const leftover = perCheck - total;
                    return (
                      <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-2xl font-bold text-white">{paycheck.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</h3>
                          <div className="text-right">
                            <p className="text-white/70 text-sm">Bills: {fmtMoney.format(total)}</p>
                            <p className={`text-lg font-bold ${leftover>=0 ? 'text-emerald-300' : 'text-red-300'}`}>Left: {fmtMoney.format(leftover)}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {assignedBills.map(bill=>(
                            <div key={bill.id + (bill.effectiveDueDate || bill.nextDueDate)} className="bg-white rounded-xl p-4 flex items-center gap-3">
                              <button onClick={()=>togglePaid(bill.id)} className={`p-2 rounded-lg transition-colors flex-shrink-0 ${bill.paidThisMonth ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`} aria-pressed={!!bill.paidThisMonth}><Check size={20}/></button>
                              <div className="flex-1">
                                <p className={`font-semibold ${bill.paidThisMonth ? 'line-through text-green-600' : 'text-slate-800'}`}>{bill.name}</p>
                                <p className="text-sm text-slate-600">{new Date(bill.effectiveDueDate || bill.nextDueDate).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <p className="text-lg font-bold text-slate-800">{fmtMoney.format(toMoney(bill.amount))}</p>
                                {bill.autopay && <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded">AUTO</span>}
                                <button onClick={()=>setEditingBill(bill)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16}/></button>
                              </div>
                            </div>
                          ))}
                          {assignedBills.length===0 && <p className="text-white/70 text-center py-4 text-sm">No bills due before next paycheck</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {bills.length===0 && (
              <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                <Receipt className="mx-auto mb-4 text-slate-300" size={64} />
                <h3 className="text-xl font-bold text-slate-800 mb-2">No Bills Yet</h3>
                <p className="text-slate-600 mb-6">Start by adding your first recurring bill</p>
                <button onClick={()=>setShowBillForm(true)} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold">Add Your First Bill</button>
              </div>
            )}
          </div>
        )}

        {/* Assets */}
        {view === 'assets' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-black text-white">Assets & Loans</h2>
              <button onClick={()=>setShowAssetForm(true)} className="px-6 py-3 bg-white hover:bg-emerald-50 text-emerald-700 rounded-xl font-semibold shadow-lg transition-colors flex items-center gap-2">
                <Plus size={20}/>Add Asset
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {assets.map(asset=>{
                const amort = calculateAmortization(asset);
                return (
                  <div key={asset.id} className="bg-white rounded-2xl shadow-xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-100 rounded-xl"><Building2 className="text-blue-600" size={24}/></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-2xl font-bold text-slate-800">{asset.name}</h3>
                          <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full uppercase">{asset.type}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div><p className="text-xs text-slate-500">Loan Amount</p><p className="text-lg font-bold text-slate-800">{fmtMoney.format(toMoney(asset.loanAmount))}</p></div>
                          <div><p className="text-xs text-slate-500">Payment</p><p className="text-lg font-bold text-slate-800">{fmtMoney.format(toMoney(asset.paymentAmount))}</p></div>
                          <div><p className="text-xs text-slate-500">Interest Rate</p><p className="text-lg font-bold text-slate-800">{(parseFloat(asset.interestRate)||0)}%</p></div>
                          <div><p className="text-xs text-slate-500">Payoff Date</p><p className="text-lg font-bold text-slate-800">{amort.payoffDate ? new Date(amort.payoffDate).toLocaleDateString() : '-'}</p></div>
                        </div>
                        <button onClick={()=>setShowAmortizationView(asset)} className="text-blue-600 hover:text-blue-700 font-semibold text-sm flex items-center gap-1">View Amortization Schedule<ChevronRight size={16}/></button>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={()=>setEditingAsset(asset)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={18}/></button>
                        <button onClick={()=>deleteAsset(asset.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {assets.length===0 && (
                <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                  <Building2 className="mx-auto mb-4 text-slate-300" size={64}/>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">No Assets Yet</h3>
                  <p className="text-slate-600 mb-6">Track loans, mortgages, and other financed assets</p>
                  <button onClick={()=>setShowAssetForm(true)} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold">Add Your First Asset</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* One-Time */}
        {view === 'onetime' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-black text-white">One-Time Bills</h2>
              <button onClick={()=>setShowOneTimeForm(true)} className="px-6 py-3 bg-white hover:bg-emerald-50 text-emerald-700 rounded-xl font-semibold shadow-lg transition-colors flex items-center gap-2">
                <Plus size={20}/>Add One-Time Bill
              </button>
            </div>

            <div className="mb-6 bg-white/20 backdrop-blur-sm rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-white" size={24}/>
                <div>
                  <p className="text-white font-semibold">Upcoming Total</p>
                  <p className="text-2xl font-black text-white">{fmtMoney.format(overview.upcomingOneTime)}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {oneTimeBills.length>0 ? oneTimeBills.map(bill=>{
                const dueDate = new Date(bill.dueDate);
                const today = new Date();
                const isOverdue = !bill.paid && dueDate < addDays(today,-1);
                return (
                  <div key={bill.id} className={`bg-white rounded-2xl shadow-xl p-6 ${isOverdue ? 'border-4 border-red-500' : ''}`}>
                    <div className="flex items-start gap-4">
                      <button onClick={()=>toggleOneTimePaid(bill.id)} className={`p-3 rounded-xl transition-colors ${bill.paid ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`} aria-pressed={!!bill.paid}><Check size={24}/></button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className={`text-xl font-bold ${bill.paid ? 'text-green-800 line-through':'text-slate-800'}`}>{bill.name}</h3>
                          {isOverdue && <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">OVERDUE</span>}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
                          <span className="flex items-center gap-1"><Calendar size={14}/>Due: {new Date(bill.dueDate).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1"><DollarSign size={14}/>{fmtMoney.format(toMoney(bill.amount))}</span>
                          {bill.paid && bill.paidDate && <span className="text-green-600 flex items-center gap-1"><Check size={14}/>Paid {new Date(bill.paidDate).toLocaleDateString()}</span>}
                        </div>
                        {bill.description && <p className="text-sm text-slate-600 italic">{bill.description}</p>}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={()=>setEditingOneTime(bill)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={18}/></button>
                        <button onClick={()=>deleteOneTimeBill(bill.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                  <Calendar className="mx-auto mb-4 text-slate-300" size={64}/>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">No One-Time Bills</h3>
                  <p className="text-slate-600 mb-6">Track non-recurring expenses like medical bills or repairs</p>
                  <button onClick={()=>setShowOneTimeForm(true)} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold">Add Your First One-Time Bill</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Propane */}
        {view === 'propane' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-black text-white">Propane Usage Tracker</h2>
              <button onClick={()=>setShowPropaneForm(true)} className="px-6 py-3 bg-white hover:bg-emerald-50 text-emerald-700 rounded-xl font-semibold shadow-lg transition-colors flex items-center gap-2">
                <Plus size={20}/>Add Fill
              </button>
            </div>

            {propaneFills.length>0 && (() => {
              const sorted = [...propaneFills].sort((a,b)=>new Date(b.date)-new Date(a.date));
              const latest = sorted[0];
              const totalGallons = sorted.reduce((s,f)=>s+toMoney(f.gallons),0);
              const totalCost = sorted.reduce((s,f)=>s+toMoney(f.totalCost),0);
              const avgPricePerGal = totalGallons>0 ? totalCost/totalGallons : 0;
              const fillsWithUsage = sorted.map((fill, idx) => {
                if (idx===sorted.length-1) return { ...fill, daysLasted:null, dailyUsage:null };
                const next = sorted[idx+1];
                const days = Math.max(1, Math.floor((new Date(fill.date)-new Date(next.date))/(1000*60*60*24)));
                const dailyUsage = toMoney(fill.gallons) / days;
                return { ...fill, daysLasted:days, dailyUsage };
              });
              return (
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl shadow-xl p-6">
                    <h3 className="text-xl font-bold mb-4">Latest Fill</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div><p className="text-sm text-slate-500">Date</p><p className="text-lg font-bold">{new Date(latest.date).toLocaleDateString()}</p></div>
                      <div><p className="text-sm text-slate-500">Gallons</p><p className="text-lg font-bold text-emerald-600">{latest.gallons}</p></div>
                      <div><p className="text-sm text-slate-500">Price/Gal</p><p className="text-lg font-bold">{fmtMoney.format(toMoney(latest.pricePerGal))}</p></div>
                      <div><p className="text-sm text-slate-500">Total Cost</p><p className="text-lg font-bold text-red-600">{fmtMoney.format(toMoney(latest.totalCost))}</p></div>
                    </div>
                    {fillsWithUsage[0].daysLasted && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-slate-600">Lasted <span className="font-bold">{fillsWithUsage[0].daysLasted} days</span> • Avg <span className="font-bold">{fillsWithUsage[0].dailyUsage.toFixed(1)} gal/day</span></p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-2xl shadow-xl p-6"><p className="text-sm text-slate-500 mb-1">Total Spent (All Time)</p><p className="text-3xl font-black text-red-600">{fmtMoney.format(totalCost)}</p></div>
                    <div className="bg-white rounded-2xl shadow-xl p-6"><p className="text-sm text-slate-500 mb-1">Total Gallons</p><p className="text-3xl font-black text-emerald-600">{totalGallons.toFixed(0)}</p></div>
                    <div className="bg-white rounded-2xl shadow-xl p-6"><p className="text-sm text-slate-500 mb-1">Avg Price/Gal</p><p className="text-3xl font-black text-slate-800">{fmtMoney.format(avgPricePerGal)}</p></div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-xl p-6">
                    <h3 className="text-xl font-bold mb-4">Fill History</h3>
                    <div className="space-y-2">
                      {fillsWithUsage.map(fill=>(
                        <div key={fill.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100">
                          <div className="flex-1">
                            <p className="font-semibold">{new Date(fill.date).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</p>
                            <p className="text-sm text-slate-600">
                              {fill.gallons} gal @ {fmtMoney.format(toMoney(fill.pricePerGal))}/gal = {fmtMoney.format(toMoney(fill.totalCost))}
                              {fill.daysLasted && ` • Lasted ${fill.daysLasted} days (${fill.dailyUsage.toFixed(1)} gal/day)`}
                            </p>
                          </div>
                          <button onClick={()=>deletePropaneFill(fill.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {propaneFills.length===0 && (
              <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                <Flame className="mx-auto mb-4 text-slate-300" size={64}/>
                <h3 className="text-xl font-bold text-slate-800 mb-2">No Fills Tracked Yet</h3>
                <p className="text-slate-600 mb-6">Start tracking your propane fills to see usage patterns and costs</p>
              </div>
            )}
          </div>
        )}

        {/* Analytics */}
        {view === 'analytics' && (
          <div>
            <h2 className="text-3xl font-black text-white mb-6">Financial Analytics</h2>
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
              <h3 className="text-xl font-bold mb-4">Income vs Expenses</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center p-4 bg-emerald-50 rounded-xl"><p className="text-xs text-slate-600 mb-1">Monthly Income</p><p className="text-xl md:text-2xl font-bold text-emerald-600 break-all">{fmtMoney.format(overview.monthlyIncome)}</p></div>
                <div className="text-center p-4 bg-red-50 rounded-xl"><p className="text-xs text-slate-600 mb-1">Monthly Expenses</p><p className="text-xl md:text-2xl font-bold text-red-600 break-all">{fmtMoney.format(overview.totalMonthly)}</p></div>
                <div className="text-center p-4 bg-blue-50 rounded-xl"><p className="text-xs text-slate-600 mb-1">Net Savings</p><p className={`text-xl md:text-2xl font-bold break-all ${overview.leftover>=0?'text-blue-600':'text-red-600'}`}>{fmtMoney.format(overview.leftover)}</p></div>
              </div>
              <div className="h-8 bg-slate-100 rounded-full overflow-hidden flex">
                <div className="bg-emerald-500 flex items-center justify-center text-white text-xs font-bold" style={{ width: `${Math.min(overview.monthlyIncome>0 ? (overview.totalMonthly/overview.monthlyIncome)*100 : 0, 100)}%` }}>
                  {overview.monthlyIncome>0 ? ((overview.totalMonthly/overview.monthlyIncome)*100).toFixed(0) : 0}%
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2 text-center">{overview.totalMonthly>overview.monthlyIncome ? '⚠️ Spending exceeds income' : '✓ Under budget'}</p>
            </div>

            {/* Emergency Fund */}
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Emergency Fund</h3>
                <button type="button" onClick={(e)=>{e.preventDefault(); const target = window.prompt('Target amount:', emergencyFund.target); const current = window.prompt('Current saved:', emergencyFund.current); if (target==null || current==null) return; const fund={target:toMoney(target), current:toMoney(current)}; setEmergencyFund(fund); setLS({emergencyFund:fund});}} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold">Update</button>
              </div>
              {emergencyFund.target>0 ? (
                <>
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2"><span className="text-slate-600">Progress: {fmtMoney.format(emergencyFund.current)} / {fmtMoney.format(emergencyFund.target)}</span><span className="font-bold text-emerald-600">{((emergencyFund.current/emergencyFund.target)*100).toFixed(0)}%</span></div>
                    <div className="h-6 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500" style={{ width: `${Math.min((emergencyFund.current/emergencyFund.target)*100, 100)}%` }} />
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">{emergencyFund.current>=emergencyFund.target ? '🎉 Goal reached!' : `${fmtMoney.format(emergencyFund.target-emergencyFund.current)} to go`}</p>
                </>
              ) : (<p className="text-slate-500 text-center py-4">Set your emergency fund goal to start tracking</p>)}
            </div>

            {/* Debt Payoff (simple) */}
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Debt Payoff Tracker</h3>
                <button type="button" onClick={(e)=>{e.preventDefault(); const name=window.prompt('Debt name:'); if(!name) return; const balance=window.prompt('Current balance:'); if(!balance) return; const rate=window.prompt('Interest rate %:'); if(!rate) return; const payment=window.prompt('Monthly payment:'); if(!payment) return; const debt={id:safeUUID(), name, balance:toMoney(balance), rate:parseFloat(rate)||0, payment:toMoney(payment)}; const upd=[...debtPayoff, debt]; setDebtPayoff(upd); setLS({debtPayoff:upd});}} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold">Add Debt</button>
              </div>
              {debtPayoff.length>0 ? (
                <div className="space-y-3">
                  {debtPayoff.map(debt=>{
                    const monthsToPayoff = debt.payment>0 ? Math.ceil(debt.balance/debt.payment) : 0;
                    const totalInterest = Math.max(0, (debt.payment*monthsToPayoff) - debt.balance);
                    return (
                      <div key={debt.id} className="p-4 bg-slate-50 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold">{debt.name}</span>
                          <button type="button" onClick={(e)=>{e.preventDefault(); const upd = debtPayoff.filter(d=>d.id!==debt.id); setDebtPayoff(upd); setLS({debtPayoff:upd});}} className="text-red-600 hover:bg-red-50 p-1 rounded"><X size={16}/></button>
                        </div>
                        <p className="text-sm text-slate-600">Balance: {fmtMoney.format(debt.balance)} @ {debt.rate}%</p>
                        <p className="text-sm text-slate-600">Payment: {fmtMoney.format(debt.payment)}/mo</p>
                        <p className="text-sm font-semibold text-emerald-600 mt-2">Payoff: {monthsToPayoff} months | Interest: {fmtMoney.format(totalInterest)}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (<p className="text-slate-500 text-center py-4">Add debts to track payoff timeline</p>)}
            </div>

            {/* Export */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold mb-4">Export Reports</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button type="button" onClick={(e)=>{e.preventDefault(); const csv = `PayPlan Pro Export - ${new Date().toLocaleDateString()}\n\nMonthly Income,${overview.monthlyIncome}\nMonthly Expenses,${overview.totalMonthly}\nNet Savings,${overview.leftover}\n\nBills:\nName,Amount,Due Date,Frequency\n` + bills.map(b=>`${b.name},${toMoney(b.amount)},${b.dueDate},${b.frequency}`).join('\n'); const blob = new Blob([csv],{type:'text/csv'}); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`payplan-export-${Date.now()}.csv`; a.click(); URL.revokeObjectURL(url); }} className="px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold">📊 Export CSV</button>
                <button type="button" onClick={(e)=>{e.preventDefault(); const data={ bills, assets, oneTimeBills, paySchedule, emergencyFund, debtPayoff, propaneFills }; const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`payplan-backup-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url); }} className="px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold">💾 Backup JSON</button>
              </div>
            </div>
          </div>
        )}

        {/* Settings */}
        {view === 'settings' && (
          <div>
            <div className="flex items-center gap-4 mb-6">
              <button onClick={()=>setView('dashboard')} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl"><Home className="text-white" size={24}/></button>
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
                  <button onClick={()=>setShowPayScheduleForm(true)} className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl font-semibold">{paySchedule ? 'Edit' : 'Set Up'}</button>
                </div>
                {paySchedule && (
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><span className="text-slate-500">Frequency:</span><span className="font-bold text-slate-800 ml-2 capitalize">{paySchedule.frequency}</span></div>
                      <div><span className="text-slate-500">Pay Amount:</span><span className="font-bold text-slate-800 ml-2">{fmtMoney.format(toMoney(paySchedule.payAmount))}</span></div>
                      {paySchedule.nextPayDate && <div className="col-span-2"><span className="text-slate-500">Next Pay Date:</span><span className="font-bold text-emerald-600 ml-2">{new Date(paySchedule.nextPayDate).toLocaleDateString('en-US',{weekday:'long', month:'long', day:'numeric'})}</span></div>}
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
                    {calendarConnected && <button onClick={syncToCalendar} className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl font-semibold flex items-center gap-2"><RefreshCw size={16}/>Sync Now</button>}
                    <button onClick={connectGoogleCalendar} className={`px-4 py-2 rounded-xl font-semibold ${calendarConnected ? 'bg-green-100 text-green-700' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>{calendarConnected ? '✓ Connected' : 'Connect'}</button>
                  </div>
                </div>
                {calendarConnected && <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4"><p className="text-green-800 text-sm">✓ Calendar is connected. Your bills and payment dates will sync automatically.</p></div>}
              </div>

              {/* Backup & Restore */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-slate-800">Backup & Restore</h3>
                  <p className="text-slate-600 text-sm">Export your data or restore from a backup file</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={exportBackup} className="flex-1 px-4 py-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl font-semibold flex items-center justify-center gap-2"><Download size={18}/>Export Backup</button>
                  <button onClick={()=>backupFileInputRef.current?.click()} className="flex-1 px-4 py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl font-semibold flex items-center justify-center gap-2"><Upload size={18}/>Restore Backup</button>
                  <input ref={backupFileInputRef} type="file" accept=".json" onChange={(e)=>{ const file = e.target.files?.[0]; if(file){ importBackupFromFile(file); e.target.value=''; } }} className="hidden"/>
                </div>
                <div className="mt-4 bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
                  <p className="text-amber-800 text-sm"><strong>Note:</strong> Backups contain all your bills, assets, one-time bills, and settings. Keep your backup files secure.</p>
                </div>
              </div>

              {/* Danger */}
              <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-red-200">
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-red-600">Danger Zone</h3>
                  <p className="text-slate-600 text-sm">Permanently delete all your data</p>
                </div>
                <button onClick={clearAllData} className="w-full px-4 py-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-semibold flex items-center justify-center gap-2"><Trash2 size={18}/>Clear All Data</button>
                <div className="mt-4 bg-red-50 border-2 border-red-200 rounded-xl p-4">
                  <p className="text-red-800 text-sm"><strong>⚠️ Warning:</strong> This will permanently delete ALL data. Make a backup first!</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showBillForm && <BillForm onSubmit={addBill} onCancel={()=>setShowBillForm(false)} />}
      {editingBill && <BillForm bill={editingBill} onSubmit={updateBill} onCancel={()=>setEditingBill(null)} />}
      {showAssetForm && <AssetForm onSubmit={addAsset} onCancel={()=>setShowAssetForm(false)} />}
      {editingAsset && <AssetForm asset={editingAsset} onSubmit={updateAsset} onCancel={()=>setEditingAsset(null)} />}
      {showOneTimeForm && <OneTimeBillForm onSubmit={addOneTimeBill} onCancel={()=>setShowOneTimeForm(false)} />}
      {editingOneTime && <OneTimeBillForm bill={editingOneTime} onSubmit={updateOneTimeBill} onCancel={()=>setEditingOneTime(null)} />}
      {showPayScheduleForm && <PayScheduleForm schedule={paySchedule} onSubmit={savePaySchedule} onCancel={()=>setShowPayScheduleForm(false)} />}
      {showHistoricalForm && <HistoricalPaymentsForm bill={showHistoricalForm} onClose={()=>setShowHistoricalForm(null)} />}
      {showAmortizationView && <AmortizationView asset={showAmortizationView} onClose={()=>setShowAmortizationView(null)} />}

      {/* Propane Fill Form */}
      {showPropaneForm && (
        <ModalShell title="Add Propane Fill" onClose={()=>setShowPropaneForm(false)}>
          <form onSubmit={(e)=>{ e.preventDefault(); const fd=new FormData(e.target); const gallons=toMoney(fd.get('gallons')); const pricePerGal=toMoney(fd.get('pricePerGal')); addPropaneFill({ date: fd.get('date'), gallons: gallons.toFixed(2), pricePerGal: pricePerGal.toFixed(2), totalCost: (gallons*pricePerGal).toFixed(2) }); setShowPropaneForm(false); }} className="space-y-4">
            <div><label className="block text-sm font-semibold mb-2">Fill Date</label><input type="date" name="date" required className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"/></div>
            <div><label className="block text-sm font-semibold mb-2">Gallons Delivered</label><input type="number" step="0.1" name="gallons" required className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"/></div>
            <div><label className="block text-sm font-semibold mb-2">Price per Gallon</label><input type="number" step="0.01" name="pricePerGal" required className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"/></div>
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={()=>setShowPropaneForm(false)} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold">Cancel</button>
              <button type="submit" className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold">Add Fill</button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Clear All Data Modal (kept) */}
      {showClearDataModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-100 rounded-full"><AlertCircle className="text-red-600" size={32}/></div>
                <h2 className="text-2xl font-bold text-red-600">Clear All Data?</h2>
              </div>
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
                <p className="text-red-800 font-semibold mb-2">⚠️ This will permanently delete:</p>
                <ul className="text-red-700 text-sm space-y-1 ml-4">
                  <li>• All recurring bills</li><li>• All assets and loans</li><li>• All one-time bills</li><li>• Your pay schedule</li><li>• All settings</li>
                </ul>
                <p className="text-red-800 font-semibold mt-3">This action cannot be undone!</p>
              </div>
              <div className="flex gap-3">
                <button onClick={()=>{setShowClearDataModal(false); setClearDataCountdown(5);}} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold">Cancel</button>
                <button onClick={confirmClearAllData} disabled={clearDataCountdown>0} className={`flex-1 px-4 py-3 rounded-xl font-semibold ${clearDataCountdown>0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white'}`}>{clearDataCountdown>0 ? `Wait ${clearDataCountdown}s…` : 'Yes, Delete Everything'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/** export wrapped with ConfirmProvider */
export default function AppWrapper(){
  return (
    <ConfirmProvider>
      <BillPayPlanner/>
    </ConfirmProvider>
  );
}