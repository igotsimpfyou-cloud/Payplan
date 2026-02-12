import React from 'react';
import AdvancedSection from './settings/AdvancedSection';
import BackupRestoreSection from './settings/BackupRestoreSection';
import DataManagementSection from './settings/DataManagementSection';
import IntegrationsSection from './settings/IntegrationsSection';
import SettingsSectionNav from './settings/SettingsSectionNav';

const SETTINGS_SECTIONS = [
  { id: 'integrations', label: 'Integrations' },
  { id: 'data-management', label: 'Data Management' },
  { id: 'backup-restore', label: 'Backup & Restore' },
  { id: 'advanced', label: 'Advanced' },
];

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

      <IntegrationsSection billInstances={billInstances} />

      <DataManagementSection bills={bills} />

      <BackupRestoreSection
        backupFileInputRef={backupFileInputRef}
        onExportBackup={onExportBackup}
        onImportBackup={onImportBackup}
      />

      <AdvancedSection
        bills={bills}
        onDeduplicateBills={onDeduplicateBills}
        onMarkPastBillsPaid={onMarkPastBillsPaid}
      />
    </div>
  );
};

export default Settings;
