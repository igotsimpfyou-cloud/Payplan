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
  Settings,
  Heart,
  Shield,
} from 'lucide-react';

// ============================================
// ENHANCED MONTE CARLO SIMULATION ENGINE
// ============================================
const SIMULATIONS = 10000; // Professional-grade: 10,000 simulations

// Historical return data (real returns based on market history)
const HISTORICAL_RETURNS = {
  // Mean real returns (after inflation) and standard deviations
  stocks: { mean: 0.07, stdDev: 0.17, realMean: 0.07 },  // ~10% nominal, ~7% real
  bonds: { mean: 0.02, stdDev: 0.05, realMean: 0.02 },   // ~5% nominal, ~2% real
  cash: { mean: 0.00, stdDev: 0.01, realMean: 0.00 },    // ~2% nominal, ~0% real
};

// Correlation matrix (stocks and bonds can correlate in crashes)
const CORRELATION = {
  stocksBonds: 0.2,  // Slight positive correlation historically
  stocksCash: 0.0,
  bondsCash: 0.3,
};

// Social Security benefit by claiming age (relative to Full Retirement Age)
const SS_ADJUSTMENT = {
  62: 0.70,  // 30% reduction
  63: 0.75,
  64: 0.80,
  65: 0.867,
  66: 0.933,
  67: 1.00,  // Full Retirement Age (for those born 1960+)
  68: 1.08,
  69: 1.16,
  70: 1.24,  // Maximum benefit
};

// RMD factors (IRS Uniform Lifetime Table - simplified)
const RMD_FACTORS = {
  72: 27.4, 73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9,
  78: 22.0, 79: 21.1, 80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7,
  84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4, 88: 13.7, 89: 12.9,
  90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9,
};

// Healthcare cost increases (above inflation)
const HEALTHCARE_INCREASE = 0.02; // 2% above inflation per year

// Generate correlated random returns using Cholesky decomposition
const generateCorrelatedReturns = () => {
  // Generate independent standard normal variables
  const z1 = randomNormal(0, 1);
  const z2 = randomNormal(0, 1);
  const z3 = randomNormal(0, 1);

  // Apply correlation using Cholesky decomposition
  const stockZ = z1;
  const bondZ = CORRELATION.stocksBonds * z1 + Math.sqrt(1 - CORRELATION.stocksBonds ** 2) * z2;
  const cashZ = z3; // Cash uncorrelated for simplicity

  // Convert to actual returns
  const stockReturn = HISTORICAL_RETURNS.stocks.mean + HISTORICAL_RETURNS.stocks.stdDev * stockZ;
  const bondReturn = HISTORICAL_RETURNS.bonds.mean + HISTORICAL_RETURNS.bonds.stdDev * bondZ;
  const cashReturn = HISTORICAL_RETURNS.cash.mean + HISTORICAL_RETURNS.cash.stdDev * cashZ;

  return { stockReturn, bondReturn, cashReturn };
};

// Generate random normal using Box-Muller transform
const randomNormal = (mean, stdDev) => {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + stdDev * z;
};

// Calculate glide path allocation based on age
const getGlidePath = (age, retirementAge, useGlidePath) => {
  if (!useGlidePath) return null;

  // Common glide path: Start with (110 - age)% stocks, reduce to (100 - age)% in retirement
  // Pre-retirement: More aggressive
  // Post-retirement: More conservative

  let stocksPercent;
  if (age < retirementAge) {
    // Pre-retirement: 110 - age (e.g., age 30 = 80% stocks)
    stocksPercent = Math.max(20, Math.min(90, 110 - age));
  } else {
    // Post-retirement: 100 - age, floor at 30% stocks
    stocksPercent = Math.max(30, Math.min(70, 100 - age));
  }

  const bondsPercent = Math.min(60, 100 - stocksPercent - 10);
  const cashPercent = 100 - stocksPercent - bondsPercent;

  return { stocksPercent, bondsPercent, cashPercent };
};

// Calculate RMD for a given age and traditional balance
const calculateRMD = (age, traditionalBalance) => {
  if (age < 73 || !RMD_FACTORS[age]) return 0;
  return traditionalBalance / RMD_FACTORS[age];
};

// Calculate Social Security benefit
const calculateSocialSecurity = (baseBenefit, claimingAge, currentAge) => {
  if (currentAge < claimingAge) return 0;
  const adjustment = SS_ADJUSTMENT[claimingAge] || 1.0;
  return baseBenefit * adjustment;
};

// Calculate tax on withdrawal (simplified)
const calculateTax = (withdrawal, accountType, taxRate) => {
  switch (accountType) {
    case 'traditional':
      return withdrawal * taxRate;
    case 'roth':
      return 0; // Tax-free
    case 'taxable':
      return withdrawal * 0.5 * 0.15; // Assume 50% is gains, 15% LTCG rate
    default:
      return 0;
  }
};

