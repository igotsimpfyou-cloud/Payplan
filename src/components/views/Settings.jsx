import React, { useState, useEffect, useMemo } from 'react';
import { Download, Upload, RefreshCw, Camera, Eye, EyeOff, ExternalLink, Calendar, CheckCircle2, Trash2, AlertTriangle } from 'lucide-react';
import { downloadICSFile, generateFilename } from '../../utils/calendarExport';
import { parseMMDDYYYY } from '../../utils/billDatabase';

const OCR_API_KEY_STORAGE = 'ppp.ocrApiKey';

// Data Cleanup Component
const DataCleanup = ({ bills, onDeduplicateBills, onMarkPastBillsPaid }) => {
  const [cleanupResult, setCleanupResult] = useState(null);

  // Calculate duplicates and past unpaid bills
  const stats = useMemo(() => {
    // Find duplicates by name + year + month (not just exact ID)
    // This catches timezone-shifted duplicates
    const billsByNameMonth = {};
    bills.forEach(bill => {
      const dueDate = parseMMDDYYYY(bill.dueDate);
      if (!dueDate) return;
      const monthKey = `${bill.name}-${dueDate.getFullYear()}-${dueDate.getMonth()}`;
      billsByNameMonth[monthKey] = (billsByNameMonth[monthKey] || 0) + 1;
    });

    const duplicateCount = Object.values(billsByNameMonth)
      .filter(count => count > 1)
      .reduce((sum, count) => sum + count - 1, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pastUnpaidBills = bills.filter(bill => {
      if (bill.paid) return false;
      const dueDate = parseMMDDYYYY(bill.dueDate);
      return dueDate && dueDate < today;
    });

    return {
      duplicateCount,
      pastUnpaidCount: pastUnpaidBills.length,
      pastUnpaidBills,
      total: bills.length,
    };
  }, [bills]);

  const handleDeduplicate = () => {
    if (stats.duplicateCount === 0) return;
    const removed = onDeduplicateBills();
    setCleanupResult({ type: 'dedupe', count: removed });
    setTimeout(() => setCleanupResult(null), 3000);
  };

  const handleMarkPastPaid = () => {
    if (stats.pastUnpaidCount === 0) return;
    const marked = onMarkPastBillsPaid();
    setCleanupResult({ type: 'markPaid', count: marked });
    setTimeout(() => setCleanupResult(null), 3000);
  };

  if (!bills.length) return null;

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl text-white">
          <Trash2 size={24} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-800">Data Cleanup</h3>
          <p className="text-slate-600 text-sm">
            Fix duplicate bills and mark old bills as paid
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Duplicate Bills */}
        <div className="p-4 bg-slate-50 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-800">Duplicate Bills</div>
              <div className="text-sm text-slate-600">
                {stats.duplicateCount > 0
                  ? `Found ${stats.duplicateCount} duplicate bill${stats.duplicateCount !== 1 ? 's' : ''}`
                  : 'No duplicates found'}
              </div>
            </div>
            <button
              onClick={handleDeduplicate}
              disabled={stats.duplicateCount === 0}
              className={`px-4 py-2 rounded-xl font-semibold transition-colors ${
                stats.duplicateCount > 0
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              Remove Duplicates
            </button>
          </div>
        </div>

        {/* Past Unpaid Bills */}
        <div className="p-4 bg-slate-50 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-800">Past Unpaid Bills</div>
              <div className="text-sm text-slate-600">
                {stats.pastUnpaidCount > 0
                  ? `${stats.pastUnpaidCount} bill${stats.pastUnpaidCount !== 1 ? 's' : ''} due before today marked unpaid`
                  : 'All past bills are marked as paid'}
              </div>
            </div>
            <button
              onClick={handleMarkPastPaid}
              disabled={stats.pastUnpaidCount === 0}
              className={`px-4 py-2 rounded-xl font-semibold transition-colors ${
                stats.pastUnpaidCount > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              Mark All Paid
            </button>
          </div>
          {stats.pastUnpaidCount > 0 && (
            <div className="mt-3 text-xs text-slate-500">
              These are bills with due dates in the past that haven't been marked paid.
              Click "Mark All Paid" if you paid them before using this app.
            </div>
          )}
        </div>

        {/* Result message */}
        {cleanupResult && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
            <CheckCircle2 className="text-green-500" size={20} />
            <span className="text-green-700 text-sm font-medium">
              {cleanupResult.type === 'dedupe'
                ? `Removed ${cleanupResult.count} duplicate bill${cleanupResult.count !== 1 ? 's' : ''}`
                : `Marked ${cleanupResult.count} bill${cleanupResult.count !== 1 ? 's' : ''} as paid`}
            </span>
          </div>
        )}

        {/* Stats */}
        <div className="text-sm text-slate-500 text-center">
          Total bills in database: {stats.total}
        </div>
      </div>
    </div>
  );
};

