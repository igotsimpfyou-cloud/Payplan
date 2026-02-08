import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Home,
  Settings as SettingsIcon,
  List,
  BarChart3,
  Receipt,
  Building2,
  Calendar,
  Flame,
  Check,
  Wallet,
  ChevronDown,
  ChevronUp,
  Menu,
  ClipboardCheck,
  TrendingUp,
  LineChart,
} from 'lucide-react';

// Utils
import { toYMD, startOfMonth, addMonths, sameMonth, idForInstance, parseLocalDate, toLocalMidnight } from './utils/dateHelpers';
import { parseAmt } from './utils/formatters';
import { calculateNextPayDates, monthlyTotal } from './utils/calculations';

// Constants
import {
  LS_TEMPLATES,
  LS_INSTANCES,
  LS_ASSETS,
  LS_ONETIME,
  LS_PAY,
  LS_CAL,
  LS_PROPANE,
  LS_EMERGENCY,
  LS_DEBTS,
  LS_ENVELOPES,
  LS_BUDGETS,
  LS_ACTUAL_PAY,
  LS_SCANNED_RECEIPTS,
  LS_INVESTMENTS,
  LS_BILLS,
  LS_HISTORICAL_BILLS,
  LS_PAYCHECKS,
  LS_LAST_ROLLOVER,
} from './constants/storageKeys';

// Bill Database utilities
import {
  generateBillsFromTemplate,
  generatePaychecksFromSchedule,
  migrateFromInstances,
  migrateOneTimeBills,
  separateActiveAndHistorical,
  needsMonthlyRollover,
  getCurrentMonth,
  assignBillToPaycheck,
  parseMMDDYYYY,
  toMMDDYYYY,
  generateBillId,
} from './utils/billDatabase';

// Forms
import { TemplateForm } from './components/forms/TemplateForm';
import { PayScheduleForm } from './components/forms/PayScheduleForm';
import { AssetForm } from './components/forms/AssetForm';
import { OneTimeForm } from './components/forms/OneTimeForm';
import { PropaneForm } from './components/forms/PropaneForm';

// Views
import { Dashboard } from './components/views/Dashboard';
import { BillsTemplates } from './components/views/BillsTemplates';
import { Checklist } from './components/views/Checklist';
import { SubmitActuals } from './components/views/SubmitActuals';
import { Assets } from './components/views/Assets';
import { OneTime } from './components/views/OneTime';
import { Propane } from './components/views/Propane';
import { Analytics } from './components/views/Analytics';
import { Settings } from './components/views/Settings';
import { Retirement } from './components/views/Retirement';
import { Investments } from './components/views/Investments';

/**
 * PayPlan Pro - Slim Orchestrator
 * Manages state and coordinates between extracted components
 */