// Run a single enhanced simulation
const runEnhancedSimulation = (params) => {
  const {
    currentAge, retirementAge, lifeExpectancy,
    traditionalBalance, rothBalance, taxableBalance,
    annualContribution, contributionType,
    annualSpending, ssBaseBenefit, ssClaimingAge,
    stocksPercent, bondsPercent, useGlidePath,
    inflationRate, taxRate, includeHealthcare,
    healthcareCostBase,
  } = params;

  const totalYears = lifeExpectancy - currentAge;

  // Track balances by account type
  let traditional = traditionalBalance;
  let roth = rothBalance;
  let taxable = taxableBalance;

  const yearlyBalances = [traditional + roth + taxable];
  let cumulativeInflation = 1;
  let healthcareCost = healthcareCostBase;

  for (let year = 1; year <= totalYears; year++) {
    const age = currentAge + year;
    const isRetired = age > retirementAge;

    // Update inflation
    cumulativeInflation *= (1 + inflationRate);

    // Get allocation (either fixed or glide path)
    const allocation = useGlidePath
      ? getGlidePath(age, retirementAge, true)
      : { stocksPercent, bondsPercent, cashPercent: 100 - stocksPercent - bondsPercent };

    // Generate correlated returns
    const { stockReturn, bondReturn, cashReturn } = generateCorrelatedReturns();

    // Calculate blended portfolio return
    const portfolioReturn =
      (allocation.stocksPercent / 100) * stockReturn +
      (allocation.bondsPercent / 100) * bondReturn +
      (allocation.cashPercent / 100) * cashReturn;

    // Apply returns to each account
    traditional *= (1 + portfolioReturn);
    roth *= (1 + portfolioReturn);
    taxable *= (1 + portfolioReturn);

    if (isRetired) {
      // Calculate required spending (inflation-adjusted)
      let requiredSpending = annualSpending * cumulativeInflation;

      // Add healthcare costs if enabled
      if (includeHealthcare) {
        healthcareCost *= (1 + inflationRate + HEALTHCARE_INCREASE);
        requiredSpending += healthcareCost;
      }

      // Get Social Security income
      const ssIncome = calculateSocialSecurity(ssBaseBenefit, ssClaimingAge, age) * cumulativeInflation;
      requiredSpending = Math.max(0, requiredSpending - ssIncome);

      // Calculate RMD (must withdraw from traditional)
      const rmd = calculateRMD(age, traditional);
      const rmdAfterTax = rmd * (1 - taxRate);

      // Withdrawal strategy: RMD first, then taxable, then traditional, then Roth
      let remaining = requiredSpending;

      // Apply RMD (mandatory)
      if (rmd > 0) {
        traditional -= rmd;
        remaining -= rmdAfterTax;
      }

      // Withdraw from taxable (most tax-efficient after RMD)
      if (remaining > 0 && taxable > 0) {
        const taxableWithdrawal = Math.min(taxable, remaining / 0.925); // Account for ~7.5% effective tax
        taxable -= taxableWithdrawal;
        remaining -= taxableWithdrawal * 0.925;
      }

      // Withdraw from traditional
      if (remaining > 0 && traditional > 0) {
        const tradWithdrawal = Math.min(traditional, remaining / (1 - taxRate));
        traditional -= tradWithdrawal;
        remaining -= tradWithdrawal * (1 - taxRate);
      }

      // Withdraw from Roth (last resort, tax-free)
      if (remaining > 0 && roth > 0) {
        const rothWithdrawal = Math.min(roth, remaining);
        roth -= rothWithdrawal;
        remaining -= rothWithdrawal;
      }

      // Check if we couldn't meet spending needs
      if (remaining > 0) {
        // Depleted
        for (let i = year; i <= totalYears; i++) {
          yearlyBalances.push(0);
        }
        return {
          success: false,
          finalBalance: 0,
          yearlyBalances,
          depletedAtAge: age,
          finalTraditional: 0,
          finalRoth: 0,
          finalTaxable: 0,
        };
      }
    } else {
      // Pre-retirement: Add contributions
      const contribution = annualContribution * cumulativeInflation;
      if (contributionType === 'traditional') {
        traditional += contribution;
      } else if (contributionType === 'roth') {
        roth += contribution;
      } else {
        // Split 50/50
        traditional += contribution / 2;
        roth += contribution / 2;
      }
    }

    yearlyBalances.push(Math.max(0, traditional + roth + taxable));
  }

  const finalBalance = traditional + roth + taxable;
  return {
    success: true,
    finalBalance,
    yearlyBalances,
    depletedAtAge: null,
    finalTraditional: traditional,
    finalRoth: roth,
    finalTaxable: taxable,
  };
};

