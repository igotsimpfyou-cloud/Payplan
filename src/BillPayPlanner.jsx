import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  DollarSign, Calendar, Plus, Check, AlertCircle, Trash2, Edit2, X, Clock, TrendingUp, Home, Settings, List,
  BarChart3, ChevronRight, ChevronLeft, RefreshCw, Building2, Receipt, Download, Upload, Flame
} from 'lucide-react';

/**
 * PayPlan Pro — Full merged file (instances model + original modules)
 * - billTemplates: recurring definitions (replaces legacy `bills`)
 * - billInstances: dated rows generated from templates (current month + 2 forward)
 * - Assignment: next 4 checks from paySchedule
 * - Checklist: current month
 * - Submit: variable bills "Actual Paid" (updates last year's same month history)
 * - Retire template: removes future instances from last paid onward
 * - Preserves: Assets + amortization, One-Time bills, Propane tracker, Analytics, Backup/Restore, Calendar placeholder
 */

// ---------- Utilities ----------
const toYMD = (d) => {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
const sameMonth = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
const idForInstance = (name, dueDate) => `${name.replace(/\s+/g, '_')}_${toYMD(dueDate)}`;
const parseAmt = (v) => parseFloat(v || 0) || 0;

// ---------- Storage Keys ----------
const LS_TEMPLATES = 'ppp.billTemplates';
const LS_INSTANCES = 'ppp.billInstances';
const LS_ASSETS = 'assets';
const LS_ONETIME = 'oneTimeBills';
const LS_PAY = 'paySchedule';
const LS_CAL = 'calendarConnected';
const LS_PROPANE = 'propaneFills';
const LS_EMERGENCY = 'emergencyFund';
const LS_DEBTS = 'debtPayoff';
const LS_ENVELOPES = 'ppp.envelopes';
const LS_BUDGETS = 'ppp.budgets';

// ---------- Components ----------
const BillPayPlanner = () => {
  const [view, setView] = useState('dashboard');

  // Core (instances model)
  const [billTemplates, setBillTemplates] = useState([]);
  const [billInstances, setBillInstances] = useState([]);

  // Original modules
  const [assets, setAssets] = useState([]);
  const [oneTimeBills, setOneTimeBills] = useState([]);
  const [paySchedule, setPaySchedule] = useState(null);
  const [propaneFills, setPropaneFills] = useState([]);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [emergencyFund, setEmergencyFund] = useState({ target: 0, current: 0 });
  const [debtPayoff, setDebtPayoff] = useState([]);
  const [envelopes, setEnvelopes] = useState([]);
  const [budgets, setBudgets] = useState({ utilities: 0, subscription: 0, insurance: 0, loan: 0, rent: 0, other: 0 });

  // UI modals
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showPayForm, setShowPayForm] = useState(false);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [showOneTimeForm, setShowOneTimeForm] = useState(false);
  const [editingOneTime, setEditingOneTime] = useState(null);
  const [showPropaneForm, setShowPropaneForm] = useState(false);
  const [showDebtForm, setShowDebtForm] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [loading, setLoading] = useState(true);

  // Backup / Restore
  const backupFileInputRef = useRef(null);

  // ---------- Load & migrate ----------
  useEffect(() => {
    try {
      const t = localStorage.getItem(LS_TEMPLATES);
      const i = localStorage.getItem(LS_INSTANCES);
      const a = localStorage.getItem(LS_ASSETS);
      const o = localStorage.getItem(LS_ONETIME);
      const p = localStorage.getItem(LS_PAY);
      const c = localStorage.getItem(LS_CAL);
      const pr = localStorage.getItem(LS_PROPANE);
      const e = localStorage.getItem(LS_EMERGENCY);
      const d = localStorage.getItem(LS_DEBTS);
      const env = localStorage.getItem(LS_ENVELOPES);
      const bud = localStorage.getItem(LS_BUDGETS);

      // MIGRATION: if old 'bills' exists, migrate to templates
      const legacyBills = localStorage.getItem('bills');
      if (!t && legacyBills) {
        const legacy = JSON.parse(legacyBills);
        const asTemplates = legacy.map(b => ({
          id: b.id || Date.now() + Math.random(),
          name: b.name,
          amount: parseAmt(b.amount),
          isVariable: !!b.isVariable,
          category: b.category || 'utilities',
          autopay: !!b.autopay,
          frequency: b.frequency || 'monthly',
          dueDay: parseInt(b.dueDate, 10),
          firstDueDate: b.nextDueDate || new Date().toISOString().split('T')[0],
          historicalPayments: b.historicalPayments || []
        }));
        localStorage.setItem(LS_TEMPLATES, JSON.stringify(asTemplates));
        localStorage.removeItem('bills');
      }

      if (localStorage.getItem(LS_TEMPLATES)) setBillTemplates(JSON.parse(localStorage.getItem(LS_TEMPLATES)));
      if (i) setBillInstances(JSON.parse(i));
      if (a) setAssets(JSON.parse(a));
      if (o) setOneTimeBills(JSON.parse(o));
      if (p) setPaySchedule(JSON.parse(p));
      if (c) setCalendarConnected(JSON.parse(c));
      if (pr) setPropaneFills(JSON.parse(pr));
      if (e) setEmergencyFund(JSON.parse(e));
      if (d) setDebtPayoff(JSON.parse(d));
      if (env) setEnvelopes(JSON.parse(env));
      if (bud) setBudgets(JSON.parse(bud));
    } catch (err) {
      console.warn('Load error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------- Persist ----------
  useEffect(() => localStorage.setItem(LS_TEMPLATES, JSON.stringify(billTemplates)), [billTemplates]);
  useEffect(() => localStorage.setItem(LS_INSTANCES, JSON.stringify(billInstances)), [billInstances]);
  useEffect(() => localStorage.setItem(LS_ASSETS, JSON.stringify(assets)), [assets]);
  useEffect(() => localStorage.setItem(LS_ONETIME, JSON.stringify(oneTimeBills)), [oneTimeBills]);
  useEffect(() => localStorage.setItem(LS_PAY, JSON.stringify(paySchedule)), [paySchedule]);
  useEffect(() => localStorage.setItem(LS_CAL, JSON.stringify(calendarConnected)), [calendarConnected]);
  useEffect(() => localStorage.setItem(LS_PROPANE, JSON.stringify(propaneFills)), [propaneFills]);
  useEffect(() => localStorage.setItem(LS_EMERGENCY, JSON.stringify(emergencyFund)), [emergencyFund]);
  useEffect(() => localStorage.setItem(LS_DEBTS, JSON.stringify(debtPayoff)), [debtPayoff]);
  useEffect(() => localStorage.setItem(LS_ENVELOPES, JSON.stringify(envelopes)), [envelopes]);
  useEffect(() => localStorage.setItem(LS_BUDGETS, JSON.stringify(budgets)), [budgets]);

  // ---------- Instance generation (current month + 2 forward) ----------
  useEffect(() => {
    if (!billTemplates.length) return;
    const now = new Date();
    const end = startOfMonth(addMonths(now, 2));
    const updated = [...billInstances];
    let changed = false;

    const ensureInstance = (tmpl, due) => {
      const id = idForInstance(tmpl.name, due);
      if (!updated.find(x => x.id === id)) {
        updated.push({
          id,
          templateId: tmpl.id,
          name: tmpl.name,
          category: tmpl.category,
          autopay: !!tmpl.autopay,
          isVariable: !!tmpl.isVariable,
          frequency: tmpl.frequency,
          dueDate: toYMD(due),
          amountEstimate: parseAmt(tmpl.amount),
          actualPaid: null,
          paid: false,
          assignedCheck: null,
          assignedPayDate: null,
        });
        changed = true;
      }
    };

    billTemplates.forEach(tmpl => {
      const first = new Date(tmpl.firstDueDate);
      if (isNaN(first)) return;
      let cursor = startOfMonth(first) < startOfMonth(now) ? startOfMonth(now) : startOfMonth(first);
      while (cursor <= end) {
        const day = Math.min(parseInt(tmpl.dueDay, 10), new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate());
        const due = new Date(cursor.getFullYear(), cursor.getMonth(), day);
        if (due >= first) ensureInstance(tmpl, due);
        cursor = addMonths(cursor, 1);
      }
    });

    if (changed) {
      updated.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      setBillInstances(updated);
    }
    // eslint-disable-next-line
  }, [billTemplates]);

  const ensureNextMonthForTemplate = (tmpl, paidDueDate) => {
    const paid = new Date(paidDueDate);
    const next = addMonths(paid, 1);
    const day = Math.min(parseInt(tmpl.dueDay, 10), new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate());
    const due = new Date(next.getFullYear(), next.getMonth(), day);
    const id = idForInstance(tmpl.name, due);
    if (!billInstances.find(x => x.id === id)) {
      setBillInstances(prev => [...prev, {
        id,
        templateId: tmpl.id,
        name: tmpl.name,
        category: tmpl.category,
        autopay: !!tmpl.autopay,
        isVariable: !!tmpl.isVariable,
        frequency: tmpl.frequency,
        dueDate: toYMD(due),
        amountEstimate: parseAmt(tmpl.amount),
        actualPaid: null,
        paid: false,
        assignedCheck: null,
        assignedPayDate: null,
      }].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)));
    }
  };

  // ---------- Next 4 checks + assignment ----------
  const nextPayDates = useMemo(() => {
    if (!paySchedule?.nextPayDate) return [];
    const dates = [];
    const freq = paySchedule.frequency || 'biweekly';
    let d = new Date(paySchedule.nextPayDate);
    dates.push(new Date(d));
    for (let i = 0; i < 10; i++) {
      const x = new Date(d);
      switch (freq) {
        case 'weekly': x.setDate(x.getDate() + 7); break;
        case 'biweekly': x.setDate(x.getDate() + 14); break;
        case 'semimonthly':
          if (x.getDate() <= 15) x.setDate(15);
          else { x.setMonth(x.getMonth() + 1); x.setDate(1); }
          break;
        case 'monthly': x.setMonth(x.getMonth() + 1); break;
        default: x.setDate(x.getDate() + 14);
      }
      dates.push(x);
      d = x;
    }
    return dates;
  }, [paySchedule]);

  const assignInstancesToChecks = () => {
    if (!nextPayDates.length) return;
    const checks = nextPayDates.slice(0, 4);
    const today = new Date();

    setBillInstances(prev => prev.map(inst => {
      const due = new Date(inst.dueDate);
      let idx = null;
      for (let i = 0; i < checks.length; i++) {
        const prevCut = i === 0 ? today : checks[i - 1];
        if (due > prevCut && due <= checks[i]) { idx = i + 1; break; }
      }
      if (!idx) idx = (due > checks[checks.length - 1]) ? 4 : 1;
      return { ...inst, assignedCheck: idx, assignedPayDate: toYMD(checks[idx - 1]) };
    }));
  };
  useEffect(() => { assignInstancesToChecks(); /* eslint-disable-next-line */ }, [billInstances.length, paySchedule]);

  // ---------- Template CRUD ----------
  const addBillTemplate = async (billData) => {
    const tmpl = {
      id: Date.now(),
      name: billData.name.trim(),
      amount: parseAmt(billData.amount),
      isVariable: !!billData.isVariable,
      category: billData.category || 'utilities',
      autopay: !!billData.autopay,
      frequency: billData.frequency || 'monthly',
      dueDay: parseInt(billData.dueDate, 10),
      firstDueDate: (() => {
        const today = new Date();
        const d = parseInt(billData.dueDate, 10);
        const monthLen = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const real = Math.min(d, monthLen);
        let dt = new Date(today.getFullYear(), today.getMonth(), real);
        if (dt < today) dt = addMonths(dt, 1);
        return toYMD(dt);
      })(),
      historicalPayments: billData.historicalPayments || []
    };
    setBillTemplates(prev => [...prev, tmpl]);
    setShowTemplateForm(false);
  };

  const updateBillTemplate = async (billData) => {
    setBillTemplates(prev => prev.map(t => t.id === editingTemplate.id ? {
      ...t,
      name: billData.name,
      amount: parseAmt(billData.amount),
      isVariable: !!billData.isVariable,
      category: billData.category,
      autopay: !!billData.autopay,
      frequency: billData.frequency,
      dueDay: parseInt(billData.dueDate, 10),
    } : t));
    setEditingTemplate(null);
  };

  const retireTemplate = async (tmplId) => {
    const tmpl = billTemplates.find(t => t.id === tmplId);
    if (!tmpl) return;
    if (!confirm(`Retire "${tmpl.name}"?\nFuture instances will be removed from the last paid month onward.`)) return;

    const related = billInstances.filter(i => i.templateId === tmplId);
    const lastPaid = related.filter(i => i.paid).sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate))[0];
    const cutoff = lastPaid ? new Date(lastPaid.dueDate) : new Date(0);

    setBillInstances(prev => prev.filter(i => i.templateId !== tmplId || new Date(i.dueDate) < cutoff));
    setBillTemplates(prev => prev.filter(t => t.id !== tmplId));
  };

  // ---------- Mark paid (instances) ----------
  const toggleInstancePaid = async (instanceId) => {
    const inst = billInstances.find(i => i.id === instanceId);
    if (!inst) return;

    if (inst.autopay) {
      const ok = confirm('This bill is on Auto-pay. Mark paid/unpaid anyway?');
      if (!ok) return;
    }
    const nowPaid = !inst.paid;
    setBillInstances(prev => prev.map(i => i.id === instanceId ? { ...i, paid: nowPaid } : i));

    if (nowPaid) {
      const tmpl = billTemplates.find(t => t.id === inst.templateId);
      if (tmpl && sameMonth(new Date(inst.dueDate), new Date())) {
        ensureNextMonthForTemplate(tmpl, new Date(inst.dueDate));
      }
    }
  };

  // ---------- Submit Actuals (variable) ----------
  const submitActualPaid = (instanceId, value) => {
    const inst = billInstances.find(x => x.id === instanceId);
    if (!inst) return;
    const tmpl = billTemplates.find(t => t.id === inst.templateId);
    if (!tmpl) return;

    const actual = parseAmt(value);
    // set on instance
    setBillInstances(prev => prev.map(x => x.id === instanceId ? ({ ...x, actualPaid: actual }) : x));

    // update previous year's same month history
    const instDate = new Date(inst.dueDate);
    const lastYear = new Date(instDate.getFullYear() - 1, instDate.getMonth(), 1);
    const key = toYMD(lastYear).slice(0, 7);
    const history = Array.isArray(tmpl.historicalPayments) ? [...tmpl.historicalPayments] : [];
    const idx = history.findIndex(h => (h.date || '').startsWith(key));
    if (idx >= 0) history[idx] = { date: `${key}-01`, amount: actual };
    else history.push({ date: `${key}-01`, amount: actual });

    // recompute estimate
    let estimate = tmpl.amount;
    const nums = history.map(h => parseAmt(h.amount)).filter(n => n > 0);
    if (nums.length) estimate = nums.reduce((s, n) => s + n, 0) / nums.length;

    // save template
    setBillTemplates(prev => prev.map(t => t.id === tmpl.id ? ({ ...t, historicalPayments: history, amount: estimate }) : t));

    // propagate to this month and future instances
    const now = new Date();
    setBillInstances(prev => prev.map(x => {
      if (x.templateId !== tmpl.id) return x;
      const xd = new Date(x.dueDate);
      if (xd >= startOfMonth(now)) return { ...x, amountEstimate: estimate };
      return x;
    }));
  };

  // ---------- Helpers ----------
  const perCheckEnvelopeSum = () => envelopes.reduce((s, e) => s + parseAmt(e.perCheck), 0);

  // ---------- Backup / Restore ----------
  const exportBackup = () => {
    const payload = {
      app: 'PayPlan Pro',
      version: 2,
      exportedAt: new Date().toISOString(),
      data: {
        billTemplates, billInstances, assets, oneTimeBills, paySchedule, propaneFills,
        calendarConnected, emergencyFund, debtPayoff, envelopes, budgets
      }
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payplan-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const applyBackup = async (payload) => {
    const d = payload?.data ?? payload;
    setBillTemplates(Array.isArray(d?.billTemplates) ? d.billTemplates : []);
    setBillInstances(Array.isArray(d?.billInstances) ? d.billInstances : []);
    setAssets(Array.isArray(d?.assets) ? d.assets : []);
    setOneTimeBills(Array.isArray(d?.oneTimeBills) ? d.oneTimeBills : []);
    setPaySchedule(d?.paySchedule ?? null);
    setPropaneFills(Array.isArray(d?.propaneFills) ? d.propaneFills : []);
    setCalendarConnected(!!d?.calendarConnected);
    setEmergencyFund(d?.emergencyFund || { target: 0, current: 0 });
    setDebtPayoff(Array.isArray(d?.debtPayoff) ? d.debtPayoff : []);
    setEnvelopes(Array.isArray(d?.envelopes) ? d.envelopes : []);
    setBudgets(d?.budgets || { utilities: 0, subscription: 0, insurance: 0, loan: 0, rent: 0, other: 0 });
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
      alert('Backup restored successfully.');
    } catch (e) {
      alert('Error restoring backup: ' + e.message);
    }
  };

  // ---------- Assets / Amortization ----------
  const saveAssets = async (updated) => setAssets(updated);
  const addAsset = async (assetData) => {
    const newAsset = {
      id: Date.now(),
      ...assetData,
      startDate: assetData.startDate || new Date().toISOString().split('T')[0]
    };
    await saveAssets([...assets, newAsset]);
    setShowAssetForm(false);

    // Optional: create a linked template?
    if (assetData.createBill) {
      const tmpl = {
        name: assetData.name,
        amount: parseAmt(assetData.paymentAmount),
        isVariable: false,
        category: 'loan',
        autopay: false,
        frequency: assetData.paymentFrequency || 'monthly',
        dueDate: new Date(assetData.startDate).getDate().toString(),
        historicalPayments: []
      };
      addBillTemplate(tmpl);
    }
  };
  const updateAsset = async (assetData) => {
    const updated = assets.map(a => a.id === editingAsset.id ? { ...a, ...assetData } : a);
    await saveAssets(updated);
    setEditingAsset(null);
  };
  const deleteAsset = async (assetId) => saveAssets(assets.filter(a => a.id !== assetId));

  const calculateAmortization = (asset) => {
    const principal = parseAmt(asset.currentBalance || asset.loanAmount);
    const annualRate = parseAmt(asset.interestRate) / 100;
    const payment = parseAmt(asset.paymentAmount);
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
        case 'weekly': paymentDate.setDate(startDate.getDate() + (period * 7)); break;
        case 'biweekly': paymentDate.setDate(startDate.getDate() + (period * 14)); break;
        case 'monthly': paymentDate.setMonth(startDate.getMonth() + period); break;
        case 'quarterly': paymentDate.setMonth(startDate.getMonth() + (period * 3)); break;
        case 'annual': paymentDate.setFullYear(startDate.getFullYear() + period); break;
        default: paymentDate.setMonth(startDate.getMonth() + period);
      }

      schedule.push({
        period,
        date: toYMD(paymentDate),
        payment: totalPayment,
        principal: principalPayment,
        interest: interestPayment,
        balance: Math.max(0, balance)
      });
    }

    return { schedule, totalInterest, totalPayments: period, payoffDate: schedule[schedule.length - 1]?.date };
  };

  // ---------- Debt Payoff Calculation ----------
  const calculateDebtPayoff = (debt) => {
    const balance = parseAmt(debt.balance);
    const annualRate = parseAmt(debt.rate) / 100;
    const monthlyRate = annualRate / 12;
    const payment = parseAmt(debt.payment);

    if (payment <= 0 || balance <= 0) return { months: 0, totalInterest: 0, totalPaid: 0, payoffDate: null };

    if (monthlyRate > 0 && payment <= balance * monthlyRate) {
      return { months: Infinity, totalInterest: Infinity, totalPaid: Infinity, payoffDate: null };
    }

    let months;
    if (monthlyRate === 0) {
      months = Math.ceil(balance / payment);
    } else {
      months = Math.ceil(-Math.log(1 - (monthlyRate * balance) / payment) / Math.log(1 + monthlyRate));
    }

    let remaining = balance;
    let totalInterest = 0;
    for (let i = 0; i < months && remaining > 0.01; i++) {
      const interest = remaining * monthlyRate;
      const principal = Math.min(payment - interest, remaining);
      totalInterest += interest;
      remaining -= principal;
    }

    const startDate = debt.startDate ? new Date(debt.startDate) : new Date();
    const payoffDate = new Date(startDate);
    payoffDate.setMonth(payoffDate.getMonth() + months);

    return { months, totalInterest, totalPaid: balance + totalInterest, payoffDate: toYMD(payoffDate) };
  };

  const addDebt = (form) => {
    const debt = {
      id: Date.now(),
      name: form.name,
      loanAmount: parseAmt(form.loanAmount),
      balance: parseAmt(form.balance),
      rate: parseAmt(form.rate),
      loanTerm: parseInt(form.loanTerm) || 0,
      startDate: form.startDate,
      payment: parseAmt(form.payment)
    };
    setDebtPayoff([...debtPayoff, debt]);
    setShowDebtForm(false);
  };

  const updateDebt = (form) => {
    setDebtPayoff(debtPayoff.map(d => d.id === editingDebt.id ? {
      ...editingDebt,
      name: form.name,
      loanAmount: parseAmt(form.loanAmount),
      balance: parseAmt(form.balance),
      rate: parseAmt(form.rate),
      loanTerm: parseInt(form.loanTerm) || 0,
      startDate: form.startDate,
      payment: parseAmt(form.payment)
    } : d));
    setEditingDebt(null);
  };

  // ---------- One-Time Bills ----------
  const saveOneTime = async (updated) => setOneTimeBills(updated);
  const addOneTimeBill = async (billData) => {
    const newBill = { id: Date.now(), ...billData, paid: false, addedDate: new Date().toISOString() };
    await saveOneTime([...oneTimeBills, newBill]);
    setShowOneTimeForm(false);
  };
  const updateOneTimeBill = async (billData) => {
    const updated = oneTimeBills.map(b => b.id === editingOneTime.id ? { ...b, ...billData } : b);
    await saveOneTime(updated);
    setEditingOneTime(null);
  };
  const deleteOneTimeBill = async (billId) => saveOneTime(oneTimeBills.filter(b => b.id !== billId));
  const toggleOneTimePaid = async (billId) => {
    const updated = oneTimeBills.map(b => b.id === billId ? { ...b, paid: !b.paid, paidDate: !b.paid ? new Date().toISOString() : null } : b);
    await saveOneTime(updated);
  };

  // ---------- Propane ----------
  const savePropane = async (updated) => setPropaneFills(updated);
  const addPropaneFill = async (fill) => {
    const newFill = { ...fill, id: Date.now() };
    await savePropane([...propaneFills, newFill]);
  };
  const deletePropaneFill = async (id) => savePropane(propaneFills.filter(f => f.id !== id));

  // ---------- Calendar (placeholder) ----------
  const connectGoogleCalendar = async () => {
    const connected = !calendarConnected;
    setCalendarConnected(connected);
    if (connected) alert('Calendar connected! (Demo mode)');
  };
  const syncToCalendar = async () => alert('Syncing bills to calendar... (Demo mode)');

  // ---------- Overview helpers ----------
  const currentMonthInstances = useMemo(() => {
    const now = new Date();
    return billInstances
      .filter(i => sameMonth(new Date(i.dueDate), now))
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  }, [billInstances]);

  const monthlyTotal = (instances) => instances.reduce((s, i) => s + parseAmt(i.actualPaid ?? i.amountEstimate), 0);

  const overview = useMemo(() => {
    // approximate monthly bills from instances of this month
    const monthlyBills = monthlyTotal(currentMonthInstances);

    // one-time upcoming (unpaid)
    const upcomingOneTime = oneTimeBills.filter(b => !b.paid).reduce((s, b) => s + parseAmt(b.amount), 0);

    // monthly income: count checks in current month
    let monthlyIncome = 0;
    let paychecksThisMonth = 0;
    let nextPaycheckDate = null;
    let daysUntilNextPaycheck = null;
    if (paySchedule?.nextPayDate) {
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      const payAmount = parseAmt(paySchedule.payAmount);
      const nd = nextPayDates; // many
      paychecksThisMonth = nd.filter(d => d.getMonth() === currentMonth && d.getFullYear() === currentYear).length;
      monthlyIncome = payAmount * paychecksThisMonth;
      nextPaycheckDate = nd.find(d => d >= today);
      if (nextPaycheckDate) {
        const diff = nextPaycheckDate.getTime() - today.getTime();
        daysUntilNextPaycheck = Math.ceil(diff / (1000 * 3600 * 24));
      }
    }
    const leftover = monthlyIncome - monthlyBills;

    return { monthlyBills, totalMonthly: monthlyBills, upcomingOneTime, monthlyIncome, leftover, paychecksThisMonth, nextPaycheckDate, daysUntilNextPaycheck };
  }, [currentMonthInstances, oneTimeBills, paySchedule, nextPayDates]);

  // ---------- Forms ----------
  const TemplateForm = ({ defaultValue, onCancel, onSubmit }) => {
    const [form, setForm] = useState(defaultValue || {
      name: '',
      amount: '',
      isVariable: false,
      category: 'utilities',
      autopay: false,
      dueDate: 1,
      frequency: 'monthly',
    });
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">{defaultValue ? 'Edit Bill Template' : 'Add Bill Template'}</h2>
              <button className="p-2 rounded-lg hover:bg-slate-100" onClick={onCancel}><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold">Name</label>
                <input className="w-full mt-1 px-3 py-2 border-2 rounded-xl"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.isVariable} onChange={e => setForm({ ...form, isVariable: e.target.checked })} />
                <span className="text-sm font-semibold">Variable amount</span>
              </div>
              <div>
                <label className="text-sm font-semibold">{form.isVariable ? 'Estimated Amount' : 'Amount'}</label>
                <input type="number" step="0.01" className="w-full mt-1 px-3 py-2 border-2 rounded-xl"
                  value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-semibold">Category</label>
                <select className="w-full mt-1 px-3 py-2 border-2 rounded-xl"
                  value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  <option value="utilities">Utilities</option>
                  <option value="subscription">Subscription</option>
                  <option value="insurance">Insurance</option>
                  <option value="loan">Loan</option>
                  <option value="rent">Rent/Mortgage</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.autopay} onChange={e => setForm({ ...form, autopay: e.target.checked })} />
                <span className="text-sm font-semibold">Auto-pay</span>
              </div>
              <div>
                <label className="text-sm font-semibold">Due Day (1–31)</label>
                <input type="number" min={1} max={31} className="w-full mt-1 px-3 py-2 border-2 rounded-xl"
                  value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} required />
              </div>
              <div className="flex gap-3 pt-2">
                <button className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold" onClick={onCancel}>Cancel</button>
                <button className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-white font-semibold"
                  onClick={() => defaultValue ? updateBillTemplate(form) : addBillTemplate(form)}
                >{defaultValue ? 'Update' : 'Add'}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const PayForm = ({ defaultValue, onCancel, onSubmit }) => {
    const [form, setForm] = useState(defaultValue || { frequency: 'biweekly', payAmount: '', nextPayDate: '' });
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Pay Schedule</h2>
              <button className="p-2 rounded-lg hover:bg-slate-100" onClick={onCancel}><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold">Frequency</label>
                <select className="w-full mt-1 px-3 py-2 border-2 rounded-xl"
                  value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="semimonthly">Semi-monthly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold">Pay Amount (per check)</label>
                <input type="number" step="0.01" className="w-full mt-1 px-3 py-2 border-2 rounded-xl"
                  value={form.payAmount} onChange={e => setForm({ ...form, payAmount: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-semibold">Next Pay Date</label>
                <input type="date" className="w-full mt-1 px-3 py-2 border-2 rounded-xl"
                  value={form.nextPayDate} onChange={e => setForm({ ...form, nextPayDate: e.target.value })} required />
              </div>
              <div className="flex gap-3 pt-2">
                <button className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold" onClick={onCancel}>Cancel</button>
                <button className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-white font-semibold"
                  onClick={() => onSubmit(form)}>Save</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const AssetForm = ({ asset, onSubmit, onCancel }) => {
    const [form, setForm] = useState(asset || {
      name: '',
      type: 'mortgage',
      loanAmount: '',
      currentBalance: '',
      loanTerm: '',
      interestRate: '',
      paymentAmount: '',
      paymentFrequency: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      createBill: false
    });
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">{asset ? 'Edit Asset' : 'Add Asset'}</h2>
              <button className="p-2 rounded-lg hover:bg-slate-100" onClick={onCancel}><X size={20} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-3">
              <div>
                <label className="text-sm font-semibold">Name</label>
                <input className="w-full mt-1 px-3 py-2 border-2 rounded-xl" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-semibold">Type</label>
                <select className="w-full mt-1 px-3 py-2 border-2 rounded-xl" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="mortgage">Mortgage</option>
                  <option value="auto">Auto Loan</option>
                  <option value="student">Student Loan</option>
                  <option value="personal">Personal Loan</option>
                  <option value="credit">Credit Card</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold">Loan Amount</label>
                  <input type="number" step="0.01" className="w-full mt-1 px-3 py-2 border-2 rounded-xl" value={form.loanAmount} onChange={e => setForm({ ...form, loanAmount: e.target.value })} required />
                </div>
                <div>
                  <label className="text-sm font-semibold">Current Balance</label>
                  <input type="number" step="0.01" className="w-full mt-1 px-3 py-2 border-2 rounded-xl" value={form.currentBalance} onChange={e => setForm({ ...form, currentBalance: e.target.value })} required />
                </div>
                <div>
                  <label className="text-sm font-semibold">Loan Term (months)</label>
                  <input type="number" className="w-full mt-1 px-3 py-2 border-2 rounded-xl" value={form.loanTerm} onChange={e => setForm({ ...form, loanTerm: e.target.value })} required />
                </div>
                <div>
                  <label className="text-sm font-semibold">Interest Rate (%)</label>
                  <input type="number" step="0.01" className="w-full mt-1 px-3 py-2 border-2 rounded-xl" value={form.interestRate} onChange={e => setForm({ ...form, interestRate: e.target.value })} required />
                </div>
                <div>
                  <label className="text-sm font-semibold">Payment Amount</label>
                  <input type="number" step="0.01" className="w-full mt-1 px-3 py-2 border-2 rounded-xl" value={form.paymentAmount} onChange={e => setForm({ ...form, paymentAmount: e.target.value })} required />
                </div>
                <div>
                  <label className="text-sm font-semibold">Payment Frequency</label>
                  <select className="w-full mt-1 px-3 py-2 border-2 rounded-xl" value={form.paymentFrequency} onChange={e => setForm({ ...form, paymentFrequency: e.target.value })}>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold">Start Date</label>
                <input type="date" className="w-full mt-1 px-3 py-2 border-2 rounded-xl" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.createBill} onChange={e => setForm({ ...form, createBill: e.target.checked })} />
                <span className="text-sm font-semibold">Create linked recurring bill</span>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onCancel} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold">{asset ? 'Update' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  const OneTimeBillForm = ({ bill, onSubmit, onCancel }) => {
    const [form, setForm] = useState(bill || { name: '', amount: '', dueDate: '', description: '' });
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">{bill ? 'Edit One-Time Bill' : 'Add One-Time Bill'}</h2>
              <button className="p-2 rounded-lg hover:bg-slate-100" onClick={onCancel}><X size={20} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-3">
              <div>
                <label className="text-sm font-semibold">Name</label>
                <input className="w-full mt-1 px-3 py-2 border-2 rounded-xl" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-semibold">Amount</label>
                <input type="number" step="0.01" className="w-full mt-1 px-3 py-2 border-2 rounded-xl" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-semibold">Due Date</label>
                <input type="date" className="w-full mt-1 px-3 py-2 border-2 rounded-xl" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-semibold">Description (Optional)</label>
                <textarea rows={3} className="w-full mt-1 px-3 py-2 border-2 rounded-xl" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onCancel} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold">{bill ? 'Update' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  const DebtForm = ({ debt, onSubmit, onCancel }) => {
    const [form, setForm] = useState(debt ? {
      name: debt.name,
      loanAmount: debt.loanAmount || debt.balance || '',
      balance: debt.balance || '',
      rate: debt.rate || '',
      loanTerm: debt.loanTerm || '',
      startDate: debt.startDate || new Date().toISOString().split('T')[0],
      payment: debt.payment || ''
    } : {
      name: '',
      loanAmount: '',
      balance: '',
      rate: '',
      loanTerm: '',
      startDate: new Date().toISOString().split('T')[0],
      payment: ''
    });
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">{debt ? 'Edit Debt' : 'Add Debt'}</h2>
              <button className="p-2 rounded-lg hover:bg-slate-100" onClick={onCancel}><X size={20} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-3">
              <div>
                <label className="text-sm font-semibold">Debt Name</label>
                <input className="w-full mt-1 px-3 py-2 border-2 rounded-xl" placeholder="e.g., Credit Card, Auto Loan" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold">Original Loan Amount</label>
                  <input type="number" step="0.01" className="w-full mt-1 px-3 py-2 border-2 rounded-xl" value={form.loanAmount} onChange={e => setForm({ ...form, loanAmount: e.target.value })} required />
                </div>
                <div>
                  <label className="text-sm font-semibold">Current Balance</label>
                  <input type="number" step="0.01" className="w-full mt-1 px-3 py-2 border-2 rounded-xl" value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} required />
                </div>
                <div>
                  <label className="text-sm font-semibold">Interest Rate (%)</label>
                  <input type="number" step="0.01" className="w-full mt-1 px-3 py-2 border-2 rounded-xl" placeholder="e.g., 18.5" value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })} required />
                </div>
                <div>
                  <label className="text-sm font-semibold">Loan Term (months)</label>
                  <input type="number" className="w-full mt-1 px-3 py-2 border-2 rounded-xl" placeholder="e.g., 60" value={form.loanTerm} onChange={e => setForm({ ...form, loanTerm: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold">Loan Start Date</label>
                <input type="date" className="w-full mt-1 px-3 py-2 border-2 rounded-xl" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-semibold">Monthly Payment</label>
                <input type="number" step="0.01" className="w-full mt-1 px-3 py-2 border-2 rounded-xl" value={form.payment} onChange={e => setForm({ ...form, payment: e.target.value })} required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onCancel} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold">{debt ? 'Update' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // ---------- Header ----------
  const Header = () => (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-4xl md:text-5xl font-black text-white">PayPlan Pro</h1>
        <p className="text-emerald-100">Instances-based bill planning (2+ months ahead)</p>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setView('dashboard')} className={`px-4 py-2 rounded-xl font-semibold flex items-center gap-2 ${view === 'dashboard' ? 'bg-white text-emerald-600' : 'bg-white/20 text-white hover:bg-white/30'}`}><Home size={18}/>Dashboard</button>
        <button onClick={() => setView('checklist')} className={`px-4 py-2 rounded-xl font-semibold flex items-center gap-2 ${view === 'checklist' ? 'bg-white text-emerald-600' : 'bg-white/20 text-white hover:bg-white/30'}`}><List size={18}/>Checklist</button>
        <button onClick={() => setView('submit')} className={`px-4 py-2 rounded-xl font-semibold flex items-center gap-2 ${view === 'submit' ? 'bg-white text-emerald-600' : 'bg-white/20 text-white hover:bg-white/30'}`}><Check size={18}/>Submit</button>
        <button onClick={() => setView('bills')} className={`px-4 py-2 rounded-xl font-semibold flex items-center gap-2 ${view === 'bills' ? 'bg-white text-emerald-600' : 'bg-white/20 text-white hover:bg-white/30'}`}><Receipt size={18}/>Bills</button>
        <button onClick={() => setView('assets')} className={`px-4 py-2 rounded-xl font-semibold flex items-center gap-2 ${view === 'assets' ? 'bg-white text-emerald-600' : 'bg-white/20 text-white hover:bg-white/30'}`}><Building2 size={18}/>Assets</button>
        <button onClick={() => setView('onetime')} className={`px-4 py-2 rounded-xl font-semibold flex items-center gap-2 ${view === 'onetime' ? 'bg-white text-emerald-600' : 'bg-white/20 text-white hover:bg-white/30'}`}><Calendar size={18}/>One-Time</button>
        <button onClick={() => setView('propane')} className={`px-4 py-2 rounded-xl font-semibold flex items-center gap-2 ${view === 'propane' ? 'bg-white text-emerald-600' : 'bg-white/20 text-white hover:bg-white/30'}`}><Flame size={18}/>Propane</button>
        <button onClick={() => setView('analytics')} className={`px-4 py-2 rounded-xl font-semibold flex items-center gap-2 ${view === 'analytics' ? 'bg-white text-emerald-600' : 'bg-white/20 text-white hover:bg-white/30'}`}><BarChart3 size={18}/>Analytics</button>
        <button onClick={() => setView('settings')} className={`px-4 py-2 rounded-xl font-semibold flex items-center gap-2 ${view === 'settings' ? 'bg-white text-emerald-600' : 'bg-white/20 text-white hover:bg-white/30'}`}><Settings size={18}/>Settings</button>
      </div>
    </div>
  );

  // ---------- Derived check groups ----------
  const fourCheckPlan = useMemo(() => {
    const checks = nextPayDates.slice(0, 4);
    if (!checks.length) return { checks: [], groups: [] };
    const groups = [1, 2, 3, 4].map(idx =>
      billInstances.filter(i => i.assignedCheck === idx).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    );
    return { checks, groups };
  }, [billInstances, nextPayDates]);

  // ---------- Views ----------
  const Dashboard = () => {
    return (
      <div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-emerald-100 rounded-xl"><DollarSign className="text-emerald-600" size={24} /></div>
              <div className="flex-1">
                <p className="text-slate-500 text-sm">{new Date().toLocaleDateString('en-US', { month: 'long' })} Income</p>
                <p className="text-3xl font-black text-slate-800">${overview.monthlyIncome.toFixed(2)}</p>
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
                  {overview.nextPaycheckDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })}
                  {overview.daysUntilNextPaycheck !== null && (
                    <span className="text-slate-500 ml-1">({overview.daysUntilNextPaycheck} day{overview.daysUntilNextPaycheck !== 1 ? 's' : ''})</span>
                  )}
                </p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-red-100 rounded-xl"><TrendingUp className="text-red-600" size={24} /></div>
              <div>
                <p className="text-slate-500 text-sm">Monthly Expenses</p>
                <p className="text-3xl font-black text-slate-800">${overview.totalMonthly.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6">
            {(() => {
              const perCheck = parseAmt(paySchedule?.payAmount);
              const g1 = billInstances.filter(i => i.assignedCheck === 1).reduce((s, i) => s + parseAmt(i.amountEstimate), 0);
              const g2 = billInstances.filter(i => i.assignedCheck === 2).reduce((s, i) => s + parseAmt(i.amountEstimate), 0);
              const leftover1 = perCheck - perCheckEnvelopeSum() - g1;
              const leftover2 = perCheck - perCheckEnvelopeSum() - g2;
              return (
                <>
                  <h3 className="text-lg font-bold mb-3">Leftover Per Check</h3>
                  <div className="space-y-3">
                    <div className="p-3 bg-emerald-50 rounded-xl">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Check 1 Leftover</span>
                        <span className={`text-xl font-bold ${leftover1 >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>${leftover1.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-xl">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Check 2 Leftover</span>
                        <span className={`text-xl font-bold ${leftover2 >= 0 ? 'text-blue-600' : 'text-red-600'}`}>${leftover2.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border-2 border-slate-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-slate-700">Total Monthly</span>
                        <span className={`text-xl font-bold ${overview.leftover >= 0 ? 'text-slate-800' : 'text-red-600'}`}>${overview.leftover.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Next 4 checks */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-xl font-bold mb-4">Next 4 Checks</h3>
          {!fourCheckPlan.checks.length ? (
            <p className="text-slate-600">Set your pay schedule in Settings.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fourCheckPlan.checks.map((d, idx) => {
                const bucket = fourCheckPlan.groups[idx] || [];
                const total = bucket.reduce((s, i) => s + parseAmt(i.amountEstimate), 0);
                const free = parseAmt(paySchedule?.payAmount) - perCheckEnvelopeSum() - total;
                return (
                  <div key={idx} className="p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">Check {idx + 1} • {new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                      <div className={`font-bold ${free >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Free: ${free.toFixed(2)}</div>
                    </div>
                    <div className="text-sm text-slate-600 mt-1">{bucket.length} bills • Total ${total.toFixed(2)}</div>
                    <div className="mt-2 space-y-1">
                      {bucket.slice(0, 5).map(b => (
                        <div key={b.id} className="flex items-center justify-between text-sm">
                          <span>{b.name}</span>
                          <span>${parseAmt(b.amountEstimate).toFixed(2)}</span>
                        </div>
                      ))}
                      {bucket.length > 5 && <div className="text-xs text-slate-500 mt-1">+{bucket.length - 5} more…</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const BillsTemplates = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white">Bill Templates</h2>
        <button onClick={() => { setEditingTemplate(null); setShowTemplateForm(true); }} className="px-4 py-3 bg-white text-emerald-600 rounded-xl font-semibold flex items-center gap-2"><Plus size={18} />Add Template</button>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {billTemplates.length ? billTemplates.map((t) => (
          <div key={t.id} className="bg-white rounded-xl p-4 shadow">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="font-bold text-lg">{t.name}</div>
                  {t.isVariable && <span className="text-xs font-bold px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">VARIABLE</span>}
                  {t.autopay && <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">AUTO</span>}
                </div>
                <div className="text-sm text-slate-600 flex flex-wrap gap-4">
                  <span><DollarSign className="inline mr-1" size={14} /> Est. ${parseAmt(t.amount).toFixed(2)}</span>
                  <span><Calendar className="inline mr-1" size={14} /> Due day {t.dueDay}</span>
                  <span>Category: {t.category}</span>
                  <span>First due: {new Date(t.firstDueDate).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" onClick={() => { setEditingTemplate(t); setShowTemplateForm(true); }} title="Edit"><Edit2 size={18} /></button>
                <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg" onClick={() => retireTemplate(t.id)} title="Retire"><Trash2 size={18} /></button>
              </div>
            </div>
            <div className="mt-3 text-sm text-slate-600">
              Upcoming:{' '}
              {billInstances
                .filter(i => i.templateId === t.id && new Date(i.dueDate) >= startOfMonth(new Date()))
                .slice(0, 3)
                .map(i => new Date(i.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
                .join(' • ') || '—'}
            </div>
          </div>
        )) : (
          <div className="bg-white rounded-xl p-8 text-center text-slate-600">No templates yet. Click “Add Template”.</div>
        )}
      </div>
    </div>
  );

  const Checklist = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Checklist</h2>
        <button onClick={assignInstancesToChecks} className="px-4 py-2 rounded-xl bg-white/20 text-white hover:bg-white/30 font-semibold flex items-center gap-2"><RefreshCw size={16} />Re-assign</button>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {currentMonthInstances.length ? currentMonthInstances.map((i) => (
          <div key={i.id} className="bg-white rounded-xl p-4 shadow flex items-start gap-3">
            <button onClick={() => toggleInstancePaid(i.id)} className={`p-2 rounded-lg ${i.paid ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`} title={i.paid ? 'Mark unpaid' : 'Mark paid'}>
              <Check size={18} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className={`font-semibold ${i.paid ? 'line-through text-green-700' : 'text-slate-800'}`}>{i.name}</div>
                {i.isVariable && <span className="text-xs font-bold px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">VAR</span>}
                {i.autopay && <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">AUTO</span>}
              </div>
              <div className="text-sm text-slate-600 flex flex-wrap gap-4">
                <span><Calendar size={14} className="inline mr-1" /> {new Date(i.dueDate).toLocaleDateString()}</span>
                <span><DollarSign size={14} className="inline mr-1" /> Est. ${parseAmt(i.amountEstimate).toFixed(2)}</span>
                {i.actualPaid != null && <span>Actual ${parseAmt(i.actualPaid).toFixed(2)}</span>}
                {i.assignedPayDate && <span><Clock size={14} className="inline mr-1" /> Check {i.assignedCheck} • {new Date(i.assignedPayDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
              </div>
            </div>
          </div>
        )) : (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <Receipt className="mx-auto mb-4 text-slate-300" size={64} />
            <h3 className="text-xl font-bold text-slate-800 mb-2">No Bills This Month</h3>
          </div>
        )}
      </div>
    </div>
  );

  const SubmitActuals = () => {
    const thisMonthVars = currentMonthInstances.filter(i => i.isVariable);
    const [values, setValues] = useState(() => {
      const obj = {};
      thisMonthVars.forEach(i => { obj[i.id] = i.actualPaid != null ? i.actualPaid : ''; });
      return obj;
    });
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">Submit Actuals (Variable Bills)</h2>
          <div className="text-emerald-100 text-sm">Updates last year's same month to keep estimates accurate.</div>
        </div>
        {thisMonthVars.length ? (
          <div className="grid grid-cols-1 gap-3">
            {thisMonthVars.map((i) => (
              <div key={i.id} className="bg-white rounded-xl p-4 shadow flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">{i.name}</div>
                  <div className="text-sm text-slate-600">Due {new Date(i.dueDate).toLocaleDateString()} • Est. ${parseAmt(i.amountEstimate).toFixed(2)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" step="0.01" placeholder="Actual Paid" className="px-3 py-2 border-2 rounded-xl w-40"
                    value={values[i.id] ?? ''} onChange={e => setValues({ ...values, [i.id]: e.target.value })} />
                  <button className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" onClick={() => submitActualPaid(i.id, values[i.id])}>Save</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-8 text-center text-slate-600">No variable bills this month.</div>
        )}
      </div>
    );
  };
    const AssetsView = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-black text-white">Assets & Loans</h2>
        <button onClick={() => setShowAssetForm(true)} className="px-6 py-3 bg-white hover:bg-emerald-50 text-emerald-600 rounded-xl font-semibold shadow-lg transition-colors flex items-center gap-2">
          <Plus size={20} />Add Asset
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {assets.map(asset => {
          const amort = calculateAmortization(asset);
          return (
            <div key={asset.id} className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 rounded-xl"><Building2 className="text-blue-600" size={24} /></div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold text-slate-800">{asset.name}</h3>
                    <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full uppercase">{asset.type}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div><p className="text-xs text-slate-500">Loan Amount</p><p className="text-lg font-bold text-slate-800">${parseAmt(asset.loanAmount).toFixed(2)}</p></div>
                    <div><p className="text-xs text-slate-500">Payment</p><p className="text-lg font-bold text-slate-800">${parseAmt(asset.paymentAmount).toFixed(2)}</p></div>
                    <div><p className="text-xs text-slate-500">Interest Rate</p><p className="text-lg font-bold text-slate-800">{asset.interestRate}%</p></div>
                    <div><p className="text-xs text-slate-500">Payoff Date</p><p className="text-lg font-bold text-slate-800">{amort.payoffDate ? new Date(amort.payoffDate).toLocaleDateString() : '—'}</p></div>
                  </div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-blue-600 font-semibold">View Amortization Schedule</summary>
                    <div className="overflow-x-auto mt-3 border rounded-xl">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="px-3 py-2 text-left">#</th>
                            <th className="px-3 py-2 text-left">Date</th>
                            <th className="px-3 py-2 text-right">Payment</th>
                            <th className="px-3 py-2 text-right">Principal</th>
                            <th className="px-3 py-2 text-right">Interest</th>
                            <th className="px-3 py-2 text-right">Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {amort.schedule.map(row => (
                            <tr key={row.period} className="border-b">
                              <td className="px-3 py-2">{row.period}</td>
                              <td className="px-3 py-2">{new Date(row.date).toLocaleDateString()}</td>
                              <td className="px-3 py-2 text-right">${row.payment.toFixed(2)}</td>
                              <td className="px-3 py-2 text-right">${row.principal.toFixed(2)}</td>
                              <td className="px-3 py-2 text-right">${row.interest.toFixed(2)}</td>
                              <td className="px-3 py-2 text-right font-semibold">${row.balance.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingAsset(asset)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={18} /></button>
                  <button onClick={() => { if (confirm(`Delete ${asset.name}?`)) deleteAsset(asset.id); }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                </div>
              </div>
            </div>
          );
        })}
        {!assets.length && (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <Building2 className="mx-auto mb-4 text-slate-300" size={64} />
            <h3 className="text-xl font-bold text-slate-800 mb-2">No Assets Yet</h3>
            <p className="text-slate-600 mb-6">Track loans, mortgages, and other financed assets</p>
            <button onClick={() => setShowAssetForm(true)} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold">Add Your First Asset</button>
          </div>
        )}
      </div>
    </div>
  );

  const OneTimeView = () => {
    const upcomingTotal = oneTimeBills.filter(b => !b.paid).reduce((s, b) => s + parseAmt(b.amount), 0);
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-black text-white">One-Time Bills</h2>
          <button onClick={() => setShowOneTimeForm(true)} className="px-6 py-3 bg-white hover:bg-emerald-50 text-emerald-600 rounded-xl font-semibold shadow-lg transition-colors flex items-center gap-2">
            <Plus size={20} />Add One-Time Bill
          </button>
        </div>

        <div className="mb-6 bg-white/20 backdrop-blur-sm rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-white" size={24} />
            <div>
              <p className="text-white font-semibold">Upcoming Total</p>
              <p className="text-2xl font-black text-white">${upcomingTotal.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {oneTimeBills.length ? oneTimeBills.map(bill => {
            const dueDate = new Date(bill.dueDate);
            const today = new Date();
            const isOverdue = !bill.paid && dueDate < today;
            return (
              <div key={bill.id} className={`bg-white rounded-2xl shadow-xl p-6 ${isOverdue ? 'border-4 border-red-500' : ''}`}>
                <div className="flex items-start gap-4">
                  <button onClick={() => toggleOneTimePaid(bill.id)} className={`p-3 rounded-xl ${bill.paid ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}><Check size={24} /></button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className={`text-xl font-bold ${bill.paid ? 'text-green-800 line-through' : 'text-slate-800'}`}>{bill.name}</h3>
                      {isOverdue && <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">OVERDUE</span>}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
                      <span className="flex items-center gap-1"><Calendar size={14} />Due: {new Date(bill.dueDate).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1"><DollarSign size={14} />${bill.amount}</span>
                      {bill.paid && bill.paidDate && <span className="text-green-600 flex items-center gap-1"><Check size={14} />Paid {new Date(bill.paidDate).toLocaleDateString()}</span>}
                    </div>
                    {bill.description && <p className="text-sm text-slate-600 italic">{bill.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingOneTime(bill)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={18} /></button>
                    <button onClick={() => { if (confirm(`Delete ${bill.name}?`)) deleteOneTimeBill(bill.id); }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
              <Calendar className="mx-auto mb-4 text-slate-300" size={64} />
              <h3 className="text-xl font-bold text-slate-800 mb-2">No One-Time Bills</h3>
              <p className="text-slate-600 mb-6">Track non-recurring expenses like medical bills or repairs</p>
              <button onClick={() => setShowOneTimeForm(true)} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold">Add Your First One-Time Bill</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const PropaneView = () => {
    const sorted = [...propaneFills].sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = sorted[0];
    const totalGallons = propaneFills.reduce((sum, f) => sum + parseAmt(f.gallons), 0);
    const totalCost = propaneFills.reduce((sum, f) => sum + parseAmt(f.totalCost), 0);
    const avgPricePerGal = totalGallons ? totalCost / totalGallons : 0;
    const fillsWithUsage = sorted.map((fill, idx) => {
      if (idx === sorted.length - 1) return { ...fill, daysLasted: null, dailyUsage: null };
      const nextFill = sorted[idx + 1];
      const days = Math.max(1, Math.floor((new Date(fill.date) - new Date(nextFill.date)) / (1000 * 60 * 60 * 24)));
      const dailyUsage = parseAmt(fill.gallons) / days;
      return { ...fill, daysLasted: days, dailyUsage };
    });

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-black text-white">Propane Usage Tracker</h2>
          <button onClick={() => setShowPropaneForm(true)} className="px-6 py-3 bg-white hover:bg-emerald-50 text-emerald-600 rounded-xl font-semibold shadow-lg transition-colors flex items-center gap-2">
            <Plus size={20} />Add Fill
          </button>
        </div>

        {propaneFills.length > 0 ? (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold mb-4">Latest Fill</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><p className="text-sm text-slate-500">Date</p><p className="text-lg font-bold">{latest ? new Date(latest.date).toLocaleDateString() : '—'}</p></div>
                <div><p className="text-sm text-slate-500">Gallons</p><p className="text-lg font-bold text-emerald-600">{latest?.gallons ?? '—'}</p></div>
                <div><p className="text-sm text-slate-500">Price/Gal</p><p className="text-lg font-bold">${latest?.pricePerGal ?? '—'}</p></div>
                <div><p className="text-sm text-slate-500">Total Cost</p><p className="text-lg font-bold text-red-600">${latest?.totalCost ?? '—'}</p></div>
              </div>
              {fillsWithUsage[0]?.daysLasted && (
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
                    <button onClick={() => deletePropaneFill(fill.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <Flame className="mx-auto mb-4 text-slate-300" size={64} />
            <h3 className="text-xl font-bold text-slate-800 mb-2">No Fills Tracked Yet</h3>
            <p className="text-slate-600 mb-6">Start tracking to see usage patterns and costs</p>
          </div>
        )}
      </div>
  );
  };

  const AnalyticsView = () => {
    const categories = ['utilities', 'subscription', 'insurance', 'loan', 'rent', 'other'];
    const thisMonthByCategory = categories.map(cat => {
      const sum = currentMonthInstances.filter(i => i.category === cat).reduce((s, i) => s + parseAmt(i.actualPaid ?? i.amountEstimate), 0);
      return { cat, sum, cap: parseAmt(budgets[cat] || 0) };
    });
    const totalThisMonth = thisMonthByCategory.reduce((s, r) => s + r.sum, 0);
    return (
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
            <div className="bg-emerald-500 flex items-center justify-center text-white text-xs font-bold"
              style={{ width: `${overview.monthlyIncome > 0 ? Math.min((overview.totalMonthly / overview.monthlyIncome) * 100, 100) : 0}%` }}>
              {overview.monthlyIncome > 0 ? ((overview.totalMonthly / overview.monthlyIncome) * 100).toFixed(0) : 0}%
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2 text-center">
            {overview.totalMonthly > overview.monthlyIncome ? '⚠️ Spending exceeds income' : '✓ Under budget'}
          </p>
        </div>

        {/* Category budgets */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h3 className="text-xl font-bold mb-4">Category Budgets</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {thisMonthByCategory.map(({ cat, sum, cap }) => {
              const pct = cap > 0 ? Math.min(sum / cap * 100, 100) : 0;
              const over = cap > 0 && sum > cap;
              return (
                <div key={cat} className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold capitalize">{cat}</div>
                    <div className={`text-sm ${over ? 'text-red-600 font-bold' : 'text-slate-700'}`}>${sum.toFixed(2)} / ${cap.toFixed(2)}</div>
                  </div>
                  <div className="h-3 bg-white rounded-full overflow-hidden border">
                    <div className={`h-full ${over ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                  {over && <div className="text-xs text-red-600 mt-1">Over by ${(sum - cap).toFixed(2)}</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Debts quick view */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Debt Payoff Tracker</h3>
            <button
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold"
              onClick={() => setShowDebtForm(true)}
            >Add Debt</button>
          </div>
          {debtPayoff.length ? (
            <div className="space-y-3">
              {debtPayoff.map(debt => {
                const payoff = calculateDebtPayoff(debt);
                const isInfinite = !isFinite(payoff.months);
                return (
                  <div key={debt.id} className="p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{debt.name}</span>
                      <div className="flex items-center gap-1">
                        <button className="text-blue-600 hover:bg-blue-50 p-1 rounded transition-colors" onClick={() => setEditingDebt(debt)}><Edit2 size={16} /></button>
                        <button className="text-red-600 hover:bg-red-50 p-1 rounded transition-colors" onClick={() => setDebtPayoff(debtPayoff.filter(d => d.id !== debt.id))}><X size={16} /></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-600">
                      {debt.loanAmount > 0 && <p>Original Loan: ${parseAmt(debt.loanAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>}
                      <p>Balance: ${parseAmt(debt.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                      <p>Rate: {debt.rate}%</p>
                      <p>Payment: ${parseAmt(debt.payment).toLocaleString('en-US', { minimumFractionDigits: 2 })}/mo</p>
                      {debt.loanTerm > 0 && <p>Loan Term: {debt.loanTerm} months</p>}
                      {debt.startDate && <p>Start: {new Date(debt.startDate + 'T00:00:00').toLocaleDateString()}</p>}
                    </div>
                    {isInfinite ? (
                      <p className="text-sm font-semibold text-red-600 mt-2">Payment does not cover monthly interest. Increase payment above ${(parseAmt(debt.balance) * parseAmt(debt.rate) / 100 / 12).toFixed(2)}/mo</p>
                    ) : (
                      <div className="mt-2 p-2 bg-emerald-50 rounded-lg">
                        <p className="text-sm font-semibold text-emerald-700">Payoff: {payoff.months} months | Total Interest: ${payoff.totalInterest.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        {payoff.payoffDate && <p className="text-xs text-emerald-600">Est. Payoff Date: {new Date(payoff.payoffDate + 'T00:00:00').toLocaleDateString()}</p>}
                        <p className="text-xs text-slate-500">Total Paid: ${payoff.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : <p className="text-slate-500">Add debts to track payoff timeline</p>}
        </div>
      </div>
    );
  };

  const SettingsView = () => (
    <div>
      {/* Pay Schedule */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">Pay Schedule</h3>
            {paySchedule ? (
              <div className="text-sm text-slate-600 mt-1">
                {paySchedule.frequency} • ${parseAmt(paySchedule.payAmount).toFixed(2)} per check • Next {new Date(paySchedule.nextPayDate).toLocaleDateString()}
              </div>
            ) : <div className="text-sm text-slate-600 mt-1">Not set.</div>}
          </div>
          <button className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" onClick={() => setShowPayForm(true)}>{paySchedule ? 'Edit' : 'Set up'}</button>
        </div>
      </div>

      {/* Envelopes */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold">Envelopes</h3>
          <button className="px-3 py-2 rounded-xl bg-emerald-100 text-emerald-700 font-semibold"
            onClick={() => {
              const name = prompt('Envelope name:');
              if (!name) return;
              const amt = parseAmt(prompt('Amount per check:') || 0);
              setEnvelopes([...envelopes, { id: Date.now(), name, perCheck: amt }]);
            }}
          >Add</button>
        </div>
        {envelopes.length ? (
          <div className="space-y-2">
            {envelopes.map(e => (
              <div key={e.id} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                <div className="font-semibold">{e.name}</div>
                <div className="flex items-center gap-2">
                  <div className="text-slate-600">${parseAmt(e.perCheck).toFixed(2)} / check</div>
                  <button className="px-2 py-1 text-blue-700 bg-blue-100 rounded-lg"
                    onClick={() => {
                      const v = parseAmt(prompt(`New amount for "${e.name}":`, e.perCheck) || 0);
                      setEnvelopes(envelopes.map(x => x.id === e.id ? { ...x, perCheck: v } : x));
                    }}
                  >Edit</button>
                  <button className="px-2 py-1 text-red-700 bg-red-100 rounded-lg" onClick={() => setEnvelopes(envelopes.filter(x => x.id !== e.id))}>Remove</button>
                </div>
              </div>
            ))}
            <div className="text-sm text-slate-600">Total reserved per check: <b>${perCheckEnvelopeSum().toFixed(2)}</b></div>
          </div>
        ) : <div className="text-slate-600">No envelopes yet.</div>}
      </div>

      {/* Category Budgets */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold">Category Budgets</h3>
          <button className="px-3 py-2 rounded-xl bg-emerald-100 text-emerald-700 font-semibold"
            onClick={() => {
              const cat = prompt('Category (utilities, subscription, insurance, loan, rent, other):');
              if (!cat) return;
              const cap = parseAmt(prompt('Monthly cap:') || 0);
              setBudgets({ ...budgets, [cat]: cap });
            }}
          >Set/Update</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
          {Object.entries(budgets).map(([k, v]) => (
            <div key={k} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
              <span className="font-semibold capitalize">{k}</span>
              <span>${parseAmt(v).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Google Calendar */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Google Calendar Integration</h3>
            <p className="text-slate-600 text-sm">Sync your bills and payment dates to your calendar</p>
          </div>
          <div className="flex items-center gap-2">
            {calendarConnected && (
              <button onClick={syncToCalendar} className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl font-semibold flex items-center gap-2"><RefreshCw size={16} />Sync Now</button>
            )}
            <button onClick={connectGoogleCalendar} className={`px-4 py-2 rounded-xl font-semibold ${calendarConnected ? 'bg-green-100 text-green-700' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>
              {calendarConnected ? '✓ Connected' : 'Connect'}
            </button>
          </div>
        </div>
        {calendarConnected && <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-green-800 text-sm">✓ Calendar is connected. (Demo mode)</div>}
      </div>

      {/* Backup & Restore */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-slate-800">Backup & Restore</h3>
          <p className="text-slate-600 text-sm">Export your data or restore from a backup file</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportBackup} className="flex-1 px-4 py-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2">
            <Download size={18} />Export Backup
          </button>
          <button onClick={() => backupFileInputRef.current?.click()} className="flex-1 px-4 py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2">
            <Upload size={18} />Restore Backup
          </button>
          <input ref={backupFileInputRef} type="file" accept=".json" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) { importBackupFromFile(file); e.target.value = ''; }
          }} className="hidden" />
        </div>
        <div className="mt-4 bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
          <p className="text-amber-800 text-sm"><strong>Note:</strong> Backups include templates, instances, assets, one-time bills, and settings. Keep them secure.</p>
        </div>
      </div>
    </div>
  );

  // ---------- Propane Modal ----------
  const PropaneModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">Add Propane Fill</h2>
          <form onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const gallons = parseAmt(fd.get('gallons'));
            const pricePerGal = parseAmt(fd.get('pricePerGal'));
            addPropaneFill({
              date: fd.get('date'),
              gallons: gallons.toFixed(2),
              pricePerGal: pricePerGal.toFixed(2),
              totalCost: (gallons * pricePerGal).toFixed(2)
            });
            setShowPropaneForm(false);
          }} className="space-y-4">
            <div><label className="block text-sm font-semibold mb-2">Fill Date</label><input type="date" name="date" required className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none" /></div>
            <div><label className="block text-sm font-semibold mb-2">Gallons Delivered</label><input type="number" step="0.1" name="gallons" required className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none" /></div>
            <div><label className="block text-sm font-semibold mb-2">Price per Gallon</label><input type="number" step="0.01" name="pricePerGal" required className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none" /></div>
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => setShowPropaneForm(false)} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold">Cancel</button>
              <button type="submit" className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold">Add Fill</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  // ---------- Shell & Routing ----------
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
        <Header />

        {view === 'dashboard' && <Dashboard />}
        {view === 'bills' && <BillsTemplates />}
        {view === 'checklist' && <Checklist />}
        {view === 'submit' && <SubmitActuals />}
        {view === 'assets' && <AssetsView />}
        {view === 'onetime' && <OneTimeView />}
        {view === 'propane' && <PropaneView />}
        {view === 'analytics' && <AnalyticsView />}
        {view === 'settings' && (
          <SettingsView />
        )}

        {/* Modals */}
        {showTemplateForm && (
          <TemplateForm
            defaultValue={editingTemplate ? {
              name: editingTemplate.name,
              amount: editingTemplate.amount,
              isVariable: editingTemplate.isVariable,
              category: editingTemplate.category,
              autopay: editingTemplate.autopay,
              dueDate: editingTemplate.dueDay,
              frequency: editingTemplate.frequency,
            } : null}
            onCancel={() => { setShowTemplateForm(false); setEditingTemplate(null); }}
            onSubmit={(form) => { editingTemplate ? updateBillTemplate(form) : addBillTemplate(form); setShowTemplateForm(false); }}
          />
        )}

        {showPayForm && (
          <PayForm
            defaultValue={paySchedule || { frequency: 'biweekly', payAmount: '', nextPayDate: '' }}
            onCancel={() => setShowPayForm(false)}
            onSubmit={(f) => { setPaySchedule(f); setShowPayForm(false); setTimeout(assignInstancesToChecks, 0); }}
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

        {showPropaneForm && <PropaneModal />}

        {showDebtForm && (
          <DebtForm
            onSubmit={addDebt}
            onCancel={() => setShowDebtForm(false)}
          />
        )}

        {editingDebt && (
          <DebtForm
            debt={editingDebt}
            onSubmit={updateDebt}
            onCancel={() => setEditingDebt(null)}
          />
        )}
      </div>
    </div>
  );
};

export default BillPayPlanner;