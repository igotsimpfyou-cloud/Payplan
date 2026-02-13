import React from 'react';
import { Download, Upload } from 'lucide-react';
import LearnMoreToggle from './LearnMoreToggle';
import SectionCard from './SectionCard';

const BackupRestoreSection = ({ backupFileInputRef, onExportBackup, onImportBackup }) => {
  return (
    <SectionCard
      id="backup-restore"
      title="Backup & Restore"
      summary="Export your data or restore from a backup file."
      className="mb-6"
    >
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

      <LearnMoreToggle
        className="mt-4"
        summary="Backups contain your templates, instances, assets, one-time bills, and settings."
      >
        <p>
          Keep backup files in a secure location. Restoring a backup replaces current in-app data
          with the file contents.
        </p>
      </LearnMoreToggle>
    </SectionCard>
  );
};

export default BackupRestoreSection;