export const Settings = ({
  backupFileInputRef,
  onExportBackup,
  onImportBackup,
  billInstances = [],
  bills = [],
  onDeduplicateBills,
  onMarkPastBillsPaid,
}) => {
  // OCR API key state
  const [ocrApiKey, setOcrApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeySaved, setApiKeySaved] = useState(false);

  // Calendar export state
  const [exportSuccess, setExportSuccess] = useState(null);

  // Load API key on mount
  useEffect(() => {
    const savedKey = localStorage.getItem(OCR_API_KEY_STORAGE) || '';
    setOcrApiKey(savedKey);
  }, []);

  const handleSaveApiKey = () => {
    localStorage.setItem(OCR_API_KEY_STORAGE, ocrApiKey.trim());
    setApiKeySaved(true);
    setTimeout(() => setApiKeySaved(false), 2000);
  };

  const handleClearApiKey = () => {
    localStorage.removeItem(OCR_API_KEY_STORAGE);
    setOcrApiKey('');
  };

  // Calendar export handler
  const handleExportCalendar = () => {
    if (!billInstances.length) {
      setExportSuccess({ success: false, message: 'No bills to export' });
      setTimeout(() => setExportSuccess(null), 3000);
      return;
    }

    const filename = generateFilename(billInstances);
    const result = downloadICSFile(billInstances, { filename });

    setExportSuccess({
      success: true,
      message: `Downloaded ${result.eventCount} bill${result.eventCount !== 1 ? 's' : ''} to ${filename}`,
    });
    setTimeout(() => setExportSuccess(null), 5000);
  };

  return (
    <div>
      {/* Receipt Scanner OCR */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl text-white">
            <Camera size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">Receipt Scanner OCR</h3>
            <p className="text-slate-600 text-sm">
              Auto-extract merchant, amount, and date from photos
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-600 block mb-2">
              Tabscanner API Key
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={ocrApiKey}
                  onChange={(e) => setOcrApiKey(e.target.value)}
                  placeholder="Enter your API key..."
                  className="w-full px-4 py-2 pr-10 border-2 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                >
                  {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <button
                onClick={handleSaveApiKey}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold"
              >
                {apiKeySaved ? '✓ Saved' : 'Save'}
              </button>
              {ocrApiKey && (
                <button
                  onClick={handleClearApiKey}
                  className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-semibold"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-blue-800 text-sm mb-2">
              <strong>How to get a free API key:</strong>
            </p>
            <ol className="text-blue-700 text-sm list-decimal list-inside space-y-1">
              <li>Visit <a href="https://tabscanner.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">tabscanner.com</a></li>
              <li>Create a free account</li>
              <li>Copy your API key from the dashboard</li>
              <li>Paste it above and click Save</li>
            </ol>
            <a
              href="https://tabscanner.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-blue-600 hover:text-blue-800 font-semibold text-sm"
            >
              Get Free API Key <ExternalLink size={14} />
            </a>
          </div>

          {!ocrApiKey && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <p className="text-emerald-800 text-sm">
                <strong>Built-in OCR Active:</strong> Receipts are processed locally in your browser using Tesseract.js.
                Add a Tabscanner API key above for improved accuracy on difficult receipts.
              </p>
            </div>
          )}

          {ocrApiKey && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-green-800 text-sm">
                ✓ <strong>Tabscanner API Active:</strong> Using cloud OCR for best accuracy. Falls back to built-in OCR if API fails.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Calendar Export */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl text-white">
            <Calendar size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">
              Calendar Export
            </h3>
            <p className="text-slate-600 text-sm">
              Download your bills as a calendar file (.ics)
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleExportCalendar}
            className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Download size={18} />
            Download Calendar File
          </button>

          {exportSuccess && (
            <div className={`rounded-xl p-4 flex items-start gap-3 ${
              exportSuccess.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-amber-50 border border-amber-200'
            }`}>
              <CheckCircle2 className={`flex-shrink-0 mt-0.5 ${
                exportSuccess.success ? 'text-green-500' : 'text-amber-500'
              }`} size={18} />
              <p className={`text-sm ${
                exportSuccess.success ? 'text-green-700' : 'text-amber-700'
              }`}>
                {exportSuccess.message}
              </p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-blue-800 text-sm mb-2">
              <strong>How to use:</strong>
            </p>
            <ol className="text-blue-700 text-sm list-decimal list-inside space-y-1">
              <li>Click "Download Calendar File" above</li>
              <li>Open your calendar app (Google Calendar, Apple Calendar, Outlook, etc.)</li>
              <li>Import the .ics file:
                <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5">
                  <li><strong>Google Calendar:</strong> Settings → Import & Export → Import</li>
                  <li><strong>Apple Calendar:</strong> File → Import</li>
                  <li><strong>Outlook:</strong> File → Open & Export → Import</li>
                </ul>
              </li>
              <li>Re-export monthly to keep your calendar current</li>
            </ol>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-slate-700 text-sm">
              <strong>Tip:</strong> Import into a separate calendar (create one called "Bills")
              so you can easily show/hide all bill reminders at once. Each bill includes
              reminders for 1 day and 3 days before the due date.
            </p>
          </div>

          <div className="text-sm text-slate-500">
            {billInstances.length} bill{billInstances.length !== 1 ? 's' : ''} will be exported
          </div>
        </div>
      </div>

      {/* Data Cleanup */}
      <DataCleanup
        bills={bills}
        onDeduplicateBills={onDeduplicateBills}
        onMarkPastBillsPaid={onMarkPastBillsPaid}
      />

      {/* Backup & Restore */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-slate-800">Backup & Restore</h3>
          <p className="text-slate-600 text-sm">
            Export your data or restore from a backup file
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onExportBackup}
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
                onImportBackup(file);
                e.target.value = '';
              }
            }}
            className="hidden"
          />
        </div>
        <div className="mt-4 bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
          <p className="text-amber-800 text-sm">
            <strong>Note:</strong> Backups include templates, instances, assets,
            one-time bills, and settings. Keep them secure.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
