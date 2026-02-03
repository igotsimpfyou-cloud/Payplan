import React, { useState, useEffect, useRef } from 'react';
import { DollarSign, Calendar, Plus, Check, AlertCircle, Trash2, Edit2, X, Clock, TrendingUp, Home, Settings, List, BarChart3, ChevronRight, RefreshCw, Building2, Receipt, Download, Upload } from 'lucide-react';

const BillPayPlanner = () => {
  const [view, setView] = useState('dashboard');
  const [bills, setBills] = useState([]);
  const [assets, setAssets] = useState([]);
  const [oneTimeBills, setOneTimeBills] = useState([]);
  const [paySchedule, setPaySchedule] = useState(null);
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
  const [loading, setLoading] = useState(true);
  const [calendarConnected, setCalendarConnected] = useState(false);
  
  // Backup / Restore
  const backupFileInputRef = useRef(null);

  // Backup/Restore functions - now properly placed after state declarations
  const exportBackup = () => {
    const payload = {
      app: 'PayPlan Pro',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: { bills, assets, oneTimeBills, paySchedule, calendarConnected },
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
    
    // Update state
    setBills(newBills);
    setAssets(newAssets);
    setOneTimeBills(newOneTimeBills);
    setPaySchedule(newPaySchedule);
    setCalendarConnected(newCalendarConnected);
    
    // Persist to localStorage
    localStorage.setItem('bills', JSON.stringify(newBills));
    localStorage.setItem('assets', JSON.stringify(newAssets));
    localStorage.setItem('oneTimeBills', JSON.stringify(newOneTimeBills));
    localStorage.setItem('paySchedule', JSON.stringify(newPaySchedule));
    localStorage.setItem('calendarConnected', JSON.stringify(newCalendarConnected));
  };

  const importBackupFromFile = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      
      // Validate the backup file
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
      
      if (billsData) {
        setBills(JSON.parse(billsData));
      }
      if (assetsData) {
        setAssets(JSON.parse(assetsData));
      }
      if (oneTimeData) {
        setOneTimeBills(JSON.parse(oneTimeData));
      }
      if (scheduleData) {
        setPaySchedule(JSON.parse(scheduleData));
      }
      if (calendarData) {
        setCalendarConnected(JSON.parse(calendarData));
      }
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

  const addBill = async (billData) => {
    const newBill = {
      id: Date.now(),
      ...billData,
      paidThisMonth: false,
      lastPaid: null,
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
      b.id === editingBill.id ? { ...b, ...billData } : b
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
    // Clear state
    setBills([]);
    setAssets([]);
    setOneTimeBills([]);
    setPaySchedule(null);
    setCalendarConnected(false);
    
    // Clear localStorage
    localStorage.removeItem('bills');
    localStorage.removeItem('assets');
    localStorage.removeItem('oneTimeBills');
    localStorage.removeItem('paySchedule');
    localStorage.removeItem('calendarConnected');
    
    setShowClearDataModal(false);
    alert('✓ All data has been cleared. Starting fresh!');
    
    // Reload the page to ensure clean state
    window.location.reload();
  };

  const togglePaid = async (billId) => {
    const updatedBills = bills.map(b => 
      b.id === billId 
        ? { ...b, paidThisMonth: !b.paidThisMonth, lastPaid: !b.paidThisMonth ? new Date().toISOString() : b.lastPaid }
        : b
    );
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
    
    // Determine periods per year based on frequency
    let periodsPerYear;
    switch(asset.paymentFrequency) {
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
      
      // Calculate payment date
      const paymentDate = new Date(startDate);
      switch(asset.paymentFrequency) {
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
    // In a real implementation, this would use OAuth
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

    const today = new Date();
    const nextPay = new Date(paySchedule.nextPayDate);
    
    // Calculate the next 4 pay dates based on frequency
    const payDates = [nextPay];
    
    for (let i = 1; i < 4; i++) {
      const nextDate = new Date(payDates[i - 1]);
      
      switch(paySchedule.frequency) {
        case 'weekly':
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case 'biweekly':
          nextDate.setDate(nextDate.getDate() + 14);
          break;
        case 'semimonthly':
          // If we're on the 1st, next is 15th; if on 15th, next is 1st of next month
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

    // Get the next two paychecks for the current month planning
    const check1Date = payDates[0];
    const check2Date = payDates[1];

    // Group bills by which paycheck should pay them
    const check1Bills = [];
    const check2Bills = [];

    bills.forEach(bill => {
      const currentMonth = check1Date.getMonth();
      const currentYear = check1Date.getFullYear();
      const dueDay = parseInt(bill.dueDate);
      
      // Create the actual due date for this month
      let dueDate = new Date(currentYear, currentMonth, dueDay);
      
      // If the due date is before the first paycheck, it's for next month
      if (dueDate < check1Date) {
        dueDate.setMonth(dueDate.getMonth() + 1);
      }
      
      // Manual assignment override
      if (bill.payFromCheck === 'check1') {
        check1Bills.push(bill);
      } else if (bill.payFromCheck === 'check2') {
        check2Bills.push(bill);
      } else {
        // Auto-assign: bill is paid by the check that comes BEFORE the due date
        if (dueDate <= check2Date) {
          // Due before or on second paycheck - pay with first check
          check1Bills.push(bill);
        } else {
          // Due after second paycheck - pay with second check (or third check if available)
          check2Bills.push(bill);
        }
      }
    });

    return { 
      check1: check1Bills, 
      check2: check2Bills, 
      payDates: payDates.slice(0, 2) // Return the next 2 pay dates
    };
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

    const monthlyAssets = assets.reduce((sum, asset) => {
      const amount = parseFloat(asset.paymentAmount);
      if (asset.paymentFrequency === 'monthly') return sum + amount;
      if (asset.paymentFrequency === 'weekly') return sum + (amount * 4.33);
      if (asset.paymentFrequency === 'biweekly') return sum + (amount * 2.17);
      if (asset.paymentFrequency === 'quarterly') return sum + (amount / 3);
      if (asset.paymentFrequency === 'annual') return sum + (amount / 12);
      return sum;
    }, 0);

    const upcomingOneTime = oneTimeBills
      .filter(b => !b.paid)
      .reduce((sum, bill) => sum + parseFloat(bill.amount), 0);

    const totalMonthly = monthlyBills + monthlyAssets;
    
    // Calculate monthly income based on pay frequency
    let monthlyIncome = 0;
    if (paySchedule) {
      const payAmount = parseFloat(paySchedule.payAmount);
      switch(paySchedule.frequency) {
        case 'weekly': monthlyIncome = payAmount * 4.33; break;
        case 'biweekly': monthlyIncome = payAmount * 2.17; break;
        case 'semimonthly': monthlyIncome = payAmount * 2; break;
        case 'monthly': monthlyIncome = payAmount; break;
        default: monthlyIncome = payAmount;
      }
    }
    
    const leftover = monthlyIncome - totalMonthly;

    return {
      monthlyBills,
      monthlyAssets,
      totalMonthly,
      upcomingOneTime,
      monthlyIncome,
      leftover
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
      payFromCheck: 'auto'
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
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                  required
                />
              </div>

              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="isVariable"
                  checked={formData.isVariable}
                  onChange={(e) => setFormData({...formData, isVariable: e.target.checked})}
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
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
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
                  onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Frequency</label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({...formData, frequency: e.target.value})}
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
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
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
                  onChange={(e) => setFormData({...formData, autopay: e.target.checked})}
                  className="w-5 h-5"
                />
                <label htmlFor="autopay" className="text-sm font-semibold">Auto-pay enabled</label>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Pay From Paycheck</label>
                <select
                  value={formData.payFromCheck}
                  onChange={(e) => setFormData({...formData, payFromCheck: e.target.value})}
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
      interestRate: '',
      paymentAmount: '',
      paymentFrequency: 'monthly',
      startDate: new Date().toISOString().split('T')[0]
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
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
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
                  onChange={(e) => setFormData({...formData, loanAmount: e.target.value})}
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
                  onChange={(e) => setFormData({...formData, interestRate: e.target.value})}
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
                  onChange={(e) => setFormData({...formData, paymentAmount: e.target.value})}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Payment Frequency</label>
                <select
                  value={formData.paymentFrequency}
                  onChange={(e) => setFormData({...formData, paymentFrequency: e.target.value})}
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
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
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
      description: ''
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
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
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
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Due Date</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Description (Optional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                  rows="3"
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
      nextPayDate: '', // The next upcoming pay date
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
                  onChange={(e) => setFormData({...formData, frequency: e.target.value})}
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
                  onChange={(e) => setFormData({...formData, payAmount: e.target.value})}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Next Pay Date</label>
                <input
                  type="date"
                  value={formData.nextPayDate}
                  onChange={(e) => setFormData({...formData, nextPayDate: e.target.value})}
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
      
      // Check if we already have 12 payments
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
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={24} />
              </button>
            </div>

            {/* Current Estimate */}
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
                          className={`w-2 h-8 rounded ${
                            i < historicalPayments.length ? 'bg-emerald-500' : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{historicalPayments.length}/12 months</p>
                  </div>
                </div>
              </div>
            )}

            {/* Add New Payment */}
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
                    onChange={(e) => setNewPayment({...newPayment, date: e.target.value})}
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
                    onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold self-end"
                  disabled={historicalPayments.length >= 12}
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

            {/* Payment History List */}
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

            {/* Statistics */}
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
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
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
            className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
              view === 'dashboard'
                ? 'bg-white text-emerald-600 shadow-lg'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <Home size={20} />
            Dashboard
          </button>
          <button
            onClick={() => setView('bills')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
              view === 'bills'
                ? 'bg-white text-emerald-600 shadow-lg'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <Receipt size={20} />
            Bills
          </button>
          <button
            onClick={() => setView('assets')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
              view === 'assets'
                ? 'bg-white text-emerald-600 shadow-lg'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <Building2 size={20} />
            Assets
          </button>
          <button
            onClick={() => setView('onetime')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
              view === 'onetime'
                ? 'bg-white text-emerald-600 shadow-lg'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <Calendar size={20} />
            One-Time
          </button>
          <button
            onClick={() => setView('settings')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
              view === 'settings'
                ? 'bg-white text-emerald-600 shadow-lg'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
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
                  <div>
                    <p className="text-slate-500 text-sm">Monthly Income</p>
                    <p className="text-3xl font-black text-slate-800">
                      ${overview.monthlyIncome.toFixed(2)}
                    </p>
                  </div>
                </div>
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
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-3 rounded-xl ${overview.leftover >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    <DollarSign className={overview.leftover >= 0 ? 'text-emerald-600' : 'text-red-600'} size={24} />
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm">Left Over</p>
                    <p className={`text-3xl font-black ${overview.leftover >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      ${overview.leftover.toFixed(2)}
                    </p>
                  </div>
                </div>
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
                  
                  return (
                    <div className="space-y-3">
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
                            Leftover Check 1: ${(parseFloat(paySchedule.payAmount) - check1Total).toFixed(2)} • 
                            Leftover Check 2: ${(parseFloat(paySchedule.payAmount) - check2Total).toFixed(2)}
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
              <h2 className="text-3xl font-black text-white">Recurring Bills</h2>
              <div className="flex gap-3">
                <button
                  onClick={resetMonthlyBills}
                  className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-xl font-semibold shadow-lg transition-colors flex items-center gap-2"
                >
                  <RefreshCw size={20} />
                  Reset Month
                </button>
                <button
                  onClick={() => setShowBillForm(true)}
                  className="px-6 py-3 bg-white hover:bg-emerald-50 text-emerald-600 rounded-xl font-semibold shadow-lg transition-colors flex items-center gap-2"
                >
                  <Plus size={20} />
                  Add Bill
                </button>
              </div>
            </div>

            {/* Bills grouped by paycheck based on due dates */}
            {bills.length > 0 && (() => {
              const assignments = getPaycheckAssignments();
              const formatDate = (date) => {
                if (!date) return '';
                // Use UTC to prevent timezone issues that shift dates by one day
                const d = new Date(date);
                return d.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  timeZone: 'UTC'
                });
              };
              
              return (
                <div className="space-y-6">
                  {/* First Paycheck Bills - in a card */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                    <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2 flex-wrap">
                      <DollarSign size={24} />
                      <span>First Paycheck Bills</span>
                      {assignments.payDates[0] && (
                        <span className="text-lg font-normal text-emerald-300">
                          (Pay Date: {formatDate(assignments.payDates[0])})
                        </span>
                      )}
                    </h3>
                    <p className="text-white/70 text-sm mb-6">
                      Bills to pay with your next paycheck
                    </p>
                    <div className="grid grid-cols-1 gap-4">
                      {assignments.check1.map(bill => (
                      <div key={bill.id} className="bg-white rounded-xl shadow-lg p-4">
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => togglePaid(bill.id)}
                            className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                              bill.paidThisMonth
                                ? 'bg-green-500 text-white'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            }`}
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
                </div>

                {/* Second Paycheck Bills - in a card */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                  <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2 flex-wrap">
                    <DollarSign size={24} />
                    <span>Second Paycheck Bills</span>
                    {assignments.payDates[1] && (
                      <span className="text-lg font-normal text-blue-300">
                        (Pay Date: {formatDate(assignments.payDates[1])})
                      </span>
                    )}
                  </h3>
                  <p className="text-white/70 text-sm mb-6">
                    Bills to pay with your following paycheck
                  </p>
                  <div className="grid grid-cols-1 gap-4">
                    {assignments.check2.map(bill => (
                      <div key={bill.id} className="bg-white rounded-xl shadow-lg p-4">
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => togglePaid(bill.id)}
                            className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                              bill.paidThisMonth
                                ? 'bg-green-500 text-white'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            }`}
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
                </div>
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
                        >
                          View Amortization Schedule
                          <ChevronRight size={16} />
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingAsset(asset)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
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
                          className={`p-3 rounded-xl transition-colors ${
                            bill.paid
                              ? 'bg-green-500 text-white'
                              : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                          }`}
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
                  >
                    Add Your First One-Time Bill
                  </button>
                </div>
              )}
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
                      >
                        <RefreshCw size={16} />
                        Sync Now
                      </button>
                    )}
                    <button
                      onClick={connectGoogleCalendar}
                      className={`px-4 py-2 rounded-xl font-semibold transition-colors ${
                        calendarConnected
                          ? 'bg-green-100 text-green-700'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
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
                  >
                    <Download size={18} />
                    Export Backup
                  </button>
                  <button
                    onClick={() => backupFileInputRef.current?.click()}
                    className="flex-1 px-4 py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
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
                  className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-colors ${
                    clearDataCountdown > 0
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