import React from 'react';
import { Download, Upload, RefreshCw } from 'lucide-react';
import { parseAmt } from '../../utils/formatters';

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
}) => {
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

      {/* Google Calendar */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-slate-800">
              Google Calendar Integration
            </h3>
            <p className="text-slate-600 text-sm">
              Sync your bills and payment dates to your calendar
            </p>
          </div>
          <div className="flex items-center gap-2">
            {calendarConnected && (
              <button
                onClick={onSyncCalendar}
                className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl font-semibold flex items-center gap-2"
              >
                <RefreshCw size={16} />
                Sync Now
              </button>
            )}
            <button
              onClick={onConnectCalendar}
              className={`px-4 py-2 rounded-xl font-semibold ${
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
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-green-800 text-sm">
            ✓ Calendar is connected. (Demo mode)
          </div>
        )}
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
