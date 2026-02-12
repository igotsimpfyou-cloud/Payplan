import {
  LS_TEMPLATES,
  LS_INSTANCES,
  LS_ASSETS,
  LS_ONETIME,
  LS_PAY,
  LS_CAL,
  LS_PROPANE,
  LS_EMERGENCY,
  LS_DEBTS,
  LS_ENVELOPES,
  LS_BUDGETS,
  LS_ACTUAL_PAY,
  LS_SCANNED_RECEIPTS,
  LS_INVESTMENTS,
  LS_BILLS,
  LS_HISTORICAL_BILLS,
  LS_PAYCHECKS,
  LS_LAST_ROLLOVER,
} from '../constants/storageKeys';

const DB_NAME = 'payplan-pro';
const DB_VERSION = 1;
const META_STORE = 'meta';
const QUARANTINE_STORE = 'quarantine';
const APP_VERSION_KEY = 'appVersion';
const CURRENT_APP_VERSION = '1.0.0';

const hasId = (record) => record && (typeof record.id === 'number' || typeof record.id === 'string');
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const Collections = {
  templates: { type: 'array', keyPath: 'id', legacyKey: LS_TEMPLATES, validate: hasId },
  billInstances: { type: 'array', keyPath: 'id', legacyKey: LS_INSTANCES, validate: hasId },
  bills: { type: 'array', keyPath: 'id', legacyKey: LS_BILLS, validate: hasId },
  historicalBills: { type: 'array', keyPath: 'id', legacyKey: LS_HISTORICAL_BILLS, validate: hasId },
  paychecks: { type: 'array', keyPath: 'id', legacyKey: LS_PAYCHECKS, validate: hasId },
  assets: { type: 'array', keyPath: 'id', legacyKey: LS_ASSETS, validate: hasId },
  oneTimeBills: { type: 'array', keyPath: 'id', legacyKey: LS_ONETIME, validate: hasId },
  propaneFills: { type: 'array', keyPath: 'id', legacyKey: LS_PROPANE, validate: hasId },
  debtPayoff: { type: 'array', keyPath: 'id', legacyKey: LS_DEBTS, validate: hasId },
  envelopes: { type: 'array', keyPath: 'id', legacyKey: LS_ENVELOPES, validate: hasId },
  actualPayEntries: { type: 'array', keyPath: 'id', legacyKey: LS_ACTUAL_PAY, validate: hasId },
  scannedReceipts: { type: 'array', keyPath: 'id', legacyKey: LS_SCANNED_RECEIPTS, validate: hasId },
  investments: { type: 'array', keyPath: 'id', legacyKey: LS_INVESTMENTS, validate: hasId },
  paySchedule: { type: 'singleton', legacyKey: LS_PAY, validate: (v) => v == null || isObject(v) },
  calendarConnected: { type: 'singleton', legacyKey: LS_CAL, validate: (v) => typeof v === 'boolean' },
  emergencyFund: { type: 'singleton', legacyKey: LS_EMERGENCY, validate: (v) => isObject(v) },
  budgets: { type: 'singleton', legacyKey: LS_BUDGETS, validate: (v) => isObject(v) },
  lastRolloverMonth: { type: 'singleton', legacyKey: LS_LAST_ROLLOVER, validate: (v) => typeof v === 'string' || v == null },
};

const MIGRATIONS = {
  '1.0.0': [
    function migrateLegacyBillsToTemplates() {
      const templates = localStorage.getItem(LS_TEMPLATES);
      const legacyBills = localStorage.getItem('bills');
      if (templates || !legacyBills) return;
      let parsed;
      try {
        parsed = JSON.parse(legacyBills);
      } catch {
        return;
      }
      if (!Array.isArray(parsed)) return;
      const mapped = parsed.map((b) => ({
        id: b.id || Date.now() + Math.random(),
        name: b.name,
        amount: Number(b.amount) || 0,
        isVariable: !!b.isVariable,
        category: b.category || 'utilities',
        autopay: !!b.autopay,
        frequency: b.frequency || 'monthly',
        dueDay: parseInt(b.dueDate, 10),
        firstDueDate: b.nextDueDate || new Date().toISOString().split('T')[0],
        historicalPayments: b.historicalPayments || [],
      }));
      localStorage.setItem(LS_TEMPLATES, JSON.stringify(mapped));
      localStorage.removeItem('bills');
    },
  ],
};

