export const DEFAULT_SIMULATION_COUNT = 10000;

export const HISTORICAL_RETURNS = {
  stocks: { mean: 0.10, stdDev: 0.17 },
  bonds: { mean: 0.05, stdDev: 0.05 },
  cash: { mean: 0.03, stdDev: 0.01 },
};

export const CORRELATION = {
  stocksBonds: 0.2,
  stocksCash: 0.0,
  bondsCash: 0.3,
};

export const SS_ADJUSTMENT = {
  62: 0.70,
  63: 0.75,
  64: 0.80,
  65: 0.867,
  66: 0.933,
  67: 1.00,
  68: 1.08,
  69: 1.16,
  70: 1.24,
};

export const RMD_FACTORS = {
  72: 27.4, 73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9,
  78: 22.0, 79: 21.1, 80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7,
  84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4, 88: 13.7, 89: 12.9,
  90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9,
};

export const HEALTHCARE_INCREASE = 0.02;

export const HISTORICAL_ANNUAL = [
  [0.1898,0.0569,0.0384],[-.1466,-.0111,0.0693],[-.2647,-.0306,0.0800],[0.3720,0.0920,0.0580],
  [0.2384,0.1675,0.0508],[-.0718,-.0069,0.0512],[0.0656,-.0118,0.0718],[0.1844,-.0123,0.1038],
  [0.3242,-.0395,0.1124],[-.0491,0.0186,0.1471],[0.2141,0.3262,0.1054],[0.2251,0.0819,0.0880],
  [0.0627,0.1515,0.0985],[0.3216,0.2210,0.0772],[0.1847,0.1526,0.0616],[0.0523,0.0276,0.0547],
  [0.1681,0.0789,0.0635],[0.3149,0.1453,0.0837],[-.0317,0.0896,0.0781],[0.3055,0.1600,0.0560],
  [0.0767,0.0740,0.0351],[0.0999,0.0975,0.0290],[0.0131,-.0292,0.0390],[0.3743,0.1847,0.0560],
  [0.2307,0.0363,0.0521],[0.3336,0.0965,0.0526],[0.2858,0.0869,0.0486],[0.2104,-.0082,0.0468],
  [-.0911,0.1163,0.0589],[-.1189,0.0844,0.0383],[-.2210,0.1026,0.0165],[0.2868,0.0410,0.0102],
  [0.1088,0.0434,0.0120],[0.0491,0.0243,0.0298],[0.1579,0.0433,0.0480],[0.0549,0.0697,0.0466],
  [-.3700,0.0524,0.0160],[0.2646,0.0593,0.0010],[0.1506,0.0654,0.0012],[0.0211,0.0784,0.0004],
  [0.1600,0.0421,0.0006],[0.3239,-.0202,0.0002],[0.1369,0.0597,0.0002],[0.0138,0.0055,0.0002],
  [0.1196,0.0265,0.0027],[0.2183,0.0354,0.0086],[-.0438,0.0001,0.0187],[0.3149,0.0872,0.0228],
  [0.1840,0.0751,0.0058],[0.2871,-.0154,0.0005],[-.1811,-.1301,0.0146],[0.2629,0.0553,0.0526],
  [0.2502,0.0125,0.0500],
];

/** @typedef {{ stocks: { mean: number, stdDev: number }, bonds: { mean: number, stdDev: number }, cash: { mean: number, stdDev: number } }} ReturnAssumptions */
/** @typedef {{ currentAge: number, retirementAge: number, lifeExpectancy: number, traditionalBalance: number, rothBalance: number, taxableBalance: number, annualContribution: number, contributionType: 'traditional'|'roth'|'split', annualSpending: number, ssBaseBenefit: number, ssClaimingAge: number, stocksPercent: number, bondsPercent: number, useGlidePath: boolean, inflationRate: number, taxRate?: number, includeHealthcare: boolean, healthcareCostBase: number, simulationModel: 'historical'|'parameterized'|'stochastic', customReturns: ReturnAssumptions | null, withdrawalModel: 'fixed'|'percentage'|'lifeExpectancy', withdrawalPercent: number }} SimulationParams */
/** @typedef {{ success: boolean, finalBalance: number, yearlyBalances: number[], depletedAtAge: number|null, finalTraditional: number, finalRoth: number, finalTaxable: number }} SimulationRunResult */
/** @typedef {{ successRate: number, successCount: number, totalSimulations: number, medianFinalBalance: number, p10FinalBalance: number, p25FinalBalance: number, p75FinalBalance: number, p90FinalBalance: number, avgBalances: number[], p10Balances: number[], p25Balances: number[], p50Balances: number[], p75Balances: number[], p90Balances: number[], avgDepletionAge: number|null, depletionCount: number }} MonteCarloSummary */

