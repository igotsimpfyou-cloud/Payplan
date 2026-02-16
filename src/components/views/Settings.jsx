import React from 'react';
import AdvancedSection from './settings/AdvancedSection';
import BackupRestoreSection from './settings/BackupRestoreSection';
import DataManagementSection from './settings/DataManagementSection';
import IntegrationsSection from './settings/IntegrationsSection';
import SettingsSectionNav from './settings/SettingsSectionNav';

const SETTINGS_SECTIONS = [
  { id: 'integrations', label: 'Integrations' },
  { id: 'data-management', label: 'Data Management' },
  { id: 'advanced', label: 'Advanced' },
  { id: 'backup-restore', label: 'Backup & Restore' },
];

export const Settings = ({
  backupFileInputRef,
  onExportBackup,
  onImportBackup,
  billInstances = [],
  bills = [],
  institutions = [],
  accountConnections = [],
  syncedAccounts = [],
  syncJobs = [],
  onLinkInstitution,
  onRunSync,
  onUnlinkConnection,
  onDeduplicateBills,
  onMarkPastBillsPaid,
}) => {
  return (
    <div>
      <SettingsSectionNav sections={SETTINGS_SECTIONS} />

      <IntegrationsSection billInstances={billInstances} bills={bills} />

      <DataManagementSection bills={bills} />

      <AdvancedSection
        bills={bills}
        onDeduplicateBills={onDeduplicateBills}
        onMarkPastBillsPaid={onMarkPastBillsPaid}
      />

      <BackupRestoreSection
        backupFileInputRef={backupFileInputRef}
        onExportBackup={onExportBackup}
        onImportBackup={onImportBackup}
      />
    </div>
  );
};

export default Settings;
