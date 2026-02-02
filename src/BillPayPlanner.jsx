import React, { useState, useEffect, useRef } from 'react';
import {
  DollarSign,
  Calendar,
  Plus,
  Trash2,
  Clock,
  Settings,
  BarChart3,
  Building2,
  Receipt
} from 'lucide-react';

/* -------------------------------
   Safari / iOS storage shim
-------------------------------- */
const storageShim = {
  async get(key) {
    try {
      const v = localStorage.getItem(key);
      return v == null ? null : { value: v };
    } catch {
      return null;
    }
  },
  async set(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
};

if (typeof window !== 'undefined' && !window.storage) {
  window.storage = storageShim;
}

const BillPayPlanner = () => {
  const [view, setView] = useState('dashboard');
  const [bills, setBills] = useState([]);
  const [assets, setAssets] = useState([]);
  const [oneTimeBills, setOneTimeBills] = useState([]);
  const [paySchedule, setPaySchedule] = useState(null);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  /* -------------------------------
     Backup / Restore
  -------------------------------- */
  const backupFileInputRef = useRef(null);

  const exportBackup = () => {
    const payload = {
      app: 'PayPlan Pro',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: { bills, assets, oneTimeBills, paySchedule, calendarConnected }
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payplan-backup-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importBackupFromFile = async (file) => {
    if (!file) return;
    const text = await file.text();
    const payload = JSON.parse(text);
    const d = payload?.data ?? payload;

    setBills(Array.isArray(d?.bills) ? d.bills : []);
    setAssets(Array.isArray(d?.assets) ? d.assets : []);
    setOneTimeBills(Array.isArray(d?.oneTimeBills) ? d.oneTimeBills : []);
    setPaySchedule(d?.paySchedule ?? null);
    setCalendarConnected(!!d?.calendarConnected);

    alert('Backup restored');
  };

  /* -------------------------------
     Load & persist
  -------------------------------- */
  useEffect(() => {
    const load = async () => {
      const sb = await window.storage.get('bills');
      const sa = await window.storage.get('assets');
      const so = await window.storage.get('oneTimeBills');
      const sp = await window.storage.get('paySchedule');
      const sc = await window.storage.get('calendarConnected');

      if (sb) setBills(JSON.parse(sb.value));
      if (sa) setAssets(JSON.parse(sa.value));
      if (so) setOneTimeBills(JSON.parse(so.value));
      if (sp) setPaySchedule(JSON.parse(sp.value));
      if (sc) setCalendarConnected(JSON.parse(sc.value));

      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (!loading) window.storage.set('bills', JSON.stringify(bills));
  }, [bills, loading]);

  useEffect(() => {
    if (!loading) window.storage.set('assets', JSON.stringify(assets));
  }, [assets, loading]);

  useEffect(() => {
    if (!loading)
      window.storage.set('oneTimeBills', JSON.stringify(oneTimeBills));
  }, [oneTimeBills, loading]);

  useEffect(() => {
    if (!loading)
      window.storage.set('paySchedule', JSON.stringify(paySchedule));
  }, [paySchedule, loading]);

  useEffect(() => {
    if (!loading)
      window.storage.set(
        'calendarConnected',
        JSON.stringify(calendarConnected)
      );
  }, [calendarConnected, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-7xl mx-auto">

        {/* Top Navigation */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            ['dashboard', 'Dashboard', BarChart3],
            ['bills', 'Bills', Receipt],
            ['assets', 'Assets', Building2],
            ['oneTime', 'One-Time', Clock],
            ['settings', 'Settings', Settings]
          ].map(([k, label, Icon]) => (
            <button
              key={k}
              onClick={() => setView(k)}
              className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 ${
                view === k
                  ? 'bg-white text-slate-900'
                  : 'bg-white/10 text-white'
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>

        {/* Dashboard */}
        {view === 'dashboard' && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-black mb-4">Financial Overview</h2>
            <p className="text-slate-600">
              Bills: {bills.length} • Assets: {assets.length} • One-Time:{' '}
              {oneTimeBills.length}
            </p>
          </div>
        )}

        {/* Bills */}
        {view === 'bills' && (
          <div className="bg-white rounded-2xl shadow-xl p-6 space-y-3">
            <h2 className="text-xl font-black">Bills</h2>
            {bills.map((b, i) => (
              <div
                key={i}
                className="flex justify-between border p-3 rounded-lg"
              >
                <span>{b.name}</span>
                <span>${b.amount}</span>
              </div>
            ))}
          </div>
        )}

        {/* Assets */}
        {view === 'assets' && (
          <div className="bg-white rounded-2xl shadow-xl p-6 space-y-3">
            <h2 className="text-xl font-black">Assets</h2>
            {assets.map((a, i) => (
              <div
                key={i}
                className="flex justify-between border p-3 rounded-lg"
              >
                <span>{a.name}</span>
                <span>${a.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* One-Time */}
        {view === 'oneTime' && (
          <div className="bg-white rounded-2xl shadow-xl p-6 space-y-3">
            <h2 className="text-xl font-black">One-Time Bills</h2>
            {oneTimeBills.map((o, i) => (
              <div
                key={i}
                className="flex justify-between border p-3 rounded-lg"
              >
                <span>{o.name}</span>
                <span>${o.amount}</span>
              </div>
            ))}
          </div>
        )}

        {/* Settings */}
        {view === 'settings' && (
          <div className="bg-white rounded-2xl shadow-xl p-6 space-y-6">
            <h2 className="text-2xl font-black">Settings</h2>

            <div>
              <h3 className="font-bold mb-2">Backup & Restore</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={exportBackup}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg"
                >
                  Export Backup
                </button>

                <button
                  onClick={() => backupFileInputRef.current.click()}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg"
                >
                  Import Backup
                </button>

                <input
                  ref={backupFileInputRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    importBackupFromFile(f);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        <div className="h-6" />
      </div>
    </div>
  );
};

export default BillPayPlanner;