export const randomNormal = (mean, stdDev) => {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + stdDev * z;
};

export const generateCorrelatedReturns = (customReturns) => {
  const z1 = randomNormal(0, 1);
  const z2 = randomNormal(0, 1);
  const z3 = randomNormal(0, 1);

  const stockZ = z1;
  const bondZ = CORRELATION.stocksBonds * z1 + Math.sqrt(1 - CORRELATION.stocksBonds ** 2) * z2;
  const cashZ = z3;

  const sr = customReturns || HISTORICAL_RETURNS;
  const stockReturn = sr.stocks.mean + sr.stocks.stdDev * stockZ;
  const bondReturn = sr.bonds.mean + sr.bonds.stdDev * bondZ;
  const cashReturn = sr.cash.mean + sr.cash.stdDev * cashZ;

  return { stockReturn, bondReturn, cashReturn };
};

export const generateHistoricalReturns = () => {
  const idx = Math.floor(Math.random() * HISTORICAL_ANNUAL.length);
  const [stockReturn, bondReturn, cashReturn] = HISTORICAL_ANNUAL[idx];
  return { stockReturn, bondReturn, cashReturn };
};

export const getGlidePath = (age, retirementAge, useGlidePath) => {
  if (!useGlidePath) return null;

  let stocksPercent;
  if (age < retirementAge) {
    stocksPercent = Math.max(20, Math.min(90, 110 - age));
  } else {
    stocksPercent = Math.max(30, Math.min(70, 100 - age));
  }

  const bondsPercent = Math.min(60, 100 - stocksPercent - 10);
  const cashPercent = 100 - stocksPercent - bondsPercent;

  return { stocksPercent, bondsPercent, cashPercent };
};

export const calculateRMD = (age, traditionalBalance, birthYear) => {
  const rmdStartAge = (birthYear && (birthYear + 73) >= 2033) ? 75 : 73;
  if (age < rmdStartAge || !RMD_FACTORS[age]) return 0;
  return traditionalBalance / RMD_FACTORS[age];
};

export const calculateSocialSecurity = (baseBenefit, claimingAge, currentAge) => {
  if (currentAge < claimingAge) return 0;
  const adjustment = SS_ADJUSTMENT[claimingAge] || 1.0;
  return baseBenefit * adjustment;
};