const BillPayPlanner = () => {
  const [view, setView] = useState('dashboard');
  const [openDrawer, setOpenDrawer] = useState(null); // Track which nav drawer is open

  // Core (new database model)
  const [billTemplates, setBillTemplates] = useState([]);
  const [bills, setBills] = useState([]);                     // Active bills (18-month window)
  const [historicalBills, setHistoricalBills] = useState([]); // Archived bills (12+ months)
  const [paychecks, setPaychecks] = useState([]);             // Income records
  const [lastRolloverMonth, setLastRolloverMonth] = useState(null);

  // Legacy - kept for migration, will be removed
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
  const [budgets, setBudgets] = useState({
    utilities: 0,
    subscription: 0,
    insurance: 0,
    loan: 0,
    rent: 0,
    other: 0,
  });
  const [actualPayEntries, setActualPayEntries] = useState([]);
  const [scannedReceipts, setScannedReceipts] = useState([]);
  const [investments, setInvestments] = useState([]);

  // UI modals
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showPayForm, setShowPayForm] = useState(false);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [showOneTimeForm, setShowOneTimeForm] = useState(false);
  const [editingOneTime, setEditingOneTime] = useState(null);
  const [showPropaneForm, setShowPropaneForm] = useState(false);
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
      const ap = localStorage.getItem(LS_ACTUAL_PAY);
      const sr = localStorage.getItem(LS_SCANNED_RECEIPTS);
      const inv = localStorage.getItem(LS_INVESTMENTS);

      // New database storage
      const billsData = localStorage.getItem(LS_BILLS);
      const historicalBillsData = localStorage.getItem(LS_HISTORICAL_BILLS);
      const paychecksData = localStorage.getItem(LS_PAYCHECKS);
      const lastRollover = localStorage.getItem(LS_LAST_ROLLOVER);

      // MIGRATION: if old 'bills' exists, migrate to templates
      const legacyBills = localStorage.getItem('bills');
      if (!t && legacyBills) {
        const legacy = JSON.parse(legacyBills);
        const asTemplates = legacy.map((b) => ({
          id: b.id || Date.now() + Math.random(),
          name: b.name,
          amount: parseAmt(b.amount),
          isVariable: !!b.isVariable,
          category: b.category || 'utilities',
          autopay: !!b.autopay,
          frequency: b.frequency || 'monthly',
          dueDay: parseInt(b.dueDate, 10),
          firstDueDate: b.nextDueDate || new Date().toISOString().split('T')[0],
          historicalPayments: b.historicalPayments || [],
        }));
        localStorage.setItem(LS_TEMPLATES, JSON.stringify(asTemplates));
        localStorage.removeItem('bills');
      }

      // Load templates
      let loadedTemplates = [];
      if (localStorage.getItem(LS_TEMPLATES)) {
        loadedTemplates = JSON.parse(localStorage.getItem(LS_TEMPLATES));
        setBillTemplates(loadedTemplates);
      }

      // Load pay schedule
      let loadedPaySchedule = null;
      if (p) {
        loadedPaySchedule = JSON.parse(p);
        setPaySchedule(loadedPaySchedule);
      }

      // Load or migrate bills
      if (billsData) {
        // New format exists - load it
        setBills(JSON.parse(billsData));
        if (historicalBillsData) setHistoricalBills(JSON.parse(historicalBillsData));
        if (paychecksData) setPaychecks(JSON.parse(paychecksData));
        if (lastRollover) setLastRolloverMonth(lastRollover);
      } else if (i) {
        // Migrate from old instances
        const oldInstances = JSON.parse(i);
        const migratedBills = migrateFromInstances(oldInstances, loadedTemplates);

        // Separate into active and historical
        const { active, historical } = separateActiveAndHistorical(migratedBills);
        setBills(active);
        setHistoricalBills(historical);

        // Generate 6 months of bills from templates
        const now = new Date();
        const newBills = [];
        for (const template of loadedTemplates) {
          const generated = generateBillsFromTemplate(template, 6, now, active);
          newBills.push(...generated);
        }
        if (newBills.length > 0) {
          setBills(prev => [...prev, ...newBills]);
        }

        // Generate paychecks if pay schedule exists
        if (loadedPaySchedule) {
          const generatedPaychecks = generatePaychecksFromSchedule(loadedPaySchedule, 6, []);
          setPaychecks(generatedPaychecks);
        }

        setLastRolloverMonth(getCurrentMonth());

        // Clear old instances storage after migration
        // localStorage.removeItem(LS_INSTANCES); // Keep for now as backup
      } else {
        // Fresh start - generate bills from templates
        const now = new Date();
        const newBills = [];
        for (const template of loadedTemplates) {
          const generated = generateBillsFromTemplate(template, 6, now, []);
          newBills.push(...generated);
        }
        setBills(newBills);

        if (loadedPaySchedule) {
          const generatedPaychecks = generatePaychecksFromSchedule(loadedPaySchedule, 6, []);
          setPaychecks(generatedPaychecks);
        }

        setLastRolloverMonth(getCurrentMonth());
      }

      // Load legacy instances for backward compatibility during transition
      if (i) setBillInstances(JSON.parse(i));

      if (a) setAssets(JSON.parse(a));
      if (o) setOneTimeBills(JSON.parse(o));
      if (c) setCalendarConnected(JSON.parse(c));
      if (pr) setPropaneFills(JSON.parse(pr));
      if (e) setEmergencyFund(JSON.parse(e));
      if (d) setDebtPayoff(JSON.parse(d));
      if (env) setEnvelopes(JSON.parse(env));
      if (bud) setBudgets(JSON.parse(bud));
      if (ap) setActualPayEntries(JSON.parse(ap));
      if (sr) setScannedReceipts(JSON.parse(sr));
      if (inv) setInvestments(JSON.parse(inv));
    } catch (err) {
      console.warn('Load error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------- Persist ----------
  useEffect(
    () => localStorage.setItem(LS_TEMPLATES, JSON.stringify(billTemplates)),
    [billTemplates]
  );
  useEffect(
    () => localStorage.setItem(LS_INSTANCES, JSON.stringify(billInstances)),
    [billInstances]
  );
  useEffect(
    () => localStorage.setItem(LS_ASSETS, JSON.stringify(assets)),
    [assets]
  );
  useEffect(
    () => localStorage.setItem(LS_ONETIME, JSON.stringify(oneTimeBills)),
    [oneTimeBills]
  );
  useEffect(
    () => localStorage.setItem(LS_PAY, JSON.stringify(paySchedule)),
    [paySchedule]
  );
  useEffect(
    () => localStorage.setItem(LS_CAL, JSON.stringify(calendarConnected)),
    [calendarConnected]
  );
  useEffect(
    () => localStorage.setItem(LS_PROPANE, JSON.stringify(propaneFills)),
    [propaneFills]
  );
  useEffect(
    () => localStorage.setItem(LS_EMERGENCY, JSON.stringify(emergencyFund)),
    [emergencyFund]
  );
  useEffect(
    () => localStorage.setItem(LS_DEBTS, JSON.stringify(debtPayoff)),
    [debtPayoff]
  );
  useEffect(
    () => localStorage.setItem(LS_ENVELOPES, JSON.stringify(envelopes)),
    [envelopes]
  );
  useEffect(
    () => localStorage.setItem(LS_BUDGETS, JSON.stringify(budgets)),
    [budgets]
  );
  useEffect(
    () => localStorage.setItem(LS_ACTUAL_PAY, JSON.stringify(actualPayEntries)),
    [actualPayEntries]
  );
  useEffect(
    () => localStorage.setItem(LS_SCANNED_RECEIPTS, JSON.stringify(scannedReceipts)),
    [scannedReceipts]
  );
  useEffect(
    () => localStorage.setItem(LS_INVESTMENTS, JSON.stringify(investments)),
    [investments]
  );

  // New database persistence
  useEffect(
    () => localStorage.setItem(LS_BILLS, JSON.stringify(bills)),
    [bills]
  );
  useEffect(
    () => localStorage.setItem(LS_HISTORICAL_BILLS, JSON.stringify(historicalBills)),
    [historicalBills]
  );
  useEffect(
    () => localStorage.setItem(LS_PAYCHECKS, JSON.stringify(paychecks)),
    [paychecks]
  );
  useEffect(
    () => {
      if (lastRolloverMonth) {
        localStorage.setItem(LS_LAST_ROLLOVER, lastRolloverMonth);
      }
    },
    [lastRolloverMonth]
  );

  // ---------- Monthly rollover - generate new month's bills on first load ----------
  useEffect(() => {
    if (!billTemplates.length || loading) return;

    if (needsMonthlyRollover(lastRolloverMonth)) {
      // Generate next month's bills
      const now = new Date();
      const newBills = [];

      for (const template of billTemplates) {
        // Generate from current month forward (will skip existing)
        const generated = generateBillsFromTemplate(template, 6, now, bills);
        newBills.push(...generated);
      }

      if (newBills.length > 0) {
        setBills(prev => [...prev, ...newBills]);
      }

      // Generate new paychecks if schedule exists
      if (paySchedule) {
        const newPaychecks = generatePaychecksFromSchedule(paySchedule, 6, paychecks);
        if (newPaychecks.length > 0) {
          setPaychecks(prev => [...prev, ...newPaychecks]);
        }
      }

      // Archive old bills (12+ months)
      const { active, historical } = separateActiveAndHistorical(bills);
      if (historical.length > 0) {
        setBills(active);
        setHistoricalBills(prev => [...prev, ...historical]);
      }

      setLastRolloverMonth(getCurrentMonth());
    }
  }, [billTemplates, lastRolloverMonth, loading]);

  // ---------- Instance generation (legacy - kept for compatibility) ----------
  useEffect(() => {
    if (!billTemplates.length) return;
    const now = new Date();
    const end = startOfMonth(addMonths(now, 2));
    const updated = [...billInstances];
    let changed = false;

    const ensureInstance = (tmpl, due) => {
      const id = idForInstance(tmpl.name, due);
      if (!updated.find((x) => x.id === id)) {
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

    billTemplates.forEach((tmpl) => {
      const first = new Date(tmpl.firstDueDate);
      if (isNaN(first)) return;
      let cursor =
        startOfMonth(first) < startOfMonth(now)
          ? startOfMonth(now)
          : startOfMonth(first);
      while (cursor <= end) {
        const day = Math.min(
          parseInt(tmpl.dueDay, 10),
          new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
        );
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
    const day = Math.min(
      parseInt(tmpl.dueDay, 10),
      new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
    );
    const due = new Date(next.getFullYear(), next.getMonth(), day);
    const id = idForInstance(tmpl.name, due);
    if (!billInstances.find((x) => x.id === id)) {
      setBillInstances((prev) =>
        [
          ...prev,
          {
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
          },
        ].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      );
    }
  };

  // ---------- Next pay dates + assignment ----------
  const nextPayDates = useMemo(
    () => calculateNextPayDates(paySchedule),
    [paySchedule]
  );

  // Calculate assignment for a bill based on due date
  // Returns null if bill is due on or after the 4-check window cutoff
  const calculateBillAssignment = (dueDate, checks, cutoffDate) => {
    // If due date is on or after our cutoff (Check #5), don't assign yet
    if (cutoffDate && dueDate >= cutoffDate) {
      return null;
    }

    let idx = 1;
    for (let i = 0; i < checks.length; i++) {
      if (checks[i] <= dueDate) {
        idx = i + 1;
      } else {
        break;
      }
    }
    return idx;
  };

  // Force reassign ALL bills (called by Re-assign button)
  const assignInstancesToChecks = () => {
    if (!nextPayDates.length) return;
    const checks = nextPayDates.slice(0, 4).map(toLocalMidnight);

    // Calculate cutoff: ~2 weeks after Check #4 (or when Check #5 would be)
    const check5 = nextPayDates[4] ? toLocalMidnight(nextPayDates[4]) : null;
    const cutoffDate = check5 || new Date(checks[3].getTime() + 14 * 24 * 60 * 60 * 1000);

    // Update legacy billInstances - force reassign all
    setBillInstances((prev) =>
      prev.map((inst) => {
        const due = parseLocalDate(inst.dueDate);
        const idx = calculateBillAssignment(due, checks, cutoffDate);

        // If null, bill is too far in future - clear assignment
        if (idx === null) {
          return {
            ...inst,
            assignedCheck: null,
            assignedPayDate: null,
            manuallyAssigned: false,
          };
        }

        return {
          ...inst,
          assignedCheck: idx,
          assignedPayDate: toYMD(checks[idx - 1]),
          manuallyAssigned: false,
        };
      })
    );

    // Update new bills array - force reassign all
    setBills((prev) =>
      prev.map((bill) => {
        if (bill.paid) return bill;
        const due = parseMMDDYYYY(bill.dueDate);
        if (!due) return bill;

        const idx = calculateBillAssignment(due, checks, cutoffDate);

        // If null, bill is too far in future - clear assignment
        if (idx === null) {
          return {
            ...bill,
            assignedCheck: null,
            assignedPayDate: null,
            manuallyAssigned: false,
          };
        }

        return {
          ...bill,
          assignedCheck: idx,
          assignedPayDate: toMMDDYYYY(checks[idx - 1]),
          manuallyAssigned: false,
        };
      })
    );
  };

  // Auto-assign only NEW bills (ones without assignedCheck)
  const autoAssignNewBills = () => {
    if (!nextPayDates.length) return;
    const checks = nextPayDates.slice(0, 4).map(toLocalMidnight);

    // Calculate cutoff: ~2 weeks after Check #4 (or when Check #5 would be)
    const check5 = nextPayDates[4] ? toLocalMidnight(nextPayDates[4]) : null;
    const cutoffDate = check5 || new Date(checks[3].getTime() + 14 * 24 * 60 * 60 * 1000);

    setBillInstances((prev) =>
      prev.map((inst) => {
        // Skip if already assigned
        if (inst.assignedCheck) return inst;
        const due = parseLocalDate(inst.dueDate);
        const idx = calculateBillAssignment(due, checks, cutoffDate);

        // If null, bill is too far in future - don't assign
        if (idx === null) return inst;

        return {
          ...inst,
          assignedCheck: idx,
          assignedPayDate: toYMD(checks[idx - 1]),
        };
      })
    );

    setBills((prev) =>
      prev.map((bill) => {
        // Skip if already assigned or paid
        if (bill.paid || bill.assignedCheck) return bill;
        const due = parseMMDDYYYY(bill.dueDate);
        if (!due) return bill;

        const idx = calculateBillAssignment(due, checks, cutoffDate);

        // If null, bill is too far in future - don't assign
        if (idx === null) return bill;

        return {
          ...bill,
          assignedCheck: idx,
          assignedPayDate: toMMDDYYYY(checks[idx - 1]),
        };
      })
    );
  };

  // Only auto-assign new bills, don't overwrite existing assignments
  useEffect(() => {
    autoAssignNewBills();
    // eslint-disable-next-line
  }, [billInstances.length, paySchedule]);

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
        const monthLen = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          0
        ).getDate();
        const real = Math.min(d, monthLen);
        let dt = new Date(today.getFullYear(), today.getMonth(), real);
        if (dt < today) dt = addMonths(dt, 1);
        return toYMD(dt);
      })(),
      historicalPayments: billData.historicalPayments || [],
      retireDate: null,
    };
    setBillTemplates((prev) => [...prev, tmpl]);

    // Generate 6 months of bills for this new template
    const newBills = generateBillsFromTemplate(tmpl, 6, new Date(), bills);
    if (newBills.length > 0) {
      setBills((prev) => [...prev, ...newBills]);
    }

    setShowTemplateForm(false);
  };

  const updateBillTemplate = async (billData) => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    setBillTemplates((prev) =>
      prev.map((t) =>
        t.id === editingTemplate.id
          ? {
              ...t,
              name: billData.name,
              amount: parseAmt(billData.amount),
              isVariable: !!billData.isVariable,
              category: billData.category,
              autopay: !!billData.autopay,
              frequency: billData.frequency,
              dueDay: parseInt(billData.dueDate, 10),
            }
          : t
      )
    );

    // Update FUTURE bills only (next month and beyond)
    // Keep past and current month bills unchanged
    setBills((prev) =>
      prev.map((bill) => {
        if (bill.templateId !== editingTemplate.id) return bill;

        const billDate = parseMMDDYYYY(bill.dueDate);
        if (!billDate || billDate < nextMonth) return bill; // Don't change past/current month

        // Update future bill with new template data
        return {
          ...bill,
          name: billData.name,
          amount: parseAmt(billData.amount),
          isVariable: !!billData.isVariable,
          category: billData.category,
          autopay: !!billData.autopay,
        };
      })
    );

    setEditingTemplate(null);
  };

  const retireTemplate = async (tmplId) => {
    const tmpl = billTemplates.find((t) => t.id === tmplId);
    if (!tmpl) return;
    if (
      !confirm(
        `Retire "${tmpl.name}"?\nFuture unpaid bills will be removed. Paid bills will be kept in history.`
      )
    )
      return;

    const now = new Date();
    const retireDate = toYMD(now);

    // Set retire date on template (keeps template for reference)
    setBillTemplates((prev) =>
      prev.map((t) =>
        t.id === tmplId ? { ...t, retireDate } : t
      )
    );

    // Remove future UNPAID bills for this template
    // Keep all paid bills (they go to history)
    setBills((prev) =>
      prev.filter((bill) => {
        if (bill.templateId !== tmplId) return true;
        if (bill.paid) return true; // Keep paid bills
        const billDate = parseMMDDYYYY(bill.dueDate);
        return billDate && billDate < now; // Keep past bills
      })
    );

    // Legacy support
    const related = billInstances.filter((i) => i.templateId === tmplId);
    const lastPaid = related
      .filter((i) => i.paid)
      .sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate))[0];
    const cutoff = lastPaid ? new Date(lastPaid.dueDate) : new Date(0);

    setBillInstances((prev) =>
      prev.filter(
        (i) => i.templateId !== tmplId || new Date(i.dueDate) < cutoff
      )
    );
  };

  // ---------- Mark paid ----------
  const toggleInstancePaid = async (instanceId) => {
    // Try to find in new bills array first
    const bill = bills.find((b) => b.id === instanceId);

    if (bill) {
      // New system
      if (bill.autopay) {
        const ok = confirm('This bill is on Auto-pay. Mark paid/unpaid anyway?');
        if (!ok) return;
      }

      const nowPaid = !bill.paid;
      const paidDate = nowPaid ? toYMD(new Date()) : null;

      setBills((prev) =>
        prev.map((b) =>
          b.id === instanceId
            ? { ...b, paid: nowPaid, paidDate }
            : b
        )
      );
      return;
    }

    // Legacy system fallback
    const inst = billInstances.find((i) => i.id === instanceId);
    if (!inst) return;

    if (inst.autopay) {
      const ok = confirm('This bill is on Auto-pay. Mark paid/unpaid anyway?');
      if (!ok) return;
    }
    const nowPaid = !inst.paid;
    setBillInstances((prev) =>
      prev.map((i) => (i.id === instanceId ? { ...i, paid: nowPaid } : i))
    );

    if (nowPaid) {
      const tmpl = billTemplates.find((t) => t.id === inst.templateId);
      if (tmpl && sameMonth(new Date(inst.dueDate), new Date())) {
        ensureNextMonthForTemplate(tmpl, new Date(inst.dueDate));
      }
    }
  };

  // ---------- Submit Actuals ----------
  const submitActualPaid = (instanceId, value) => {
    const actual = parseAmt(value);

    // Try new bills array first
    const bill = bills.find((b) => b.id === instanceId);
    if (bill) {
      setBills((prev) =>
        prev.map((b) => (b.id === instanceId ? { ...b, actualPaid: actual } : b))
      );

      // Update template estimate based on all paid bills
      const tmpl = billTemplates.find((t) => t.id === bill.templateId);
      if (tmpl) {
        // Calculate new estimate from all paid bills for this template
        const paidBills = bills.filter(
          (b) => b.templateId === tmpl.id && b.actualPaid != null
        );
        const allAmounts = [...paidBills.map((b) => b.actualPaid), actual];
        const newEstimate = allAmounts.reduce((s, a) => s + a, 0) / allAmounts.length;

        setBillTemplates((prev) =>
          prev.map((t) =>
            t.id === tmpl.id ? { ...t, amount: newEstimate } : t
          )
        );
      }
      return;
    }

    // Legacy fallback
    const inst = billInstances.find((x) => x.id === instanceId);
    if (!inst) return;
    const tmpl = billTemplates.find((t) => t.id === inst.templateId);
    if (!tmpl) return;

    setBillInstances((prev) =>
      prev.map((x) => (x.id === instanceId ? { ...x, actualPaid: actual } : x))
    );

    const instDate = new Date(inst.dueDate);
    const lastYear = new Date(instDate.getFullYear() - 1, instDate.getMonth(), 1);
    const key = toYMD(lastYear).slice(0, 7);
    const history = Array.isArray(tmpl.historicalPayments)
      ? [...tmpl.historicalPayments]
      : [];
    const idx = history.findIndex((h) => (h.date || '').startsWith(key));
    if (idx >= 0) history[idx] = { date: `${key}-01`, amount: actual };
    else history.push({ date: `${key}-01`, amount: actual });

    let estimate = tmpl.amount;
    const nums = history.map((h) => parseAmt(h.amount)).filter((n) => n > 0);
    if (nums.length) estimate = nums.reduce((s, n) => s + n, 0) / nums.length;

    setBillTemplates((prev) =>
      prev.map((t) =>
        t.id === tmpl.id
          ? { ...t, historicalPayments: history, amount: estimate }
          : t
      )
    );

    const now = new Date();
    setBillInstances((prev) =>
      prev.map((x) => {
        if (x.templateId !== tmpl.id) return x;
        const xd = new Date(x.dueDate);
        if (xd >= startOfMonth(now)) return { ...x, amountEstimate: estimate };
        return x;
      })
    );
  };

  // ---------- Helpers ----------
  const perCheckEnvelopeSum = () =>
    envelopes.reduce((s, e) => s + parseAmt(e.perCheck), 0);

  // ---------- Backup / Restore ----------
  const exportBackup = () => {
    const payload = {
      app: 'PayPlan Pro',
      version: 3, // Bump version for new database format
      exportedAt: new Date().toISOString(),
      data: {
        billTemplates,
        billInstances, // Legacy, kept for compatibility
        bills,         // New database format
        historicalBills,
        paychecks,
        lastRolloverMonth,
        assets,
        oneTimeBills,
        paySchedule,
        propaneFills,
        calendarConnected,
        emergencyFund,
        debtPayoff,
        envelopes,
        budgets,
        actualPayEntries,
        scannedReceipts,
        investments,
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
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
    setBills(Array.isArray(d?.bills) ? d.bills : []);
    setHistoricalBills(Array.isArray(d?.historicalBills) ? d.historicalBills : []);
    setPaychecks(Array.isArray(d?.paychecks) ? d.paychecks : []);
    if (d?.lastRolloverMonth) setLastRolloverMonth(d.lastRolloverMonth);
    setAssets(Array.isArray(d?.assets) ? d.assets : []);
    setOneTimeBills(Array.isArray(d?.oneTimeBills) ? d.oneTimeBills : []);
    setPaySchedule(d?.paySchedule ?? null);
    setPropaneFills(Array.isArray(d?.propaneFills) ? d.propaneFills : []);
    setCalendarConnected(!!d?.calendarConnected);
    setEmergencyFund(d?.emergencyFund || { target: 0, current: 0 });
    setDebtPayoff(Array.isArray(d?.debtPayoff) ? d.debtPayoff : []);
    setEnvelopes(Array.isArray(d?.envelopes) ? d.envelopes : []);
    setBudgets(
      d?.budgets || {
        utilities: 0,
        subscription: 0,
        insurance: 0,
        loan: 0,
        rent: 0,
        other: 0,
      }
    );
    setActualPayEntries(Array.isArray(d?.actualPayEntries) ? d.actualPayEntries : []);
    setScannedReceipts(Array.isArray(d?.scannedReceipts) ? d.scannedReceipts : []);
    setInvestments(Array.isArray(d?.investments) ? d.investments : []);
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

  // ---------- Assets ----------
  const addAsset = async (assetData) => {
    const newAsset = {
      id: Date.now(),
      ...assetData,
      startDate: assetData.startDate || new Date().toISOString().split('T')[0],
    };
    setAssets([...assets, newAsset]);
    setShowAssetForm(false);

    if (assetData.createBill) {
      const tmpl = {
        name: assetData.name,
        amount: parseAmt(assetData.paymentAmount),
        isVariable: false,
        category: 'loan',
        autopay: false,
        frequency: assetData.paymentFrequency || 'monthly',
        dueDate: new Date(assetData.startDate).getDate().toString(),
        historicalPayments: [],
      };
      addBillTemplate(tmpl);
    }
  };

  const updateAsset = async (assetData) => {
    setAssets(
      assets.map((a) =>
        a.id === editingAsset.id ? { ...a, ...assetData } : a
      )
    );
    setEditingAsset(null);
  };

  const deleteAsset = async (assetId) =>
    setAssets(assets.filter((a) => a.id !== assetId));

  // ---------- One-Time Bills ----------
  const addOneTimeBill = async (billData) => {
    const newBill = {
      id: Date.now(),
      ...billData,
      paid: false,
      addedDate: new Date().toISOString(),
    };
    setOneTimeBills([...oneTimeBills, newBill]);
    setShowOneTimeForm(false);
  };

  const updateOneTimeBill = async (billData) => {
    setOneTimeBills(
      oneTimeBills.map((b) =>
        b.id === editingOneTime.id ? { ...b, ...billData } : b
      )
    );
    setEditingOneTime(null);
  };

  const deleteOneTimeBill = async (billId) =>
    setOneTimeBills(oneTimeBills.filter((b) => b.id !== billId));

  const toggleOneTimePaid = async (billId) => {
    setOneTimeBills(
      oneTimeBills.map((b) =>
        b.id === billId
          ? { ...b, paid: !b.paid, paidDate: !b.paid ? new Date().toISOString() : null }
          : b
      )
    );
  };

  // ---------- Propane ----------
  const addPropaneFill = async (fill) => {
    const newFill = { ...fill, id: Date.now() };
    setPropaneFills([...propaneFills, newFill]);
    setShowPropaneForm(false);
  };

  const deletePropaneFill = async (id) =>
    setPropaneFills(propaneFills.filter((f) => f.id !== id));

  // ---------- Actual Pay Entries ----------
  const addActualPayEntry = (payDate, amount, overtimeHours = 0) => {
    const entry = {
      id: Date.now(),
      payDate,
      amount: parseAmt(amount),
      overtimeHours: parseAmt(overtimeHours),
      createdAt: new Date().toISOString(),
    };
    setActualPayEntries((prev) => [...prev, entry]);
  };

  const deleteActualPayEntry = (id) =>
    setActualPayEntries((prev) => prev.filter((e) => e.id !== id));

  // ---------- Scanned Receipts ----------
  const addScannedReceipt = (receipt) => {
    const entry = {
      id: Date.now(),
      merchant: receipt.merchant || 'Unknown',
      amount: parseAmt(receipt.amount),
      date: receipt.date || new Date().toISOString().split('T')[0],
      category: receipt.category || 'other',
      notes: receipt.notes || '',
      createdAt: new Date().toISOString(),
    };
    setScannedReceipts((prev) => [...prev, entry]);
  };

  const deleteScannedReceipt = (id) =>
    setScannedReceipts((prev) => prev.filter((r) => r.id !== id));

  // ---------- Investments ----------
  const addInvestment = (holding) => {
    setInvestments((prev) => [...prev, holding]);
  };

  const updateInvestment = (holding) => {
    setInvestments((prev) =>
      prev.map((h) => (h.id === holding.id ? holding : h))
    );
  };

  const deleteInvestment = (id) => {
    setInvestments((prev) => prev.filter((h) => h.id !== id));
  };

  // ---------- Calendar ----------
  // Calendar export is now handled directly in Settings via ICS file download
  // No account connection needed - users just download and import the .ics file

  // ---------- Overview helpers ----------
  // Convert new bills format to legacy format for views compatibility
  const currentMonthInstances = useMemo(() => {
    const now = new Date();

    // Use new bills array, converting to legacy format for compatibility
    return bills
      .filter((bill) => {
        const billDate = parseMMDDYYYY(bill.dueDate);
        return billDate && sameMonth(billDate, now);
      })
      .map((bill) => ({
        ...bill,
        // Map new format fields to legacy field names for view compatibility
        amountEstimate: bill.amount,
        dueDate: (() => {
          // Convert MMDDYYYY to YYYY-MM-DD for legacy compatibility
          const d = parseMMDDYYYY(bill.dueDate);
          return d ? toYMD(d) : bill.dueDate;
        })(),
      }))
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  }, [bills]);

  const overview = useMemo(() => {
    const monthlyBills = monthlyTotal(currentMonthInstances);
    const upcomingOneTime = oneTimeBills
      .filter((b) => !b.paid)
      .reduce((s, b) => s + parseAmt(b.amount), 0);

    let monthlyIncome = 0;
    let paychecksThisMonth = 0;
    let nextPaycheckDate = null;
    let daysUntilNextPaycheck = null;

    if (paySchedule?.nextPayDate) {
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      const payAmount = parseAmt(paySchedule.payAmount);
      paychecksThisMonth = nextPayDates.filter(
        (d) => d.getMonth() === currentMonth && d.getFullYear() === currentYear
      ).length;
      monthlyIncome = payAmount * paychecksThisMonth;
      nextPaycheckDate = nextPayDates.find((d) => d >= today);
      if (nextPaycheckDate) {
        const diff = nextPaycheckDate.getTime() - today.getTime();
        daysUntilNextPaycheck = Math.ceil(diff / (1000 * 3600 * 24));
      }
    }
    const leftover = monthlyIncome - monthlyBills;

    return {
      monthlyBills,
      totalMonthly: monthlyBills,
      upcomingOneTime,
      monthlyIncome,
      leftover,
      paychecksThisMonth,
      nextPaycheckDate,
      daysUntilNextPaycheck,
    };
  }, [currentMonthInstances, oneTimeBills, paySchedule, nextPayDates]);

  // ---------- Navigation Configuration ----------
  const navCategories = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      view: 'dashboard', // Direct link, no drawer
    },
    {
      id: 'bills',
      label: 'Bills',
      icon: Receipt,
      items: [
        { view: 'bills', label: 'Templates', icon: Receipt },
        { view: 'checklist', label: 'Checklist', icon: List },
        { view: 'onetime', label: 'One-Time', icon: Calendar },
        { view: 'propane', label: 'Propane', icon: Flame },
      ],
    },
    {
      id: 'money',
      label: 'Money',
      icon: Wallet,
      items: [
        { view: 'assets', label: 'Assets', icon: Building2 },
        { view: 'investments', label: 'Investments', icon: LineChart },
        { view: 'retirement', label: 'Retirement', icon: TrendingUp },
      ],
    },
    {
      id: 'track',
      label: 'Track',
      icon: ClipboardCheck,
      items: [
        { view: 'submit', label: 'Submit Actuals', icon: Check },
      ],
    },
    {
      id: 'more',
      label: 'More',
      icon: Menu,
      items: [
        { view: 'analytics', label: 'Analytics', icon: BarChart3 },
        { view: 'settings', label: 'Settings', icon: SettingsIcon },
      ],
    },
  ];

  // Check if current view is in a category
  const getActiveCategory = () => {
    for (const cat of navCategories) {
      if (cat.view === view) return cat.id;
      if (cat.items?.some((item) => item.view === view)) return cat.id;
    }
    return null;
  };

  const handleNavClick = (category) => {
    if (category.view) {
      // Direct link - go to view and close any drawer
      setView(category.view);
      setOpenDrawer(null);
    } else {
      // Toggle drawer
      setOpenDrawer(openDrawer === category.id ? null : category.id);
    }
  };

  const handleSubItemClick = (itemView) => {
    setView(itemView);
    setOpenDrawer(null);
  };

  // ---------- Header ----------
  const Header = () => {
    const activeCategory = getActiveCategory();
    const activeDrawerItems = navCategories.find((c) => c.id === openDrawer)?.items;
    const currentViewLabel = navCategories
      .flatMap((c) => c.items || [{ view: c.view, label: c.label }])
      .find((item) => item.view === view)?.label;

    return (
      <div className="mb-6">
        {/* Navigation Container */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/20">
          {/* Header Row: Title + Current Page */}
          <div className="flex items-center justify-between mb-3 px-1">
            <h1 className="text-xl md:text-2xl font-black text-white">
              PayPlan Pro
            </h1>
            {currentViewLabel && (
              <span className="text-white bg-white/20 px-3 py-1 rounded-lg text-sm font-semibold">
                {currentViewLabel}
              </span>
            )}
          </div>

          {/* Main Navigation - Grid Layout */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {navCategories.map((category) => {
              const Icon = category.icon;
              const isActive = activeCategory === category.id;
              const isOpen = openDrawer === category.id;
              const hasDrawer = !!category.items;

              return (
                <button
                  key={category.id}
                  onClick={() => handleNavClick(category)}
                  title={category.label}
                  className={`relative px-2 py-2.5 rounded-xl font-semibold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition-all border-2 ${
                    isActive
                      ? 'bg-white text-emerald-600 shadow-lg border-white'
                      : isOpen
                      ? 'bg-white/40 text-white border-white/50 shadow-md'
                      : 'bg-white/25 text-white border-transparent hover:bg-white/35 hover:border-white/30'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-xs font-bold">{category.label}</span>
                  {hasDrawer && (
                    <span className="absolute top-1 right-1 sm:static">
                      {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Drawer - Sub Items */}
          {activeDrawerItems && (
            <div className="mt-3">
              <div className="bg-white rounded-2xl shadow-xl p-2 grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-center gap-2 border border-slate-200">
                {activeDrawerItems.map((item) => {
                  const ItemIcon = item.icon;
                  const isItemActive = view === item.view;

                  return (
                    <button
                      key={item.view}
                      onClick={() => handleSubItemClick(item.view)}
                      className={`px-3 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                        isItemActive
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                      }`}
                    >
                      <ItemIcon size={18} />
                      <span className="text-sm">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

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

        {view === 'dashboard' && (
          <Dashboard
            overview={overview}
            paySchedule={paySchedule}
            billInstances={billInstances}
            bills={bills}
            currentMonthInstances={currentMonthInstances}
            nextPayDates={nextPayDates}
            perCheckEnvelopeSum={perCheckEnvelopeSum()}
            onToggleInstancePaid={toggleInstancePaid}
          />
        )}
        {view === 'bills' && (
          <BillsTemplates
            billTemplates={billTemplates}
            billInstances={billInstances}
            onAddTemplate={() => {
              setEditingTemplate(null);
              setShowTemplateForm(true);
            }}
            onEditTemplate={(t) => {
              setEditingTemplate(t);
              setShowTemplateForm(true);
            }}
            onRetireTemplate={retireTemplate}
            onUpdateHistoricalPayments={(templateId, historicalPayments, newEstimate) => {
              // Update template with new historical payments and estimate
              setBillTemplates((prev) =>
                prev.map((t) =>
                  t.id === templateId
                    ? { ...t, historicalPayments, amount: newEstimate }
                    : t
                )
              );

              // Update future unpaid bills with new estimate
              setBills((prev) =>
                prev.map((bill) => {
                  if (bill.templateId !== templateId) return bill;
                  if (bill.paid) return bill; // Don't update paid bills
                  return { ...bill, amount: newEstimate };
                })
              );

              // Also update legacy billInstances
              setBillInstances((prev) =>
                prev.map((inst) => {
                  if (inst.templateId !== templateId) return inst;
                  if (inst.paid) return inst;
                  return { ...inst, amountEstimate: newEstimate };
                })
              );
            }}
          />
        )}
        {view === 'checklist' && (
          <Checklist
            currentMonthInstances={currentMonthInstances}
            allBills={bills}
            onToggleInstancePaid={toggleInstancePaid}
            onReassignChecks={assignInstancesToChecks}
            onUpdateInstance={(updatedInstance) => {
              // Update in new bills array - mark as manually assigned
              setBills((prev) =>
                prev.map((bill) =>
                  bill.id === updatedInstance.id
                    ? {
                        ...bill,
                        assignedCheck: updatedInstance.assignedCheck,
                        assignedPayDate: updatedInstance.assignedPayDate
                          ? toMMDDYYYY(parseLocalDate(updatedInstance.assignedPayDate))
                          : bill.assignedPayDate,
                        paid: updatedInstance.paid,
                        paidDate: updatedInstance.paidDate,
                        manuallyAssigned: true, // Mark as manually assigned
                      }
                    : bill
                )
              );
              // Legacy support - also mark as manually assigned
              setBillInstances((prev) =>
                prev.map((inst) =>
                  inst.id === updatedInstance.id
                    ? { ...updatedInstance, manuallyAssigned: true }
                    : inst
                )
              );
            }}
            nextPayDates={nextPayDates}
          />
        )}
        {view === 'submit' && (
          <SubmitActuals
            currentMonthInstances={currentMonthInstances}
            onSubmitActual={submitActualPaid}
            nextPayDates={nextPayDates}
            actualPayEntries={actualPayEntries}
            onAddActualPay={addActualPayEntry}
            onDeleteActualPay={deleteActualPayEntry}
            scannedReceipts={scannedReceipts}
            onAddReceipt={addScannedReceipt}
            onDeleteReceipt={deleteScannedReceipt}
          />
        )}
        {view === 'assets' && (
          <Assets
            assets={assets}
            onAddAsset={() => setShowAssetForm(true)}
            onEditAsset={(a) => setEditingAsset(a)}
            onDeleteAsset={deleteAsset}
          />
        )}
        {view === 'onetime' && (
          <OneTime
            oneTimeBills={oneTimeBills}
            onAddOneTime={() => setShowOneTimeForm(true)}
            onEditOneTime={(b) => setEditingOneTime(b)}
            onDeleteOneTime={deleteOneTimeBill}
            onToggleOneTimePaid={toggleOneTimePaid}
          />
        )}
        {view === 'propane' && (
          <Propane
            propaneFills={propaneFills}
            onAddPropaneFill={() => setShowPropaneForm(true)}
            onDeletePropaneFill={deletePropaneFill}
          />
        )}
        {view === 'analytics' && (
          <Analytics
            overview={overview}
            currentMonthInstances={currentMonthInstances}
            billInstances={billInstances}
            bills={bills}
            historicalBills={historicalBills}
            scannedReceipts={scannedReceipts}
            nextPayDates={nextPayDates}
            paySchedule={paySchedule}
            budgets={budgets}
            debtPayoff={debtPayoff}
            onAddDebt={() => {
              const name = prompt('Debt name (e.g., Credit Card):');
              if (!name) return;
              const balance = parseAmt(prompt('Current balance:') || 0);
              const rate = parseAmt(prompt('Interest rate % (e.g., 18.5):') || 0);
              const payment = parseAmt(prompt('Monthly payment:') || 0);
              const debt = { id: Date.now(), name, balance, rate, payment };
              setDebtPayoff([...debtPayoff, debt]);
            }}
            onRemoveDebt={(id) =>
              setDebtPayoff(debtPayoff.filter((d) => d.id !== id))
            }
          />
        )}
        {view === 'investments' && (
          <Investments
            holdings={investments}
            onAddHolding={addInvestment}
            onUpdateHolding={updateInvestment}
            onDeleteHolding={deleteInvestment}
          />
        )}
        {view === 'retirement' && <Retirement />}
        {view === 'settings' && (
          <Settings
            paySchedule={paySchedule}
            envelopes={envelopes}
            budgets={budgets}
            backupFileInputRef={backupFileInputRef}
            perCheckEnvelopeSum={perCheckEnvelopeSum()}
            billInstances={billInstances}
            onEditPaySchedule={() => setShowPayForm(true)}
            onAddEnvelope={() => {
              const name = prompt('Envelope name:');
              if (!name) return;
              const amt = parseAmt(prompt('Amount per check:') || 0);
              setEnvelopes([...envelopes, { id: Date.now(), name, perCheck: amt }]);
            }}
            onEditEnvelope={(e) => {
              const v = parseAmt(
                prompt(`New amount for "${e.name}":`, e.perCheck) || 0
              );
              setEnvelopes(
                envelopes.map((x) => (x.id === e.id ? { ...x, perCheck: v } : x))
              );
            }}
            onRemoveEnvelope={(id) =>
              setEnvelopes(envelopes.filter((x) => x.id !== id))
            }
            onSetBudget={() => {
              const cat = prompt(
                'Category (utilities, subscription, insurance, loan, rent, other):'
              );
              if (!cat) return;
              const cap = parseAmt(prompt('Monthly cap:') || 0);
              setBudgets({ ...budgets, [cat]: cap });
            }}
            onExportBackup={exportBackup}
            onImportBackup={importBackupFromFile}
            bills={bills}
            onDeduplicateBills={() => {
              // Smart deduplication: keep only one bill per name per month
              // This handles the timezone bug where dates shifted by 1 day
              const billsByNameMonth = {};
              let removed = 0;

              for (const bill of bills) {
                const dueDate = parseMMDDYYYY(bill.dueDate);
                if (!dueDate) continue;

                // Create key from name + year + month
                const monthKey = `${bill.name}-${dueDate.getFullYear()}-${dueDate.getMonth()}`;

                if (!billsByNameMonth[monthKey]) {
                  billsByNameMonth[monthKey] = [];
                }
                billsByNameMonth[monthKey].push(bill);
              }

              // For each group, keep the bill that matches the template's dueDay
              const unique = [];
              for (const key in billsByNameMonth) {
                const group = billsByNameMonth[key];
                if (group.length === 1) {
                  unique.push(group[0]);
                } else {
                  // Multiple bills for same name/month - pick the best one
                  // Prefer: paid bills, then bills matching template dueDay
                  const template = billTemplates.find(t => t.id === group[0].templateId);
                  const templateDueDay = template?.dueDay;

                  // Sort to prefer: paid first, then matching dueDay, then earliest
                  group.sort((a, b) => {
                    // Paid bills first
                    if (a.paid && !b.paid) return -1;
                    if (!a.paid && b.paid) return 1;

                    // Matching template dueDay next
                    const aDate = parseMMDDYYYY(a.dueDate);
                    const bDate = parseMMDDYYYY(b.dueDate);
                    const aMatches = aDate?.getDate() === templateDueDay;
                    const bMatches = bDate?.getDate() === templateDueDay;
                    if (aMatches && !bMatches) return -1;
                    if (!aMatches && bMatches) return 1;

                    return 0;
                  });

                  unique.push(group[0]);
                  removed += group.length - 1;
                }
              }

              setBills(unique);

              // Also dedupe legacy instances the same way
              const instancesByNameMonth = {};
              for (const inst of billInstances) {
                const dueDate = new Date(inst.dueDate);
                const monthKey = `${inst.name}-${dueDate.getFullYear()}-${dueDate.getMonth()}`;
                if (!instancesByNameMonth[monthKey]) {
                  instancesByNameMonth[monthKey] = [];
                }
                instancesByNameMonth[monthKey].push(inst);
              }

              const uniqueInstances = [];
              for (const key in instancesByNameMonth) {
                const group = instancesByNameMonth[key];
                // Keep first (or paid) one
                group.sort((a, b) => (a.paid && !b.paid ? -1 : !a.paid && b.paid ? 1 : 0));
                uniqueInstances.push(group[0]);
              }
              setBillInstances(uniqueInstances);

              return removed;
            }}
            onMarkPastBillsPaid={() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              let marked = 0;

              setBills(prev => prev.map(bill => {
                if (bill.paid) return bill;
                const dueDate = parseMMDDYYYY(bill.dueDate);
                if (dueDate && dueDate < today) {
                  marked++;
                  return { ...bill, paid: true, paidDate: null }; // null paidDate indicates "paid before app"
                }
                return bill;
              }));

              // Also update legacy instances
              setBillInstances(prev => prev.map(inst => {
                if (inst.paid) return inst;
                const dueDate = new Date(inst.dueDate);
                if (dueDate < today) {
                  return { ...inst, paid: true };
                }
                return inst;
              }));

              return marked;
            }}
          />
        )}

        {/* Modals */}
        {showTemplateForm && (
          <TemplateForm
            defaultValue={
              editingTemplate
                ? {
                    name: editingTemplate.name,
                    amount: editingTemplate.amount,
                    isVariable: editingTemplate.isVariable,
                    category: editingTemplate.category,
                    autopay: editingTemplate.autopay,
                    dueDate: editingTemplate.dueDay,
                    frequency: editingTemplate.frequency,
                  }
                : null
            }
            onCancel={() => {
              setShowTemplateForm(false);
              setEditingTemplate(null);
            }}
            onSubmit={(form) => {
              editingTemplate ? updateBillTemplate(form) : addBillTemplate(form);
              setShowTemplateForm(false);
            }}
          />
        )}

        {showPayForm && (
          <PayScheduleForm
            defaultValue={
              paySchedule || { frequency: 'biweekly', payAmount: '', nextPayDate: '' }
            }
            onCancel={() => setShowPayForm(false)}
            onSubmit={(f) => {
              setPaySchedule(f);
              setShowPayForm(false);
              setTimeout(assignInstancesToChecks, 0);
            }}
          />
        )}

        {showAssetForm && (
          <AssetForm onSubmit={addAsset} onCancel={() => setShowAssetForm(false)} />
        )}

        {editingAsset && (
          <AssetForm
            asset={editingAsset}
            onSubmit={updateAsset}
            onCancel={() => setEditingAsset(null)}
          />
        )}

        {showOneTimeForm && (
          <OneTimeForm
            onSubmit={addOneTimeBill}
            onCancel={() => setShowOneTimeForm(false)}
          />
        )}

        {editingOneTime && (
          <OneTimeForm
            bill={editingOneTime}
            onSubmit={updateOneTimeBill}
            onCancel={() => setEditingOneTime(null)}
          />
        )}

        {showPropaneForm && (
          <PropaneForm
            onSubmit={addPropaneFill}
            onCancel={() => setShowPropaneForm(false)}
          />
        )}
      </div>
    </div>
  );
};

export default BillPayPlanner;
