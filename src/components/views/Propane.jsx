import React from 'react';
import { Plus, Flame, Trash2 } from 'lucide-react';
import { parseAmt } from '../../utils/formatters';
import { parseLocalDate } from '../../utils/dateHelpers';

export const Propane = ({
  propaneFills,
  onAddPropaneFill,
  onDeletePropaneFill,
}) => {
  const sorted = [...propaneFills].sort(
    (a, b) => parseLocalDate(b.date) - parseLocalDate(a.date)
  );
  const latest = sorted[0];
  const totalGallons = propaneFills.reduce(
    (sum, f) => sum + parseAmt(f.gallons),
    0
  );
  const totalCost = propaneFills.reduce(
    (sum, f) => sum + parseAmt(f.totalCost),
    0
  );
  const avgPricePerGal = totalGallons ? totalCost / totalGallons : 0;

  const fillsWithUsage = sorted.map((fill, idx) => {
    if (idx === sorted.length - 1)
      return { ...fill, daysLasted: null, dailyUsage: null };
    const nextFill = sorted[idx + 1];
    const days = Math.max(
      1,
      Math.floor(
        (parseLocalDate(fill.date) - parseLocalDate(nextFill.date)) /
          (1000 * 60 * 60 * 24)
      )
    );
    const dailyUsage = parseAmt(fill.gallons) / days;
    return { ...fill, daysLasted: days, dailyUsage };
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-black text-white">
          Propane Usage Tracker
        </h2>
        <button
          onClick={onAddPropaneFill}
          className="px-6 py-3 bg-white hover:bg-emerald-50 text-emerald-600 rounded-xl font-semibold shadow-lg transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          Add Fill
        </button>
      </div>

      {propaneFills.length > 0 ? (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-xl font-bold mb-4">Latest Fill</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-slate-500">Date</p>
                <p className="text-lg font-bold">
                  {latest ? parseLocalDate(latest.date).toLocaleDateString() : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Gallons</p>
                <p className="text-lg font-bold text-emerald-600">
                  {latest?.gallons ?? '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Price/Gal</p>
                <p className="text-lg font-bold">
                  ${latest?.pricePerGal ?? '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Cost</p>
                <p className="text-lg font-bold text-red-600">
                  ${latest?.totalCost ?? '-'}
                </p>
              </div>
            </div>
            {fillsWithUsage[0]?.daysLasted && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-slate-600">
                  Lasted{' '}
                  <span className="font-bold">
                    {fillsWithUsage[0].daysLasted} days
                  </span>{' '}
                  • Avg{' '}
                  <span className="font-bold">
                    {fillsWithUsage[0].dailyUsage.toFixed(1)} gal/day
                  </span>
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <p className="text-sm text-slate-500 mb-1">
                Total Spent (All Time)
              </p>
              <p className="text-3xl font-black text-red-600">
                ${totalCost.toFixed(2)}
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <p className="text-sm text-slate-500 mb-1">Total Gallons</p>
              <p className="text-3xl font-black text-emerald-600">
                {totalGallons.toFixed(0)}
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <p className="text-sm text-slate-500 mb-1">Avg Price/Gal</p>
              <p className="text-3xl font-black text-slate-800">
                ${avgPricePerGal.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-xl font-bold mb-4">Fill History</h3>
            <div className="space-y-2">
              {fillsWithUsage.map((fill) => (
                <div
                  key={fill.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-semibold">
                      {parseLocalDate(fill.date).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-slate-600">
                      {fill.gallons} gal @ ${fill.pricePerGal}/gal = $
                      {fill.totalCost}
                      {fill.daysLasted &&
                        ` • Lasted ${fill.daysLasted} days (${fill.dailyUsage.toFixed(
                          1
                        )} gal/day)`}
                    </p>
                  </div>
                  <button
                    onClick={() => onDeletePropaneFill(fill.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
          <Flame className="mx-auto mb-4 text-slate-300" size={64} />
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            No Fills Tracked Yet
          </h3>
          <p className="text-slate-600 mb-6">
            Start tracking to see usage patterns and costs
          </p>
        </div>
      )}
    </div>
  );
};

export default Propane;
