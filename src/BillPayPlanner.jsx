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
    
    // Persist to storage
    await window.storage.set('bills', JSON.stringify(newBills));
    await window.storage.set('assets', JSON.stringify(newAssets));
    await window.storage.set('oneTimeBills', JSON.stringify(newOneTimeBills));
    await window.storage.set('paySchedule', JSON.stringify(newPaySchedule));
    await window.storage.set('calendarConnected', JSON.stringify(newCalendarConnected));
  };

  const importBackupFromFile = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      await applyBackup(payload);
      alert('Backup restored successfully!');
    } catch (error) {
      alert('Error restoring backup: ' + error.message);
    }
  };

  // Load data from persistent storage
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const billsResult = await window.storage.get('bills');
      const assetsResult = await window.storage.get('assets');
      const oneTimeResult = await window.storage.get('oneTimeBills');
      const scheduleResult = await window.storage.get('paySchedule');
      const calendarResult = await window.storage.get('calendarConnected');
      
      if (billsResult?.value) {
        setBills(JSON.parse(billsResult.value));
      }
      if (assetsResult?.value) {
        setAssets(JSON.parse(assetsResult.value));
      }
      if (oneTimeResult?.value) {
        setOneTimeBills(JSON.parse(oneTimeResult.value));
      }
      if (scheduleResult?.value) {
        setPaySchedule(JSON.parse(scheduleResult.value));
      }
      if (calendarResult?.value) {
        setCalendarConnected(JSON.parse(calendarResult.value));
      }
    } catch (error) {
      console.log('No existing data found');
    }
    setLoading(false);
  };

  const saveBills = async (updatedBills) => {
    setBills(updatedBills);
    await window.storage.set('bills', JSON.stringify(updatedBills));
  };

  const saveAssets = async (updatedAssets) => {
    setAssets(updatedAssets);
    await window.storage.set('assets', JSON.stringify(updatedAssets));
  };

  const saveOneTimeBills = async (updatedOneTime) => {
    setOneTimeBills(updatedOneTime);
    await window.storage.set('oneTimeBills', JSON.stringify(updatedOneTime));
  };

  const savePaySchedule = async (schedule) => {
    setPaySchedule(schedule);
    await window.storage.set('paySchedule', JSON.stringify(schedule));
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
    await window.storage.set('calendarConnected', JSON.stringify(connected));
    if (connected) {
      alert('Calendar connected! (Demo mode)');
    }
  };

  const syncToCalendar = async () => {
    alert('Syncing bills to calendar... (Demo mode)');
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
    const monthlyIncome = paySchedule ? parseFloat(paySchedule.payAmount) : 0;
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
      isVariable: false
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      onSubmit(formData);
    };

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

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isVariable"
                  checked={formData.isVariable}
                  onChange={(e) => setFormData({...formData, isVariable: e.target.checked})}
                  className="w-5 h-5"
                />
                <label htmlFor="isVariable" className="text-sm font-semibold">Variable amount</label>
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
