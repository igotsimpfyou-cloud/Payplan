import React, { useState } from 'react';
import { Plus, DollarSign, Calendar, Edit2, Trash2, History, TrendingUp, ArrowRight } from 'lucide-react';
import { parseAmt } from '../../utils/formatters';
import { startOfMonth, parseLocalDate } from '../../utils/dateHelpers';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';

// Modal for entering historical payments
const HistoricalDataModal = ({ template, onClose, onSave }) => {
  // Generate last 12 months
  const getLastTwelveMonths = () => {
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      months.push({ key, label, date });
    }
    return months;
  };

  const months = getLastTwelveMonths();

  // Initialize from template's historicalPayments
  const initializeData = () => {
    const data = {};
    months.forEach(m => {
      const existing = (template.historicalPayments || []).find(h =>
        h.date && h.date.startsWith(m.key)
      );
      data[m.key] = existing ? existing.amount : '';
    });
    return data;
  };

  const [payments, setPayments] = useState(initializeData);

  const handleSave = () => {
    // Convert to historicalPayments array format
    const historicalPayments = Object.entries(payments)
      .filter(([_, amount]) => amount !== '' && amount !== null)
      .map(([key, amount]) => ({
        date: `${key}-01`,
        amount: parseAmt(amount)
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate new estimate from average
    const amounts = historicalPayments.map(h => h.amount).filter(a => a > 0);
    const newEstimate = amounts.length > 0
      ? amounts.reduce((s, a) => s + a, 0) / amounts.length
      : template.amount;

    onSave(template.id, historicalPayments, newEstimate);
    onClose();
  };

  const filledCount = Object.values(payments).filter(v => v !== '' && v !== null).length;
  const total = Object.values(payments)
    .filter(v => v !== '' && v !== null)
    .reduce((s, v) => s + parseAmt(v), 0);
  const average = filledCount > 0 ? total / filledCount : 0;

  return (
    <Modal isOpen onClose={onClose} title={null} maxWidth="max-w-lg">
      <div className="-m-6 max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
          <h3 className="text-xl font-bold">{template.name}</h3>
          <p className="text-emerald-100 text-sm">Enter historical payment amounts</p>
        </div>

        <div className="p-4 overflow-y-auto max-h-[50vh]">
          <div className="space-y-2">
            {months.map(month => (
              <div key={month.key} className="flex items-center gap-3">
                <label className="w-24 text-sm font-medium text-slate-600">
                  {month.label}
                </label>
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={payments[month.key]}
                    onChange={(e) => setPayments(prev => ({ ...prev, [month.key]: e.target.value }))}
                    inputClassName="pl-7"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="p-4 bg-slate-50 border-t">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 text-center p-3 bg-white rounded-xl">
              <div className="text-2xl font-bold text-emerald-600">{filledCount}</div>
              <div className="text-xs text-slate-500">Months Entered</div>
            </div>
            <div className="flex-1 text-center p-3 bg-white rounded-xl">
              <div className="text-2xl font-bold text-blue-600">${average.toFixed(2)}</div>
              <div className="text-xs text-slate-500">New Estimate</div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 border-slate-300 text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              variant="primary"
              className="flex-1"
            >
              Save History
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export const BillsTemplates = ({
  billTemplates,
  billInstances,
  onAddTemplate,
  onEditTemplate,
  onRetireTemplate,
  onUpdateHistoricalPayments,
}) => {
  const [historyModal, setHistoryModal] = useState(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white">Bill Templates</h2>
        <Button
          onClick={onAddTemplate}
          variant="secondary"
          className="bg-white text-emerald-600"
          icon={Plus}
        >
          Add Template
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {billTemplates.length ? (
          billTemplates.map((t) => (
            <div key={t.id} className="bg-white rounded-xl p-4 shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="font-bold text-lg">{t.name}</div>
                    {t.isVariable && (
                      <span className="text-xs font-bold px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
                        VARIABLE
                      </span>
                    )}
                    {t.autopay && (
                      <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                        AUTO
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-600 flex flex-wrap gap-4">
                    <span>
                      <DollarSign className="inline mr-1" size={14} /> Est. $
                      {parseAmt(t.amount).toFixed(2)}
                    </span>
                    <span>
                      <Calendar className="inline mr-1" size={14} /> Due day{' '}
                      {t.dueDay}
                    </span>
                    <span>Category: {t.category}</span>
                    <span>
                      First due: {parseLocalDate(t.firstDueDate).toLocaleDateString()}
                    </span>
                  </div>
                  {/* Show historical data count for variable bills */}
                  {t.isVariable && (t.historicalPayments?.length || 0) > 0 && (
                    <div className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
                      <TrendingUp size={12} />
                      {t.historicalPayments.length} months of history
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {/* History button for variable bills */}
                  {t.isVariable && (
                    <Button
                      variant="toolbar"
                      size="iconSm"
                      className="text-emerald-600 hover:bg-emerald-50 rounded-lg"
                      onClick={() => setHistoryModal(t)}
                      title="Historical Data"
                      icon={History}
                    />
                  )}
                  <Button
                    variant="toolbar"
                    size="iconSm"
                    className="text-blue-600 hover:bg-blue-50 rounded-lg"
                    onClick={() => onEditTemplate(t)}
                    title="Edit"
                    icon={Edit2}
                  />
                  <Button
                    variant="toolbar"
                    size="iconSm"
                    className="text-red-600 hover:bg-red-50 rounded-lg"
                    onClick={() => onRetireTemplate(t.id)}
                    title="Retire"
                    icon={Trash2}
                  />
                </div>
              </div>
              <div className="mt-3 text-sm text-slate-600">
                Upcoming:{' '}
                {billInstances
                  .filter(
                    (i) =>
                      i.templateId === t.id &&
                      parseLocalDate(i.dueDate) >= startOfMonth(new Date())
                  )
                  .slice(0, 3)
                  .map((i) =>
                    parseLocalDate(i.dueDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  )
                  .join(' • ') || '-'}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-xl p-8 text-center border border-dashed border-emerald-200">
            <p className="text-slate-800 text-base font-semibold">No bill templates yet</p>
            <p className="text-slate-500 text-sm mt-1 mb-4">Create your first recurring bill to start paycheck assignment and reminders.</p>
            <Button
              onClick={onAddTemplate}
              variant="primary"
              className="mx-auto"
              icon={ArrowRight}
            >
              Add your first template
            </Button>
          </div>
        )}
      </div>

      {/* Historical Data Modal */}
      {historyModal && (
        <HistoricalDataModal
          template={historyModal}
          onClose={() => setHistoryModal(null)}
          onSave={onUpdateHistoricalPayments}
        />
      )}
    </div>
  );
};

export default BillsTemplates;
