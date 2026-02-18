import React from 'react';
import { Download, Upload, Smartphone, RotateCcw } from 'lucide-react';
import LearnMoreToggle from './LearnMoreToggle';
import SectionCard from './SectionCard';

const BackupRestoreSection = ({
  backupFileInputRef,
  onExportBackup,
  onImportBackup,
  onCreateLocalBackup,
  onRestoreLocalBackup,
}) => {
  return (
    <SectionCard
      id="backup-restore"
      title="Backup & Restore"
      summary="Save backups on this phone or export files for off-device storage."
      className="mb-6"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          onClick={onCreateLocalBackup}
          className="px-4 py-3 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <Smartphone size={18} />
          Save on This Phone
        </button>
        <button
          onClick={onRestoreLocalBackup}
          className="px-4 py-3 bg-violet-100 hover:bg-violet-200 text-violet-700 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <RotateCcw size={18} />
          Restore Local Backup
        </button>
        <button
          onClick={onExportBackup}
          className="px-4 py-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <Download size={18} />
          Export File Backup
        </button>
        <button
          onClick={() => backupFileInputRef.current?.click()}
          className="px-4 py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <Upload size={18} />
          Restore File Backup
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

      <LearnMoreToggle
        className="mt-4"
        summary="Local backups are saved on this phone/browser. File backups can be moved to other devices."
      >
        <p>
          Use "Save on This Phone" for quick on-device recovery. Keep exported files in a secure
          location for off-device backup. Restoring any backup replaces your current in-app data.
        </p>
      </LearnMoreToggle>
    </SectionCard>
  );
};

export default BackupRestoreSection;
