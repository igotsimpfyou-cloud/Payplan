import React, { useState, useEffect, useRef } from 'react';
import { DollarSign, Calendar, Plus, Check, AlertCircle, Trash2, Edit2, X, Clock, TrendingUp, Home, Settings, List, BarChart3, ChevronRight, RefreshCw, Building2, Receipt } from 'lucide-react';

// iPhone/Safari friendly persistence shim (Claude sandboxes may expose window.storage; browsers don't).
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

  // Backup/Restore (exports a JSON file you can save in Files/iCloud)
  const backupFileInputRef = useRef(null);

  const exportBackup = () => {
    const payload = {
      app: 'PayPlan Pro',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        bills,
        assets,
        oneTimeBills,
        paySchedule,
        calendarConnected,
      },
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
    const d = payload?.data ?? payload; // supports either {data:{...}} or direct {...}

    const nextBills = Array.isArray(d?.bills) ? d.bills : [];
    const nextAssets = Array.isArray(d?.assets) ? d.assets : [];
    const nextOneTime = Array.isArray(d?.oneTimeBills) ? d.oneTimeBills : [];
    const nextPaySchedule = d?.paySchedule && typeof d.paySchedule === 'object' ? d.paySchedule : null;
    const nextCalendarConnected = !!d?.calendarConnected;

    // Update state
    setBills(nextBills);
    setAssets(nextAssets);
    setOneTimeBills(nextOneTime);
    setPaySchedule(nextPaySchedule);
    setCalendarConnected(nextCalendarConnected);

    // Persist immediately (so it survives refresh even before effects run)
    try {
      await window.storage.set('bills', JSON.stringify(nextBills));
      await window.storage.set('assets', JSON.stringify(nextAssets));
      await window.storage.set('oneTimeBills', JSON.stringify(nextOneTime));
      await window.storage.set('paySchedule', JSON.stringify(nextPaySchedule));
      await window.storage.set('calendarConnected', JSON.stringify(nextCalendarConnected));
    } catch {
      // If storage fails, state is still updated for the current session
    }
  };

  const importBackupFromFile = async (file) => {
    if (!file) return;

    // Simple safety check (backups should be small)
    if (file.size > 2_000_000) {
      alert('That backup file looks too large. Please choose a PayPlan backup JSON file.');
      return;
    }

    const text = await file.text();

    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      alert('Could not read that file. Please choose a valid PayPlan backup (.json).');
      return;
    }

    await applyBackup(payload);
    alert('Backup restored!');
  };

  // Load saved data
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedBills = await window.storage.get('bills');
        const savedAssets = await window.storage.get('assets');
        const savedOneTimeBills = await window.storage.get('oneTimeBills');
        const savedPaySchedule = await window.storage.get('paySchedule');
        const savedCalendarConnected = await window.storage.get('calendarConnected');
        
        if (savedBills) setBills(JSON.parse(savedBills.value));
        if (savedAssets) setAssets(JSON.parse(savedAssets.value));
        if (savedOneTimeBills) setOneTimeBills(JSON.parse(savedOneTimeBills.value));
        if (savedPaySchedule) setPaySchedule(JSON.parse(savedPaySchedule.value));
        if (savedCalendarConnected) setCalendarConnected(JSON.parse(savedCalendarConnected.value));
      } catch (error) {
        console.error('Error loading data:', error);
      }
      setLoading(false);
    };

    loadData();
  }, []);

  // Save data whenever it changes
  useEffect(() => {
    if (!loading) {
      window.storage.set('bills', JSON.stringify(bills));
    }
  }, [bills, loading]);

  useEffect(() => {
    if (!loading) {
      window.storage.set('assets', JSON.stringify(assets));
    }
  }, [assets, loading]);

  useEffect(() => {
    if (!loading) {
      window.storage.set('oneTimeBills', JSON.stringify(oneTimeBills));
    }
  }, [oneTimeBills, loading]);

  useEffect(() => {
    if (!loading) {
      window.storage.set('paySchedule', JSON.stringify(paySchedule));
    }
  }, [paySchedule, loading]);

  useEffect(() => {
    if (!loading) {
      window.storage.set('calendarConnected', JSON.stringify(calendarConnected));
    }
  }, [calendarConnected, loading]);

  const getNextPayDate = () => {
    if (!paySchedule) return null;

    const today = new Date();
    const payDayOfWeek = paySchedule.dayOfWeek;
    const payFrequency = paySchedule.frequency; // 'weekly' or 'biweekly'
    
    let nextPayDate = new Date(today);
    const currentDayOfWeek = today.getDay();
    
    // Calculate days until next pay day
    let daysUntilPay = payDayOfWeek - currentDayOfWeek;
    if (daysUntilPay <= 0) daysUntilPay += 7;
    
    nextPayDate.setDate(today.getDate() + daysUntilPay);
    
    // If biweekly, check if this is the correct week based on start date
    if (payFrequency === 'biweekly' && paySchedule.startDate) {
      const startDate = new Date(paySchedule.startDate);
      const weeksDiff = Math.floor((nextPayDate - startDate) / (7 * 24 * 60 * 60 * 1000));
      
      if (weeksDiff % 2 !== 0) {
        nextPayDate.setDate(nextPayDate.getDate() + 7);
      }
    }
    
    return nextPayDate;
  };

  const calculateUpcomingBills = () => {
    const today = new Date();
    const nextPayDate = getNextPayDate();
    if (!nextPayDate) return [];

    const upcomingBills = bills
      .filter(bill => !bill.paid)
      .map(bill => {
        const dueDate = new Date(bill.dueDate);
        const daysUntilDue = Math.ceil((dueDate - today) / (24 * 60 * 60 * 1000));
        
        return {
          ...bill,
          daysUntilDue,
          isOverdue: daysUntilDue < 0,
          dueSoon: daysUntilDue <= 3 && daysUntilDue >= 0
        };
      })
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

    const upcomingOneTimeBills = oneTimeBills
      .filter(bill => !bill.paid)
      .map(bill => {
        const dueDate = new Date(bill.dueDate);
        const daysUntilDue = Math.ceil((dueDate - today) / (24 * 60 * 60 * 1000));
        
        return {
          ...bill,
          daysUntilDue,
          isOverdue: daysUntilDue < 0,
          dueSoon: daysUntilDue <= 3 && daysUntilDue >= 0,
          oneTime: true
        };
      })
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

    return [...upcomingBills, ...upcomingOneTimeBills].sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  };

  const getTotalUpcomingAmount = () => {
    const upcomingBills = calculateUpcomingBills();
    return upcomingBills.reduce((total, bill) => total + parseFloat(bill.amount || 0), 0);
  };

  const addBill = (billData) => {
    const newBill = {
      id: Date.now(),
      ...billData,
      paid: false,
      createdAt: new Date().toISOString()
    };
    setBills([...bills, newBill]);
    setShowBillForm(false);
  };

  const updateBill = (billData) => {
    setBills(bills.map(bill => 
      bill.id === editingBill.id ? { ...bill, ...billData } : bill
    ));
    setEditingBill(null);
  };

  const deleteBill = (billId) => {
    setBills(bills.filter(bill => bill.id !== billId));
  };

  const toggleBillPaid = (billId) => {
    setBills(bills.map(bill =>
      bill.id === billId ? { ...bill, paid: !bill.paid } : bill
    ));
  };

  const addOneTimeBill = (billData) => {
    const newBill = {
      id: Date.now(),
      ...billData,
      paid: false,
      createdAt: new Date().toISOString()
    };
    setOneTimeBills([...oneTimeBills, newBill]);
    setShowOneTimeForm(false);
  };

  const updateOneTimeBill = (billData) => {
    setOneTimeBills(oneTimeBills.map(bill => 
      bill.id === editingOneTime.id ? { ...bill, ...billData } : bill
    ));
    setEditingOneTime(null);
  };

  const deleteOneTimeBill = (billId) => {
    setOneTimeBills(oneTimeBills.filter(bill => bill.id !== billId));
  };

  const toggleOneTimeBillPaid = (billId) => {
    setOneTimeBills(oneTimeBills.map(bill =>
      bill.id === billId ? { ...bill, paid: !bill.paid } : bill
    ));
  };

  const addAsset = (assetData) => {
    const newAsset = {
      id: Date.now(),
      ...assetData,
      createdAt: new Date().toISOString()
    };
    setAssets([...assets, newAsset]);
    setShowAssetForm(false);
  };

  const updateAsset = (assetData) => {
    setAssets(assets.map(asset => 
      asset.id === editingAsset.id ? { ...asset, ...assetData } : asset
    ));
    setEditingAsset(null);
  };

  const deleteAsset = (assetId) => {
    setAssets(assets.filter(asset => asset.id !== assetId));
  };

  const setPayScheduleData = (scheduleData) => {
    setPaySchedule(scheduleData);
    setShowPayScheduleForm(false);
  };

  const connectGoogleCalendar = () => {
    // This is a placeholder for actual Google Calendar integration
    // In a real app, you'd implement OAuth and Google Calendar API
    setCalendarConnected(true);
    alert('Google Calendar integration would be implemented here. For now, this is a demo connection.');
  };

  const syncToCalendar = () => {
    // Placeholder for syncing bills to calendar
    alert('Calendar sync would create events for each bill due date. This is a demo feature.');
  };

  const calculateAmortization = (principal, rate, payment, extraPayment = 0) => {
    const monthlyRate = rate / 100 / 12;
    let balance = principal;
    let month = 0;
    const schedule = [];
    let totalInterest = 0;

    while (balance > 0 && month < 3600) {
      month++;
      const interestPayment = balance * monthlyRate;
      let principalPayment = payment - interestPayment + extraPayment;
      
      if (principalPayment > balance) {
        principalPayment = balance;
      }
      
      balance -= principalPayment;
      totalInterest += interestPayment;
      
      schedule.push({
        month,
        payment: payment + extraPayment,
        principal: principalPayment,
        interest: interestPayment,
        balance: Math.max(0, balance)
      });
      
      if (balance <= 0.01) break;
    }

    return { schedule, totalInterest, totalPayments: month };
  };

  const getDebtSummary = () => {
    const debts = assets.filter(asset => asset.type === 'debt');
    const totalDebt = debts.reduce((sum, debt) => sum + parseFloat(debt.balance || 0), 0);
    const totalPayment = debts.reduce((sum, debt) => sum + parseFloat(debt.minimumPayment || 0), 0);
    
    return { totalDebt, totalPayment, count: debts.length };
  };

  const getAssetSummary = () => {
    const nonDebts = assets.filter(asset => asset.type !== 'debt');
    const totalAssets = nonDebts.reduce((sum, asset) => sum + parseFloat(asset.value || 0), 0);
    
    return { totalAssets, count: nonDebts.length };
  };

  const resetMonthlyBills = () => {
    // Reset all recurring bills to unpaid for new month
    setBills(bills.map(bill => ({ ...bill, paid: false })));
    // Remove paid one-time bills
    setOneTimeBills(oneTimeBills.filter(bill => !bill.paid));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl font-semibold">Loading PayPlan Pro...</div>
      </div>
    );
  }

  const nextPayDate = getNextPayDate();
  const upcomingBills = calculateUpcomingBills();
  const totalUpcoming = getTotalUpcomingAmount();
  const debtSummary = getDebtSummary();
  const assetSummary = getAssetSummary();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-5xl font-black text-white mb-2 tracking-tight">PayPlan Pro</h1>
            <p className="text-blue-200 font-medium">Advanced Financial Management Dashboard</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setView('dashboard')}
              className={`px-6 py-3 rounded-2xl font-bold transition-all duration-300 flex items-center gap-2 ${
                view === 'dashboard'
                  ? 'bg-white text-slate-900 shadow-xl'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <BarChart3 size={20} />
              Dashboard
            </button>
            <button
              onClick={() => setView('bills')}
              className={`px-6 py-3 rounded-2xl font-bold transition-all duration-300 flex items-center gap-2 ${
                view === 'bills'
                  ? 'bg-white text-slate-900 shadow-xl'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Receipt size={20} />
              Bills
            </button>
            <button
              onClick={() => setView('assets')}
              className={`px-6 py-3 rounded-2xl font-bold transition-all duration-300 flex items-center gap-2 ${
                view === 'assets'
                  ? 'bg-white text-slate-900 shadow-xl'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Building2 size={20} />
              Assets/Debts
            </button>
            <button
              onClick={() => setView('oneTime')}
              className={`px-6 py-3 rounded-2xl font-bold transition-all duration-300 flex items-center gap-2 ${
                view === 'oneTime'
                  ? 'bg-white text-slate-900 shadow-xl'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Clock size={20} />
              One-Time
            </button>
            <button
              onClick={() => setView('settings')}
              className={`px-6 py-3 rounded-2xl font-bold transition-all duration-300 flex items-center gap-2 ${
                view === 'settings'
                  ? 'bg-white text-slate-900 shadow-xl'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Settings size={20} />
              Settings
            </button>
          </div>
        </div>

        {/* Dashboard View */}
        {view === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Stats */}
            <div className="lg:col-span-2 space-y-6">
              {/* Next Paycheck Card */}
              <div className="bg-white rounded-3xl shadow-2xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Next Paycheck</h2>
                    {nextPayDate ? (
                      <p className="text-slate-600 font-medium">
                        {nextPayDate.toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    ) : (
                      <p className="text-red-600 font-medium">Set up your pay schedule</p>
                    )}
                  </div>
                  <div className="bg-emerald-100 p-4 rounded-2xl">
                    <DollarSign className="text-emerald-600" size={32} />
                  </div>
                </div>
                
                {nextPayDate && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-2xl p-4">
                      <p className="text-slate-600 text-sm font-medium">Days Until Pay</p>
                      <p className="text-3xl font-black text-slate-900">
                        {Math.ceil((nextPayDate - new Date()) / (24 * 60 * 60 * 1000))}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-4">
                      <p className="text-slate-600 text-sm font-medium">Upcoming Bills Total</p>
                      <p className="text-3xl font-black text-slate-900">${totalUpcoming.toFixed(2)}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-3xl shadow-2xl p-8">
                <h2 className="text-2xl font-black text-slate-900 mb-6">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => setShowBillForm(true)}
                    className="p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-colors flex items-center gap-3"
                  >
                    <Plus size={24} />
                    Add Recurring Bill
                  </button>
                  <button
                    onClick={() => setShowOneTimeForm(true)}
                    className="p-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold transition-colors flex items-center gap-3"
                  >
                    <Plus size={24} />
                    Add One-Time Bill
                  </button>
                  <button
                    onClick={() => setShowAssetForm(true)}
                    className="p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold transition-colors flex items-center gap-3"
                  >
                    <Plus size={24} />
                    Add Asset/Debt
                  </button>
                  <button
                    onClick={resetMonthlyBills}
                    className="p-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-bold transition-colors flex items-center gap-3"
                  >
                    <RefreshCw size={24} />
                    New Month Reset
                  </button>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="bg-white rounded-3xl shadow-2xl p-8">
                <h2 className="text-2xl font-black text-slate-900 mb-6">Financial Summary</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-red-900">Total Debt</h3>
                      <TrendingUp className="text-red-600" size={24} />
                    </div>
                    <p className="text-3xl font-black text-red-900">${debtSummary.totalDebt.toFixed(2)}</p>
                    <p className="text-red-700 font-medium mt-2">
                      {debtSummary.count} debt accounts
                    </p>
                    <p className="text-red-700 font-medium">
                      Monthly payments: ${debtSummary.totalPayment.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6">
  <p className="text-emerald-800 font-medium">
    Your assets are in great shape.
  </p>
</div>

                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer spacing for mobile */}
        <div className="h-6" />
      </div>
    </div>
  );
};

export default BillPayPlanner;
                  
