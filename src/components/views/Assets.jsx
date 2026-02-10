import React from 'react';
import { Plus, Building2, Edit2, Trash2 } from 'lucide-react';
import { parseAmt } from '../../utils/formatters';
import { calculateAmortization } from '../../utils/calculations';

export const Assets = ({
  assets,
  onAddAsset,
  onEditAsset,
  onDeleteAsset,
}) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-black text-white">Assets & Loans</h2>
        <button
          onClick={onAddAsset}
          className="px-6 py-3 bg-white hover:bg-emerald-50 text-emerald-600 rounded-xl font-semibold shadow-lg transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          Add Asset
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {assets.map((asset) => {
          const amort = calculateAmortization(asset);
          return (
            <div key={asset.id} className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Building2 className="text-blue-600" size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold text-slate-800">
                      {asset.name}
                    </h3>
                    <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full uppercase">
                      {asset.type}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-slate-500">Loan Amount</p>
                      <p className="text-lg font-bold text-slate-800">
                        ${parseAmt(asset.loanAmount).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Payment</p>
                      <p className="text-lg font-bold text-slate-800">
                        ${parseAmt(asset.paymentAmount).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Interest Rate</p>
                      <p className="text-lg font-bold text-slate-800">
                        {asset.interestRate}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Payoff Date</p>
                      <p className="text-lg font-bold text-slate-800">
                        {amort.payoffDate
                          ? new Date(amort.payoffDate).toLocaleDateString()
                          : '-'}
                      </p>
                    </div>
                  </div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-blue-600 font-semibold">
                      View Amortization Schedule
                    </summary>
                    <div className="overflow-x-auto mt-3 border rounded-xl">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="px-3 py-2 text-left">#</th>
                            <th className="px-3 py-2 text-left">Date</th>
                            <th className="px-3 py-2 text-right">Payment</th>
                            <th className="px-3 py-2 text-right">Principal</th>
                            <th className="px-3 py-2 text-right">Interest</th>
                            <th className="px-3 py-2 text-right">Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {amort.schedule.map((row) => (
                            <tr key={row.period} className="border-b">
                              <td className="px-3 py-2">{row.period}</td>
                              <td className="px-3 py-2">
                                {new Date(row.date).toLocaleDateString()}
                              </td>
                              <td className="px-3 py-2 text-right">
                                ${row.payment.toFixed(2)}
                              </td>
                              <td className="px-3 py-2 text-right">
                                ${row.principal.toFixed(2)}
                              </td>
                              <td className="px-3 py-2 text-right">
                                ${row.interest.toFixed(2)}
                              </td>
                              <td className="px-3 py-2 text-right font-semibold">
                                ${row.balance.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onEditAsset(asset)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete ${asset.name}?`))
                        onDeleteAsset(asset.id);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {!assets.length && (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <Building2 className="mx-auto mb-4 text-slate-300" size={64} />
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              No Assets Yet
            </h3>
            <p className="text-slate-600 mb-6">
              Track loans, mortgages, and other financed assets
            </p>
            <button
              onClick={onAddAsset}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold"
            >
              Add Your First Asset
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Assets;
