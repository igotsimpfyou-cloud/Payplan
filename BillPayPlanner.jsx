import React, { useState, useEffect } from 'react';
import { DollarSign, Calendar, Plus, Check, AlertCircle, Trash2, Edit2, X, Clock, TrendingUp, Home, Settings, List, BarChart3, ChevronRight, RefreshCw, Building2, Receipt } from 'lucide-react';

// iPhone/Safari friendly persistence shim (Claude sandboxes often expose window.storage; browsers don't).
const __localStorageShim = {
  async get(key) {
    try {
      const value = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
      return value == null ? null : { value };
    } catch {
      return null;
    }
  },
  async set(key, value) {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
};
if (typeof window !== 'undefined' && !window.storage) window.storage = __localStorageShim;

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
    
    while (balance > 0.01 && period < 1000) { // Safety limit
      period++;
      
      const interestPayment = balance * periodicRate;
      const principalPayment = Math.min(payment - interestPayment, balance);
      balance -= principalPayment;
      totalInterest += interestPayment;
      
      // Calculate payment date
      let paymentDate = new Date(startDate);
      if (asset.paymentFrequency === 'weekly') {
        paymentDate.setDate(paymentDate.getDate() + (period * 7));
      } else if (asset.paymentFrequency === 'biweekly') {
        paymentDate.setDate(paymentDate.getDate() + (period * 14));
      } else if (asset.paymentFrequency === 'monthly') {
        paymentDate.setMonth(paymentDate.getMonth() + period);
      } else if (asset.paymentFrequency === 'quarterly') {
        paymentDate.setMonth(paymentDate.getMonth() + (period * 3));
      } else if (asset.paymentFrequency === 'annual') {
        paymentDate.setFullYear(paymentDate.getFullYear() + period);
      }
      
      schedule.push({
        period,
        date: paymentDate,
        payment: payment,
        principal: principalPayment,
        interest: interestPayment,
        balance: Math.max(0, balance)
      });
      
      if (balance < 0.01) break;
    }
    
    return {
      schedule,
      totalPayments: schedule.length * payment,
      totalInterest,
      totalPrincipal: principal,
      payoffDate: schedule[schedule.length - 1]?.date
    };
  };

  // Get bills for current period based on frequency
  const getBillsForPeriod = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Include regular bills
    const regularBills = bills.filter(bill => {
      if (bill.frequency === 'monthly') return true;
      if (bill.frequency === 'quarterly') {
        const monthsSinceStart = (currentMonth - bill.startMonth + 12) % 12;
        return monthsSinceStart % 3 === 0;
      }
      if (bill.frequency === 'annual') {
        return currentMonth === bill.startMonth;
      }
      if (bill.frequency === 'biannual') {
        return currentMonth === bill.startMonth || currentMonth === (bill.startMonth + 6) % 12;
      }
      return true;
    });
    
    // Include asset payments
    const assetPayments = assets.map(asset => ({
      ...asset,
      name: `${asset.assetName} Payment`,
      amount: asset.paymentAmount,
      dueDate: new Date(asset.startDate).getDate(),
      category: 'loans',
      frequency: asset.paymentFrequency,
      isAsset: true
    }));
    
    // Include unpaid one-time bills
    const unpaidOneTime = oneTimeBills.filter(bill => !bill.paid).map(bill => ({
      ...bill,
      category: 'one-time',
      isOneTime: true
    }));
    
    return [...regularBills, ...assetPayments, ...unpaidOneTime];
  };

  // Calculate next paychecks
  const getNextPaychecks = () => {
    if (!paySchedule) return [];
    
    const today = new Date();
    const paychecks = [];
    
    if (paySchedule.frequency === 'biweekly') {
      const firstPayDate = new Date(paySchedule.firstPayDate);
      let nextPay = new Date(firstPayDate);
      
      while (nextPay < today) {
        nextPay.setDate(nextPay.getDate() + 14);
      }
      
      for (let i = 0; i < 4; i++) {
        paychecks.push({
          date: new Date(nextPay),
          amount: parseFloat(paySchedule.payAmount || 0)
        });
        nextPay.setDate(nextPay.getDate() + 14);
      }
    } else if (paySchedule.frequency === 'weekly') {
      const firstPayDate = new Date(paySchedule.firstPayDate);
      let nextPay = new Date(firstPayDate);
      
      while (nextPay < today) {
        nextPay.setDate(nextPay.getDate() + 7);
      }
      
      for (let i = 0; i < 6; i++) {
        paychecks.push({
          date: new Date(nextPay),
          amount: parseFloat(paySchedule.payAmount || 0)
        });
        nextPay.setDate(nextPay.getDate() + 7);
      }
    } else if (paySchedule.frequency === 'monthly') {
      for (let i = 0; i < 3; i++) {
        const date = new Date(today.getFullYear(), today.getMonth() + i, paySchedule.dayOfMonth);
        if (date > today) {
          paychecks.push({
            date,
            amount: parseFloat(paySchedule.payAmount || 0)
          });
        }
      }
    } else if (paySchedule.frequency === 'semimonthly') {
      // Two paychecks per month
      for (let i = 0; i < 3; i++) {
        const month = today.getMonth() + Math.floor(i / 2);
        const year = today.getFullYear() + Math.floor(month / 12);
        const adjustedMonth = month % 12;
        
        if (i % 2 === 0) {
          const date = new Date(year, adjustedMonth, paySchedule.firstPayDay);
          if (date > today) {
            paychecks.push({
              date,
              amount: parseFloat(paySchedule.payAmount || 0)
            });
          }
        } else {
          const date = new Date(year, adjustedMonth, paySchedule.secondPayDay);
          if (date > today) {
            paychecks.push({
              date,
              amount: parseFloat(paySchedule.payAmount || 0)
            });
          }
        }
      }
    }
    
    return paychecks.slice(0, 6);
  };

  // Assign bills to paychecks intelligently based on salary
  const assignBillsToPaychecks = () => {
    const paychecks = getNextPaychecks();
    const periodBills = getBillsForPeriod();
    
    const billAssignments = paychecks.map(paycheck => ({
      date: paycheck.date,
      payAmount: paycheck.amount,
      bills: [],
      total: 0,
      overflow: paycheck.amount
    }));
    
    // Create array of bills with their due dates for this period
    const billsWithDates = periodBills.map(bill => ({
      ...bill,
      nextDueDate: new Date(new Date().getFullYear(), new Date().getMonth(), bill.dueDate)
    })).sort((a, b) => a.nextDueDate - b.nextDueDate);
    
    // Assign each bill to the best paycheck
    billsWithDates.forEach(bill => {
      let bestPaycheckIndex = -1;
      
      // Find the last paycheck before the due date that has enough money
      for (let i = billAssignments.length - 1; i >= 0; i--) {
        const paycheck = billAssignments[i];
        const billAmount = parseFloat(bill.amount);
        
        // Check if this paycheck is before the due date and has enough overflow
        if (paycheck.date <= bill.nextDueDate) {
          if (paycheck.overflow >= billAmount || bestPaycheckIndex === -1) {
            bestPaycheckIndex = i;
            break;
          }
        }
      }
      
      // If no paycheck before due date, assign to first available
      if (bestPaycheckIndex === -1) {
        bestPaycheckIndex = 0;
      }
      
      if (billAssignments[bestPaycheckIndex]) {
        const billAmount = parseFloat(bill.amount);
        billAssignments[bestPaycheckIndex].bills.push(bill);
        billAssignments[bestPaycheckIndex].total += billAmount;
        billAssignments[bestPaycheckIndex].overflow -= billAmount;
      }
    });
    
    return billAssignments;
  };

  // Check for overdue unpaid bills
  const getOverdueBills = () => {
    const today = new Date();
    const currentDay = today.getDate();
    const periodBills = getBillsForPeriod();
    
    return periodBills.filter(bill => {
      if (bill.paidThisMonth) return false;
      return bill.dueDate < currentDay;
    });
  };

  // Google Calendar Integration (simulated)
  const connectGoogleCalendar = async () => {
    // In a real app, this would use Google Calendar API
    // For demo purposes, we'll simulate the connection
    setCalendarConnected(true);
    await window.storage.set('calendarConnected', JSON.stringify(true));
    alert('Google Calendar connected! (Demo mode - in a real app, this would sync your bills to Google Calendar)');
  };

  const syncToCalendar = () => {
    if (!calendarConnected) {
      alert('Please connect Google Calendar first');
      return;
    }
    alert('Bills synced to Google Calendar! (Demo mode)');
  };

  const BillForm = ({ bill, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState(bill || {
      name: '',
      amount: '',
      dueDate: '',
      category: 'utilities',
      isVariable: false,
      frequency: 'monthly',
      startMonth: new Date().getMonth()
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      onSubmit(formData);
    };

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative my-8">
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
          
          <h2 className="text-3xl font-bold text-slate-800 mb-6">
            {bill ? 'Edit Bill' : 'Add New Bill'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Bill Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                placeholder="e.g., Electric Bill"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {formData.isVariable ? 'Average Amount (will be calculated from history)' : 'Amount'}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-slate-500 text-lg">$</span>
                <input
                  type="number"
                  step="0.01"
                  required={!formData.isVariable}
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                  placeholder="0.00"
                  disabled={formData.isVariable && bill?.historicalPayments?.length > 0}
                />
              </div>
              <label className="flex items-center mt-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={formData.isVariable}
                  onChange={(e) => setFormData({ ...formData, isVariable: e.target.checked })}
                  className="mr-2 w-4 h-4 accent-emerald-600"
                />
                Variable amount (track historical payments)
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Due Date (day of month)</label>
              <input
                type="number"
                min="1"
                max="31"
                required
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                placeholder="e.g., 15"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Frequency</label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors bg-white"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly (every 3 months)</option>
                <option value="biannual">Bi-annual (twice per year)</option>
                <option value="annual">Annual (once per year)</option>
              </select>
            </div>

            {(formData.frequency !== 'monthly') && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Starting Month</label>
                <select
                  value={formData.startMonth}
                  onChange={(e) => setFormData({ ...formData, startMonth: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors bg-white"
                >
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, idx) => (
                    <option key={idx} value={idx}>{month}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  {formData.frequency === 'quarterly' && 'Bill will recur every 3 months starting from this month'}
                  {formData.frequency === 'biannual' && 'Bill will recur in this month and 6 months later'}
                  {formData.frequency === 'annual' && 'Bill will recur every year in this month'}
                </p>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors bg-white"
              >
                <option value="utilities">Utilities</option>
                <option value="housing">Housing</option>
                <option value="insurance">Insurance</option>
                <option value="subscriptions">Subscriptions</option>
                <option value="loans">Loans</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-600/30"
              >
                {bill ? 'Update' : 'Add Bill'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const AssetForm = ({ asset, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState(asset || {
      assetName: '',
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
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative my-8">
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
          
          <h2 className="text-3xl font-bold text-slate-800 mb-6">
            {asset ? 'Edit Asset' : 'Add Long-Term Asset'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Asset Name</label>
              <input
                type="text"
                required
                value={formData.assetName}
                onChange={(e) => setFormData({ ...formData, assetName: e.target.value })}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                placeholder="e.g., Car Loan, Mortgage, Student Loan"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Total Loan Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-slate-500 text-lg">$</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.loanAmount}
                  onChange={(e) => setFormData({ ...formData, loanAmount: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Interest Rate (Annual %)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.interestRate}
                  onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                  placeholder="e.g., 4.5"
                />
                <span className="absolute right-4 top-3 text-slate-500">%</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Payment Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-slate-500 text-lg">$</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.paymentAmount}
                  onChange={(e) => setFormData({ ...formData, paymentAmount: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Payment Frequency</label>
              <select
                value={formData.paymentFrequency}
                onChange={(e) => setFormData({ ...formData, paymentFrequency: e.target.value })}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors bg-white"
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Loan Start Date</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg shadow-purple-600/30"
              >
                {asset ? 'Update' : 'Add Asset'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const OneTimeBillForm = ({ bill, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState(bill || {
      name: '',
      amount: '',
      dueDate: new Date().toISOString().split('T')[0],
      description: ''
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      onSubmit(formData);
    };

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative my-8">
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
          
          <h2 className="text-3xl font-bold text-slate-800 mb-6">
            {bill ? 'Edit One-Time Bill' : 'Add One-Time Bill'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Bill Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                placeholder="e.g., Medical Bill, Attorney Fees"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-slate-500 text-lg">$</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Due Date</label>
              <input
                type="date"
                required
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Description (Optional)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors resize-none"
                placeholder="Add any notes about this bill..."
                rows="3"
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-semibold hover:from-orange-700 hover:to-red-700 transition-all shadow-lg shadow-orange-600/30"
              >
                {bill ? 'Update' : 'Add Bill'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const HistoricalPaymentsForm = ({ bill, onClose }) => {
    const [newPayment, setNewPayment] = useState({
      date: new Date().toISOString().split('T')[0],
      amount: ''
    });

    const handleAddPayment = () => {
      if (newPayment.amount) {
        addHistoricalPayment(bill.id, newPayment);
        setNewPayment({
          date: new Date().toISOString().split('T')[0],
          amount: ''
        });
      }
    };

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 relative my-8">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
          
          <h2 className="text-3xl font-bold text-slate-800 mb-2">{bill.name}</h2>
          <p className="text-slate-600 mb-6">Historical Payment Tracking</p>
          
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-emerald-800">Current Average</span>
              <span className="text-2xl font-bold text-emerald-600">${bill.amount}</span>
            </div>
            <p className="text-xs text-emerald-700 mt-1">
              Based on {bill.historicalPayments?.length || 0} payment{bill.historicalPayments?.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-800 mb-3">Add New Payment</h3>
            <div className="flex gap-3">
              <input
                type="date"
                value={newPayment.date}
                onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })}
                className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
              />
              <div className="relative flex-1">
                <span className="absolute left-4 top-3 text-slate-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                  placeholder="0.00"
                />
              </div>
              <button
                onClick={handleAddPayment}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-3">Payment History</h3>
            {bill.historicalPayments?.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {[...bill.historicalPayments].reverse().map((payment, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Calendar size={16} className="text-slate-500" />
                      <span className="font-medium text-slate-700">
                        {new Date(payment.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-800">${payment.amount}</span>
                      <button
                        onClick={() => deleteHistoricalPayment(bill.id, bill.historicalPayments.length - 1 - idx)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-500 py-8">No payment history yet. Add payments to calculate average.</p>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full mt-6 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  };

  const AmortizationView = ({ asset, onClose }) => {
    const amortization = calculateAmortization(asset);
    const [viewMode, setViewMode] = useState('summary');

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-8 relative my-8">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
          
          <h2 className="text-3xl font-bold text-slate-800 mb-2">{asset.assetName}</h2>
          <p className="text-slate-600 mb-6">Loan Amortization Schedule</p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <div className="text-xs text-blue-600 font-semibold mb-1">ORIGINAL LOAN</div>
              <div className="text-2xl font-black text-blue-600">${parseFloat(asset.loanAmount).toFixed(2)}</div>
            </div>
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
              <div className="text-xs text-green-600 font-semibold mb-1">TOTAL PAYMENTS</div>
              <div className="text-2xl font-black text-green-600">${amortization.totalPayments.toFixed(2)}</div>
            </div>
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <div className="text-xs text-red-600 font-semibold mb-1">TOTAL INTEREST</div>
              <div className="text-2xl font-black text-red-600">${amortization.totalInterest.toFixed(2)}</div>
            </div>
            <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
              <div className="text-xs text-purple-600 font-semibold mb-1">PAYOFF DATE</div>
              <div className="text-lg font-black text-purple-600">
                {amortization.payoffDate?.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setViewMode('summary')}
              className={`px-4 py-2 rounded-xl font-semibold transition-colors ${
                viewMode === 'summary'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setViewMode('schedule')}
              className={`px-4 py-2 rounded-xl font-semibold transition-colors ${
                viewMode === 'schedule'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Full Schedule
            </button>
          </div>

          {viewMode === 'summary' && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-6">
                <h3 className="font-bold text-slate-800 mb-4 text-lg">Loan Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Payment Amount:</span>
                    <span className="font-bold text-slate-800 ml-2">${asset.paymentAmount}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Interest Rate:</span>
                    <span className="font-bold text-slate-800 ml-2">{asset.interestRate}%</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Frequency:</span>
                    <span className="font-bold text-slate-800 ml-2 capitalize">{asset.paymentFrequency}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Total Payments:</span>
                    <span className="font-bold text-slate-800 ml-2">{amortization.schedule.length}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-6">
                <h3 className="font-bold text-slate-800 mb-3 text-lg">Cost Breakdown</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700">Principal</span>
                    <span className="text-xl font-bold text-slate-800">${amortization.totalPrincipal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700">Interest</span>
                    <span className="text-xl font-bold text-red-600">${amortization.totalInterest.toFixed(2)}</span>
                  </div>
                  <div className="border-t-2 border-purple-300 pt-3 flex justify-between items-center">
                    <span className="font-bold text-slate-800">Total Cost</span>
                    <span className="text-2xl font-black text-purple-600">${amortization.totalPayments.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {viewMode === 'schedule' && (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white border-b-2 border-slate-200">
                  <tr className="text-left">
                    <th className="p-3 font-bold text-slate-700">#</th>
                    <th className="p-3 font-bold text-slate-700">Date</th>
                    <th className="p-3 font-bold text-slate-700">Payment</th>
                    <th className="p-3 font-bold text-slate-700">Principal</th>
                    <th className="p-3 font-bold text-slate-700">Interest</th>
                    <th className="p-3 font-bold text-slate-700">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {amortization.schedule.map((payment, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 text-slate-600">{payment.period}</td>
                      <td className="p-3 text-slate-600">
                        {payment.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </td>
                      <td className="p-3 font-semibold text-slate-800">${payment.payment.toFixed(2)}</td>
                      <td className="p-3 text-green-600">${payment.principal.toFixed(2)}</td>
                      <td className="p-3 text-red-600">${payment.interest.toFixed(2)}</td>
                      <td className="p-3 font-semibold text-slate-800">${payment.balance.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full mt-6 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  };

  const PayScheduleForm = ({ schedule, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState(schedule || {
      frequency: 'biweekly',
      firstPayDate: '',
      dayOfMonth: 1,
      firstPayDay: 1,
      secondPayDay: 15,
      payAmount: ''
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      onSubmit(formData);
      onCancel();
    };

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
          
          <h2 className="text-3xl font-bold text-slate-800 mb-6">Pay Schedule</h2>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Paycheck Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-slate-500 text-lg">$</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.payAmount}
                  onChange={(e) => setFormData({ ...formData, payAmount: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">Your net pay (after taxes)</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Pay Frequency</label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors bg-white"
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly (every 2 weeks)</option>
                <option value="semimonthly">Semi-monthly (twice per month)</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            
            {(formData.frequency === 'weekly' || formData.frequency === 'biweekly') && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Next Pay Date</label>
                <input
                  type="date"
                  required
                  value={formData.firstPayDate}
                  onChange={(e) => setFormData({ ...formData, firstPayDate: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                />
              </div>
            )}

            {formData.frequency === 'semimonthly' && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">First Pay Day of Month</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={formData.firstPayDay}
                    onChange={(e) => setFormData({ ...formData, firstPayDay: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                    placeholder="e.g., 1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Second Pay Day of Month</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={formData.secondPayDay}
                    onChange={(e) => setFormData({ ...formData, secondPayDay: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                    placeholder="e.g., 15"
                  />
                </div>
              </>
            )}
            
            {formData.frequency === 'monthly' && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Pay Day of Month</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  required
                  value={formData.dayOfMonth}
                  onChange={(e) => setFormData({ ...formData, dayOfMonth: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                  placeholder="e.g., 15"
                />
              </div>
            )}
            
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-600/30"
              >
                Save Schedule
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-400 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white font-medium">Loading your financial data...</p>
        </div>
      </div>
    );
  }

  const overdueBills = getOverdueBills();
  const billAssignments = assignBillsToPaychecks();
  const nextPaycheck = billAssignments[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-black text-white mb-2 tracking-tight">
            PayPlan Pro
          </h1>
          <p className="text-emerald-200 text-lg">Smart bill management powered by your paycheck</p>
        </div>

        {view === 'dashboard' && (
          <div className="space-y-6">
            {/* Alerts */}
            {overdueBills.length > 0 && (
              <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-white flex-shrink-0 mt-1" size={28} />
                  <div>
                    <h3 className="font-bold text-white text-xl mb-2">⚠️ Overdue Bills</h3>
                    <p className="text-white/90 mb-3">
                      You have {overdueBills.length} unpaid bill{overdueBills.length !== 1 ? 's' : ''} past due:
                    </p>
                    <div className="space-y-2">
                      {overdueBills.map(bill => (
                        <div key={bill.id} className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white">{bill.name}</span>
                            <span className="font-bold text-white">${bill.amount}</span>
                          </div>
                          <div className="text-sm text-white/80">Due: {bill.dueDate}th of the month</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Next Paycheck Overview */}
            {nextPaycheck && (
              <div className="bg-gradient-to-br from-white to-emerald-50 rounded-3xl shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6">
                  <h2 className="text-2xl font-black text-white mb-1">Next Paycheck</h2>
                  <p className="text-emerald-100">
                    {nextPaycheck.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="text-center">
                      <div className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">Income</div>
                      <div className="text-4xl font-black text-emerald-600">${nextPaycheck.payAmount.toFixed(2)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">Bills Due</div>
                      <div className="text-4xl font-black text-orange-600">${nextPaycheck.total.toFixed(2)}</div>
                      <div className="text-sm text-slate-500">{nextPaycheck.bills.length} bills</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">Overflow</div>
                      <div className={`text-4xl font-black ${nextPaycheck.overflow >= 0 ? 'text-teal-600' : 'text-red-600'}`}>
                        ${Math.abs(nextPaycheck.overflow).toFixed(2)}
                      </div>
                      <div className="text-sm text-slate-500">
                        {nextPaycheck.overflow >= 0 ? 'Available' : 'Short'}
                      </div>
                    </div>
                  </div>

                  {/* Bills for this paycheck */}
                  {nextPaycheck.bills.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 mb-3">Bills to Pay</h3>
                      <div className="space-y-2">
                        {nextPaycheck.bills.map(bill => (
                          <div key={bill.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border-2 border-slate-100">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${bill.paidThisMonth ? 'bg-green-500' : 'bg-orange-400'}`}></div>
                              <div>
                                <div className="font-bold text-slate-800">{bill.name}</div>
                                <div className="text-sm text-slate-500">Due: {bill.dueDate}th • {bill.category}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-slate-800 text-lg">${bill.amount}</div>
                              {bill.isVariable && <div className="text-xs text-slate-500">avg</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Actions Menu */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setView('plan')}
                className="bg-white hover:bg-emerald-50 rounded-2xl p-6 shadow-lg border-2 border-transparent hover:border-emerald-300 transition-all group text-left"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-gradient-to-br from-emerald-500 to-teal-500 p-3 rounded-xl">
                    <TrendingUp className="text-white" size={28} />
                  </div>
                  <ChevronRight className="text-slate-300 group-hover:text-emerald-500 transition-colors" size={28} />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-1">Payment Schedule</h3>
                <p className="text-slate-600">View all upcoming paychecks and bill assignments</p>
              </button>

              <button
                onClick={() => setView('checklist')}
                className="bg-white hover:bg-emerald-50 rounded-2xl p-6 shadow-lg border-2 border-transparent hover:border-emerald-300 transition-all group text-left"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-500 p-3 rounded-xl">
                    <Check className="text-white" size={28} />
                  </div>
                  <ChevronRight className="text-slate-300 group-hover:text-blue-500 transition-colors" size={28} />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-1">Payment Checklist</h3>
                <p className="text-slate-600">Track and mark off bills as you pay them</p>
              </button>

              <button
                onClick={() => setView('manage')}
                className="bg-white hover:bg-emerald-50 rounded-2xl p-6 shadow-lg border-2 border-transparent hover:border-emerald-300 transition-all group text-left"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-xl">
                    <DollarSign className="text-white" size={28} />
                  </div>
                  <ChevronRight className="text-slate-300 group-hover:text-purple-500 transition-colors" size={28} />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-1">Manage Bills</h3>
                <p className="text-slate-600">Add, edit, or remove your monthly bills</p>
              </button>

              <button
                onClick={() => setView('assets')}
                className="bg-white hover:bg-emerald-50 rounded-2xl p-6 shadow-lg border-2 border-transparent hover:border-emerald-300 transition-all group text-left"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-gradient-to-br from-indigo-500 to-purple-500 p-3 rounded-xl">
                    <Building2 className="text-white" size={28} />
                  </div>
                  <ChevronRight className="text-slate-300 group-hover:text-indigo-500 transition-colors" size={28} />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-1">Long-Term Assets</h3>
                <p className="text-slate-600">Track loans with amortization schedules</p>
              </button>

              <button
                onClick={() => setView('onetime')}
                className="bg-white hover:bg-emerald-50 rounded-2xl p-6 shadow-lg border-2 border-transparent hover:border-emerald-300 transition-all group text-left"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-gradient-to-br from-orange-500 to-red-500 p-3 rounded-xl">
                    <Receipt className="text-white" size={28} />
                  </div>
                  <ChevronRight className="text-slate-300 group-hover:text-orange-500 transition-colors" size={28} />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-1">One-Time Bills</h3>
                <p className="text-slate-600">Medical bills, attorney fees, and other one-off expenses</p>
              </button>

              <button
                onClick={() => setView('settings')}
                className="bg-white hover:bg-emerald-50 rounded-2xl p-6 shadow-lg border-2 border-transparent hover:border-emerald-300 transition-all group text-left"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-gradient-to-br from-slate-500 to-gray-500 p-3 rounded-xl">
                    <Settings className="text-white" size={28} />
                  </div>
                  <ChevronRight className="text-slate-300 group-hover:text-slate-500 transition-colors" size={28} />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-1">Settings</h3>
                <p className="text-slate-600">Configure pay schedule and integrations</p>
              </button>
            </div>
          </div>
        )}

        {view === 'plan' && (
          <div>
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => setView('dashboard')}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
              >
                <Home className="text-white" size={24} />
              </button>
              <h2 className="text-3xl font-black text-white">Payment Schedule</h2>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-6">
              {!paySchedule ? (
                <div className="text-center py-12">
                  <Calendar className="mx-auto text-slate-300 mb-4" size={64} />
                  <h3 className="text-xl font-bold text-slate-600 mb-2">Set Your Pay Schedule</h3>
                  <p className="text-slate-500 mb-6">Configure when you get paid to create your bill payment plan</p>
                  <button
                    onClick={() => setShowPayScheduleForm(true)}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg"
                  >
                    Set Pay Schedule
                  </button>
                </div>
              ) : bills.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign className="mx-auto text-slate-300 mb-4" size={64} />
                  <h3 className="text-xl font-bold text-slate-600 mb-2">No Bills Yet</h3>
                  <p className="text-slate-500 mb-6">Add your bills to see your payment plan</p>
                  <button
                    onClick={() => setView('manage')}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg"
                  >
                    Add Bills
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {billAssignments.map((paycheck, idx) => (
                    <div key={idx} className="border-2 border-slate-200 rounded-2xl p-6 hover:border-emerald-300 transition-colors">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-slate-800">
                            Paycheck - {paycheck.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </h3>
                          <p className="text-slate-500 text-sm">
                            {paycheck.date.toLocaleDateString('en-US', { weekday: 'long' })}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-slate-600 mb-1">Income</div>
                          <div className="text-2xl font-black text-emerald-600">${paycheck.payAmount.toFixed(2)}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-orange-50 rounded-xl p-4">
                          <div className="text-xs text-orange-600 font-semibold mb-1">BILLS DUE</div>
                          <div className="text-2xl font-black text-orange-600">${paycheck.total.toFixed(2)}</div>
                          <div className="text-xs text-orange-700">{paycheck.bills.length} bills</div>
                        </div>
                        <div className={`${paycheck.overflow >= 0 ? 'bg-teal-50' : 'bg-red-50'} rounded-xl p-4`}>
                          <div className={`text-xs font-semibold mb-1 ${paycheck.overflow >= 0 ? 'text-teal-600' : 'text-red-600'}`}>
                            {paycheck.overflow >= 0 ? 'OVERFLOW' : 'SHORT'}
                          </div>
                          <div className={`text-2xl font-black ${paycheck.overflow >= 0 ? 'text-teal-600' : 'text-red-600'}`}>
                            ${Math.abs(paycheck.overflow).toFixed(2)}
                          </div>
                          <div className={`text-xs ${paycheck.overflow >= 0 ? 'text-teal-700' : 'text-red-700'}`}>
                            {paycheck.overflow >= 0 ? 'Available' : 'Needed'}
                          </div>
                        </div>
                      </div>

                      {paycheck.bills.length > 0 && (
                        <div className="space-y-2">
                          {paycheck.bills.map(bill => (
                            <div
                              key={bill.id}
                              className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${bill.paidThisMonth ? 'bg-green-500' : 'bg-orange-400'}`}></div>
                                <div>
                                  <div className="font-semibold text-slate-800">{bill.name}</div>
                                  <div className="text-xs text-slate-500">
                                    Due: {bill.dueDate}th • {bill.category} • {bill.frequency}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-slate-800">
                                  ${bill.amount}
                                  {bill.isVariable && <span className="text-xs text-slate-500 ml-1">~</span>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'checklist' && (
          <div>
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => setView('dashboard')}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
              >
                <Home className="text-white" size={24} />
              </button>
              <h2 className="text-3xl font-black text-white">Payment Checklist</h2>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-6">
              {bills.length === 0 ? (
                <div className="text-center py-12">
                  <Check className="mx-auto text-slate-300 mb-4" size={64} />
                  <h3 className="text-xl font-bold text-slate-600 mb-2">No Bills to Track</h3>
                  <p className="text-slate-500">Add bills to start tracking payments</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {getBillsForPeriod().sort((a, b) => a.dueDate - b.dueDate).map(bill => {
                    const isOverdue = bill.dueDate < new Date().getDate() && !bill.paidThisMonth;
                    
                    return (
                      <div
                        key={bill.id}
                        className={`border-2 rounded-2xl p-5 transition-all ${
                          bill.paidThisMonth
                            ? 'border-green-200 bg-green-50'
                            : isOverdue
                            ? 'border-red-200 bg-red-50'
                            : 'border-slate-200 bg-white hover:border-emerald-300'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => togglePaid(bill.id)}
                            className={`flex-shrink-0 w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${
                              bill.paidThisMonth
                                ? 'bg-green-500 border-green-500'
                                : 'border-slate-300 hover:border-emerald-500'
                            }`}
                          >
                            {bill.paidThisMonth && <Check className="text-white" size={20} />}
                          </button>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className={`text-lg font-bold ${bill.paidThisMonth ? 'text-green-800 line-through' : 'text-slate-800'}`}>
                                {bill.name}
                              </h3>
                              {isOverdue && (
                                <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                                  OVERDUE
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-600">
                              <span className="flex items-center gap-1">
                                <Calendar size={14} />
                                Due: {bill.dueDate}th
                              </span>
                              <span className="flex items-center gap-1">
                                <DollarSign size={14} />
                                ${bill.amount}
                                {bill.isVariable && '~'}
                              </span>
                              <span className="capitalize">{bill.frequency}</span>
                              {bill.paidThisMonth && bill.lastPaid && (
                                <span className="text-green-600 flex items-center gap-1">
                                  <Check size={14} />
                                  Paid {new Date(bill.lastPaid).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'manage' && (
          <div>
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => setView('dashboard')}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
              >
                <Home className="text-white" size={24} />
              </button>
              <h2 className="text-3xl font-black text-white flex-1">Manage Bills</h2>
              <button
                onClick={() => setShowBillForm(true)}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg flex items-center gap-2"
              >
                <Plus size={20} />
                Add Bill
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-6">
              {bills.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign className="mx-auto text-slate-300 mb-4" size={64} />
                  <h3 className="text-xl font-bold text-slate-600 mb-2">No Bills Added</h3>
                  <p className="text-slate-500 mb-6">Start by adding your monthly bills</p>
                  <button
                    onClick={() => setShowBillForm(true)}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg inline-flex items-center gap-2"
                  >
                    <Plus size={20} />
                    Add Your First Bill
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {bills.map(bill => (
                    <div
                      key={bill.id}
                      className="border-2 border-slate-200 rounded-2xl p-5 hover:border-emerald-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-slate-800 mb-2">{bill.name}</h3>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-slate-500">Amount:</span>
                              <span className="font-bold text-slate-800 ml-2">
                                ${bill.amount}
                                {bill.isVariable && <span className="text-slate-500"> (avg)</span>}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500">Due:</span>
                              <span className="font-bold text-slate-800 ml-2">{bill.dueDate}th</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Category:</span>
                              <span className="font-bold text-slate-800 ml-2 capitalize">{bill.category}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Frequency:</span>
                              <span className="font-bold text-slate-800 ml-2 capitalize">{bill.frequency}</span>
                            </div>
                            {bill.isVariable && (
                              <div className="col-span-2">
                                <button
                                  onClick={() => setShowHistoricalForm(bill)}
                                  className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
                                >
                                  <BarChart3 size={16} />
                                  {bill.historicalPayments?.length || 0} payment{bill.historicalPayments?.length !== 1 ? 's' : ''} tracked
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => setEditingBill(bill)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 size={20} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete ${bill.name}?`)) {
                                deleteBill(bill.id);
                              }
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'assets' && (
          <div>
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => setView('dashboard')}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
              >
                <Home className="text-white" size={24} />
              </button>
              <h2 className="text-3xl font-black text-white flex-1">Long-Term Assets</h2>
              <button
                onClick={() => setShowAssetForm(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-bold hover:from-purple-600 hover:to-indigo-600 transition-all shadow-lg flex items-center gap-2"
              >
                <Plus size={20} />
                Add Asset
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-6">
              {assets.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="mx-auto text-slate-300 mb-4" size={64} />
                  <h3 className="text-xl font-bold text-slate-600 mb-2">No Assets Tracked</h3>
                  <p className="text-slate-500 mb-6">Add loans and financed assets to track amortization</p>
                  <button
                    onClick={() => setShowAssetForm(true)}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg inline-flex items-center gap-2"
                  >
                    <Plus size={20} />
                    Add Your First Asset
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {assets.map(asset => {
                    const amort = calculateAmortization(asset);
                    const remainingBalance = amort.schedule[amort.schedule.length - 1]?.balance || 0;
                    const paidSoFar = parseFloat(asset.loanAmount) - remainingBalance;
                    const progress = (paidSoFar / parseFloat(asset.loanAmount)) * 100;

                    return (
                      <div
                        key={asset.id}
                        className="border-2 border-slate-200 rounded-2xl p-6 hover:border-purple-300 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-2xl font-bold text-slate-800 mb-2">{asset.assetName}</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                              <div>
                                <span className="text-slate-500">Loan Amount:</span>
                                <div className="font-bold text-slate-800">${asset.loanAmount}</div>
                              </div>
                              <div>
                                <span className="text-slate-500">Payment:</span>
                                <div className="font-bold text-slate-800">
                                  ${asset.paymentAmount} <span className="text-xs text-slate-500 capitalize">({asset.paymentFrequency})</span>
                                </div>
                              </div>
                              <div>
                                <span className="text-slate-500">Interest Rate:</span>
                                <div className="font-bold text-slate-800">{asset.interestRate}%</div>
                              </div>
                              <div>
                                <span className="text-slate-500">Payoff Date:</span>
                                <div className="font-bold text-slate-800">
                                  {amort.payoffDate?.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                </div>
                              </div>
                            </div>

                            <div className="mb-2">
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-slate-600">Progress</span>
                                <span className="font-bold text-purple-600">{progress.toFixed(1)}% paid off</span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full transition-all duration-500 rounded-full"
                                  style={{ width: `${progress}%` }}
                                ></div>
                              </div>
                            </div>

                            <div className="flex gap-3 mt-4">
                              <button
                                onClick={() => setShowAmortizationView(asset)}
                                className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-xl font-semibold transition-colors text-sm flex items-center gap-2"
                              >
                                <BarChart3 size={16} />
                                View Amortization
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => setEditingAsset(asset)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 size={20} />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete ${asset.assetName}?`)) {
                                  deleteAsset(asset.id);
                                }
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'onetime' && (
          <div>
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => setView('dashboard')}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
              >
                <Home className="text-white" size={24} />
              </button>
              <h2 className="text-3xl font-black text-white flex-1">One-Time Bills</h2>
              <button
                onClick={() => setShowOneTimeForm(true)}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold hover:from-orange-600 hover:to-red-600 transition-all shadow-lg flex items-center gap-2"
              >
                <Plus size={20} />
                Add Bill
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-6">
              {oneTimeBills.length === 0 ? (
                <div className="text-center py-12">
                  <Receipt className="mx-auto text-slate-300 mb-4" size={64} />
                  <h3 className="text-xl font-bold text-slate-600 mb-2">No One-Time Bills</h3>
                  <p className="text-slate-500 mb-6">Track medical bills, attorney fees, and other one-off expenses</p>
                  <button
                    onClick={() => setShowOneTimeForm(true)}
                    className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-bold hover:from-orange-700 hover:to-red-700 transition-all shadow-lg inline-flex items-center gap-2"
                  >
                    <Plus size={20} />
                    Add Your First One-Time Bill
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {oneTimeBills.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).map(bill => {
                    const isOverdue = new Date(bill.dueDate) < new Date() && !bill.paid;
                    
                    return (
                      <div
                        key={bill.id}
                        className={`border-2 rounded-2xl p-5 transition-all ${
                          bill.paid
                            ? 'border-green-200 bg-green-50'
                            : isOverdue
                            ? 'border-red-200 bg-red-50'
                            : 'border-slate-200 bg-white hover:border-orange-300'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <button
                            onClick={() => toggleOneTimePaid(bill.id)}
                            className={`flex-shrink-0 w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all mt-1 ${
                              bill.paid
                                ? 'bg-green-500 border-green-500'
                                : 'border-slate-300 hover:border-orange-500'
                            }`}
                          >
                            {bill.paid && <Check className="text-white" size={20} />}
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
                  })}
                </div>
              )}
            </div>
          </div>
        )}

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
    </div>
  );
};

export default BillPayPlanner;