// Run all simulations
const runEnhancedMonteCarloSimulation = (params, progressCallback) => {
  const results = [];
  const batchSize = 1000;

  for (let i = 0; i < SIMULATIONS; i++) {
    results.push(runEnhancedSimulation(params));

    // Report progress every batch
    if (progressCallback && i % batchSize === 0) {
      progressCallback(Math.round((i / SIMULATIONS) * 100));
    }
  }

  const successCount = results.filter(r => r.success).length;
  const successRate = (successCount / SIMULATIONS) * 100;

  const finalBalances = results.map(r => r.finalBalance).sort((a, b) => a - b);
  const percentile = (p) => finalBalances[Math.floor(p * SIMULATIONS / 100)] || 0;

  // Calculate yearly percentiles
  const totalYears = params.lifeExpectancy - params.currentAge;
  const avgBalances = [];
  const p10Balances = [];
  const p25Balances = [];
  const p50Balances = [];
  const p75Balances = [];
  const p90Balances = [];

  for (let year = 0; year <= totalYears; year++) {
    const yearBalances = results.map(r => r.yearlyBalances[year] || 0).sort((a, b) => a - b);
    avgBalances.push(yearBalances.reduce((a, b) => a + b, 0) / SIMULATIONS);
    p10Balances.push(yearBalances[Math.floor(0.10 * SIMULATIONS)] || 0);
    p25Balances.push(yearBalances[Math.floor(0.25 * SIMULATIONS)] || 0);
    p50Balances.push(yearBalances[Math.floor(0.50 * SIMULATIONS)] || 0);
    p75Balances.push(yearBalances[Math.floor(0.75 * SIMULATIONS)] || 0);
    p90Balances.push(yearBalances[Math.floor(0.90 * SIMULATIONS)] || 0);
  }

  // Calculate depletion age distribution
  const depletionAges = results.filter(r => !r.success).map(r => r.depletedAtAge);
  const avgDepletionAge = depletionAges.length > 0
    ? depletionAges.reduce((a, b) => a + b, 0) / depletionAges.length
    : null;

  return {
    successRate,
    successCount,
    totalSimulations: SIMULATIONS,
    medianFinalBalance: percentile(50),
    p10FinalBalance: percentile(10),
    p25FinalBalance: percentile(25),
    p75FinalBalance: percentile(75),
    p90FinalBalance: percentile(90),
    avgBalances,
    p10Balances,
    p25Balances,
    p50Balances,
    p75Balances,
    p90Balances,
    avgDepletionAge,
    depletionCount: depletionAges.length,
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
  const [initialAmount, setInitialAmount] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [years, setYears] = useState('');
  const [annualReturn, setAnnualReturn] = useState(10);

  // Parse values for calculations (empty = 0)
  const initAmt = Number(initialAmount) || 0;
  const monthlyAmt = Number(monthlyContribution) || 0;
  const yearsNum = Number(years) || 0;

  const results = useMemo(() => {
    if (yearsNum <= 0) return { totalValue: 0, totalContributions: 0, totalInterest: 0, yearlyData: [] };

    const monthlyRate = annualReturn / 100 / 12;
    const months = yearsNum * 12;
    const futureValueInitial = initAmt * Math.pow(1 + monthlyRate, months);
    const futureValueContributions = monthlyAmt *
      ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
    const totalValue = futureValueInitial + futureValueContributions;
    const totalContributions = initAmt + (monthlyAmt * months);
    const totalInterest = totalValue - totalContributions;

    const yearlyData = [];
    let balance = initAmt;
    for (let y = 0; y <= yearsNum; y++) {
      yearlyData.push({ year: y, balance, contributions: initAmt + (monthlyAmt * 12 * y) });
      for (let m = 0; m < 12; m++) {
        balance = balance * (1 + monthlyRate) + monthlyAmt;
      }
    }
    return { totalValue, totalContributions, totalInterest, yearlyData };
  }, [initAmt, monthlyAmt, yearsNum, annualReturn]);

  const maxBalance = results.yearlyData.length > 0 ? Math.max(...results.yearlyData.map(d => d.balance)) : 1;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Calculator size={28} />
          <h2 className="text-2xl font-bold">Investment Calculator</h2>
        </div>
        <p className="text-emerald-100">
          See how compound interest grows your money. Dave Ramsey recommends 15% of income at 10-12% returns.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Starting Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input type="number" value={initialAmount} onChange={(e) => setInitialAmount(e.target.value)}
                placeholder="10,000" className="w-full pl-8 pr-4 py-3 border-2 rounded-xl focus:border-emerald-500 focus:outline-none" min={0} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Monthly Contribution</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input type="number" value={monthlyContribution} onChange={(e) => setMonthlyContribution(e.target.value)}
                placeholder="500" className="w-full pl-8 pr-4 py-3 border-2 rounded-xl focus:border-emerald-500 focus:outline-none" min={0} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Years to Invest</label>
            <input type="number" value={years} onChange={(e) => setYears(e.target.value)}
              placeholder="30" className="w-full px-4 py-3 border-2 rounded-xl focus:border-emerald-500 focus:outline-none" min={1} max={50} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Expected Return: {annualReturn}%</label>
            <input type="range" value={annualReturn} onChange={(e) => setAnnualReturn(Number(e.target.value))}
              className="w-full mt-2" min={1} max={15} step={0.5} />
            <div className="flex justify-between text-xs text-slate-500"><span>1%</span><span>10-12% (Ramsey)</span><span>15%</span></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-emerald-50 rounded-2xl p-6 text-center border-2 border-emerald-200">
          <p className="text-sm text-slate-600 mb-1">Total Value</p>
          <p className="text-3xl font-black text-emerald-600">{formatCurrency(results.totalValue)}</p>
        </div>
        <div className="bg-blue-50 rounded-2xl p-6 text-center border-2 border-blue-200">
          <p className="text-sm text-slate-600 mb-1">Total Contributions</p>
          <p className="text-3xl font-black text-blue-600">{formatCurrency(results.totalContributions)}</p>
        </div>
        <div className="bg-purple-50 rounded-2xl p-6 text-center border-2 border-purple-200">
          <p className="text-sm text-slate-600 mb-1">Interest Earned</p>
          <p className="text-3xl font-black text-purple-600">{formatCurrency(results.totalInterest)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Growth Over Time</h3>
        <div className="h-64 relative">
          <svg viewBox="0 0 100 50" className="w-full h-full" preserveAspectRatio="none">
            {[0, 25, 50, 75, 100].map((pct) => (
              <line key={pct} x1="0" y1={50 - pct / 2} x2="100" y2={50 - pct / 2} stroke="#e2e8f0" strokeWidth="0.3" />
            ))}
            <path d={`M 0 50 ${results.yearlyData.map((d, i) => `L ${(i / years) * 100} ${50 - (d.contributions / maxBalance) * 45}`).join(' ')} L 100 50 Z`}
              fill="rgba(59, 130, 246, 0.3)" />
            <path d={`M 0 50 ${results.yearlyData.map((d, i) => `L ${(i / years) * 100} ${50 - (d.balance / maxBalance) * 45}`).join(' ')} L 100 50 Z`}
              fill="rgba(16, 185, 129, 0.3)" />
            <path d={results.yearlyData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${(i / years) * 100} ${50 - (d.balance / maxBalance) * 45}`).join(' ')}
              fill="none" stroke="#10b981" strokeWidth="1" />
          </svg>
          <div className="absolute bottom-0 left-0 text-xs text-slate-500">Year 0</div>
          <div className="absolute bottom-0 right-0 text-xs text-slate-500">Year {years}</div>
        </div>
        <div className="flex justify-center gap-6 mt-4 text-sm">
          <span className="flex items-center gap-2"><span className="w-4 h-4 bg-emerald-400 rounded"></span> Total Balance</span>
          <span className="flex items-center gap-2"><span className="w-4 h-4 bg-blue-400 rounded"></span> Contributions</span>
        </div>
      </div>
    </div>
  );
};

// ============================================
// RETIREMENT NEEDS CALCULATOR (25x Rule)
// ============================================
const RetirementNeedsCalculator = () => {
  const [currentAge, setCurrentAge] = useState('');
  const [retirementAge, setRetirementAge] = useState('');
  const [monthlyExpenses, setMonthlyExpenses] = useState('');
  const [currentSavings, setCurrentSavings] = useState('');
  const [annualReturn, setAnnualReturn] = useState(10);

  // Parse values for calculations
  const curAge = Number(currentAge) || 0;
  const retAge = Number(retirementAge) || 0;
  const monthExp = Number(monthlyExpenses) || 0;
  const curSavings = Number(currentSavings) || 0;

  const results = useMemo(() => {
    const annualExpenses = monthExp * 12;
    const targetNestEgg = annualExpenses * 25;
    const yearsToRetirement = Math.max(0, retAge - curAge);
    if (yearsToRetirement <= 0 || annualExpenses <= 0) {
      return { annualExpenses, targetNestEgg, monthlyNeeded: 0, progress: 0, yearsToRetirement: 0 };
    }
    const monthlyRate = annualReturn / 100 / 12;
    const months = yearsToRetirement * 12;
    const futureValueOfCurrent = curSavings * Math.pow(1 + monthlyRate, months);
    const remaining = targetNestEgg - futureValueOfCurrent;
    const monthlyNeeded = remaining > 0 ? (remaining * monthlyRate) / (Math.pow(1 + monthlyRate, months) - 1) : 0;
    const progress = targetNestEgg > 0 ? (curSavings / targetNestEgg) * 100 : 0;
    return { annualExpenses, targetNestEgg, monthlyNeeded: Math.max(0, monthlyNeeded), progress, yearsToRetirement };
  }, [curAge, retAge, monthExp, curSavings, annualReturn]);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Target size={28} />
          <h2 className="text-2xl font-bold">Retirement Needs Calculator</h2>
        </div>
        <p className="text-blue-100">Based on the 25x rule: Save 25x your annual expenses for a 4% safe withdrawal rate.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Current Age</label>
            <input type="number" value={currentAge} onChange={(e) => setCurrentAge(e.target.value)}
              placeholder="35" className="w-full px-4 py-3 border-2 rounded-xl" min={18} max={80} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Retirement Age</label>
            <input type="number" value={retirementAge} onChange={(e) => setRetirementAge(e.target.value)}
              placeholder="65" className="w-full px-4 py-3 border-2 rounded-xl" min={curAge + 1} max={80} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Monthly Expenses in Retirement</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input type="number" value={monthlyExpenses} onChange={(e) => setMonthlyExpenses(e.target.value)}
                placeholder="4,000" className="w-full pl-8 pr-4 py-3 border-2 rounded-xl" min={0} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Current Savings</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input type="number" value={currentSavings} onChange={(e) => setCurrentSavings(e.target.value)}
                placeholder="50,000" className="w-full pl-8 pr-4 py-3 border-2 rounded-xl" min={0} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-6 text-center">
        <p className="text-slate-600 mb-2">Based on {formatFullCurrency(results.annualExpenses)}/year expenses, you need:</p>
        <p className="text-5xl font-black text-blue-600 mb-2">{formatCurrency(results.targetNestEgg)}</p>
        <div className="mt-4">
          <div className="h-4 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500" style={{ width: `${Math.min(100, results.progress)}%` }} />
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>{formatCurrency(curSavings)} ({results.progress.toFixed(1)}%)</span>
            <span>{formatCurrency(results.targetNestEgg)}</span>
          </div>
        </div>
      </div>

      {results.monthlyNeeded > 0 && (
        <div className="bg-blue-50 rounded-2xl shadow-xl p-6 text-center border-2 border-blue-200">
          <p className="text-slate-600 mb-2">To reach your goal in {results.yearsToRetirement} years, save:</p>
          <p className="text-4xl font-black text-blue-600">{formatFullCurrency(Math.round(results.monthlyNeeded))}/month</p>
        </div>
      )}
    </div>
  );
};

// ============================================
// NEST EGG CALCULATOR
// ============================================
const NestEggCalculator = () => {
  const [nestEgg, setNestEgg] = useState('');
  const [monthlyWithdrawal, setMonthlyWithdrawal] = useState('');
  const [annualReturn, setAnnualReturn] = useState(6);
  const [inflationRate, setInflationRate] = useState(3);

  // Parse values for calculations
  const nestEggAmt = Number(nestEgg) || 0;
  const monthlyAmt = Number(monthlyWithdrawal) || 0;

  const results = useMemo(() => {
    if (nestEggAmt <= 0) {
      return { years: 0, months: 0, willLastForever: false, withdrawalRate: 0, yearlyData: [{ year: 0, balance: 0 }] };
    }
    const monthlyRate = annualReturn / 100 / 12;
    const monthlyInflation = inflationRate / 100 / 12;
    let balance = nestEggAmt;
    let months = 0;
    const maxMonths = 600;
    const yearlyData = [{ year: 0, balance: nestEggAmt }];

    while (balance > 0 && months < maxMonths) {
      balance *= (1 + monthlyRate);
      balance -= monthlyAmt * Math.pow(1 + monthlyInflation, months);
      months++;
      if (months % 12 === 0) yearlyData.push({ year: months / 12, balance: Math.max(0, balance) });
    }

    const withdrawalRate = nestEggAmt > 0 ? (monthlyAmt * 12 / nestEggAmt) * 100 : 0;
    return { years: months / 12, months, willLastForever: months >= maxMonths, withdrawalRate, yearlyData };
  }, [nestEggAmt, monthlyAmt, annualReturn, inflationRate]);

  const maxBalance = results.yearlyData.length > 0 ? Math.max(...results.yearlyData.map(d => d.balance)) : 1;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Clock size={28} />
          <h2 className="text-2xl font-bold">Nest Egg Calculator</h2>
        </div>
        <p className="text-purple-100">Find out how long your savings will last in retirement.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Nest Egg</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input type="number" value={nestEgg} onChange={(e) => setNestEgg(e.target.value)}
                placeholder="1,000,000" className="w-full pl-8 pr-4 py-3 border-2 rounded-xl" min={0} step={10000} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Monthly Withdrawal</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input type="number" value={monthlyWithdrawal} onChange={(e) => setMonthlyWithdrawal(e.target.value)}
                placeholder="4,000" className="w-full pl-8 pr-4 py-3 border-2 rounded-xl" min={0} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Expected Return: {annualReturn}%</label>
            <input type="range" value={annualReturn} onChange={(e) => setAnnualReturn(Number(e.target.value))} className="w-full" min={0} max={12} step={0.5} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Inflation: {inflationRate}%</label>
            <input type="range" value={inflationRate} onChange={(e) => setInflationRate(Number(e.target.value))} className="w-full" min={0} max={6} step={0.5} />
          </div>
        </div>
      </div>

      <div className={`rounded-2xl shadow-xl p-6 text-center ${results.willLastForever ? 'bg-green-50 border-2 border-green-300' : results.years >= 30 ? 'bg-blue-50 border-2 border-blue-300' : 'bg-red-50 border-2 border-red-300'}`}>
        {results.willLastForever ? (
          <><CheckCircle2 size={48} className="mx-auto text-green-500 mb-2" /><p className="text-3xl font-black text-green-700">Forever!</p></>
        ) : (
          <><p className="text-slate-600 mb-2">Your savings will last:</p><p className="text-5xl font-black text-purple-600">{Math.floor(results.years)} years</p></>
        )}
        <p className="text-slate-500 mt-2">Withdrawal rate: {results.withdrawalRate.toFixed(1)}%</p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Balance Over Time</h3>
        <div className="h-48 relative">
          <svg viewBox="0 0 100 50" className="w-full h-full" preserveAspectRatio="none">
            {[0, 25, 50, 75, 100].map((pct) => (<line key={pct} x1="0" y1={50 - pct / 2} x2="100" y2={50 - pct / 2} stroke="#e2e8f0" strokeWidth="0.3" />))}
            <path d={`M 0 ${50 - (nestEgg / maxBalance) * 45} ${results.yearlyData.map((d, i) => `L ${(i / Math.max(results.yearlyData.length - 1, 1)) * 100} ${50 - (d.balance / maxBalance) * 45}`).join(' ')}`}
              fill="none" stroke="#9333ea" strokeWidth="1.5" />
          </svg>
        </div>
      </div>
    </div>
  );
};

// ============================================
// ENHANCED MONTE CARLO SIMULATOR
// ============================================
const MonteCarloSimulator = () => {
  // Basic info
  const [currentAge, setCurrentAge] = useState('');
  const [retirementAge, setRetirementAge] = useState('');
  const [lifeExpectancy, setLifeExpectancy] = useState('');

  // Account balances
  const [traditionalBalance, setTraditionalBalance] = useState('');
  const [rothBalance, setRothBalance] = useState('');
  const [taxableBalance, setTaxableBalance] = useState('');

  // Contributions
  const [annualContribution, setAnnualContribution] = useState('');
  const [contributionType, setContributionType] = useState('split'); // 'traditional', 'roth', 'split'

  // Spending
  const [annualSpending, setAnnualSpending] = useState('');

  // Social Security
  const [ssBaseBenefit, setSsBaseBenefit] = useState('');
  const [ssClaimingAge, setSsClaimingAge] = useState('');

  // Allocation
  const [stocksPercent, setStocksPercent] = useState(70);
  const [bondsPercent, setBondsPercent] = useState(25);
  const [useGlidePath, setUseGlidePath] = useState(true);

  // Advanced settings
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [inflationRate, setInflationRate] = useState(0.025);
  const [taxRate, setTaxRate] = useState(0.22);
  const [includeHealthcare, setIncludeHealthcare] = useState(true);
  const [healthcareCostBase, setHealthcareCostBase] = useState('');

  // Results
  const [results, setResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  // Parse values for calculations
  const curAge = Number(currentAge) || 0;
  const retAge = Number(retirementAge) || 0;
  const lifeExp = Number(lifeExpectancy) || 0;
  const tradBal = Number(traditionalBalance) || 0;
  const rothBal = Number(rothBalance) || 0;
  const taxBal = Number(taxableBalance) || 0;
  const annContrib = Number(annualContribution) || 0;
  const annSpend = Number(annualSpending) || 0;
  const ssBenefit = Number(ssBaseBenefit) || 0;
  const ssAge = Number(ssClaimingAge) || 67;
  const healthCost = Number(healthcareCostBase) || 0;

  const cashPercent = 100 - stocksPercent - bondsPercent;
  const totalBalance = tradBal + rothBal + taxBal;

  const runSimulations = () => {
    if (curAge <= 0 || retAge <= 0 || lifeExp <= 0) {
      alert('Please enter your current age, retirement age, and life expectancy');
      return;
    }
    setIsRunning(true);
    setProgress(0);

    setTimeout(() => {
      const params = {
        currentAge: curAge, retirementAge: retAge, lifeExpectancy: lifeExp,
        traditionalBalance: tradBal, rothBalance: rothBal, taxableBalance: taxBal,
        annualContribution: annContrib, contributionType,
        annualSpending: annSpend, ssBaseBenefit: ssBenefit, ssClaimingAge: ssAge,
        stocksPercent, bondsPercent, useGlidePath,
        inflationRate, taxRate, includeHealthcare, healthcareCostBase: healthCost,
      };

      const simulationResults = runEnhancedMonteCarloSimulation(params, setProgress);
      setResults(simulationResults);
      setIsRunning(false);
      setProgress(100);
    }, 50);
  };

  const getSuccessColor = (rate) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 75) return 'text-emerald-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSuccessBg = (rate) => {
    if (rate >= 90) return 'bg-green-100 border-green-300';
    if (rate >= 75) return 'bg-emerald-100 border-emerald-300';
    if (rate >= 60) return 'bg-yellow-100 border-yellow-300';
    return 'bg-red-100 border-red-300';
  };

  const getSuccessLabel = (rate) => {
    if (rate >= 90) return 'Excellent';
    if (rate >= 75) return 'Good';
    if (rate >= 60) return 'Fair';
    return 'Needs Work';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Zap size={28} />
          <h2 className="text-2xl font-bold">Advanced Monte Carlo Simulator</h2>
        </div>
        <p className="text-indigo-100">
          Professional-grade simulation with {SIMULATIONS.toLocaleString()} scenarios, tax optimization,
          Social Security timing, healthcare costs, and automatic rebalancing.
        </p>
      </div>

      {/* Feature badges */}
      <div className="flex flex-wrap gap-2">
        {[
          { icon: Zap, label: '10,000 Simulations' },
          { icon: TrendingUp, label: 'Glide Path' },
          { icon: DollarSign, label: 'Tax Optimization' },
          { icon: Shield, label: 'Social Security' },
          { icon: Heart, label: 'Healthcare Costs' },
          { icon: PieChart, label: 'Correlated Returns' },
        ].map(({ icon: Icon, label }) => (
          <span key={label} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium flex items-center gap-1">
            <Icon size={14} /> {label}
          </span>
        ))}
      </div>

      {/* Basic Info */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Calendar size={20} className="text-purple-600" /> Timeline
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Current Age</label>
            <input type="number" value={currentAge} onChange={(e) => setCurrentAge(e.target.value)}
              placeholder="35" className="w-full px-3 py-2 border-2 rounded-xl" min={18} max={80} />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Retire At</label>
            <input type="number" value={retirementAge} onChange={(e) => setRetirementAge(e.target.value)}
              placeholder="65" className="w-full px-3 py-2 border-2 rounded-xl" min={curAge + 1} max={80} />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Plan Until Age</label>
            <input type="number" value={lifeExpectancy} onChange={(e) => setLifeExpectancy(e.target.value)}
              placeholder="95" className="w-full px-3 py-2 border-2 rounded-xl" min={retAge + 1} max={110} />
          </div>
        </div>
      </div>

      {/* Account Balances */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Wallet size={20} className="text-green-600" /> Account Balances
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Traditional 401(k)/IRA</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input type="number" value={traditionalBalance} onChange={(e) => setTraditionalBalance(e.target.value)}
                placeholder="100,000" className="w-full pl-8 pr-4 py-2 border-2 rounded-xl" min={0} step={1000} />
            </div>
            <p className="text-xs text-slate-500 mt-1">Taxed on withdrawal</p>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Roth 401(k)/IRA</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input type="number" value={rothBalance} onChange={(e) => setRothBalance(e.target.value)}
                placeholder="50,000" className="w-full pl-8 pr-4 py-2 border-2 rounded-xl" min={0} step={1000} />
            </div>
            <p className="text-xs text-slate-500 mt-1">Tax-free withdrawal</p>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Taxable Brokerage</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input type="number" value={taxableBalance} onChange={(e) => setTaxableBalance(e.target.value)}
                placeholder="25,000" className="w-full pl-8 pr-4 py-2 border-2 rounded-xl" min={0} step={1000} />
            </div>
            <p className="text-xs text-slate-500 mt-1">Capital gains tax</p>
          </div>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 text-center">
          <span className="text-slate-600">Total Portfolio: </span>
          <span className="font-bold text-lg">{formatCurrency(totalBalance)}</span>
        </div>
      </div>

      {/* Contributions & Spending */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <DollarSign size={20} className="text-blue-600" /> Contributions & Spending
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Annual Contribution (until retirement)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input type="number" value={annualContribution} onChange={(e) => setAnnualContribution(e.target.value)}
                placeholder="20,000" className="w-full pl-8 pr-4 py-2 border-2 rounded-xl" min={0} step={1000} />
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Contribution Type</label>
            <select value={contributionType} onChange={(e) => setContributionType(e.target.value)}
              className="w-full px-4 py-2 border-2 rounded-xl">
              <option value="traditional">Traditional (pre-tax)</option>
              <option value="roth">Roth (after-tax)</option>
              <option value="split">Split 50/50</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Annual Spending in Retirement</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input type="number" value={annualSpending} onChange={(e) => setAnnualSpending(e.target.value)}
                placeholder="50,000" className="w-full pl-8 pr-4 py-2 border-2 rounded-xl" min={0} step={1000} />
            </div>
          </div>
        </div>
      </div>

      {/* Social Security */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Shield size={20} className="text-indigo-600" /> Social Security
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Estimated Annual Benefit (at age 67)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input type="number" value={ssBaseBenefit} onChange={(e) => setSsBaseBenefit(e.target.value)}
                placeholder="24,000" className="w-full pl-8 pr-4 py-2 border-2 rounded-xl" min={0} step={1000} />
            </div>
            <p className="text-xs text-slate-500 mt-1">Check ssa.gov for your estimate</p>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Claiming Age: {ssAge}</label>
            <input type="range" value={ssClaimingAge} onChange={(e) => setSsClaimingAge(e.target.value)}
              className="w-full" min={62} max={70} step={1} />
            <div className="flex justify-between text-xs text-slate-500">
              <span>62 (-30%)</span>
              <span>67 (FRA)</span>
              <span>70 (+24%)</span>
            </div>
            <p className="text-center text-sm font-medium mt-2">
              Adjusted benefit: {formatFullCurrency(Math.round(ssBenefit * (SS_ADJUSTMENT[ssAge] || 1)))}/year
            </p>
          </div>
        </div>
      </div>

      {/* Asset Allocation */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <PieChart size={20} className="text-orange-600" /> Asset Allocation
        </h3>

        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={useGlidePath} onChange={(e) => setUseGlidePath(e.target.checked)}
              className="w-5 h-5 rounded" />
            <span className="font-medium">Use automatic glide path (recommended)</span>
          </label>
          <p className="text-sm text-slate-500 ml-7">
            Automatically shifts from stocks to bonds as you age {curAge > 0 ? `(starts ~${110 - curAge}% stocks)` : ''}
          </p>
        </div>

        {!useGlidePath && (
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
                className="w-full px-3 py-2 border-2 rounded-xl" min={0} max={100 - stocksPercent} />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Cash %</label>
              <input type="number" value={cashPercent} disabled className="w-full px-3 py-2 border-2 rounded-xl bg-slate-100" />
            </div>
          </div>
        )}

        <div className="h-3 rounded-full overflow-hidden flex">
          <div className="bg-blue-500" style={{ width: `${useGlidePath ? (110 - currentAge) : stocksPercent}%` }} />
          <div className="bg-green-500" style={{ width: `${useGlidePath ? Math.min(60, currentAge - 20) : bondsPercent}%` }} />
          <div className="bg-yellow-400" style={{ width: `${useGlidePath ? 10 : cashPercent}%` }} />
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>Stocks</span><span>Bonds</span><span>Cash</span>
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <button onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between font-bold text-slate-800">
          <span className="flex items-center gap-2">
            <Settings size={20} className="text-slate-600" /> Advanced Settings
          </span>
          <span>{showAdvanced ? '−' : '+'}</span>
        </button>

        {showAdvanced && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Inflation Rate: {(inflationRate * 100).toFixed(1)}%</label>
              <input type="range" value={inflationRate * 100} onChange={(e) => setInflationRate(Number(e.target.value) / 100)}
                className="w-full" min={1} max={5} step={0.5} />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Tax Rate (marginal): {(taxRate * 100).toFixed(0)}%</label>
              <input type="range" value={taxRate * 100} onChange={(e) => setTaxRate(Number(e.target.value) / 100)}
                className="w-full" min={10} max={37} step={1} />
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={includeHealthcare} onChange={(e) => setIncludeHealthcare(e.target.checked)}
                  className="w-5 h-5 rounded" />
                <span>Include healthcare costs (2% above inflation)</span>
              </label>
            </div>
            {includeHealthcare && (
              <div>
                <label className="block text-sm text-slate-600 mb-1">Annual Healthcare Cost (today's $)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input type="number" value={healthcareCostBase} onChange={(e) => setHealthcareCostBase(e.target.value)}
                    placeholder="8,000" className="w-full pl-8 pr-4 py-2 border-2 rounded-xl" min={0} step={1000} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Run Button */}
      <button onClick={runSimulations} disabled={isRunning}
        className="w-full py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 disabled:opacity-50 transition-all shadow-lg">
        {isRunning ? (
          <>
            <RefreshCw size={24} className="animate-spin" />
            Running... {progress}%
          </>
        ) : (
          <>
            <Play size={24} />
            Run {SIMULATIONS.toLocaleString()} Simulations
          </>
        )}
      </button>

      {/* Progress bar */}
      {isRunning && (
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Results */}
      {results && (
        <>
          {/* Success Rate */}
          <div className={`rounded-2xl shadow-xl p-8 border-2 ${getSuccessBg(results.successRate)}`}>
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                {results.successRate >= 75 ? (
                  <CheckCircle2 size={40} className="text-green-600" />
                ) : (
                  <AlertCircle size={40} className={results.successRate >= 60 ? 'text-yellow-600' : 'text-red-600'} />
                )}
                <span className={`text-6xl font-black ${getSuccessColor(results.successRate)}`}>
                  {results.successRate.toFixed(1)}%
                </span>
              </div>
              <p className="text-xl font-bold text-slate-700">{getSuccessLabel(results.successRate)}</p>
              <p className="text-slate-600 mt-2">
                {results.successCount.toLocaleString()} of {results.totalSimulations.toLocaleString()} simulations succeeded
              </p>
              {results.avgDepletionAge && (
                <p className="text-sm text-red-600 mt-1">
                  Average depletion age when failed: {Math.round(results.avgDepletionAge)}
                </p>
              )}
            </div>
          </div>

          {/* Outcome Distribution */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="font-bold text-slate-800 mb-4">Projected Outcomes at Age {lifeExpectancy}</h3>
            <div className="grid grid-cols-5 gap-2 text-center">
              <div className="bg-red-50 rounded-xl p-3">
                <p className="text-xs text-slate-600">10th %</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(results.p10FinalBalance)}</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-3">
                <p className="text-xs text-slate-600">25th %</p>
                <p className="text-lg font-bold text-orange-600">{formatCurrency(results.p25FinalBalance)}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3">
                <p className="text-xs text-slate-600">Median</p>
                <p className="text-lg font-bold text-blue-600">{formatCurrency(results.medianFinalBalance)}</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3">
                <p className="text-xs text-slate-600">75th %</p>
                <p className="text-lg font-bold text-emerald-600">{formatCurrency(results.p75FinalBalance)}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3">
                <p className="text-xs text-slate-600">90th %</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(results.p90FinalBalance)}</p>
              </div>
            </div>
          </div>

          {/* Projection Chart */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="font-bold text-slate-800 mb-4">Portfolio Projection</h3>
            <div className="h-64 relative">
              <svg viewBox="0 0 100 50" className="w-full h-full" preserveAspectRatio="none">
                {[0, 25, 50, 75, 100].map((pct) => (
                  <line key={pct} x1="0" y1={50 - pct / 2} x2="100" y2={50 - pct / 2} stroke="#e2e8f0" strokeWidth="0.2" />
                ))}

                {/* Retirement line */}
                <line x1={((retirementAge - currentAge) / (lifeExpectancy - currentAge)) * 100} y1="0"
                  x2={((retirementAge - currentAge) / (lifeExpectancy - currentAge)) * 100} y2="50"
                  stroke="#9333ea" strokeWidth="0.3" strokeDasharray="1,1" />

                {/* Confidence bands */}
                {(() => {
                  const maxVal = Math.max(...results.p90Balances, 1);
                  const totalYears = results.avgBalances.length - 1;
                  return (
                    <>
                      <path d={`M 0 50 ${results.p90Balances.map((v, i) => `L ${(i / totalYears) * 100} ${50 - (v / maxVal) * 45}`).join(' ')} ${[...results.p10Balances].reverse().map((v, i) => `L ${((totalYears - i) / totalYears) * 100} ${50 - (v / maxVal) * 45}`).join(' ')} Z`}
                        fill="rgba(139, 92, 246, 0.15)" />
                      <path d={`M 0 50 ${results.p75Balances.map((v, i) => `L ${(i / totalYears) * 100} ${50 - (v / maxVal) * 45}`).join(' ')} ${[...results.p25Balances].reverse().map((v, i) => `L ${((totalYears - i) / totalYears) * 100} ${50 - (v / maxVal) * 45}`).join(' ')} Z`}
                        fill="rgba(139, 92, 246, 0.2)" />
                      <path d={results.p50Balances.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i / totalYears) * 100} ${50 - (v / maxVal) * 45}`).join(' ')}
                        fill="none" stroke="#8b5cf6" strokeWidth="1" />
                    </>
                  );
                })()}
              </svg>
              <div className="absolute bottom-0 left-0 text-xs text-slate-500">Age {currentAge}</div>
              <div className="absolute bottom-0 right-0 text-xs text-slate-500">Age {lifeExpectancy}</div>
              <div className="absolute bottom-0 text-xs text-purple-600 font-medium"
                style={{ left: `${((retirementAge - currentAge) / (lifeExpectancy - currentAge)) * 100}%`, transform: 'translateX(-50%)' }}>
                Retire
              </div>
            </div>
            <div className="flex justify-center gap-4 mt-4 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-purple-500 rounded"></span> Median</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-purple-300 rounded"></span> 25-75%</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-purple-100 rounded"></span> 10-90%</span>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="font-bold text-slate-800 mb-4">Analysis & Recommendations</h3>
            <div className="space-y-3">
              {results.successRate < 80 && (
                <>
                  <div className="flex gap-3 p-3 bg-amber-50 rounded-xl">
                    <AlertCircle className="text-amber-500 flex-shrink-0" size={20} />
                    <div>
                      <p className="font-medium text-amber-800">Consider increasing savings</p>
                      <p className="text-sm text-amber-700">
                        Adding {formatCurrency(annualContribution * 0.25)}/year could significantly improve your odds.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 p-3 bg-amber-50 rounded-xl">
                    <AlertCircle className="text-amber-500 flex-shrink-0" size={20} />
                    <div>
                      <p className="font-medium text-amber-800">Delay Social Security if possible</p>
                      <p className="text-sm text-amber-700">
                        Waiting until 70 increases your benefit by 24% over claiming at 67.
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
                      Consider a small buffer for unexpected expenses or longevity.
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
                      You may have room to retire earlier or increase spending.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 p-3 bg-slate-50 rounded-xl">
                <Info className="text-slate-500 flex-shrink-0" size={20} />
                <p className="text-sm text-slate-600">
                  This simulation uses real return assumptions (after inflation), correlated asset returns,
                  tax-aware withdrawal strategies, and RMD requirements. For personalized advice, consult a financial advisor.
                </p>
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
  const [activeTab, setActiveTab] = useState('montecarlo');

  const tabs = [
    { id: 'montecarlo', label: 'Monte Carlo', icon: Zap },
    { id: 'investment', label: 'Investment', icon: TrendingUp },
    { id: 'needs', label: 'Retirement Needs', icon: Target },
    { id: 'nestegg', label: 'Nest Egg', icon: Wallet },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-xl p-2">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[100px] px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}>
                <Icon size={18} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'montecarlo' && <MonteCarloSimulator />}
      {activeTab === 'investment' && <InvestmentCalculator />}
      {activeTab === 'needs' && <RetirementNeedsCalculator />}
      {activeTab === 'nestegg' && <NestEggCalculator />}
    </div>
  );
};

export default Retirement;
