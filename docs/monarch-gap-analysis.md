# PayPlan vs Monarch App Gap Analysis

## Scope
This comparison looks at the current PayPlan app and contrasts it with the core capabilities users typically expect from Monarch Money (account aggregation, transaction intelligence, budgeting, planning, collaboration, and reporting).

## What PayPlan already does well
From the current codebase, PayPlan is strongest in bill planning and paycheck-based cash-flow control:

- Bill template setup, bill dashboard, and bill analytics views.
- Pay schedule tracking and actual paycheck logging.
- Goal tracking modules (debt payoff, envelopes, investments, retirement).
- Receipt OCR key entry and calendar export (.ics) integrations.
- Local backup/restore and basic data-management tooling.

## Missing elements compared with Monarch

### 1) Connected accounts + unified transaction feed (**major gap**)
Monarch’s central workflow is linking financial institutions and auto-syncing transactions into one feed. PayPlan currently relies on manually entered bills/income/goals and does not expose bank/credit/investment account linking or account-level transaction sync.

**What is missing:**
- Institution linking flow (Plaid/MX/Finicity-style connector).
- Account list with balances (checking, savings, credit cards, loans, brokerage).
- Auto-imported transactions with pending/posted states.
- Sync health/status and reconnect UX.

### 2) Transaction categorization, rules, and merchant intelligence (**major gap**)
Monarch provides transaction-level categorization and rule automation. PayPlan has bill categories for planning, but not a full transaction ledger and categorization rules engine.

**What is missing:**
- Transaction register (search/filter by merchant, account, category, amount, date).
- Category editing and bulk recategorization.
- Rules (e.g., “If merchant contains X, assign category Y”).
- Split transactions, tags, and notes at transaction level.

### 3) Budgeting model (category budgets + period tracking) (**major gap**)
Monarch emphasizes monthly category budgets with plan-vs-actual tracking. PayPlan includes budget-like fields but lacks a full budget workflow tied to imported transactions.

**What is missing:**
- Monthly/rollover category budgets.
- Actuals pulled from transactions against budget envelopes.
- Budget progress UI with over/under indicators.
- Budget history and trend reporting across months.

### 4) Net worth + account performance dashboards (**major gap**)
Monarch prominently tracks net worth and trends by connected account balances. PayPlan has investment tracking and assets modules, but no full net worth computation across all account types.

**What is missing:**
- Time-series net worth chart.
- Asset vs liability breakdown from synced balances.
- Historical balance snapshots and deltas.
- Drill-down from net worth to underlying accounts.

### 5) Subscription and recurring transaction detection (**moderate gap**)
Monarch can identify recurring merchants/subscriptions from transaction history. PayPlan manages recurring bills via templates, but no automatic recurring detection from statement activity.

**What is missing:**
- Recurring pattern detection from transaction history.
- Subscription insights (price changes, duplicates, cancellation candidates).
- Renewal reminders based on observed charge cadence.

### 6) Shared household collaboration (**moderate gap**)
Monarch supports collaborative household finance workflows. PayPlan appears single-user/local-state oriented.

**What is missing:**
- Multiple user profiles with shared household data.
- Invite/member permissions and activity attribution.
- Conflict-aware edits and audit history.

### 7) Alerts, notifications, and proactive insights (**moderate gap**)
Monarch users expect notifications around unusual spend, large transactions, low balances, and bill events. PayPlan has dashboards and manual review flows but no broad notification system.

**What is missing:**
- Rule-based alerts (low balance, large charge, unusual category spike).
- Bill due reminders via push/email/SMS.
- Weekly digest and monthly close-out insights.

### 8) Planning depth (forecasting, scenarios, long-range what-if) (**moderate gap**)
PayPlan has strong near-term paycheck/bill planning. Monarch-style planning generally includes richer long-range scenario modeling.

**What is missing:**
- Multi-scenario planning (“what if income drops 10%?”).
- Goal projections tied to real account growth and contributions.
- Monte Carlo / probability-style retirement forecast options.

### 9) Data portability and ecosystem integrations beyond ICS/OCR (**moderate gap**)
Monarch typically supports richer import/export and ecosystem connectivity. PayPlan currently exposes OCR API key storage and calendar export.

**What is missing:**
- CSV transaction import with mapping tools.
- Rich exports (transactions, categories, budgets, net worth history).
- Webhooks/API integration points.
- Native broker/payment integrations.

### 10) Platform polish: native mobile UX and trust features (**minor-to-moderate gap**)
Monarch has a mature production product posture. PayPlan is a lightweight app shell with local persistence and Electron wrapper.

**What is missing:**
- Native mobile notification handling and polished offline behavior.
- Security posture artifacts (2FA, device management, security center UX).
- Production-grade onboarding/tutorial flows.

## Prioritized roadmap (if the goal is “closer to Monarch”)

### Phase 1 (highest impact)
1. Add account aggregation + transaction sync foundation.
2. Build transaction feed + categorization + rules.
3. Introduce category budget engine with plan-vs-actual reporting.

### Phase 2
4. Net worth dashboard driven by synced balances.
5. Recurring/subscription detection and alerts.
6. Notification system for spend and bill anomalies.

### Phase 3
7. Collaboration (household sharing).
8. Scenario planning/advanced forecasts.
9. API and enhanced import/export tooling.

## Bottom line
PayPlan is currently stronger as a focused paycheck-and-bills planning tool. To match Monarch’s core value proposition, the largest missing elements are automated account aggregation, transaction-centric workflows, and budget/net-worth intelligence built on continuously synced data.
