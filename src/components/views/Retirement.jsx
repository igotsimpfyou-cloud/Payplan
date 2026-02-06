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
  Target,
  Calculator,
  Wallet,
  Clock,
  Zap,
} from 'lucide-react';

// ============================================
// MONTE CARLO SIMULATION (existing code)
// ============================================
const SIMULATIONS = 1000;

const ASSET_RETURNS = {
  stocks: { mean: 0.10, stdDev: 0.18 },
  bonds: { mean: 0.05, stdDev: 0.06 },
  cash: { mean: 0.02, stdDev: 0.01 },
};

const randomNormal = (mean, stdDev) => {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + stdDev * z;
};

const runSimulation = (params) => {
  const {
    currentAge, retirementAge, lifeExpectancy, currentSavings,
    annualContribution, annualSpending, stocksPercent, bondsPercent,
    socialSecurity, inflationRate,
  } = params;

  const cashPercent = 100 - stocksPercent - bondsPercent;
  const totalYears = lifeExpectancy - currentAge;

  let portfolio = currentSavings;
  const yearlyBalances = [portfolio];

  for (let year = 1; year <= totalYears; year++) {
    const age = currentAge + year;
    const isRetired = age > retirementAge;

    const stockReturn = randomNormal(ASSET_RETURNS.stocks.mean, ASSET_RETURNS.stocks.stdDev);
    const bondReturn = randomNormal(ASSET_RETURNS.bonds.mean, ASSET_RETURNS.bonds.stdDev);
    const cashReturn = randomNormal(ASSET_RETURNS.cash.mean, ASSET_RETURNS.cash.stdDev);

    const portfolioReturn =
      (stocksPercent / 100) * stockReturn +
      (bondsPercent / 100) * bondReturn +
      (cashPercent / 100) * cashReturn;

    portfolio *= (1 + portfolioReturn);

    if (isRetired) {
      const yearsSinceRetirement = age - retirementAge;
      const adjustedSpending = annualSpending * Math.pow(1 + inflationRate, yearsSinceRetirement);
      const netSpending = Math.max(0, adjustedSpending - socialSecurity);
      portfolio -= netSpending;
    } else {
      const adjustedContribution = annualContribution * Math.pow(1 + inflationRate, year);
      portfolio += adjustedContribution;
    }

    yearlyBalances.push(Math.max(0, portfolio));

    if (portfolio <= 0) {
      for (let i = year + 1; i <= totalYears; i++) {
        yearlyBalances.push(0);
      }
      return { success: false, finalBalance: 0, yearlyBalances, depletedAtAge: age };
    }
  }

  return { success: true, finalBalance: portfolio, yearlyBalances, depletedAtAge: null };
};

const runMonteCarloSimulation = (params) => {
  const results = [];
  for (let i = 0; i < SIMULATIONS; i++) {
    results.push(runSimulation(params));
  }

  const successCount = results.filter(r => r.success).length;
  const successRate = (successCount / SIMULATIONS) * 100;
  const finalBalances = results.map(r => r.finalBalance).sort((a, b) => a - b);
  const percentile = (p) => finalBalances[Math.floor(p * SIMULATIONS / 100)];

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
    successRate, successCount, totalSimulations: SIMULATIONS,
    medianFinalBalance: percentile(50),
    p10FinalBalance: percentile(10),
    p90FinalBalance: percentile(90),
    avgBalances, p10Balances, p90Balances,
  };
};

// ============================================
// HELPER FUNCTIONS
// ============================================
const formatCurrency = (value) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

