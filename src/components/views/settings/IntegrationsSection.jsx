import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Camera,
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Landmark,
  Link as LinkIcon,
  RefreshCcw,
  Unplug,
} from 'lucide-react';
import { downloadICSFile, generateFilename } from '../../../utils/calendarExport';
import LearnMoreToggle from './LearnMoreToggle';
import SectionCard from './SectionCard';

const OCR_API_KEY_STORAGE = 'ppp.ocrApiKey';

const IntegrationsSection = ({
  billInstances = [],
  institutions = [],
  accountConnections = [],
  syncedAccounts = [],
  syncJobs = [],
  onLinkInstitution,
  onRunSync,
  onUnlinkConnection,
}) => {
  const safeBillInstances = Array.isArray(billInstances) ? billInstances : [];
  const safeInstitutions = Array.isArray(institutions) ? institutions : [];
  const safeAccountConnections = Array.isArray(accountConnections) ? accountConnections : [];
  const safeSyncedAccounts = Array.isArray(syncedAccounts) ? syncedAccounts : [];
  const safeSyncJobs = Array.isArray(syncJobs) ? syncJobs : [];
  const handleLinkInstitution = typeof onLinkInstitution === 'function' ? onLinkInstitution : () => {};
  const handleRunSync = typeof onRunSync === 'function' ? onRunSync : () => {};
  const handleUnlinkConnection = typeof onUnlinkConnection === 'function' ? onUnlinkConnection : () => {};

  const [ocrApiKey, setOcrApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(null);
  const lastSyncJob = safeSyncJobs.length
    ? [...safeSyncJobs].sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))[0]
    : null;

  const connectedAccountsCount = safeSyncedAccounts.filter((account) => account?.connectionStatus === 'connected').length;

  const getConnectionStateTone = (status) => {
    if (status === 'error') return 'bg-red-50 border border-red-200 text-red-700';
    if (status === 'syncing') return 'bg-blue-50 border border-blue-200 text-blue-700';
    return 'bg-emerald-50 border border-emerald-200 text-emerald-700';
  };


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

  const handleExportCalendar = () => {
    if (!safeBillInstances.length) {
      setExportSuccess({ success: false, message: 'No bills to export' });
      setTimeout(() => setExportSuccess(null), 3000);
      return;
    }

    const filename = generateFilename(safeBillInstances);
    const result = downloadICSFile(safeBillInstances, { filename });

    setExportSuccess({
      success: true,
      message: `Downloaded ${result.eventCount} bill${result.eventCount !== 1 ? 's' : ''} to ${filename}`,
    });
    setTimeout(() => setExportSuccess(null), 5000);
  };

  return (
    <SectionCard
      id="integrations"
      title="Integrations"
      summary="Connect external services for OCR and calendar reminders."
      className="mb-6"
    >
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg text-white">
              <Camera size={18} />
            </div>
            <h4 className="font-bold text-slate-800">Receipt Scanner OCR</h4>
          </div>

          <label className="text-sm font-semibold text-slate-600 block mb-2">Tabscanner API Key</label>
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
                onClick={() => setShowApiKey((show) => !show)}
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

          {!ocrApiKey ? (
            <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
              <strong>Built-in OCR active:</strong> Receipts are processed locally in your browser.
            </div>
          ) : (
            <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
              ✓ <strong>Tabscanner API active:</strong> Using cloud OCR with local fallback.
            </div>
          )}

          <LearnMoreToggle
            className="mt-3"
            summary="Use your free Tabscanner key for stronger OCR accuracy on difficult receipts."
          >
            <ol className="list-decimal list-inside space-y-1">
              <li>
                Visit{' '}
                <a
                  href="https://tabscanner.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-medium"
                >
                  tabscanner.com
                </a>
              </li>
              <li>Create a free account and copy your dashboard API key.</li>
              <li>Paste it above and click Save.</li>
            </ol>
            <a
              href="https://tabscanner.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-blue-600 hover:text-blue-800 font-semibold"
            >
              Get Free API Key <ExternalLink size={14} />
            </a>
          </LearnMoreToggle>
        </div>

        <div className="border-t border-slate-100 pt-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg text-white">
              <Landmark size={18} />
            </div>
            <h4 className="font-bold text-slate-800">Linked Accounts (Phase 1A)</h4>
          </div>

          <p className="text-sm text-slate-600">
            Simulated account aggregation foundation with institution linking, account inventory, and sync status.
          </p>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">Institutions</div>
              <div className="text-xl font-bold text-slate-800">{safeInstitutions.length}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">Connected Accounts</div>
              <div className="text-xl font-bold text-slate-800">{connectedAccountsCount}</div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={handleLinkInstitution}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold inline-flex items-center gap-2"
            >
              <LinkIcon size={16} />
              Link Institution
            </button>
            <button
              onClick={handleRunSync}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold inline-flex items-center gap-2"
            >
              <RefreshCcw size={16} />
              Run Sync
            </button>
          </div>

          {lastSyncJob && (
            <div className={`mt-3 rounded-xl p-3 text-sm ${getConnectionStateTone(lastSyncJob.status)}`}>
              Last sync {lastSyncJob.status} at {new Date(lastSyncJob.startedAt).toLocaleString()}
              {lastSyncJob.errorMessage ? ` — ${lastSyncJob.errorMessage}` : ''}
            </div>
          )}

          <div className="mt-4 space-y-3">
            {safeAccountConnections.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                No institutions linked yet.
              </div>
            ) : (
              safeAccountConnections.map((connection) => {
                const accountsForConnection = safeSyncedAccounts.filter((account) => account?.connectionId === connection.id);
                return (
                  <div key={connection.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-800">{connection.institutionName}</div>
                        <div className="text-xs text-slate-500">Linked {new Date(connection.linkedAt).toLocaleDateString()}</div>
                      </div>
                      <button
                        onClick={() => handleUnlinkConnection(connection.id)}
                        className="px-2 py-1 text-xs rounded-lg bg-red-50 hover:bg-red-100 text-red-700 inline-flex items-center gap-1"
                      >
                        <Unplug size={14} />
                        Unlink
                      </button>
                    </div>

                    <div className="mt-3 space-y-2">
                      {accountsForConnection.map((account) => (
                        <div key={account.id} className="rounded-lg border border-slate-100 p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-slate-700">{account.name}</div>
                              <div className="text-xs text-slate-500">{account.type} • {account.maskedIdentifier}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-slate-800">
                                ${Number(account?.currentBalance || 0).toLocaleString()}
                              </div>
                              <div className="text-xs text-slate-500">
                                Last sync {account?.lastSyncAt ? new Date(account.lastSyncAt).toLocaleTimeString() : 'N/A'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="border-t border-slate-100 pt-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg text-white">
              <Calendar size={18} />
            </div>
            <h4 className="font-bold text-slate-800">Calendar Export</h4>
          </div>

          <button
            onClick={handleExportCalendar}
            className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Download size={18} />
            Download Calendar File
          </button>

          {exportSuccess && (
            <div
              className={`mt-3 rounded-xl p-4 flex items-start gap-3 ${
                exportSuccess.success ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'
              }`}
            >
              <CheckCircle2
                className={`flex-shrink-0 mt-0.5 ${exportSuccess.success ? 'text-green-500' : 'text-amber-500'}`}
                size={18}
              />
              <p className={`text-sm ${exportSuccess.success ? 'text-green-700' : 'text-amber-700'}`}>
                {exportSuccess.message}
              </p>
            </div>
          )}

          <div className="mt-3 text-sm text-slate-500">
            {safeBillInstances.length} bill{safeBillInstances.length !== 1 ? 's' : ''} will be exported
          </div>

          <LearnMoreToggle
            className="mt-3"
            summary="Export as .ics and import into a dedicated Bills calendar so reminders are easy to manage."
          >
            <ol className="list-decimal list-inside space-y-1">
              <li>Click "Download Calendar File" above.</li>
              <li>Open Google Calendar, Apple Calendar, Outlook, or another calendar app.</li>
              <li>Import the .ics file using your app's import workflow.</li>
              <li>Re-export monthly to keep reminders current.</li>
            </ol>
          </LearnMoreToggle>
        </div>
      </div>
    </SectionCard>
  );
};

export default IntegrationsSection;