const isIndexedDBAvailable = () => typeof indexedDB !== 'undefined';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const [name, config] of Object.entries(Collections)) {
        if (config.type === 'array' && !db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: config.keyPath });
        }
      }
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE);
      if (!db.objectStoreNames.contains(QUARANTINE_STORE)) db.createObjectStore(QUARANTINE_STORE, { autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function parseLegacyCollection(name) {
  const config = Collections[name];
  const raw = localStorage.getItem(config.legacyKey);
  if (raw == null) return config.type === 'array' ? [] : null;
  if (name === 'lastRolloverMonth') return raw;
  try { return JSON.parse(raw); } catch { return config.type === 'array' ? [] : null; }
}

function validateRecords(name, records) {
  const config = Collections[name];
  if (config.type === 'array') {
    const valid = [];
    const invalid = [];
    for (const record of Array.isArray(records) ? records : []) {
      if (config.validate(record)) valid.push(record);
      else invalid.push({ collection: name, record, issues: ['Record failed runtime validation'] });
    }
    return { valid, invalid };
  }
  if (config.validate(records)) return { valid: records, invalid: [] };
  return { valid: null, invalid: [{ collection: name, record: records, issues: ['Record failed runtime validation'] }] };
}

class LocalStorageAdapter {
  constructor() { this.name = 'localStorage'; this.pending = new Map(); this.flushTimer = null; }
  async init() {}
  async getMeta(key) { const raw = localStorage.getItem(`meta:${key}`); return raw ? JSON.parse(raw) : null; }
  async setMeta(key, value) { localStorage.setItem(`meta:${key}`, JSON.stringify(value)); }
  async loadCollection(name) { return parseLegacyCollection(name); }
  async saveCollection(name, value) {
    const key = Collections[name].legacyKey;
    if (name === 'lastRolloverMonth') {
      if (value) localStorage.setItem(key, value);
      else localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, JSON.stringify(value));
  }
  queuePatch(name, operation) {
    const queue = this.pending.get(name) ?? [];
    queue.push(operation);
    this.pending.set(name, queue);
    if (!this.flushTimer) this.flushTimer = setTimeout(() => this.flushPatches(), 80);
  }
  async flushPatches() {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = null;
    for (const [name, ops] of this.pending.entries()) {
      const existing = (await this.loadCollection(name)) ?? [];
      const byId = new Map((Array.isArray(existing) ? existing : []).map((item) => [item.id, item]));
      for (const op of ops) {
        if (op.type === 'upsert') byId.set(op.record.id, { ...(byId.get(op.record.id) || {}), ...op.record });
        if (op.type === 'patch') {
          const current = byId.get(op.id);
          if (current) byId.set(op.id, { ...current, ...op.patch });
        }
        if (op.type === 'delete') byId.delete(op.id);
      }
      await this.saveCollection(name, Array.from(byId.values()));
    }
    this.pending.clear();
  }
  async quarantine(records) { localStorage.setItem('quarantine:records', JSON.stringify(records)); }
}

class IndexedDbAdapter {
  constructor() { this.name = 'indexedDB'; this.pending = new Map(); this.flushTimer = null; }
  async init() { this.db = await openDb(); }
  transaction(storeNames, mode = 'readonly') { return this.db.transaction(storeNames, mode); }
  async getMeta(key) { return new Promise((resolve, reject) => { const req = this.transaction([META_STORE]).objectStore(META_STORE).get(key); req.onsuccess = () => resolve(req.result ?? null); req.onerror = () => reject(req.error); }); }
  async setMeta(key, value) { return new Promise((resolve, reject) => { const tx = this.transaction([META_STORE], 'readwrite'); tx.objectStore(META_STORE).put(value, key); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); }
  async loadCollection(name) {
    if (Collections[name].type === 'singleton') return this.getMeta(`collection:${name}`);
    return new Promise((resolve, reject) => { const req = this.transaction([name]).objectStore(name).getAll(); req.onsuccess = () => resolve(req.result || []); req.onerror = () => reject(req.error); });
  }
  async saveCollection(name, value) {
    if (Collections[name].type === 'singleton') return this.setMeta(`collection:${name}`, value);
    return new Promise((resolve, reject) => {
      const tx = this.transaction([name], 'readwrite');
      const store = tx.objectStore(name);
      store.clear();
      for (const record of Array.isArray(value) ? value : []) store.put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  queuePatch(name, operation) {
    const queue = this.pending.get(name) ?? [];
    queue.push(operation);
    this.pending.set(name, queue);
    if (!this.flushTimer) this.flushTimer = setTimeout(() => this.flushPatches(), 80);
  }
  async flushPatches() {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = null;
    for (const [name, ops] of this.pending.entries()) {
      await new Promise((resolve, reject) => {
        const tx = this.transaction([name], 'readwrite');
        const store = tx.objectStore(name);
        for (const op of ops) {
          if (op.type === 'upsert') store.put(op.record);
          if (op.type === 'patch') {
            const getReq = store.get(op.id);
            getReq.onsuccess = () => { if (getReq.result) store.put({ ...getReq.result, ...op.patch }); };
          }
          if (op.type === 'delete') store.delete(op.id);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
    this.pending.clear();
  }
  async quarantine(records) {
    if (!records?.length) return;
    await new Promise((resolve, reject) => {
      const tx = this.transaction([QUARANTINE_STORE], 'readwrite');
      for (const record of records) tx.objectStore(QUARANTINE_STORE).add({ ...record, quarantinedAt: new Date().toISOString() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

async function runMigrations(adapter) {
  const lastVersion = (await adapter.getMeta(APP_VERSION_KEY)) || '0.0.0';
  for (const version of Object.keys(MIGRATIONS).sort()) {
    if (version <= lastVersion) continue;
    for (const step of MIGRATIONS[version]) await step(adapter);
    await adapter.setMeta(APP_VERSION_KEY, version);
  }
  if (lastVersion === '0.0.0') await adapter.setMeta(APP_VERSION_KEY, CURRENT_APP_VERSION);
}

export async function createStorageRepository() {
  const adapter = isIndexedDBAvailable() ? new IndexedDbAdapter() : new LocalStorageAdapter();
  await adapter.init();
  await runMigrations(adapter);

  return {
    adapter: adapter.name,
    async loadAll() {
      const data = {};
      const invalid = [];
      for (const name of Object.keys(Collections)) {
        const fromPrimary = await adapter.loadCollection(name);
        const seeded = fromPrimary == null || (Array.isArray(fromPrimary) && fromPrimary.length === 0)
          ? parseLegacyCollection(name)
          : fromPrimary;
        const { valid, invalid: bad } = validateRecords(name, seeded);
        data[name] = valid;
        invalid.push(...bad);
        if (bad.length && Collections[name].type === 'array') await adapter.saveCollection(name, valid);
      }
      if (invalid.length) await adapter.quarantine(invalid);
      return { data, quarantineCount: invalid.length };
    },
    saveCollection: (name, value) => adapter.saveCollection(name, value),
    queuePatch: (name, operation) => adapter.queuePatch(name, operation),
    flush: () => adapter.flushPatches?.(),
  };
}
