import { LS_LOCAL_BACKUP_CURRENT, LS_LOCAL_BACKUP_HISTORY } from '../constants/storageKeys.js';

const LOCAL_BACKUP_APP = 'PayPlan Pro';
const LOCAL_BACKUP_VERSION = 1;
const MAX_BACKUP_HISTORY = 5;

const hasWindow = () => typeof window !== 'undefined';

export function saveLocalBackup(payload) {
  if (!hasWindow()) return null;

  const snapshot = {
    app: LOCAL_BACKUP_APP,
    type: 'local-auto-backup',
    version: LOCAL_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: payload,
  };

  const serialized = JSON.stringify(snapshot);
  window.localStorage.setItem(LS_LOCAL_BACKUP_CURRENT, serialized);

  const history = getLocalBackupHistory();
  history.unshift(snapshot);
  const trimmed = history.slice(0, MAX_BACKUP_HISTORY);
  window.localStorage.setItem(LS_LOCAL_BACKUP_HISTORY, JSON.stringify(trimmed));

  return snapshot;
}

export function getLatestLocalBackup() {
  if (!hasWindow()) return null;
  const raw = window.localStorage.getItem(LS_LOCAL_BACKUP_CURRENT);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.app || parsed.app !== LOCAL_BACKUP_APP) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getLocalBackupHistory() {
  if (!hasWindow()) return [];
  const raw = window.localStorage.getItem(LS_LOCAL_BACKUP_HISTORY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => entry?.app === LOCAL_BACKUP_APP);
  } catch {
    return [];
  }
}
