# PayPlan Pro - Development Context

## Overview
PayPlan Pro is a React personal finance app for bill payment planning. It helps users track bills, assign them to paychecks, manage spending via envelopes, and plan for retirement.

## Tech Stack
- React 18 with Vite
- TailwindCSS for styling
- LocalStorage for persistence (no backend)
- Lucide React for icons

## Key Architecture Concepts

### Bill Database Model
Bills are **concrete database records**, not dynamically generated from templates each time.

**Bill ID Format:** `{Name}{MMDDYYYY}.bill` (e.g., `Electric02152026.bill`)
**Paycheck ID Format:** `income{MMDDYYYY}.pay` (e.g., `income02062026.pay`)

**Date formats used:**
- `MMDDYYYY` - Primary format stored in bill/paycheck records (e.g., `02152026`)
- `YYYY-MM-DD` - Legacy format in some places

**Key utility:** `parseLocalDate()` in `src/utils/dateHelpers.js` handles both formats and prevents timezone bugs.

### Rolling Window
- **Active bills:** Current + 6 months forward
- **Historical bills:** 12 months backward (for averaging variable bills)
- Monthly rollover generates new bills from templates at start of each month

### Bill-to-Paycheck Assignment
Bills are assigned to the **latest paycheck that is ON or BEFORE the bill's due date**. This is the "cutoff" logic - a bill due Feb 15 with paychecks on Feb 6 and Feb 20 gets assigned to Feb 6.

### Month.Check# Labeling
Paychecks are labeled as `Month.CheckNumber` (e.g., `Feb.1`, `Feb.2`, `Mar.1`). Helper functions in `dateHelpers.js`:
- `formatPayDatesAsMonthCheck(payDates)` - Returns array of `{ date, label, monthKey, checkNum }`
- `getMonthCheckLabel(payDate, allPayDates)` - Gets label for specific date

## File Structure

```
src/
├── BillPayPlanner.jsx          # Main app orchestrator - state management, persistence
├── utils/
│   ├── billDatabase.js         # Bill/paycheck generation, ID creation, assignment logic
│   ├── dateHelpers.js          # Date parsing, Month.Check# helpers
│   ├── formatters.js           # parseAmt(), currency formatting
│   └── calculations.js         # Pay date calculations
├── constants/
│   └── storageKeys.js          # LocalStorage key constants (LS_BILLS, etc.)
├── components/
│   ├── views/
│   │   ├── Dashboard.jsx       # Overview with 4-check plan, clickable check cards
│   │   ├── Checklist.jsx       # Bill list by paycheck, mark paid, edit modal
│   │   ├── Analytics.jsx       # Spending trends, receipt integration
│   │   ├── SubmitActuals.jsx   # Record actual payments, scan receipts
│   │   ├── Retirement.jsx      # Monte Carlo simulator, investment calculators
│   │   ├── BillsTemplates.jsx  # Manage bill templates
│   │   ├── Settings.jsx        # App settings, backup/restore
│   │   └── ...
│   ├── forms/                  # Modal forms for adding/editing
│   └── ui/                     # Reusable UI components
```

## LocalStorage Keys (from storageKeys.js)
- `ppp.bills` - Active bills array
- `ppp.historicalBills` - Archived bills
- `ppp.billTemplates` - Bill templates
- `ppp.paychecks` - Income records
- `ppp.actualPayEntries` - Actual pay received (different from scheduled)
- `ppp.scannedReceipts` - Receipt data from scanning
- `ppp.envelopes` - Envelope budgeting categories
- `paySchedule` - Pay schedule config (frequency, nextPayDate, payAmount)

## Bill Object Shape
```javascript
{
  id: "Electric02152026.bill",
  templateId: "tmpl_123",
  name: "Electric",
  amount: 150.00,           // Estimated amount
  dueDate: "02152026",      // MMDDYYYY format
  category: "utilities",
  isVariable: true,
  autopay: false,
  paid: false,
  paidDate: null,
  actualPaid: null,         // Actual amount when paid
  assignedCheck: 1,         // Check number (1, 2, 3, 4)
  assignedPayDate: "02062026"
}
```

## Recent Features Implemented

1. **Actual Pay Integration** - When user records actual pay received, it updates income calculations for that specific date
2. **Receipt Scanning** - Receipts update spending tracking in Analytics and affect check leftover calculations
3. **Check Card Navigation** - Clicking check cards on Dashboard navigates to Checklist filtered to that check
4. **Actual Paid Input** - BillEditModal has field to record actual amount paid
5. **Monte Carlo Simulator** - Enhanced with:
   - Visual success rate gauge
   - Safe Withdrawal Rate analysis
   - Scenario comparison (save/compare runs)
   - What-if quick adjustments
   - Fan chart visualization with percentile bands

## Mobile Responsiveness
Target device: iPhone 13 Pro (390x844). Key patterns:
- Use `sm:` breakpoint for tablet/desktop
- Smaller padding on mobile: `p-2 sm:p-4 md:p-8`
- Stack grids vertically on mobile: `grid-cols-1 sm:grid-cols-3`
- Modal slides up from bottom on mobile (action sheet pattern)

## Important Patterns

### Empty Form Fields
Use empty string `useState('')` with `placeholder` attributes, not `useState(0)`. This prevents showing "0" in empty number fields.

### Date Handling
ALWAYS use `parseLocalDate()` when parsing dates to avoid timezone bugs. Never use `new Date(dateString)` directly for stored dates.

### Bill Assignment
When reassigning bills, use `assignBillToPaycheck(bill, paychecks)` from billDatabase.js. It finds the latest paycheck ON or BEFORE the due date.

### Currency Parsing
Use `parseAmt()` from formatters.js - handles strings, numbers, null safely.

## Dashboard 4-Check Plan Calculation
The Dashboard shows the next 4 paychecks with:
- Income (uses actualPayEntries if available, else scheduled amount)
- Bills assigned to that check
- Envelope contributions
- Receipt spending (scanned receipts assigned by date)
- Leftover = Income - Bills - Envelopes - Receipts

## Common Tasks

**Add a new view:** Create in `src/components/views/`, import in BillPayPlanner.jsx, add to nav array

**Add new persisted state:** Add LS_KEY in storageKeys.js, add useState + load/save in BillPayPlanner.jsx

**Modify bill assignment:** Edit `assignBillToPaycheck()` in billDatabase.js

**Change date display:** Edit helpers in dateHelpers.js
