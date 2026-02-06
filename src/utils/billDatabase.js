/**
 * Bill Database Utilities
 *
 * New architecture:
 * - Bills are concrete database records, not dynamically generated
 * - Each bill has unique ID: {Name}{MMDDYYYY}.bill
 * - Income/paychecks follow similar pattern: income{MMDDYYYY}.pay
 * - Rolling window: 12 months backward (historical), 6 months forward (active)
 */

import { parseAmt } from './formatters';

// =============================================================================
// ID GENERATORS
// =============================================================================

/**
 * Generate bill ID in format: Name02072026.bill
 * @param {string} name - Bill name
 * @param {Date|string} dueDate - Due date
 * @returns {string} Bill ID
 */
export const generateBillId = (name, dueDate) => {
  const d = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  const cleanName = name.replace(/[^a-zA-Z0-9]/g, '');
  return `${cleanName}${mm}${dd}${yyyy}.bill`;
};

/**
 * Generate paycheck ID in format: income02062026.pay
 * @param {Date|string} payDate - Pay date
 * @returns {string} Paycheck ID
 */
export const generatePaycheckId = (payDate) => {
  const d = typeof payDate === 'string' ? new Date(payDate) : payDate;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `income${mm}${dd}${yyyy}.pay`;
};

/**
 * Convert date to MMDDYYYY format string
 */
