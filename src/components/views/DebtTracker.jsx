import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X, CreditCard, TrendingDown } from 'lucide-react';
import { parseAmt } from '../../utils/formatters';
import { calculateDebtPayoff } from '../../utils/calculations';

const DebtForm = ({ debt, onSave, onCancel }) => {
  const [name, setName] = useState(debt?.name || '');
  const [balance, setBalance] = useState(debt?.balance ?? '');
  const [rate, setRate] = useState(debt?.rate ?? '');
  const [payment, setPayment] = useState(debt?.payment ?? '');
  const [loanAmount, setLoanAmount] = useState(debt?.loanAmount ?? '');
  const [loanTerm, setLoanTerm] = useState(debt?.loanTerm ?? '');
  const [startDate, setStartDate] = useState(debt?.startDate ?? '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !balance || !payment) return;
    onSave({
      id: debt?.id || Date.now(),
      name: name.trim(),
      balance: parseAmt(balance),
      rate: parseAmt(rate),
      payment: parseAmt(payment),
      loanAmount: parseAmt(loanAmount),
      loanTerm: parseAmt(loanTerm),
      startDate: startDate || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">
              {debt ? 'Edit Debt' : 'Add Debt'}
            </h3>
            <button onClick={onCancel} className="p-1.5 hover:bg-slate-100 rounded-lg">
              <X size={20} className="text-slate-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Debt Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Credit Card, Car Loan"
                className="w-full px-3 py-2 border-2 rounded-xl text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Current Balance *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    placeholder="10,000"
                    className="w-full pl-7 pr-3 py-2 border-2 rounded-xl text-sm"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Interest Rate
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    placeholder="18.5"
                    className="w-full px-3 pr-7 py-2 border-2 rounded-xl text-sm"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Monthly Payment *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={payment}
                  onChange={(e) => setPayment(e.target.value)}
                  placeholder="250"
                  className="w-full pl-7 pr-3 py-2 border-2 rounded-xl text-sm"
                  required
                />
              </div>
            </div>

            <div className="border-t pt-3">
              <p className="text-xs text-slate-400 mb-2">Optional loan details</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Original Loan Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(e.target.value)}
                      placeholder="15,000"
                      className="w-full pl-7 pr-3 py-2 border-2 rounded-xl text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Loan Term (months)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={loanTerm}
                    onChange={(e) => setLoanTerm(e.target.value)}
                    placeholder="60"
                    className="w-full px-3 py-2 border-2 rounded-xl text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border-2 rounded-xl text-sm"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name || !balance || !payment}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-semibold text-sm transition-colors"
              >
                {debt ? 'Save Changes' : 'Add Debt'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export const DebtTracker = ({ debtPayoff, onAddDebt, onEditDebt, onRemoveDebt }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);

  const totalDebt = debtPayoff.reduce((sum, d) => sum + parseAmt(d.balance), 0);
  const totalPayment = debtPayoff.reduce((sum, d) => sum + parseAmt(d.payment), 0);

  const handleSave = (debt) => {
    if (editingDebt) {
      onEditDebt(debt);
    } else {
      onAddDebt(debt);
    }
    setShowForm(false);
    setEditingDebt(null);
  };

  const handleEdit = (debt) => {
    setEditingDebt(debt);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingDebt(null);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl text-white">
            <CreditCard size={22} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Debt Payoff Tracker</h3>
            <p className="text-xs text-slate-500">Track debts and payoff timelines</p>
          </div>
        </div>
        <button
          onClick={() => { setEditingDebt(null); setShowForm(true); }}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold flex items-center gap-1"
        >
          <Plus size={16} /> Add
        </button>
      </div>

      {/* Summary */}
      {debtPayoff.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-red-50 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500 mb-0.5">Total Debt</p>
            <p className="font-bold text-red-600">
              ${totalDebt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500 mb-0.5">Monthly Payments</p>
            <p className="font-bold text-emerald-600">
              ${totalPayment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      )}

      {/* Debt List */}
      {debtPayoff.length > 0 ? (
        <div className="space-y-3">
          {debtPayoff.map((debt) => {
            const payoff = calculateDebtPayoff(debt);
            const isInfinite = !isFinite(payoff.months);
            const paidPercent = debt.loanAmount > 0
              ? Math.max(0, Math.min(100, ((debt.loanAmount - parseAmt(debt.balance)) / debt.loanAmount) * 100))
              : 0;

            return (
              <div key={debt.id} className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-800">{debt.name}</span>
                  <div className="flex items-center gap-1">
                    <button
                      className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-colors"
                      onClick={() => handleEdit(debt)}
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                      onClick={() => onRemoveDebt(debt.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-sm mb-2">
                  <div>
                    <p className="text-xs text-slate-400">Balance</p>
                    <p className="font-medium text-slate-700">
                      ${parseAmt(debt.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Rate</p>
                    <p className="font-medium text-slate-700">{debt.rate}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Payment</p>
                    <p className="font-medium text-slate-700">
                      ${parseAmt(debt.payment).toLocaleString('en-US', { minimumFractionDigits: 2 })}/mo
                    </p>
                  </div>
                </div>

                {/* Progress bar if original loan amount is known */}
                {debt.loanAmount > 0 && (
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>{paidPercent.toFixed(0)}% paid off</span>
                      <span>Original: ${parseAmt(debt.loanAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                        style={{ width: `${paidPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Payoff info */}
                {isInfinite ? (
                  <div className="p-2 bg-red-50 border border-red-200 rounded-lg mt-2">
                    <p className="text-xs font-semibold text-red-600">
                      Payment doesn't cover monthly interest. Increase above $
                      {(parseAmt(debt.balance) * parseAmt(debt.rate) / 100 / 12).toFixed(2)}/mo
                    </p>
                  </div>
                ) : payoff.months > 0 ? (
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg mt-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <TrendingDown size={14} className="text-emerald-600" />
                      <span className="text-sm font-semibold text-emerald-700">
                        Payoff in {payoff.months} months
                      </span>
                    </div>
                    <div className="flex gap-4 text-xs text-slate-600">
                      <span>Interest: ${payoff.totalInterest.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      {payoff.payoffDate && (
                        <span>Est. {new Date(payoff.payoffDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6">
          <CreditCard size={32} className="mx-auto text-slate-300 mb-2" />
          <p className="text-slate-400 text-sm">Add debts to track payoff timelines</p>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <DebtForm
          debt={editingDebt}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
};

export default DebtTracker;
