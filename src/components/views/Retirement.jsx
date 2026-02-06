import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Play,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Info,
  DollarSign,
  Calendar,
  PieChart,
  Target
} from 'lucide-react';

// Monte Carlo simulation parameters
const SIMULATIONS = 1000;

// Historical return assumptions (annual)
const ASSET_RETURNS = {
  stocks: { mean: 0.10, stdDev: 0.18 },  // 10% avg, 18% volatility
  bonds: { mean: 0.05, stdDev: 0.06 },   // 5% avg, 6% volatility
  cash: { mean: 0.02, stdDev: 0.01 },    // 2% avg, 1% volatility
};

// Generate random normal using Box-Muller transform
const randomNormal = (mean, stdDev) => {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + stdDev * z;
};

// Run a single simulation
const runSimulation = (params) => {
  const {
    currentAge,
    retirementAge,
    lifeExpectancy,
    currentSavings,
    annualContribution,
    annualSpending,
    stocksPercent,
    bondsPercent,
    socialSecurity,
    inflationRate,
  } = params;

  const cashPercent = 100 - stocksPercent - bondsPercent;
  const yearsToRetirement = retirementAge - currentAge;
  const yearsInRetirement = lifeExpectancy - retirementAge;
  const totalYears = lifeExpectancy - currentAge;

  let portfolio = currentSavings;
  let spending = annualSpending;
  const yearlyBalances = [portfolio];

  for (let year = 1; year <= totalYears; year++) {
    const age = currentAge + year;
    const isRetired = age > retirementAge;

    // Calculate blended return based on allocation
    const stockReturn = randomNormal(ASSET_RETURNS.stocks.mean, ASSET_RETURNS.stocks.stdDev);
    const bondReturn = randomNormal(ASSET_RETURNS.bonds.mean, ASSET_RETURNS.bonds.stdDev);
    const cashReturn = randomNormal(ASSET_RETURNS.cash.mean, ASSET_RETURNS.cash.stdDev);

    const portfolioReturn =
      (stocksPercent / 100) * stockReturn +
      (bondsPercent / 100) * bondReturn +
      (cashPercent / 100) * cashReturn;

    // Apply return
    portfolio *= (1 + portfolioReturn);

    if (isRetired) {
      // Withdraw spending (adjusted for inflation)
      const yearsSinceRetirement = age - retirementAge;
      const adjustedSpending = spending * Math.pow(1 + inflationRate, yearsSinceRetirement);
      const netSpending = Math.max(0, adjustedSpending - socialSecurity);
      portfolio -= netSpending;
    } else {
      // Add contributions (adjusted for inflation)
      const adjustedContribution = annualContribution * Math.pow(1 + inflationRate, year);
      portfolio += adjustedContribution;
    }

    yearlyBalances.push(Math.max(0, portfolio));

    // Portfolio depleted
    if (portfolio <= 0) {
      // Fill remaining years with 0
      for (let i = year + 1; i <= totalYears; i++) {
        yearlyBalances.push(0);
      }
      return { success: false, finalBalance: 0, yearlyBalances, depletedAtAge: age };
    }
  }

  return { success: true, finalBalance: portfolio, yearlyBalances, depletedAtAge: null };
};

// Run all simulations
const runMonteCarloSimulation = (params) => {
  const results = [];

  for (let i = 0; i < SIMULATIONS; i++) {
    results.push(runSimulation(params));
  }

  const successCount = results.filter(r => r.success).length;
  const successRate = (successCount / SIMULATIONS) * 100;

  const finalBalances = results.map(r => r.finalBalance).sort((a, b) => a - b);
  const percentile = (p) => finalBalances[Math.floor(p * SIMULATIONS / 100)];

  // Calculate average balances per year for visualization
  const totalYears = params.lifeExpectancy - params.currentAge;
  const avgBalances = [];
  const p10Balances = [];
  const p90Balances = [];

  for (let year = 0; year <= totalYears; year++) {
    const yearBalances = results.map(r => r.yearlyBalances[year] || 0).sort((a, b) => a - b);
    avgBalances.push(yearBalances.reduce((a, b) => a + b, 0) / SIMULATIONS);
    p10Balances.push(yearBalances[Math.floor(0.10 * SIMULATIONS)]);
    p90Balances.push(yearBalances[Math.floor(0.90 * SIMULATIONS)]);
  }

  return {
    successRate,
    successCount,
    totalSimulations: SIMULATIONS,
    medianFinalBalance: percentile(50),
    p10FinalBalance: percentile(10),
    p90FinalBalance: percentile(90),
    avgBalances,
    p10Balances,
    p90Balances,
    depletionAges: results.filter(r => !r.success).map(r => r.depletedAtAge),
  };
};

