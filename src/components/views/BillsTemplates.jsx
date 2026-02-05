import React from 'react';
import { Plus, DollarSign, Calendar, Edit2, Trash2 } from 'lucide-react';
import { parseAmt } from '../../utils/formatters';
import { startOfMonth } from '../../utils/dateHelpers';

export const BillsTemplates = ({
  billTemplates,
  billInstances,
  onAddTemplate,
  onEditTemplate,
  onRetireTemplate,
}) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white">Bill Templates</h2>
        <button
          onClick={onAddTemplate}
          className="px-4 py-3 bg-white text-emerald-600 rounded-xl font-semibold flex items-center gap-2"
        >
          <Plus size={18} />
          Add Template
        </button>
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
                      First due: {new Date(t.firstDueDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    onClick={() => onEditTemplate(t)}
                    title="Edit"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    onClick={() => onRetireTemplate(t.id)}
                    title="Retire"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <div className="mt-3 text-sm text-slate-600">
                Upcoming:{' '}
                {billInstances
                  .filter(
                    (i) =>
                      i.templateId === t.id &&
                      new Date(i.dueDate) >= startOfMonth(new Date())
                  )
                  .slice(0, 3)
                  .map((i) =>
                    new Date(i.dueDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  )
                  .join(' • ') || '-'}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-xl p-8 text-center text-slate-600">
            No templates yet. Click "Add Template".
          </div>
        )}
      </div>
    </div>
  );
};

export default BillsTemplates;
