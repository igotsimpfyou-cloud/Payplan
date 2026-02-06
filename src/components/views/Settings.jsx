import React, { useState, useEffect } from 'react';
import { Download, Upload, RefreshCw, Camera, Eye, EyeOff, ExternalLink, Calendar, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { parseAmt } from '../../utils/formatters';
import {
  initializeGoogleCalendar,
  authorizeGoogle,
  signOutGoogle,
  getOrCreatePayPlanCalendar,
  syncAllBillsToCalendar,
  deletePayPlanCalendar,
  isGoogleAuthorized,
  GOOGLE_CLIENT_ID_KEY,
  GOOGLE_CALENDAR_ID_KEY,
} from '../../utils/googleCalendar';

const OCR_API_KEY_STORAGE = 'ppp.ocrApiKey';

export const Settings = ({
  paySchedule,
  envelopes,
  budgets,
  calendarConnected,
  backupFileInputRef,
  perCheckEnvelopeSum,
  onEditPaySchedule,
  onAddEnvelope,
  onEditEnvelope,
  onRemoveEnvelope,
  onSetBudget,
  onConnectCalendar,
  onSyncCalendar,
  onExportBackup,
  onImportBackup,
  billInstances = [],
}) => {
  // OCR API key state
  const [ocrApiKey, setOcrApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeySaved, setApiKeySaved] = useState(false);

  // Google Calendar state
  const [googleClientId, setGoogleClientId] = useState('');
  const [showClientId, setShowClientId] = useState(false);
  const [clientIdSaved, setClientIdSaved] = useState(false);
  const [calendarId, setCalendarId] = useState('');
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState('');
  const [syncStatus, setSyncStatus] = useState(null);

  // Load API keys on mount
  useEffect(() => {
    const savedKey = localStorage.getItem(OCR_API_KEY_STORAGE) || '';
    setOcrApiKey(savedKey);

    const savedClientId = localStorage.getItem(GOOGLE_CLIENT_ID_KEY) || '';
    setGoogleClientId(savedClientId);

    const savedCalendarId = localStorage.getItem(GOOGLE_CALENDAR_ID_KEY) || '';
    setCalendarId(savedCalendarId);
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

  // Google Calendar handlers
  const handleSaveClientId = () => {
    localStorage.setItem(GOOGLE_CLIENT_ID_KEY, googleClientId.trim());
    setClientIdSaved(true);
    setTimeout(() => setClientIdSaved(false), 2000);
  };

  const handleClearClientId = () => {
    localStorage.removeItem(GOOGLE_CLIENT_ID_KEY);
    setGoogleClientId('');
  };

  const handleConnectCalendar = async () => {
    if (!googleClientId.trim()) {
      setCalendarError('Please enter your Google Client ID first');
      return;
    }

    setCalendarLoading(true);
    setCalendarError('');

    try {
      // Initialize Google APIs
      await initializeGoogleCalendar(googleClientId.trim());

      // Authorize user
      await authorizeGoogle();

      // Get or create PayPlan calendar
      const newCalendarId = await getOrCreatePayPlanCalendar();
      setCalendarId(newCalendarId);
      localStorage.setItem(GOOGLE_CALENDAR_ID_KEY, newCalendarId);

      // Notify parent component
      onConnectCalendar(true);
    } catch (error) {
      console.error('Calendar connection error:', error);
      setCalendarError(error.message || 'Failed to connect to Google Calendar');
    } finally {
      setCalendarLoading(false);
    }
  };

  const handleDisconnectCalendar = async () => {
    if (!confirm('Disconnect from Google Calendar? The PayPlan Bills calendar will remain in your Google account.')) {
      return;
    }

    setCalendarLoading(true);
    try {
      signOutGoogle();
      setCalendarId('');
      localStorage.removeItem(GOOGLE_CALENDAR_ID_KEY);
      onConnectCalendar(false);
    } catch (error) {
      setCalendarError(error.message);
    } finally {
      setCalendarLoading(false);
    }
  };

  const handleSyncCalendar = async () => {
    if (!calendarId) {
      setCalendarError('Calendar not connected');
      return;
    }

    setCalendarLoading(true);
    setCalendarError('');
    setSyncStatus(null);

    try {
      // Re-authorize if needed
      if (!isGoogleAuthorized()) {
        await initializeGoogleCalendar(googleClientId.trim());
        await authorizeGoogle();
      }

      // Sync all bills
      const results = await syncAllBillsToCalendar(calendarId, billInstances);
      setSyncStatus(results);

      if (results.errors.length === 0) {
        setTimeout(() => setSyncStatus(null), 5000);
      }
    } catch (error) {
      console.error('Sync error:', error);
      setCalendarError(error.message || 'Failed to sync bills to calendar');
    } finally {
      setCalendarLoading(false);
    }
  };

  return (
    <div>
      {/* Pay Schedule */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">Pay Schedule</h3>
            {paySchedule ? (
              <div className="text-sm text-slate-600 mt-1">
                {paySchedule.frequency} • $
                {parseAmt(paySchedule.payAmount).toFixed(2)} per check • Next{' '}
                {new Date(paySchedule.nextPayDate).toLocaleDateString()}
              </div>
            ) : (
              <div className="text-sm text-slate-600 mt-1">Not set.</div>
            )}
          </div>
          <button
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            onClick={onEditPaySchedule}
          >
            {paySchedule ? 'Edit' : 'Set up'}
          </button>
        </div>
      </div>

      {/* Envelopes */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold">Envelopes</h3>
          <button
            className="px-3 py-2 rounded-xl bg-emerald-100 text-emerald-700 font-semibold"
            onClick={onAddEnvelope}
          >
            Add
          </button>
        </div>
        {envelopes.length ? (
          <div className="space-y-2">
            {envelopes.map((e) => (
              <div
                key={e.id}
                className="p-3 bg-slate-50 rounded-xl flex items-center justify-between"
              >
                <div className="font-semibold">{e.name}</div>
                <div className="flex items-center gap-2">
                  <div className="text-slate-600">
                    ${parseAmt(e.perCheck).toFixed(2)} / check
                  </div>
                  <button
                    className="px-2 py-1 text-blue-700 bg-blue-100 rounded-lg"
                    onClick={() => onEditEnvelope(e)}
                  >
                    Edit
                  </button>
                  <button
                    className="px-2 py-1 text-red-700 bg-red-100 rounded-lg"
                    onClick={() => onRemoveEnvelope(e.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <div className="text-sm text-slate-600">
              Total reserved per check:{' '}
              <b>${perCheckEnvelopeSum.toFixed(2)}</b>
            </div>
          </div>
        ) : (
          <div className="text-slate-600">No envelopes yet.</div>
        )}
      </div>

      {/* Category Budgets */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold">Category Budgets</h3>
          <button
            className="px-3 py-2 rounded-xl bg-emerald-100 text-emerald-700 font-semibold"
            onClick={onSetBudget}
          >
            Set/Update
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
          {Object.entries(budgets).map(([k, v]) => (
            <div
              key={k}
              className="p-3 bg-slate-50 rounded-xl flex items-center justify-between"
            >
              <span className="font-semibold capitalize">{k}</span>
              <span>${parseAmt(v).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

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
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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

      {/* Google Calendar */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl text-white">
            <Calendar size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">
              Google Calendar Integration
            </h3>
            <p className="text-slate-600 text-sm">
              Sync bills to a separate "PayPlan Bills" calendar you can toggle on/off
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Google Client ID Input */}
          <div>
            <label className="text-sm font-semibold text-slate-600 block mb-2">
              Google Cloud Client ID
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showClientId ? 'text' : 'password'}
                  value={googleClientId}
                  onChange={(e) => setGoogleClientId(e.target.value)}
                  placeholder="Enter your Google Cloud Client ID..."
                  className="w-full px-4 py-2 pr-10 border-2 rounded-xl"
                />
                <button
                  onClick={() => setShowClientId(!showClientId)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showClientId ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <button
                onClick={handleSaveClientId}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold"
              >
                {clientIdSaved ? '✓ Saved' : 'Save'}
              </button>
              {googleClientId && (
                <button
                  onClick={handleClearClientId}
                  className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-semibold"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Setup Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-blue-800 text-sm mb-2">
              <strong>How to set up Google Calendar sync:</strong>
            </p>
            <ol className="text-blue-700 text-sm list-decimal list-inside space-y-1">
              <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">Google Cloud Console</a></li>
              <li>Create a new project (or select existing)</li>
              <li>Enable the "Google Calendar API"</li>
              <li>Go to "Credentials" → "Create Credentials" → "OAuth Client ID"</li>
              <li>Select "Web application" and add your domain to Authorized JavaScript origins</li>
              <li>Copy the Client ID and paste it above</li>
            </ol>
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-blue-600 hover:text-blue-800 font-semibold text-sm"
            >
              Open Google Cloud Console <ExternalLink size={14} />
            </a>
          </div>

          {/* Connection Status & Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {calendarConnected ? (
              <>
                <button
                  onClick={handleSyncCalendar}
                  disabled={calendarLoading}
                  className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50"
                >
                  {calendarLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <RefreshCw size={16} />
                  )}
                  {calendarLoading ? 'Syncing...' : 'Sync Bills Now'}
                </button>
                <button
                  onClick={handleDisconnectCalendar}
                  disabled={calendarLoading}
                  className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-semibold disabled:opacity-50"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={handleConnectCalendar}
                disabled={calendarLoading || !googleClientId.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {calendarLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Calendar size={16} />
                )}
                {calendarLoading ? 'Connecting...' : 'Connect Google Calendar'}
              </button>
            )}
          </div>

          {/* Error Message */}
          {calendarError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
              <p className="text-red-700 text-sm">{calendarError}</p>
            </div>
          )}

          {/* Sync Status */}
          {syncStatus && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
              <CheckCircle2 className="text-green-500 flex-shrink-0 mt-0.5" size={18} />
              <div className="text-green-700 text-sm">
                <p><strong>Sync complete!</strong></p>
                <p>{syncStatus.created} events created, {syncStatus.updated} events updated</p>
                {syncStatus.errors.length > 0 && (
                  <p className="text-red-600 mt-1">
                    {syncStatus.errors.length} errors occurred
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Connection Status */}
          {calendarConnected && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-green-800 text-sm">
                <CheckCircle2 className="inline mr-2" size={16} />
                <strong>Connected!</strong> A "PayPlan Bills" calendar has been created in your Google account.
                You can show/hide it from the Google Calendar sidebar.
              </p>
              <p className="text-green-700 text-xs mt-2">
                Bills are synced with due date reminders (1 day and 3 days before).
              </p>
            </div>
          )}

          {!googleClientId && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-amber-800 text-sm">
                <AlertCircle className="inline mr-2" size={16} />
                Enter your Google Cloud Client ID above to enable calendar syncing.
              </p>
            </div>
          )}
        </div>
      </div>

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