/** @param {SimulationParams} params @returns {SimulationRunResult} */
export const runEnhancedSimulation = (params) => {
  const {
    currentAge, retirementAge, lifeExpectancy,
    traditionalBalance, rothBalance, taxableBalance,
    annualContribution, contributionType,
    annualSpending, ssBaseBenefit, ssClaimingAge,
    stocksPercent, bondsPercent, useGlidePath,
    inflationRate, includeHealthcare,
    healthcareCostBase,
    simulationModel, customReturns,
    withdrawalModel, withdrawalPercent,
  } = params;

  const totalYears = lifeExpectancy - currentAge;
  let traditional = traditionalBalance;
  let roth = rothBalance;
  let taxable = taxableBalance;

  const yearlyBalances = [traditional + roth + taxable];
  let cumulativeInflation = 1;
  let healthcareCost = healthcareCostBase;

  for (let year = 1; year <= totalYears; year++) {
    const age = currentAge + year;
    const isRetired = age >= retirementAge;

    cumulativeInflation *= (1 + inflationRate);

    if (includeHealthcare) {
      healthcareCost *= (1 + inflationRate + HEALTHCARE_INCREASE);
    }

    const allocation = useGlidePath
      ? getGlidePath(age, retirementAge, true)
      : { stocksPercent, bondsPercent, cashPercent: 100 - stocksPercent - bondsPercent };

    const { stockReturn, bondReturn, cashReturn } = simulationModel === 'historical'
      ? generateHistoricalReturns()
      : generateCorrelatedReturns(simulationModel === 'parameterized' ? customReturns : null);

    const portfolioReturn =
      (allocation.stocksPercent / 100) * stockReturn +
      (allocation.bondsPercent / 100) * bondReturn +
      (allocation.cashPercent / 100) * cashReturn;

    traditional *= (1 + portfolioReturn);
    roth *= (1 + portfolioReturn);
    taxable *= (1 + portfolioReturn);

    if (isRetired) {
      const totalPortfolio = traditional + roth + taxable;
      const remainingYears = lifeExpectancy - age;
      let requiredSpending;

      if (withdrawalModel === 'percentage') {
        requiredSpending = totalPortfolio * ((withdrawalPercent || 4) / 100);
      } else if (withdrawalModel === 'lifeExpectancy') {
        requiredSpending = remainingYears > 0 ? totalPortfolio / remainingYears : totalPortfolio;
      } else {
        requiredSpending = annualSpending * cumulativeInflation;
      }

      if (includeHealthcare) {
        requiredSpending += healthcareCost;
      }

      const ssIncome = calculateSocialSecurity(ssBaseBenefit, ssClaimingAge, age) * cumulativeInflation;
      requiredSpending = Math.max(0, requiredSpending - ssIncome);

      const birthYear = new Date().getFullYear() - currentAge;
      const rmd = calculateRMD(age, traditional, birthYear);

      let remaining = requiredSpending;
      if (rmd > 0) {
        traditional -= rmd;
        remaining -= rmd;
      }

      if (remaining > 0 && taxable > 0) {
        const taxableWithdrawal = Math.min(taxable, remaining);
        taxable -= taxableWithdrawal;
        remaining -= taxableWithdrawal;
      }

      if (remaining > 0 && traditional > 0) {
        const tradWithdrawal = Math.min(traditional, remaining);
        traditional -= tradWithdrawal;
        remaining -= tradWithdrawal;
      }

      if (remaining > 0 && roth > 0) {
        const rothWithdrawal = Math.min(roth, remaining);
        roth -= rothWithdrawal;
        remaining -= rothWithdrawal;
      }

      if (remaining > 0) {
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
      const contribution = annualContribution * cumulativeInflation;
      if (contributionType === 'traditional') {
        traditional += contribution;
      } else if (contributionType === 'roth') {
        roth += contribution;
      } else {
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

export const getPercentileValue = (sortedValues, percentile) => {
  if (sortedValues.length === 0) return 0;
  const index = Math.floor((percentile / 100) * sortedValues.length);
  return sortedValues[Math.min(index, sortedValues.length - 1)] || 0;
};

/** @param {SimulationParams} params @param {(progress: number) => void} [progressCallback] @param {number} [simulationCount] @returns {MonteCarloSummary} */
export const runEnhancedMonteCarloSimulation = (params, progressCallback, simulationCount = DEFAULT_SIMULATION_COUNT) => {
  const results = [];
  const batchSize = 1000;

  for (let i = 0; i < simulationCount; i++) {
    results.push(runEnhancedSimulation(params));
    if (progressCallback && i % batchSize === 0) {
      progressCallback(Math.round((i / simulationCount) * 100));
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const successRate = (successCount / simulationCount) * 100;

  const finalBalances = results.map((r) => r.finalBalance).sort((a, b) => a - b);

  const totalYears = params.lifeExpectancy - params.currentAge;
  const avgBalances = [];
  const p10Balances = [];
  const p25Balances = [];
  const p50Balances = [];
  const p75Balances = [];
  const p90Balances = [];

  for (let year = 0; year <= totalYears; year++) {
    const yearBalances = results.map((r) => r.yearlyBalances[year] || 0).sort((a, b) => a - b);
    avgBalances.push(yearBalances.reduce((a, b) => a + b, 0) / simulationCount);
    p10Balances.push(getPercentileValue(yearBalances, 10));
    p25Balances.push(getPercentileValue(yearBalances, 25));
    p50Balances.push(getPercentileValue(yearBalances, 50));
    p75Balances.push(getPercentileValue(yearBalances, 75));
    p90Balances.push(getPercentileValue(yearBalances, 90));
  }

  const depletionAges = results.filter((r) => !r.success).map((r) => r.depletedAtAge);
  const avgDepletionAge = depletionAges.length > 0
    ? depletionAges.reduce((a, b) => a + b, 0) / depletionAges.length
    : null;

  return {
    successRate,
    successCount,
    totalSimulations: simulationCount,
    medianFinalBalance: getPercentileValue(finalBalances, 50),
    p10FinalBalance: getPercentileValue(finalBalances, 10),
    p25FinalBalance: getPercentileValue(finalBalances, 25),
    p75FinalBalance: getPercentileValue(finalBalances, 75),
    p90FinalBalance: getPercentileValue(finalBalances, 90),
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