const formatFullCurrency = (value) => {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

// ============================================
// INVESTMENT CALCULATOR (Ramsey-style)
// ============================================
const InvestmentCalculator = () => {
  const [initialAmount, setInitialAmount] = useState(10000);
  const [monthlyContribution, setMonthlyContribution] = useState(500);
  const [years, setYears] = useState(30);
  const [annualReturn, setAnnualReturn] = useState(10); // Ramsey uses 10-12%

  const results = useMemo(() => {
    const monthlyRate = annualReturn / 100 / 12;
    const months = years * 12;

    // Future value with compound interest
    // FV = P(1+r)^n + PMT × [((1+r)^n - 1) / r]
    const futureValueInitial = initialAmount * Math.pow(1 + monthlyRate, months);
    const futureValueContributions = monthlyContribution *
      ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);

    const totalValue = futureValueInitial + futureValueContributions;
    const totalContributions = initialAmount + (monthlyContribution * months);
    const totalInterest = totalValue - totalContributions;

    // Year-by-year breakdown for chart
    const yearlyData = [];
    let balance = initialAmount;
    for (let y = 0; y <= years; y++) {
      yearlyData.push({
        year: y,
        balance,
        contributions: initialAmount + (monthlyContribution * 12 * y),
      });
      // Add one year of growth
      for (let m = 0; m < 12; m++) {
        balance = balance * (1 + monthlyRate) + monthlyContribution;
      }
    }

    return { totalValue, totalContributions, totalInterest, yearlyData };
  }, [initialAmount, monthlyContribution, years, annualReturn]);

  const maxBalance = Math.max(...results.yearlyData.map(d => d.balance));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Calculator size={28} />
          <h2 className="text-2xl font-bold">Investment Calculator</h2>
        </div>
        <p className="text-emerald-100">
          See how your investments can grow with the power of compound interest.
          Dave Ramsey recommends investing 15% of your income and expecting 10-12% returns.
        </p>
      </div>

      {/* Inputs */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Starting Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input
                type="number"
                value={initialAmount}
                onChange={(e) => setInitialAmount(Number(e.target.value))}
                className="w-full pl-8 pr-4 py-3 border-2 rounded-xl focus:border-emerald-500 focus:outline-none"
                min={0}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Monthly Contribution
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input
                type="number"
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                className="w-full pl-8 pr-4 py-3 border-2 rounded-xl focus:border-emerald-500 focus:outline-none"
                min={0}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Years to Invest
            </label>
            <input
              type="number"
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="w-full px-4 py-3 border-2 rounded-xl focus:border-emerald-500 focus:outline-none"
              min={1}
              max={50}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Expected Annual Return: {annualReturn}%
            </label>
            <input
              type="range"
              value={annualReturn}
              onChange={(e) => setAnnualReturn(Number(e.target.value))}
              className="w-full mt-2"
              min={1}
              max={15}
              step={0.5}
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>1%</span>
              <span>10-12% (Ramsey)</span>
              <span>15%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-emerald-50 rounded-2xl p-6 text-center border-2 border-emerald-200">
          <p className="text-sm text-slate-600 mb-1">Total Value</p>
          <p className="text-3xl font-black text-emerald-600">
            {formatCurrency(results.totalValue)}
          </p>
        </div>
        <div className="bg-blue-50 rounded-2xl p-6 text-center border-2 border-blue-200">
          <p className="text-sm text-slate-600 mb-1">Total Contributions</p>
          <p className="text-3xl font-black text-blue-600">
            {formatCurrency(results.totalContributions)}
          </p>
        </div>
        <div className="bg-purple-50 rounded-2xl p-6 text-center border-2 border-purple-200">
          <p className="text-sm text-slate-600 mb-1">Interest Earned</p>
          <p className="text-3xl font-black text-purple-600">
            {formatCurrency(results.totalInterest)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Growth Over Time</h3>
        <div className="h-64 relative">
          <svg viewBox="0 0 100 50" className="w-full h-full" preserveAspectRatio="none">
            {/* Grid */}
            {[0, 25, 50, 75, 100].map((pct) => (
              <line key={pct} x1="0" y1={50 - pct / 2} x2="100" y2={50 - pct / 2}
                stroke="#e2e8f0" strokeWidth="0.3" />
            ))}

            {/* Contribution area */}
            <path
              d={`M 0 50 ${results.yearlyData.map((d, i) => {
                const x = (i / years) * 100;
                const y = 50 - (d.contributions / maxBalance) * 45;
                return `L ${x} ${y}`;
              }).join(' ')} L 100 50 Z`}
              fill="rgba(59, 130, 246, 0.3)"
            />

            {/* Balance area */}
            <path
              d={`M 0 50 ${results.yearlyData.map((d, i) => {
                const x = (i / years) * 100;
                const y = 50 - (d.balance / maxBalance) * 45;
                return `L ${x} ${y}`;
              }).join(' ')} L 100 50 Z`}
              fill="rgba(16, 185, 129, 0.3)"
            />

            {/* Balance line */}
            <path
              d={results.yearlyData.map((d, i) => {
                const x = (i / years) * 100;
                const y = 50 - (d.balance / maxBalance) * 45;
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              }).join(' ')}
              fill="none" stroke="#10b981" strokeWidth="1"
            />
          </svg>
          <div className="absolute bottom-0 left-0 text-xs text-slate-500">Year 0</div>
          <div className="absolute bottom-0 right-0 text-xs text-slate-500">Year {years}</div>
        </div>
        <div className="flex justify-center gap-6 mt-4 text-sm">
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 bg-emerald-400 rounded"></span> Total Balance
          </span>
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 bg-blue-400 rounded"></span> Contributions
          </span>
        </div>
      </div>

      {/* Ramsey tip */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-amber-800 text-sm">
          <strong>Ramsey Tip:</strong> Invest 15% of your household income into tax-advantaged
          retirement accounts. Start with your 401(k) up to the employer match, then max out a Roth IRA,
          then go back to your 401(k).
        </p>
      </div>
    </div>
  );
};

// ============================================
// RETIREMENT NEEDS CALCULATOR (25x Rule)
// ============================================
const RetirementNeedsCalculator = () => {
  const [currentAge, setCurrentAge] = useState(35);
  const [retirementAge, setRetirementAge] = useState(65);
  const [monthlyExpenses, setMonthlyExpenses] = useState(4000);
  const [currentSavings, setCurrentSavings] = useState(50000);
  const [annualReturn, setAnnualReturn] = useState(10);

  const results = useMemo(() => {
    const annualExpenses = monthlyExpenses * 12;
    const targetNestEgg = annualExpenses * 25; // Ramsey's 25x rule
    const yearsToRetirement = retirementAge - currentAge;

    // How much do you need to save monthly?
    const monthlyRate = annualReturn / 100 / 12;
    const months = yearsToRetirement * 12;

    // Solve for PMT: FV = PV(1+r)^n + PMT × [((1+r)^n - 1) / r]
    // PMT = (FV - PV(1+r)^n) × r / ((1+r)^n - 1)
    const futureValueOfCurrent = currentSavings * Math.pow(1 + monthlyRate, months);
    const remaining = targetNestEgg - futureValueOfCurrent;
    const monthlyNeeded = remaining > 0
      ? (remaining * monthlyRate) / (Math.pow(1 + monthlyRate, months) - 1)
      : 0;

    // What will you have if you save $X/month?
    const projectedValue = futureValueOfCurrent +
      (monthlyNeeded * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate));

    // Progress percentage
    const progress = (currentSavings / targetNestEgg) * 100;

    return {
      annualExpenses,
      targetNestEgg,
      monthlyNeeded: Math.max(0, monthlyNeeded),
      projectedValue,
      progress,
      yearsToRetirement,
      onTrack: currentSavings >= targetNestEgg || monthlyNeeded <= monthlyExpenses * 0.15,
    };
  }, [currentAge, retirementAge, monthlyExpenses, currentSavings, annualReturn]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Target size={28} />
          <h2 className="text-2xl font-bold">Retirement Needs Calculator</h2>
        </div>
        <p className="text-blue-100">
          Based on Dave Ramsey's rule: Save 25x your annual expenses.
          This lets you withdraw 4% per year without running out of money.
        </p>
      </div>

      {/* Inputs */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Current Age
            </label>
            <input
              type="number"
              value={currentAge}
              onChange={(e) => setCurrentAge(Number(e.target.value))}
              className="w-full px-4 py-3 border-2 rounded-xl focus:border-blue-500 focus:outline-none"
              min={18} max={80}
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
              className="w-full px-4 py-3 border-2 rounded-xl focus:border-blue-500 focus:outline-none"
              min={currentAge + 1} max={80}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Monthly Expenses in Retirement
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input
                type="number"
                value={monthlyExpenses}
                onChange={(e) => setMonthlyExpenses(Number(e.target.value))}
                className="w-full pl-8 pr-4 py-3 border-2 rounded-xl focus:border-blue-500 focus:outline-none"
                min={0}
              />
            </div>
          </div>
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
                className="w-full pl-8 pr-4 py-3 border-2 rounded-xl focus:border-blue-500 focus:outline-none"
                min={0}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Target */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Your Retirement Target</h3>

        <div className="text-center mb-6">
          <p className="text-slate-600 mb-2">
            Based on {formatFullCurrency(results.annualExpenses)}/year in expenses, you need:
          </p>
          <p className="text-5xl font-black text-blue-600 mb-2">
            {formatCurrency(results.targetNestEgg)}
          </p>
          <p className="text-slate-500">
            ({formatFullCurrency(results.annualExpenses)} × 25 = {formatFullCurrency(results.targetNestEgg)})
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-600">Current savings</span>
            <span className="font-semibold">{results.progress.toFixed(1)}%</span>
          </div>
          <div className="h-4 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all"
              style={{ width: `${Math.min(100, results.progress)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>{formatCurrency(currentSavings)}</span>
            <span>{formatCurrency(results.targetNestEgg)}</span>
          </div>
        </div>
      </div>

      {/* Monthly Savings Needed */}
      <div className={`rounded-2xl shadow-xl p-6 ${
        results.monthlyNeeded <= 0
          ? 'bg-green-50 border-2 border-green-300'
          : results.monthlyNeeded <= monthlyExpenses * 0.3
            ? 'bg-blue-50 border-2 border-blue-300'
            : 'bg-amber-50 border-2 border-amber-300'
      }`}>
        <h3 className="text-lg font-bold text-slate-800 mb-4">
          What You Need to Save
        </h3>

        {results.monthlyNeeded <= 0 ? (
          <div className="text-center">
            <CheckCircle2 size={48} className="mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold text-green-700">You're on track!</p>
            <p className="text-green-600">Your current savings will grow to meet your goal.</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-slate-600 mb-2">
              To reach your goal in {results.yearsToRetirement} years, save:
            </p>
            <p className="text-4xl font-black text-blue-600 mb-2">
              {formatFullCurrency(Math.round(results.monthlyNeeded))}/month
            </p>
            <p className="text-slate-500">
              or {formatFullCurrency(Math.round(results.monthlyNeeded * 12))}/year
            </p>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-amber-800 text-sm">
          <strong>The 25x Rule:</strong> If you need $50,000/year in retirement, you need $1.25 million saved.
          At a 4% withdrawal rate, your money should last 25-30 years. This is also called the "4% rule."
        </p>
      </div>
    </div>
  );
};

// ============================================
// NEST EGG CALCULATOR (How long will it last?)
// ============================================
const NestEggCalculator = () => {
  const [nestEgg, setNestEgg] = useState(1000000);
  const [monthlyWithdrawal, setMonthlyWithdrawal] = useState(4000);
  const [annualReturn, setAnnualReturn] = useState(6);
  const [inflationRate, setInflationRate] = useState(3);

  const results = useMemo(() => {
    const monthlyRate = annualReturn / 100 / 12;
    const monthlyInflation = inflationRate / 100 / 12;

    let balance = nestEgg;
    let withdrawal = monthlyWithdrawal;
    let months = 0;
    const maxMonths = 600; // 50 years max
    const yearlyData = [{ year: 0, balance: nestEgg }];

    while (balance > 0 && months < maxMonths) {
      // Apply return
      balance *= (1 + monthlyRate);
      // Withdraw (adjusted for inflation)
      withdrawal *= (1 + monthlyInflation);
      balance -= monthlyWithdrawal * Math.pow(1 + monthlyInflation / 12, months);
      months++;

      if (months % 12 === 0) {
        yearlyData.push({ year: months / 12, balance: Math.max(0, balance) });
      }
    }

    const years = months / 12;
    const willLastForever = months >= maxMonths;
    const annualWithdrawal = monthlyWithdrawal * 12;
    const withdrawalRate = (annualWithdrawal / nestEgg) * 100;

    return { years, months, willLastForever, withdrawalRate, yearlyData };
  }, [nestEgg, monthlyWithdrawal, annualReturn, inflationRate]);

  const maxBalance = Math.max(...results.yearlyData.map(d => d.balance));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Clock size={28} />
          <h2 className="text-2xl font-bold">Nest Egg Calculator</h2>
        </div>
        <p className="text-purple-100">
          Find out how long your retirement savings will last based on your planned withdrawals.
        </p>
      </div>

      {/* Inputs */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Nest Egg (Total Savings)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input
                type="number"
                value={nestEgg}
                onChange={(e) => setNestEgg(Number(e.target.value))}
                className="w-full pl-8 pr-4 py-3 border-2 rounded-xl focus:border-purple-500 focus:outline-none"
                min={0}
                step={10000}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Monthly Withdrawal
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input
                type="number"
                value={monthlyWithdrawal}
                onChange={(e) => setMonthlyWithdrawal(Number(e.target.value))}
                className="w-full pl-8 pr-4 py-3 border-2 rounded-xl focus:border-purple-500 focus:outline-none"
                min={0}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Expected Annual Return: {annualReturn}%
            </label>
            <input
              type="range"
              value={annualReturn}
              onChange={(e) => setAnnualReturn(Number(e.target.value))}
              className="w-full"
              min={0} max={12} step={0.5}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Inflation Rate: {inflationRate}%
            </label>
            <input
              type="range"
              value={inflationRate}
              onChange={(e) => setInflationRate(Number(e.target.value))}
              className="w-full"
              min={0} max={6} step={0.5}
            />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className={`rounded-2xl shadow-xl p-6 text-center ${
        results.willLastForever
          ? 'bg-green-50 border-2 border-green-300'
          : results.years >= 30
            ? 'bg-blue-50 border-2 border-blue-300'
            : results.years >= 20
              ? 'bg-amber-50 border-2 border-amber-300'
              : 'bg-red-50 border-2 border-red-300'
      }`}>
        {results.willLastForever ? (
          <>
            <CheckCircle2 size={48} className="mx-auto text-green-500 mb-2" />
            <p className="text-3xl font-black text-green-700">Forever!</p>
            <p className="text-green-600">
              At a {results.withdrawalRate.toFixed(1)}% withdrawal rate, your money will last indefinitely.
            </p>
          </>
        ) : (
          <>
            <p className="text-slate-600 mb-2">Your savings will last approximately:</p>
            <p className="text-5xl font-black text-purple-600 mb-2">
              {Math.floor(results.years)} years
            </p>
            <p className="text-slate-500">
              ({results.months} months) at a {results.withdrawalRate.toFixed(1)}% withdrawal rate
            </p>
          </>
        )}
      </div>

      {/* Withdrawal Rate Indicator */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Withdrawal Rate</h3>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="h-4 bg-slate-200 rounded-full overflow-hidden relative">
              <div className="absolute inset-0 flex">
                <div className="w-1/4 bg-green-400" title="Safe: 0-4%"></div>
                <div className="w-1/4 bg-yellow-400" title="Moderate: 4-6%"></div>
                <div className="w-1/4 bg-orange-400" title="Risky: 6-8%"></div>
                <div className="w-1/4 bg-red-400" title="Unsustainable: 8%+"></div>
              </div>
              <div
                className="absolute top-0 w-1 h-full bg-slate-800"
                style={{ left: `${Math.min(100, results.withdrawalRate / 12 * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>0%</span>
              <span>4% (Safe)</span>
              <span>8%</span>
              <span>12%+</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-700">
            {results.withdrawalRate.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Balance Over Time</h3>
        <div className="h-48 relative">
          <svg viewBox="0 0 100 50" className="w-full h-full" preserveAspectRatio="none">
            {[0, 25, 50, 75, 100].map((pct) => (
              <line key={pct} x1="0" y1={50 - pct / 2} x2="100" y2={50 - pct / 2}
                stroke="#e2e8f0" strokeWidth="0.3" />
            ))}
            <path
              d={`M 0 ${50 - (nestEgg / maxBalance) * 45} ${results.yearlyData.map((d, i) => {
                const x = (i / Math.max(results.yearlyData.length - 1, 1)) * 100;
                const y = 50 - (d.balance / maxBalance) * 45;
                return `L ${x} ${y}`;
              }).join(' ')}`}
              fill="none" stroke="#9333ea" strokeWidth="1.5"
            />
          </svg>
          <div className="absolute bottom-0 left-0 text-xs text-slate-500">Year 0</div>
          <div className="absolute bottom-0 right-0 text-xs text-slate-500">
            Year {results.yearlyData.length - 1}
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-amber-800 text-sm">
          <strong>The 4% Rule:</strong> Financial experts generally recommend withdrawing no more than
          4% of your portfolio per year to ensure your money lasts 25-30 years. If you want your
          money to last forever, aim for 3-3.5%.
        </p>
      </div>
    </div>
  );
};

// ============================================
// MONTE CARLO SIMULATOR (Enhanced)
// ============================================
const MonteCarloSimulator = () => {
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
  const [results, setResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const cashPercent = 100 - stocksPercent - bondsPercent;

  const runSimulations = () => {
    setIsRunning(true);
    setTimeout(() => {
      const params = {
        currentAge, retirementAge, lifeExpectancy, currentSavings,
        annualContribution, annualSpending, stocksPercent, bondsPercent,
        socialSecurity, inflationRate,
      };
      setResults(runMonteCarloSimulation(params));
      setIsRunning(false);
    }, 50);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Zap size={28} />
          <h2 className="text-2xl font-bold">Monte Carlo Simulator</h2>
        </div>
        <p className="text-indigo-100">
          Test your retirement plan against {SIMULATIONS.toLocaleString()} random market scenarios
          to see the probability of success.
        </p>
      </div>

      {/* Inputs */}
      <div className="bg-white rounded-2xl shadow-xl p-6 space-y-6">
        <div>
          <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Calendar size={18} /> Timeline
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Current Age</label>
              <input type="number" value={currentAge} onChange={(e) => setCurrentAge(Number(e.target.value))}
                className="w-full px-3 py-2 border-2 rounded-xl" min={18} max={80} />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Retire At</label>
              <input type="number" value={retirementAge} onChange={(e) => setRetirementAge(Number(e.target.value))}
                className="w-full px-3 py-2 border-2 rounded-xl" min={currentAge+1} max={80} />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Plan Until</label>
              <input type="number" value={lifeExpectancy} onChange={(e) => setLifeExpectancy(Number(e.target.value))}
                className="w-full px-3 py-2 border-2 rounded-xl" min={retirementAge+1} max={110} />
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <DollarSign size={18} /> Money
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Current Savings</label>
              <input type="number" value={currentSavings} onChange={(e) => setCurrentSavings(Number(e.target.value))}
                className="w-full px-3 py-2 border-2 rounded-xl" min={0} step={1000} />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Annual Contribution</label>
              <input type="number" value={annualContribution} onChange={(e) => setAnnualContribution(Number(e.target.value))}
                className="w-full px-3 py-2 border-2 rounded-xl" min={0} step={1000} />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Annual Spending (Retirement)</label>
              <input type="number" value={annualSpending} onChange={(e) => setAnnualSpending(Number(e.target.value))}
                className="w-full px-3 py-2 border-2 rounded-xl" min={0} step={1000} />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Social Security/Pension</label>
              <input type="number" value={socialSecurity} onChange={(e) => setSocialSecurity(Number(e.target.value))}
                className="w-full px-3 py-2 border-2 rounded-xl" min={0} step={1000} />
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <PieChart size={18} /> Asset Allocation
          </h3>
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Stocks %</label>
              <input type="number" value={stocksPercent}
                onChange={(e) => {
                  const val = Math.min(100, Math.max(0, Number(e.target.value)));
                  setStocksPercent(val);
                  if (val + bondsPercent > 100) setBondsPercent(100 - val);
                }}
                className="w-full px-3 py-2 border-2 rounded-xl" min={0} max={100} />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Bonds %</label>
              <input type="number" value={bondsPercent}
                onChange={(e) => setBondsPercent(Math.min(100 - stocksPercent, Math.max(0, Number(e.target.value))))}
                className="w-full px-3 py-2 border-2 rounded-xl" min={0} max={100-stocksPercent} />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Cash %</label>
              <input type="number" value={cashPercent} disabled
                className="w-full px-3 py-2 border-2 rounded-xl bg-slate-100" />
            </div>
          </div>
          <div className="h-3 rounded-full overflow-hidden flex">
            <div className="bg-blue-500" style={{ width: `${stocksPercent}%` }} />
            <div className="bg-green-500" style={{ width: `${bondsPercent}%` }} />
            <div className="bg-yellow-400" style={{ width: `${cashPercent}%` }} />
          </div>
        </div>

        <button onClick={runSimulations} disabled={isRunning}
          className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-3 disabled:opacity-50">
          {isRunning ? <><RefreshCw size={24} className="animate-spin" /> Running...</>
            : <><Play size={24} /> Run {SIMULATIONS.toLocaleString()} Simulations</>}
        </button>
      </div>

      {/* Results */}
      {results && (
        <>
          <div className={`rounded-2xl shadow-xl p-6 border-2 ${getSuccessBg(results.successRate)}`}>
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                {results.successRate >= 80 ? <CheckCircle2 size={32} className="text-green-600" />
                  : <AlertCircle size={32} className={results.successRate >= 60 ? 'text-yellow-600' : 'text-red-600'} />}
                <span className={`text-5xl font-black ${getSuccessColor(results.successRate)}`}>
                  {results.successRate.toFixed(1)}%
                </span>
              </div>
              <p className="text-lg font-semibold text-slate-700">Probability of Success</p>
              <p className="text-sm text-slate-600">
                {results.successCount} of {results.totalSimulations} simulations succeeded
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="font-bold text-slate-800 mb-4">Projected Outcomes at Age {lifeExpectancy}</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-red-50 rounded-xl p-4 text-center">
                <p className="text-sm text-slate-600">10th %ile</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(results.p10FinalBalance)}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-sm text-slate-600">Median</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(results.medianFinalBalance)}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-sm text-slate-600">90th %ile</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(results.p90FinalBalance)}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ============================================
// MAIN COMPONENT WITH TABS
// ============================================
export const Retirement = () => {
  const [activeTab, setActiveTab] = useState('investment');

  const tabs = [
    { id: 'investment', label: 'Investment', icon: TrendingUp },
    { id: 'needs', label: 'Retirement Needs', icon: Target },
    { id: 'nestegg', label: 'Nest Egg', icon: Wallet },
    { id: 'montecarlo', label: 'Monte Carlo', icon: Zap },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl shadow-xl p-2">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[120px] px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon size={18} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'investment' && <InvestmentCalculator />}
      {activeTab === 'needs' && <RetirementNeedsCalculator />}
      {activeTab === 'nestegg' && <NestEggCalculator />}
      {activeTab === 'montecarlo' && <MonteCarloSimulator />}
    </div>
  );
};

export default Retirement;
