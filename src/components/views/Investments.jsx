import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  RefreshCw,
  DollarSign,
  PieChart,
  Clock,
  AlertCircle,
  X,
  Edit2,
  Check,
} from 'lucide-react';

/**
 * Stock Investment Tracker
 * Tracks stock holdings with real-time market prices
 */

// Use Yahoo Finance unofficial API (free, no key required)
const fetchStockPrice = async (symbol) => {
  try {
    // Use a CORS proxy or direct fetch
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch ${symbol}`);
    }

    const data = await response.json();
    const result = data.chart.result?.[0];

    if (!result) {
      throw new Error(`No data for ${symbol}`);
    }

    const meta = result.meta;
    const currentPrice = meta.regularMarketPrice;
    const previousClose = meta.previousClose || meta.chartPreviousClose;
    const change = currentPrice - previousClose;
    const changePercent = (change / previousClose) * 100;

    return {
      symbol: symbol.toUpperCase(),
      price: currentPrice,
      previousClose,
      change,
      changePercent,
      name: meta.shortName || meta.symbol,
      currency: meta.currency || 'USD',
      marketState: meta.marketState,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error);
    return null;
  }
};

// Batch fetch multiple stock prices
const fetchMultipleStocks = async (symbols) => {
  const results = {};
  const promises = symbols.map(async (symbol) => {
    const data = await fetchStockPrice(symbol);
    if (data) {
      results[symbol.toUpperCase()] = data;
    }
  });

  await Promise.all(promises);
  return results;
};

// Add Investment Form Modal
const AddInvestmentForm = ({ onSubmit, onCancel, editingHolding }) => {
  const [symbol, setSymbol] = useState(editingHolding?.symbol || '');
  const [shares, setShares] = useState(editingHolding?.shares?.toString() || '');
  const [purchasePrice, setPurchasePrice] = useState(editingHolding?.purchasePrice?.toString() || '');
  const [purchaseDate, setPurchaseDate] = useState(
    editingHolding?.purchaseDate || new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState(editingHolding?.notes || '');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const trimmedSymbol = symbol.trim().toUpperCase();
    const numShares = parseFloat(shares);
    const numPrice = parseFloat(purchasePrice);

    if (!trimmedSymbol) {
      setError('Please enter a stock symbol');
      return;
    }
    if (isNaN(numShares) || numShares <= 0) {
      setError('Please enter a valid number of shares');
      return;
    }
    if (isNaN(numPrice) || numPrice <= 0) {
      setError('Please enter a valid purchase price');
      return;
    }

    onSubmit({
      id: editingHolding?.id || Date.now(),
      symbol: trimmedSymbol,
      shares: numShares,
      purchasePrice: numPrice,
      purchaseDate,
      notes: notes.trim(),
      costBasis: numShares * numPrice,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-800">
            {editingHolding ? 'Edit Holding' : 'Add Stock Holding'}
          </h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">
              Stock Symbol
            </label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="e.g., AMZN, AAPL, GOOGL"
              className="w-full px-4 py-3 border-2 rounded-xl focus:border-emerald-500 focus:outline-none"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">
                Number of Shares
              </label>
              <input
                type="number"
                step="0.0001"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                placeholder="10"
                className="w-full px-4 py-3 border-2 rounded-xl focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">
                Purchase Price
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder="150.00"
                  className="w-full pl-8 pr-4 py-3 border-2 rounded-xl focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">
              Purchase Date
            </label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full px-4 py-3 border-2 rounded-xl focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">
              Notes (optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Long-term hold, IRA account"
              className="w-full px-4 py-3 border-2 rounded-xl focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl">
              <AlertCircle size={18} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors"
            >
              {editingHolding ? 'Save Changes' : 'Add Holding'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Portfolio Summary Card
const PortfolioSummary = ({ holdings, prices }) => {
  const totals = holdings.reduce(
    (acc, holding) => {
      const price = prices[holding.symbol]?.price || holding.purchasePrice;
      const currentValue = holding.shares * price;
      const costBasis = holding.costBasis;
      const gain = currentValue - costBasis;

      return {
        totalValue: acc.totalValue + currentValue,
        totalCost: acc.totalCost + costBasis,
        totalGain: acc.totalGain + gain,
      };
    },
    { totalValue: 0, totalCost: 0, totalGain: 0 }
  );

  const gainPercent = totals.totalCost > 0
    ? (totals.totalGain / totals.totalCost) * 100
    : 0;
  const isPositive = totals.totalGain >= 0;

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl text-white">
          <PieChart size={24} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-800">Portfolio Summary</h3>
          <p className="text-slate-600 text-sm">Your total investment value</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="text-sm text-slate-600 mb-1">Total Value</div>
          <div className="text-2xl font-bold text-slate-800">
            ${totals.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-4">
          <div className="text-sm text-slate-600 mb-1">Cost Basis</div>
          <div className="text-2xl font-bold text-slate-800">
            ${totals.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className={`rounded-xl p-4 ${isPositive ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="text-sm text-slate-600 mb-1">Total Gain/Loss</div>
          <div className={`text-2xl font-bold flex items-center gap-2 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            <span>
              {isPositive ? '+' : ''}${totals.totalGain.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-sm font-semibold">
              ({isPositive ? '+' : ''}{gainPercent.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Individual Holding Card
const HoldingCard = ({ holding, price, onEdit, onDelete }) => {
  const currentPrice = price?.price || holding.purchasePrice;
  const currentValue = holding.shares * currentPrice;
  const gain = currentValue - holding.costBasis;
  const gainPercent = (gain / holding.costBasis) * 100;
  const isPositive = gain >= 0;
  const dayChange = price?.change || 0;
  const dayChangePercent = price?.changePercent || 0;
  const isDayPositive = dayChange >= 0;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-5 hover:shadow-xl transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-xl font-bold text-slate-800">{holding.symbol}</h4>
            {price?.marketState === 'REGULAR' && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                LIVE
              </span>
            )}
          </div>
          {price?.name && (
            <p className="text-sm text-slate-500 truncate max-w-[200px]">{price.name}</p>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(holding)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit"
          >
            <Edit2 size={18} />
          </button>
          <button
            onClick={() => onDelete(holding.id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-sm text-slate-500">Current Price</div>
          <div className="text-lg font-bold text-slate-800">
            ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          {price && (
            <div className={`text-sm flex items-center gap-1 ${isDayPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isDayPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span>
                {isDayPositive ? '+' : ''}{dayChange.toFixed(2)} ({isDayPositive ? '+' : ''}{dayChangePercent.toFixed(2)}%)
              </span>
            </div>
          )}
        </div>

        <div>
          <div className="text-sm text-slate-500">Shares Owned</div>
          <div className="text-lg font-bold text-slate-800">
            {holding.shares.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 4 })}
          </div>
          <div className="text-sm text-slate-500">
            @ ${holding.purchasePrice.toFixed(2)} avg
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-slate-500">Market Value</div>
            <div className="text-lg font-bold text-slate-800">
              ${currentValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div>
            <div className="text-sm text-slate-500">Total Gain/Loss</div>
            <div className={`text-lg font-bold flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <span>
                {isPositive ? '+' : ''}${gain.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className={`text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              ({isPositive ? '+' : ''}{gainPercent.toFixed(2)}%)
            </div>
          </div>
        </div>
      </div>

      {holding.notes && (
        <div className="mt-4 pt-4 border-t">
          <div className="text-sm text-slate-500">{holding.notes}</div>
        </div>
      )}

      <div className="mt-3 text-xs text-slate-400 flex items-center gap-1">
        <Clock size={12} />
        Purchased {new Date(holding.purchaseDate).toLocaleDateString()}
      </div>
    </div>
  );
};

// Main Investments Component
export const Investments = ({ holdings = [], onAddHolding, onUpdateHolding, onDeleteHolding }) => {
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingHolding, setEditingHolding] = useState(null);
  const [error, setError] = useState(null);

  // Fetch prices for all holdings
  const refreshPrices = useCallback(async () => {
    if (!holdings.length) return;

    setLoading(true);
    setError(null);

    try {
      const symbols = [...new Set(holdings.map((h) => h.symbol))];
      const priceData = await fetchMultipleStocks(symbols);

      if (Object.keys(priceData).length === 0) {
        setError('Could not fetch stock prices. This may be due to CORS restrictions in browsers. Prices will show as purchase price.');
      }

      setPrices(priceData);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Failed to fetch stock prices. Showing purchase prices instead.');
      console.error('Price fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [holdings]);

  // Fetch prices on mount and when holdings change
  useEffect(() => {
    refreshPrices();
  }, [refreshPrices]);

  // Auto-refresh every 5 minutes during market hours
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const hour = now.getHours();
      const day = now.getDay();

      // Only refresh during US market hours (9:30 AM - 4:00 PM ET, Mon-Fri)
      if (day >= 1 && day <= 5 && hour >= 9 && hour < 17) {
        refreshPrices();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [refreshPrices]);

  const handleSubmit = (holdingData) => {
    if (editingHolding) {
      onUpdateHolding(holdingData);
    } else {
      onAddHolding(holdingData);
    }
    setShowForm(false);
    setEditingHolding(null);

    // Fetch price for new holding
    setTimeout(() => refreshPrices(), 500);
  };

  const handleEdit = (holding) => {
    setEditingHolding(holding);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to remove this holding?')) {
      onDeleteHolding(id);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl text-white">
              <TrendingUp size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Stock Investments</h2>
              <p className="text-slate-600 text-sm">Track your portfolio with live market prices</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refreshPrices}
              disabled={loading}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={() => {
                setEditingHolding(null);
                setShowForm(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold flex items-center gap-2 transition-colors"
            >
              <Plus size={18} />
              Add Stock
            </button>
          </div>
        </div>

        {lastUpdated && (
          <div className="mt-3 text-sm text-slate-500 flex items-center gap-1">
            <Clock size={14} />
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="text-amber-500 flex-shrink-0 mt-0.5\" size={20} />
          <div>
            <p className="text-amber-800 font-medium">Price Fetch Notice</p>
            <p className="text-amber-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {holdings.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <DollarSign size={32} className="text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">No Investments Yet</h3>
          <p className="text-slate-600 mb-6">
            Start tracking your stock portfolio by adding your first holding.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold inline-flex items-center gap-2 transition-colors"
          >
            <Plus size={20} />
            Add Your First Stock
          </button>
        </div>
      ) : (
        <>
          {/* Portfolio Summary */}
          <PortfolioSummary holdings={holdings} prices={prices} />

          {/* Holdings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {holdings.map((holding) => (
              <HoldingCard
                key={holding.id}
                holding={holding}
                price={prices[holding.symbol]}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {/* Info Box */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <p className="text-blue-800 text-sm">
              <strong>Note:</strong> Stock prices are fetched from Yahoo Finance. Due to browser security
              restrictions, real-time prices may not always be available. The app will show your purchase
              price when market data cannot be retrieved. For accurate portfolio tracking, consider
              refreshing during US market hours (9:30 AM - 4:00 PM ET).
            </p>
          </div>
        </>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <AddInvestmentForm
          editingHolding={editingHolding}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingHolding(null);
          }}
        />
      )}
    </div>
  );
};

export default Investments;