export const Retirement = () => {
  // Input state
  const [currentAge, setCurrentAge] = useState(35);
  const [retirementAge, setRetirementAge] = useState(65);
  const [lifeExpectancy, setLifeExpectancy] = useState(90);
  const [currentSavings, setCurrentSavings] = useState(100000);
  const [annualContribution, setAnnualContribution] = useState(15000);
  const [annualSpending, setAnnualSpending] = useState(50000);
  const [stocksPercent, setStocksPercent] = useState(70);
  const [bondsPercent, setBondsPercent] = useState(25);
  const [socialSecurity, setSocialSecurity] = useState(20000);
  const [inflationRate, setInflationRate] = useState(0.03);

  // Results state
  const [results, setResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const cashPercent = 100 - stocksPercent - bondsPercent;

  const runSimulations = () => {
    setIsRunning(true);

    // Use setTimeout to allow UI to update
    setTimeout(() => {
      const params = {
        currentAge,
        retirementAge,
        lifeExpectancy,
        currentSavings,
        annualContribution,
        annualSpending,
        stocksPercent,
        bondsPercent,
        socialSecurity,
        inflationRate,
      };

      const simulationResults = runMonteCarloSimulation(params);
      setResults(simulationResults);
      setIsRunning(false);
    }, 50);
  };

  const formatCurrency = (value) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  const getSuccessColor = (rate) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSuccessBg = (rate) => {
    if (rate >= 80) return 'bg-green-100 border-green-300';
    if (rate >= 60) return 'bg-yellow-100 border-yellow-300';
    return 'bg-red-100 border-red-300';
  };

  // Chart dimensions
  const chartWidth = 100;
  const chartHeight = 60;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl text-white">
            <TrendingUp size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              Monte Carlo Retirement Simulator
            </h2>
            <p className="text-slate-600">
              Test your retirement plan against {SIMULATIONS.toLocaleString()} market scenarios
            </p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex gap-2">
            <Info className="text-blue-500 flex-shrink-0 mt-0.5" size={18} />
            <p className="text-blue-800 text-sm">
              Monte Carlo simulation runs thousands of scenarios with varying market returns
              to estimate the probability of your savings lasting through retirement.
              A success rate of <strong>80% or higher</strong> is generally considered a solid plan.
            </p>
          </div>
        </div>
      </div>

      {/* Input Form */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Calendar size={20} className="text-purple-600" />
          Your Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Current Age
            </label>
            <input
              type="number"
              value={currentAge}
              onChange={(e) => setCurrentAge(Number(e.target.value))}
              className="w-full px-4 py-2 border-2 rounded-xl focus:border-purple-500 focus:outline-none"
              min={18}
              max={80}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Retirement Age
            </label>
            <input
              type="number"
              value={retirementAge}
              onChange={(e) => setRetirementAge(Number(e.target.value))}
              className="w-full px-4 py-2 border-2 rounded-xl focus:border-purple-500 focus:outline-none"
              min={currentAge + 1}
              max={80}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Life Expectancy
            </label>
            <input
              type="number"
              value={lifeExpectancy}
              onChange={(e) => setLifeExpectancy(Number(e.target.value))}
              className="w-full px-4 py-2 border-2 rounded-xl focus:border-purple-500 focus:outline-none"
              min={retirementAge + 1}
              max={110}
            />
          </div>
        </div>

        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <DollarSign size={20} className="text-green-600" />
          Savings & Spending
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Current Retirement Savings
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input
                type="number"
                value={currentSavings}
                onChange={(e) => setCurrentSavings(Number(e.target.value))}
                className="w-full pl-8 pr-4 py-2 border-2 rounded-xl focus:border-purple-500 focus:outline-none"
                min={0}
                step={1000}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Annual Contribution (until retirement)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input
                type="number"
                value={annualContribution}
                onChange={(e) => setAnnualContribution(Number(e.target.value))}
                className="w-full pl-8 pr-4 py-2 border-2 rounded-xl focus:border-purple-500 focus:outline-none"
                min={0}
                step={1000}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Annual Spending in Retirement
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input
                type="number"
                value={annualSpending}
                onChange={(e) => setAnnualSpending(Number(e.target.value))}
                className="w-full pl-8 pr-4 py-2 border-2 rounded-xl focus:border-purple-500 focus:outline-none"
                min={0}
                step={1000}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Annual Social Security Income
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input
                type="number"
                value={socialSecurity}
                onChange={(e) => setSocialSecurity(Number(e.target.value))}
                className="w-full pl-8 pr-4 py-2 border-2 rounded-xl focus:border-purple-500 focus:outline-none"
                min={0}
                step={1000}
              />
            </div>
          </div>
        </div>

        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <PieChart size={20} className="text-blue-600" />
          Asset Allocation
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Stocks %
            </label>
            <input
              type="number"
              value={stocksPercent}
              onChange={(e) => {
                const val = Math.min(100, Math.max(0, Number(e.target.value)));
                setStocksPercent(val);
                if (val + bondsPercent > 100) {
                  setBondsPercent(100 - val);
                }
              }}
              className="w-full px-4 py-2 border-2 rounded-xl focus:border-purple-500 focus:outline-none"
              min={0}
              max={100}
            />
            <p className="text-xs text-slate-500 mt-1">Higher risk, higher potential return</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Bonds %
            </label>
            <input
              type="number"
              value={bondsPercent}
              onChange={(e) => {
                const val = Math.min(100 - stocksPercent, Math.max(0, Number(e.target.value)));
                setBondsPercent(val);
              }}
              className="w-full px-4 py-2 border-2 rounded-xl focus:border-purple-500 focus:outline-none"
              min={0}
              max={100 - stocksPercent}
            />
            <p className="text-xs text-slate-500 mt-1">Moderate risk, stable income</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Cash %
            </label>
            <input
              type="number"
              value={cashPercent}
              disabled
              className="w-full px-4 py-2 border-2 rounded-xl bg-slate-100 text-slate-600"
            />
            <p className="text-xs text-slate-500 mt-1">Low risk, low return</p>
          </div>
        </div>

        {/* Allocation visual bar */}
        <div className="mb-6">
          <div className="h-4 rounded-full overflow-hidden flex">
            <div
              className="bg-blue-500 transition-all"
              style={{ width: `${stocksPercent}%` }}
              title={`Stocks: ${stocksPercent}%`}
            />
            <div
              className="bg-green-500 transition-all"
              style={{ width: `${bondsPercent}%` }}
              title={`Bonds: ${bondsPercent}%`}
            />
            <div
              className="bg-yellow-400 transition-all"
              style={{ width: `${cashPercent}%` }}
              title={`Cash: ${cashPercent}%`}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span> Stocks
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span> Bonds
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-yellow-400 rounded-full"></span> Cash
            </span>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Expected Inflation Rate: {(inflationRate * 100).toFixed(1)}%
          </label>
          <input
            type="range"
            value={inflationRate * 100}
            onChange={(e) => setInflationRate(Number(e.target.value) / 100)}
            className="w-full"
            min={1}
            max={6}
            step={0.5}
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>1%</span>
            <span>3% (historical avg)</span>
            <span>6%</span>
          </div>
        </div>

        {/* Run Button */}
        <button
          onClick={runSimulations}
          disabled={isRunning}
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-3 disabled:opacity-50 transition-all"
        >
          {isRunning ? (
            <>
              <RefreshCw size={24} className="animate-spin" />
              Running {SIMULATIONS.toLocaleString()} Simulations...
            </>
          ) : (
            <>
              <Play size={24} />
              Run Monte Carlo Simulation
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-6">
          {/* Success Rate */}
          <div className={`rounded-2xl shadow-xl p-6 border-2 ${getSuccessBg(results.successRate)}`}>
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                {results.successRate >= 80 ? (
                  <CheckCircle2 size={32} className="text-green-600" />
                ) : results.successRate >= 60 ? (
                  <AlertCircle size={32} className="text-yellow-600" />
                ) : (
                  <AlertCircle size={32} className="text-red-600" />
                )}
                <span className={`text-5xl font-black ${getSuccessColor(results.successRate)}`}>
                  {results.successRate.toFixed(1)}%
                </span>
              </div>
              <p className="text-lg font-semibold text-slate-700">
                Probability of Success
              </p>
              <p className="text-sm text-slate-600 mt-1">
                {results.successCount.toLocaleString()} of {results.totalSimulations.toLocaleString()} simulations
                had money remaining at age {lifeExpectancy}
              </p>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Target size={20} className="text-purple-600" />
              Projected Outcomes at Age {lifeExpectancy}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-red-50 rounded-xl p-4 text-center">
                <p className="text-sm text-slate-600 mb-1">Pessimistic (10th percentile)</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(results.p10FinalBalance)}
                </p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-sm text-slate-600 mb-1">Median (50th percentile)</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(results.medianFinalBalance)}
                </p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-sm text-slate-600 mb-1">Optimistic (90th percentile)</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(results.p90FinalBalance)}
                </p>
              </div>
            </div>
          </div>

          {/* Portfolio Projection Chart */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              Portfolio Projection Over Time
            </h3>

            <div className="relative h-64 bg-slate-50 rounded-xl p-4">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full" preserveAspectRatio="none">
                {/* Grid lines */}
                {[0, 25, 50, 75, 100].map((pct) => (
                  <line
                    key={pct}
                    x1="0"
                    y1={chartHeight - (pct / 100) * chartHeight}
                    x2={chartWidth}
                    y2={chartHeight - (pct / 100) * chartHeight}
                    stroke="#e2e8f0"
                    strokeWidth="0.3"
                  />
                ))}

                {/* Retirement age marker */}
                {(() => {
                  const totalYears = lifeExpectancy - currentAge;
                  const retirementYear = retirementAge - currentAge;
                  const x = (retirementYear / totalYears) * chartWidth;
                  return (
                    <line
                      x1={x}
                      y1="0"
                      x2={x}
                      y2={chartHeight}
                      stroke="#9333ea"
                      strokeWidth="0.5"
                      strokeDasharray="2,2"
                    />
                  );
                })()}

                {/* 90th percentile area */}
                <path
                  d={(() => {
                    const maxVal = Math.max(...results.p90Balances, 1);
                    const totalYears = results.avgBalances.length - 1;

                    let path = `M 0 ${chartHeight}`;

                    // Top line (90th percentile)
                    results.p90Balances.forEach((val, i) => {
                      const x = (i / totalYears) * chartWidth;
                      const y = chartHeight - (val / maxVal) * chartHeight * 0.9;
                      path += ` L ${x} ${y}`;
                    });

                    // Bottom line (10th percentile, reversed)
                    for (let i = results.p10Balances.length - 1; i >= 0; i--) {
                      const x = (i / totalYears) * chartWidth;
                      const y = chartHeight - (results.p10Balances[i] / maxVal) * chartHeight * 0.9;
                      path += ` L ${x} ${y}`;
                    }

                    path += ' Z';
                    return path;
                  })()}
                  fill="rgba(139, 92, 246, 0.2)"
                />

                {/* Average line */}
                <path
                  d={(() => {
                    const maxVal = Math.max(...results.p90Balances, 1);
                    const totalYears = results.avgBalances.length - 1;

                    return results.avgBalances
                      .map((val, i) => {
                        const x = (i / totalYears) * chartWidth;
                        const y = chartHeight - (val / maxVal) * chartHeight * 0.9;
                        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                      })
                      .join(' ');
                  })()}
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="1"
                />
              </svg>

              {/* Labels */}
              <div className="absolute bottom-0 left-4 text-xs text-slate-500">
                Age {currentAge}
              </div>
              <div className="absolute bottom-0 right-4 text-xs text-slate-500">
                Age {lifeExpectancy}
              </div>
              <div
                className="absolute bottom-0 text-xs text-purple-600 font-medium"
                style={{
                  left: `${((retirementAge - currentAge) / (lifeExpectancy - currentAge)) * 100}%`,
                  transform: 'translateX(-50%)'
                }}
              >
                Retire ({retirementAge})
              </div>
            </div>

            <div className="flex justify-center gap-6 mt-4 text-sm">
              <span className="flex items-center gap-2">
                <span className="w-4 h-1 bg-purple-500 rounded"></span>
                Average
              </span>
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 bg-purple-200 rounded"></span>
                10th-90th Percentile Range
              </span>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              Recommendations
            </h3>

            <div className="space-y-3">
              {results.successRate < 80 && (
                <>
                  <div className="flex gap-3 p-3 bg-amber-50 rounded-xl">
                    <AlertCircle className="text-amber-500 flex-shrink-0" size={20} />
                    <div>
                      <p className="font-medium text-amber-800">Consider increasing contributions</p>
                      <p className="text-sm text-amber-700">
                        Saving an additional ${Math.round(annualContribution * 0.2).toLocaleString()}/year could significantly improve your success rate.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 p-3 bg-amber-50 rounded-xl">
                    <AlertCircle className="text-amber-500 flex-shrink-0" size={20} />
                    <div>
                      <p className="font-medium text-amber-800">Review retirement spending</p>
                      <p className="text-sm text-amber-700">
                        Reducing annual spending by 10-15% in retirement can dramatically improve sustainability.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {results.successRate >= 80 && results.successRate < 95 && (
                <div className="flex gap-3 p-3 bg-green-50 rounded-xl">
                  <CheckCircle2 className="text-green-500 flex-shrink-0" size={20} />
                  <div>
                    <p className="font-medium text-green-800">Your plan looks solid</p>
                    <p className="text-sm text-green-700">
                      Consider building a small buffer by either saving a bit more or planning for slightly lower spending.
                    </p>
                  </div>
                </div>
              )}

              {results.successRate >= 95 && (
                <div className="flex gap-3 p-3 bg-green-50 rounded-xl">
                  <CheckCircle2 className="text-green-500 flex-shrink-0" size={20} />
                  <div>
                    <p className="font-medium text-green-800">Excellent! Your plan is very robust</p>
                    <p className="text-sm text-green-700">
                      You may even have room to retire earlier or increase retirement spending if desired.
                    </p>
                  </div>
                </div>
              )}

              {stocksPercent > 80 && currentAge > 50 && (
                <div className="flex gap-3 p-3 bg-blue-50 rounded-xl">
                  <Info className="text-blue-500 flex-shrink-0" size={20} />
                  <div>
                    <p className="font-medium text-blue-800">Consider reducing stock allocation</p>
                    <p className="text-sm text-blue-700">
                      As you approach retirement, shifting some investments to bonds can reduce volatility and sequence-of-returns risk.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 p-3 bg-slate-50 rounded-xl">
                <Info className="text-slate-500 flex-shrink-0" size={20} />
                <div>
                  <p className="font-medium text-slate-700">Remember</p>
                  <p className="text-sm text-slate-600">
                    This simulation uses historical return assumptions. Actual results will vary.
                    Consider consulting a financial advisor for personalized advice.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assumptions */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">
          Simulation Assumptions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="font-semibold text-blue-600">Stocks</p>
            <p className="text-slate-600">10% avg return, 18% volatility</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="font-semibold text-green-600">Bonds</p>
            <p className="text-slate-600">5% avg return, 6% volatility</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="font-semibold text-yellow-600">Cash</p>
            <p className="text-slate-600">2% avg return, 1% volatility</p>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Returns are modeled using normal distributions based on historical averages.
          {SIMULATIONS.toLocaleString()} independent simulations are run to estimate probability of success.
        </p>
      </div>
    </div>
  );
};

export default Retirement;
