/**
 * LocalStorage keys for PayPlan Pro
 */

export const LS_TEMPLATES = 'ppp.billTemplates';
export const LS_INSTANCES = 'ppp.billInstances';  // Legacy - will migrate from this
export const LS_ASSETS = 'assets';
export const LS_ONETIME = 'oneTimeBills';
export const LS_PAY = 'paySchedule';
export const LS_CAL = 'calendarConnected';
export const LS_PROPANE = 'propaneFills';
export const LS_EMERGENCY = 'emergencyFund';
export const LS_DEBTS = 'debtPayoff';
export const LS_ENVELOPES = 'ppp.envelopes';
export const LS_BUDGETS = 'ppp.budgets';
export const LS_ACTUAL_PAY = 'ppp.actualPayEntries';
export const LS_SCANNED_RECEIPTS = 'ppp.scannedReceipts';
export const LS_INVESTMENTS = 'ppp.investments';

// New database-style storage
export const LS_BILLS = 'ppp.bills';                    // Active bills (18-month window)
export const LS_HISTORICAL_BILLS = 'ppp.historicalBills'; // Archived bills (12+ months old)
export const LS_PAYCHECKS = 'ppp.paychecks';            // Income records
export const LS_LAST_ROLLOVER = 'ppp.lastRolloverMonth'; // Track when we last generated new month

// Phase 1A sync foundation
export const LS_INSTITUTIONS = 'ppp.institutions';
export const LS_ACCOUNT_CONNECTIONS = 'ppp.accountConnections';
export const LS_SYNCED_ACCOUNTS = 'ppp.syncedAccounts';
export const LS_SYNCED_TRANSACTIONS = 'ppp.syncedTransactions';
export const LS_SYNC_JOBS = 'ppp.syncJobs';
