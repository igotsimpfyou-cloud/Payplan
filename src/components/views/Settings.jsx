import React, { useState, useEffect, useMemo } from 'react';
import { Download, Upload, Camera, Eye, EyeOff, ExternalLink, Calendar, CheckCircle2, Trash2 } from 'lucide-react';
import { downloadICSFile, generateFilename } from '../../utils/calendarExport';
import { parseMMDDYYYY } from '../../utils/billDatabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

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
            <Button
              onClick={handleDeduplicate}
              disabled={stats.duplicateCount === 0}
              variant="secondary"
              className={`${stats.duplicateCount > 0 ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
            >
              Remove Duplicates
            </Button>
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
            <Button
              onClick={handleMarkPastPaid}
              disabled={stats.pastUnpaidCount === 0}
              variant="success"
              className={`${stats.pastUnpaidCount > 0 ? '' : 'bg-slate-200 text-slate-400'}`}
            >
              Mark All Paid
            </Button>
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
  return (
    <div>
      <SettingsSectionNav sections={SETTINGS_SECTIONS} />

        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-600 block mb-2">
              Tabscanner API Key
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  value={ocrApiKey}
                  onChange={(e) => setOcrApiKey(e.target.value)}
                  placeholder="Enter your API key..."
                  size="md"
                  inputClassName="pr-10"
                  rightElement={(
                    <Button
                      type="button"
                      variant="ghost"
                      size="iconSm"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </Button>
                  )}
                />
              </div>
              <Button
                onClick={handleSaveApiKey}
                loading={apiKeySaved}
                loadingText="Saved"
                variant="primary"
              >
                Save
              </Button>
              {ocrApiKey && (
                <Button
                  onClick={handleClearApiKey}
                  variant="destructiveOutline"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

      <DataManagementSection bills={bills} />

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
          <Button
            onClick={handleExportCalendar}
            className="w-full"
            icon={Download}
          >
            Download Calendar File
          </Button>

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

      <AdvancedSection
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
          <Button
            onClick={onExportBackup}
            variant="secondary"
            className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700"
            icon={Download}
          >
            Export Backup
          </Button>
          <Button
            onClick={() => backupFileInputRef.current?.click()}
            variant="secondary"
            className="flex-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700"
            icon={Upload}
          >
            Restore Backup
          </Button>
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
