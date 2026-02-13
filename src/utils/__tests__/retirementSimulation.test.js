import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRMD,
  getPercentileValue,
  runEnhancedSimulation,
  runEnhancedMonteCarloSimulation,
} from '../retirementSimulation.js';

const baseParams = {
  currentAge: 65,
  retirementAge: 65,
  lifeExpectancy: 66,
  traditionalBalance: 100,
  rothBalance: 20,
  taxableBalance: 30,
  annualContribution: 0,
  contributionType: 'split',
  annualSpending: 50,
  ssBaseBenefit: 0,
  ssClaimingAge: 67,
  stocksPercent: 60,
  bondsPercent: 30,
  useGlidePath: false,
  inflationRate: 0,
  taxRate: 0,
  includeHealthcare: false,
  healthcareCostBase: 0,
  simulationModel: 'parameterized',
  customReturns: {
    stocks: { mean: 0, stdDev: 0 },
    bonds: { mean: 0, stdDev: 0 },
    cash: { mean: 0, stdDev: 0 },
  },
  withdrawalModel: 'fixed',
  withdrawalPercent: 4,
};

test('depletes portfolio and reports depletion age when spending exceeds assets', () => {
  const result = runEnhancedSimulation({
    ...baseParams,
    traditionalBalance: 10,
    rothBalance: 0,
    taxableBalance: 0,
    annualSpending: 100,
    lifeExpectancy: 70,
  });

  assert.equal(result.success, false);
  assert.equal(result.depletedAtAge, 66);
  assert.equal(result.finalBalance, 0);
  assert.equal(result.yearlyBalances[result.yearlyBalances.length - 1], 0);
});

test('withdraws from taxable before traditional then roth', () => {
  const result = runEnhancedSimulation(baseParams);

  assert.equal(result.success, true);
  assert.equal(result.finalTaxable, 0);
  assert.equal(result.finalTraditional, 80);
  assert.equal(result.finalRoth, 20);
  assert.equal(result.finalBalance, 100);
});

test('computes quantiles from sorted arrays', () => {
  const values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  assert.equal(getPercentileValue(values, 10), 1);
  assert.equal(getPercentileValue(values, 50), 5);
  assert.equal(getPercentileValue(values, 90), 9);
});

test('applies RMD at age thresholds based on birth year', () => {
  assert.equal(calculateRMD(74, 255, 1955).toFixed(6), '10.000000');
  assert.equal(calculateRMD(74, 255, 1965), 0);
  assert.equal(calculateRMD(75, 246, 1965).toFixed(6), '10.000000');
});

test('subtracts RMD from traditional balance even with zero spending needs', () => {
  const originalRandom = Math.random;
  Math.random = () => 0.5;

  try {
    const result = runEnhancedSimulation({
      ...baseParams,
      currentAge: 73,
      retirementAge: 60,
      lifeExpectancy: 74,
      traditionalBalance: 255,
      rothBalance: 0,
      taxableBalance: 0,
      annualSpending: 0,
    });

    assert.equal(result.success, true);
    assert.equal(result.finalTraditional.toFixed(6), '245.000000');
  } finally {
    Math.random = originalRandom;
  }
});

test('aggregates monte carlo outcomes and depletion counts', () => {
  const originalRandom = Math.random;
  Math.random = () => 0.5;

  try {
    const summary = runEnhancedMonteCarloSimulation(
      {
        ...baseParams,
        traditionalBalance: 5,
        rothBalance: 0,
        taxableBalance: 0,
        annualSpending: 50,
        lifeExpectancy: 67,
      },
      undefined,
      20,
    );

    assert.equal(summary.totalSimulations, 20);
    assert.equal(summary.successRate, 0);
    assert.equal(summary.depletionCount, 20);
    assert.equal(summary.p50Balances.length, 3);
    assert.equal(summary.p90FinalBalance, 0);
  } finally {
    Math.random = originalRandom;
  }
});