export const toMMDDYYYY = (date) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}${dd}${yyyy}`;
};

/**
 * Parse MMDDYYYY string to Date
 */
export const parseMMDDYYYY = (str) => {
  if (!str || str.length !== 8) return null;
  const mm = parseInt(str.substring(0, 2), 10);
  const dd = parseInt(str.substring(2, 4), 10);
  const yyyy = parseInt(str.substring(4, 8), 10);
  return new Date(yyyy, mm - 1, dd);
};

// =============================================================================
// BILL GENERATION
// =============================================================================

/**
 * Calculate the estimated amount for a bill based on historical payments
 * Uses rolling average of last 12 months of actualPaid values
 */
export const calculateBillEstimate = (template, historicalBills = []) => {
  // Get bills for this template from the last 12 months with actualPaid
  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);

  const relevantBills = historicalBills.filter(bill => {
    if (bill.templateId !== template.id) return false;
    if (bill.actualPaid == null) return false;
    const billDate = parseMMDDYYYY(bill.dueDate) || new Date(bill.dueDate);
    return billDate >= twelveMonthsAgo;
  });

  if (relevantBills.length > 0) {
    const total = relevantBills.reduce((sum, b) => sum + parseAmt(b.actualPaid), 0);
    return total / relevantBills.length;
  }

  // Also check template's historicalPayments for legacy data
  if (template.historicalPayments && template.historicalPayments.length > 0) {
    const amounts = template.historicalPayments
      .map(h => parseAmt(h.amount))
      .filter(a => a > 0);
    if (amounts.length > 0) {
      return amounts.reduce((s, a) => s + a, 0) / amounts.length;
    }
  }

  return parseAmt(template.amount);
};

/**
 * Generate a single bill record from a template for a specific date
 */
export const createBillRecord = (template, dueDate, estimatedAmount) => {
  const d = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;

  return {
    id: generateBillId(template.name, d),
    templateId: template.id,
    name: template.name,
    amount: estimatedAmount,
    dueDate: toMMDDYYYY(d),
    category: template.category || 'utilities',
    isVariable: !!template.isVariable,
    autopay: !!template.autopay,
    frequency: template.frequency || 'monthly',
    paid: false,
    paidDate: null,
    actualPaid: null,
    assignedCheck: null,
    assignedPayDate: null,
    createdAt: new Date().toISOString(),
  };
};

/**
 * Generate bills for a template for the next N months
 * @param {Object} template - Bill template
 * @param {number} monthsForward - How many months forward to generate (default 6)
 * @param {Date} startFrom - Start generating from this date (default: current month)
 * @param {Array} existingBills - Existing bills to check for duplicates
 * @param {Array} allBills - All bills for estimate calculation
 * @returns {Array} New bill records to add
 */
export const generateBillsFromTemplate = (
  template,
  monthsForward = 6,
  startFrom = new Date(),
  existingBills = [],
  allBills = []
) => {
  const newBills = [];
  const estimate = calculateBillEstimate(template, allBills);

  // Check for retire date
  const retireDate = template.retireDate ? new Date(template.retireDate) : null;

  for (let i = 0; i < monthsForward; i++) {
    const targetMonth = new Date(startFrom.getFullYear(), startFrom.getMonth() + i, 1);

    // Skip if past retire date
    if (retireDate && targetMonth > retireDate) {
      break;
    }

    // Calculate due date for this month
    const dueDay = parseInt(template.dueDay, 10) || 1;
    const lastDayOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
    const actualDueDay = Math.min(dueDay, lastDayOfMonth);
    const dueDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), actualDueDay);

    // Check if bill already exists
    const billId = generateBillId(template.name, dueDate);
    const alreadyExists = existingBills.some(b => b.id === billId);

    if (!alreadyExists) {
      newBills.push(createBillRecord(template, dueDate, estimate));
    }
  }

  return newBills;
};

/**
 * Generate all bills for all templates
 */
export const generateAllBillsFromTemplates = (
  templates,
  monthsForward = 6,
  startFrom = new Date(),
  existingBills = []
) => {
  let allNewBills = [];

  for (const template of templates) {
    const newBills = generateBillsFromTemplate(
      template,
      monthsForward,
      startFrom,
      existingBills,
      [...existingBills, ...allNewBills]
    );
    allNewBills = [...allNewBills, ...newBills];
  }

  return allNewBills;
};

// =============================================================================
// PAYCHECK GENERATION
// =============================================================================

/**
 * Generate a single paycheck record
 */
export const createPaycheckRecord = (payDate, amount, scheduleId = null) => {
  const d = typeof payDate === 'string' ? new Date(payDate) : payDate;

  return {
    id: generatePaycheckId(d),
    scheduleId,
    amount: parseAmt(amount),
    date: toMMDDYYYY(d),
    received: false,
    actualAmount: null,
    createdAt: new Date().toISOString(),
  };
};

/**
 * Generate paychecks for N months forward
 * @param {Object} paySchedule - Pay schedule config
 * @param {number} monthsForward - How many months forward (default 6)
 * @param {Array} existingPaychecks - Existing paychecks to check for duplicates
 * @returns {Array} New paycheck records
 */
export const generatePaychecksFromSchedule = (
  paySchedule,
  monthsForward = 6,
  existingPaychecks = []
) => {
  if (!paySchedule?.nextPayDate) return [];

  const newPaychecks = [];
  const freq = paySchedule.frequency || 'biweekly';
  const amount = parseAmt(paySchedule.payAmount);

  // Parse the next pay date
  let currentDate = new Date(paySchedule.nextPayDate);
  if (isNaN(currentDate.getTime())) return [];

  // Calculate end date (N months from now)
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + monthsForward);

  // Generate paychecks until end date
  while (currentDate <= endDate) {
    const paycheckId = generatePaycheckId(currentDate);
    const alreadyExists = existingPaychecks.some(p => p.id === paycheckId);

    if (!alreadyExists) {
      newPaychecks.push(createPaycheckRecord(currentDate, amount, paySchedule.id));
    }

    // Advance to next pay date based on frequency
    const nextDate = new Date(currentDate);
    switch (freq) {
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'biweekly':
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case 'semimonthly':
        if (nextDate.getDate() <= 15) {
          nextDate.setDate(15);
        } else {
          nextDate.setMonth(nextDate.getMonth() + 1);
          nextDate.setDate(1);
        }
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      default:
        nextDate.setDate(nextDate.getDate() + 14);
    }
    currentDate = nextDate;
  }

  return newPaychecks;
};

// =============================================================================
// ARCHIVAL & MAINTENANCE
// =============================================================================

/**
 * Get the cutoff date for historical archival (12 months ago)
 */
export const getArchivalCutoffDate = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - 12, 1);
};

/**
 * Separate bills into active and historical based on 12-month cutoff
 * @param {Array} bills - All bills
 * @returns {{ active: Array, historical: Array }}
 */
export const separateActiveAndHistorical = (bills) => {
  const cutoff = getArchivalCutoffDate();
  const active = [];
  const historical = [];

  for (const bill of bills) {
    const billDate = parseMMDDYYYY(bill.dueDate) || new Date(bill.dueDate);
    if (billDate < cutoff) {
      historical.push(bill);
    } else {
      active.push(bill);
    }
  }

  return { active, historical };
};

/**
 * Check if we need to generate new month's bills (first load of new month)
 * @param {string} lastRolloverMonth - YYYY-MM format of last rollover
 * @returns {boolean}
 */
export const needsMonthlyRollover = (lastRolloverMonth) => {
  if (!lastRolloverMonth) return true;

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return currentMonth !== lastRolloverMonth;
};

/**
 * Get current month in YYYY-MM format
 */
export const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// =============================================================================
// BILL ASSIGNMENT
// =============================================================================

/**
 * Assign a single bill to the correct paycheck
 * Uses the latest paycheck that is ON or BEFORE the bill's due date
 */
export const assignBillToPaycheck = (bill, paychecks) => {
  if (!paychecks.length) return bill;

  const billDate = parseMMDDYYYY(bill.dueDate) || new Date(bill.dueDate);

  // Sort paychecks by date
  const sortedPaychecks = [...paychecks].sort((a, b) => {
    const dateA = parseMMDDYYYY(a.date) || new Date(a.date);
    const dateB = parseMMDDYYYY(b.date) || new Date(b.date);
    return dateA - dateB;
  });

  // Find the latest paycheck on or before bill due date
  let assignedPaycheck = sortedPaychecks[0];
  let checkNumber = 1;

  for (let i = 0; i < sortedPaychecks.length; i++) {
    const paycheckDate = parseMMDDYYYY(sortedPaychecks[i].date) || new Date(sortedPaychecks[i].date);
    if (paycheckDate <= billDate) {
      assignedPaycheck = sortedPaychecks[i];
      checkNumber = i + 1;
    } else {
      break;
    }
  }

  return {
    ...bill,
    assignedCheck: checkNumber,
    assignedPayDate: assignedPaycheck.date,
  };
};

/**
 * Assign all unpaid bills to paychecks
 */
export const assignAllBillsToPaychecks = (bills, paychecks) => {
  return bills.map(bill => {
    // Only reassign if not already paid
    if (bill.paid) return bill;
    return assignBillToPaycheck(bill, paychecks);
  });
};

// =============================================================================
// MIGRATION
// =============================================================================

/**
 * Migrate from old billInstances to new bills format
 * @param {Array} oldInstances - Old billInstances
 * @param {Array} templates - Bill templates
 * @returns {Array} Bills in new format
 */
export const migrateFromInstances = (oldInstances, templates) => {
  return oldInstances.map(inst => {
    // Find template for this instance
    const template = templates.find(t => t.id === inst.templateId);

    // Parse the old date format (YYYY-MM-DD) to new format (MMDDYYYY)
    const oldDate = new Date(inst.dueDate);
    const newDueDate = toMMDDYYYY(oldDate);

    return {
      id: generateBillId(inst.name, oldDate),
      templateId: inst.templateId,
      name: inst.name,
      amount: parseAmt(inst.amountEstimate || inst.amount || (template?.amount)),
      dueDate: newDueDate,
      category: inst.category || template?.category || 'utilities',
      isVariable: inst.isVariable ?? template?.isVariable ?? false,
      autopay: inst.autopay ?? template?.autopay ?? false,
      frequency: inst.frequency || template?.frequency || 'monthly',
      paid: !!inst.paid,
      paidDate: inst.paidDate || null,
      actualPaid: inst.actualPaid,
      assignedCheck: inst.assignedCheck,
      assignedPayDate: inst.assignedPayDate ? toMMDDYYYY(new Date(inst.assignedPayDate)) : null,
      createdAt: inst.createdAt || new Date().toISOString(),
    };
  });
};

/**
 * Migrate one-time bills to the new format
 */
export const migrateOneTimeBills = (oneTimeBills) => {
  return oneTimeBills.map(bill => {
    const dueDate = new Date(bill.dueDate);

    return {
      id: generateBillId(bill.name, dueDate),
      templateId: null, // One-time bills have no template
      name: bill.name,
      amount: parseAmt(bill.amount),
      dueDate: toMMDDYYYY(dueDate),
      category: bill.category || 'other',
      isVariable: false,
      autopay: false,
      frequency: 'once',
      paid: !!bill.paid,
      paidDate: bill.paidDate || null,
      actualPaid: bill.actualPaid || (bill.paid ? bill.amount : null),
      assignedCheck: bill.assignedCheck || null,
      assignedPayDate: bill.assignedPayDate || null,
      createdAt: bill.addedDate || new Date().toISOString(),
    };
  });
};
