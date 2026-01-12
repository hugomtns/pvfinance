/**
 * Integration tests for SolarFinanceCalculator
 *
 * Tests the complete calculation chain and validates output structure
 */

import { describe, it, expect } from 'vitest';
import { SolarFinanceCalculator } from './calculator';
import { DEFAULT_INPUTS } from '../../types';

describe('SolarFinanceCalculator', () => {
  describe('Basic Calculation Flow', () => {
    it('should instantiate with valid inputs', () => {
      const calculator = new SolarFinanceCalculator(DEFAULT_INPUTS);
      expect(calculator).toBeInstanceOf(SolarFinanceCalculator);
    });

    it('should throw error if capex_per_mw missing without cost_items', () => {
      const invalidInputs = {
        ...DEFAULT_INPUTS,
        capex_per_mw: undefined
      };

      expect(() => new SolarFinanceCalculator(invalidInputs as any)).toThrow();
    });

    it('should throw error if om_cost_per_mw_year missing without cost_items', () => {
      const invalidInputs = {
        ...DEFAULT_INPUTS,
        om_cost_per_mw_year: undefined
      };

      expect(() => new SolarFinanceCalculator(invalidInputs as any)).toThrow();
    });
  });

  describe('Intermediate Calculations', () => {
    const calculator = new SolarFinanceCalculator(DEFAULT_INPUTS);

    it('should calculate capacity factor', () => {
      const cf = calculator.calcCapacityFactor();
      expect(cf).toBeGreaterThan(0);
      expect(cf).toBeLessThan(1);
      // For 300 MW with 577,920 MWh yield: CF = 577920 / (300 × 8760) = 0.22
      expect(cf).toBeCloseTo(0.22, 2);
    });

    it('should calculate total CapEx', () => {
      const capex = calculator.calcTotalCapEx();
      // 300 MW × 850,000 €/MW = 255,000,000 €
      expect(capex).toBe(255_000_000);
    });

    it('should calculate energy with degradation', () => {
      const year1 = calculator.calcEnergyYearT(1);
      const year2 = calculator.calcEnergyYearT(2);

      // Year 1 should equal P50 Year 0 Yield
      expect(year1).toBe(DEFAULT_INPUTS.p50_year_0_yield);

      // Year 2 should be degraded
      expect(year2).toBeLessThan(year1);
      expect(year2).toBeCloseTo(year1 * (1 - DEFAULT_INPUTS.degradation_rate), 2);
    });

    it('should calculate revenue with PPA escalation', () => {
      const year1Revenue = calculator.calcRevenueYearT(1);
      const year2Revenue = calculator.calcRevenueYearT(2);

      // Revenue should be positive
      expect(year1Revenue).toBeGreaterThan(0);

      // With 0% PPA escalation but degradation, year 2 revenue should be slightly less
      expect(year2Revenue).toBeLessThan(year1Revenue);
    });

    it('should calculate O&M with escalation', () => {
      const year1OM = calculator.calcOMYearT(1);
      const year2OM = calculator.calcOMYearT(2);

      // O&M should be positive
      expect(year1OM).toBeGreaterThan(0);

      // With 1% O&M escalation, year 2 should be higher
      expect(year2OM).toBeGreaterThan(year1OM);
      expect(year2OM).toBeCloseTo(year1OM * 1.01, 2);
    });

    it('should calculate EBITDA', () => {
      const ebitda = calculator.calcEBITDAYearT(1);
      const revenue = calculator.calcRevenueYearT(1);
      const om = calculator.calcOMYearT(1);

      expect(ebitda).toBe(revenue - om);
      expect(ebitda).toBeGreaterThan(0);
    });

    it('should calculate CFADS (after-tax EBITDA)', () => {
      const cfads = calculator.calcCFADSYearT(1);
      const ebitda = calculator.calcEBITDAYearT(1);

      // CFADS = EBITDA × (1 - Tax Rate)
      expect(cfads).toBeCloseTo(ebitda * 0.75, 2); // 25% tax
    });
  });

  describe('Financing Structure', () => {
    const calculator = new SolarFinanceCalculator(DEFAULT_INPUTS);

    it('should calculate PV of CFADS', () => {
      const pvCfads = calculator.calcPVofCFADS();
      expect(pvCfads).toBeGreaterThan(0);
    });

    it('should calculate max debt by DSCR', () => {
      const maxDebt = calculator.calcMaxDebtByDSCR();
      expect(maxDebt).toBeGreaterThan(0);
    });

    it('should calculate max debt by Gearing', () => {
      const maxDebt = calculator.calcMaxDebtByGearing();
      const totalCapex = calculator.calcTotalCapEx();

      // Should be 75% of CapEx
      expect(maxDebt).toBeCloseTo(totalCapex * 0.75, 2);
    });

    it('should determine binding constraint', () => {
      const maxDebtDSCR = calculator.calcMaxDebtByDSCR();
      const maxDebtGearing = calculator.calcMaxDebtByGearing();
      const finalDebt = calculator.calcFinalDebt();

      // Final debt should be the minimum of the two
      expect(finalDebt).toBe(Math.min(maxDebtDSCR, maxDebtGearing));
    });

    it('should calculate equity', () => {
      const equity = calculator.calcEquity();
      const totalCapex = calculator.calcTotalCapEx();
      const finalDebt = calculator.calcFinalDebt();

      expect(equity).toBe(totalCapex - finalDebt);
      expect(equity).toBeGreaterThan(0);
    });

    it('should calculate annual debt service', () => {
      const annualDS = calculator.calcAnnualDebtService();
      expect(annualDS).toBeGreaterThan(0);
    });

    it('should calculate DSCR', () => {
      const dscr1 = calculator.calcDSCRYearT(1);
      const dscr16 = calculator.calcDSCRYearT(16); // After debt tenor

      expect(dscr1).toBeGreaterThan(1); // Should meet minimum DSCR
      expect(dscr16).toBeNull(); // No debt service after tenor
    });
  });

  describe('Key Metrics', () => {
    const calculator = new SolarFinanceCalculator(DEFAULT_INPUTS);

    it('should calculate Project IRR', () => {
      const projectIRR = calculator.calcProjectIRR();

      expect(projectIRR).toBeGreaterThan(0);
      expect(projectIRR).toBeLessThan(0.20); // Should be reasonable (< 20%)

      // For a good solar project, should be around 6-10%
      expect(projectIRR).toBeGreaterThan(0.06);
      expect(projectIRR).toBeLessThan(0.12);
    });

    it('should calculate Equity IRR', () => {
      const equityIRR = calculator.calcEquityIRR();

      expect(equityIRR).toBeGreaterThan(0);
      // Equity IRR should be higher than Project IRR due to leverage
      const projectIRR = calculator.calcProjectIRR();
      expect(equityIRR).toBeGreaterThan(projectIRR);
    });

    it('should calculate LCOE', () => {
      const lcoe = calculator.calcLCOE();

      expect(lcoe).toBeGreaterThan(0);
      // For typical solar, LCOE should be 30-80 €/MWh
      expect(lcoe).toBeGreaterThan(30);
      expect(lcoe).toBeLessThan(100);
    });

    it('should calculate minimum DSCR', () => {
      const minDSCR = calculator.calcMinimumDSCR();

      expect(minDSCR).not.toBeNull();
      expect(minDSCR!).toBeGreaterThan(1); // Should be above 1.0
    });

    it('should calculate average DSCR', () => {
      const avgDSCR = calculator.calcAverageDSCR();

      expect(avgDSCR).not.toBeNull();
      expect(avgDSCR!).toBeGreaterThan(1);
    });

    it('should calculate Project NPV', () => {
      const projectNPV = calculator.calcProjectNPV();

      // NPV can be positive or negative depending on discount rate
      expect(projectNPV).toBeDefined();
      expect(!isNaN(projectNPV)).toBe(true);
    });
  });

  describe('Summary Report Generation', () => {
    const calculator = new SolarFinanceCalculator(DEFAULT_INPUTS);

    it('should generate complete summary report', () => {
      const summary = calculator.generateSummaryReport();

      // Check all sections exist
      expect(summary.project_summary).toBeDefined();
      expect(summary.financing_structure).toBeDefined();
      expect(summary.key_metrics).toBeDefined();
      expect(summary.first_year_operations).toBeDefined();
      expect(summary.assessment).toBeDefined();
    });

    it('should have correct project summary structure', () => {
      const summary = calculator.generateSummaryReport();
      const ps = summary.project_summary;

      expect(ps.capacity_mw).toBe(DEFAULT_INPUTS.capacity);
      expect(ps.capacity_factor).toBeGreaterThan(0);
      expect(ps.p50_year_0_yield_mwh).toBe(DEFAULT_INPUTS.p50_year_0_yield);
      expect(ps.project_lifetime).toBe(DEFAULT_INPUTS.project_lifetime);
      expect(ps.total_capex).toBeGreaterThan(0);
      expect(ps.capex_per_mw).toBe(DEFAULT_INPUTS.capex_per_mw);
    });

    it('should have correct financing structure', () => {
      const summary = calculator.generateSummaryReport();
      const fs = summary.financing_structure;

      expect(fs.max_debt_by_dscr).toBeGreaterThan(0);
      expect(fs.max_debt_by_gearing).toBeGreaterThan(0);
      expect(fs.final_debt).toBeGreaterThan(0);
      expect(fs.equity).toBeGreaterThan(0);
      expect(fs.actual_gearing).toBeGreaterThan(0);
      expect(fs.actual_gearing).toBeLessThanOrEqual(1);
      expect(fs.binding_constraint).toMatch(/DSCR|Gearing/);
      expect(fs.interest_rate).toBe(DEFAULT_INPUTS.interest_rate);
      expect(fs.debt_tenor).toBe(DEFAULT_INPUTS.debt_tenor);
      expect(fs.annual_debt_service).toBeGreaterThan(0);
    });

    it('should have correct key metrics', () => {
      const summary = calculator.generateSummaryReport();
      const km = summary.key_metrics;

      expect(km.project_irr).toBeGreaterThan(0);
      expect(km.equity_irr).toBeGreaterThan(0);
      expect(km.lcoe).toBeGreaterThan(0);
      expect(km.min_dscr).toBeGreaterThan(1);
      expect(km.avg_dscr).toBeGreaterThan(1);
      expect(km.ppa_price).toBe(DEFAULT_INPUTS.ppa_price);
    });

    it('should have correct first year operations', () => {
      const summary = calculator.generateSummaryReport();
      const fyo = summary.first_year_operations;

      expect(fyo.energy_production_mwh).toBeGreaterThan(0);
      expect(fyo.revenue).toBeGreaterThan(0);
      expect(fyo.om_costs).toBeGreaterThan(0);
      expect(fyo.ebitda).toBeGreaterThan(0);
      expect(fyo.cfads).toBeGreaterThan(0);
    });

    it('should have assessment with all fields', () => {
      const summary = calculator.generateSummaryReport();
      const assessment = summary.assessment;

      expect(assessment.project_irr).toBeDefined();
      expect(assessment.equity_irr).toBeDefined();
      expect(assessment.dscr).toBeDefined();
      expect(assessment.overall).toBeDefined();

      // Should contain percentage values
      expect(assessment.project_irr).toContain('%');
      expect(assessment.equity_irr).toContain('%');
    });
  });

  describe('Yearly Data Generation', () => {
    const calculator = new SolarFinanceCalculator(DEFAULT_INPUTS);

    it('should generate yearly data for all years', () => {
      const yearlyData = calculator.generateYearlyData();

      expect(yearlyData.years.length).toBe(DEFAULT_INPUTS.project_lifetime);
      expect(yearlyData.energy_production_mwh.length).toBe(DEFAULT_INPUTS.project_lifetime);
      expect(yearlyData.revenue.length).toBe(DEFAULT_INPUTS.project_lifetime);
      expect(yearlyData.om_costs.length).toBe(DEFAULT_INPUTS.project_lifetime);
      expect(yearlyData.ebitda.length).toBe(DEFAULT_INPUTS.project_lifetime);
      expect(yearlyData.cfads.length).toBe(DEFAULT_INPUTS.project_lifetime);
      expect(yearlyData.fcf_to_equity.length).toBe(DEFAULT_INPUTS.project_lifetime);
      expect(yearlyData.debt_service.length).toBe(DEFAULT_INPUTS.project_lifetime);
      expect(yearlyData.dscr.length).toBe(DEFAULT_INPUTS.project_lifetime);
      expect(yearlyData.cumulative_fcf_to_equity.length).toBe(DEFAULT_INPUTS.project_lifetime);
    });

    it('should have descending energy production (degradation)', () => {
      const yearlyData = calculator.generateYearlyData();

      for (let i = 1; i < yearlyData.energy_production_mwh.length; i++) {
        expect(yearlyData.energy_production_mwh[i]).toBeLessThan(
          yearlyData.energy_production_mwh[i - 1]
        );
      }
    });

    it('should have debt service only during debt tenor', () => {
      const yearlyData = calculator.generateYearlyData();

      // During debt tenor, should have debt service
      for (let i = 0; i < DEFAULT_INPUTS.debt_tenor; i++) {
        expect(yearlyData.debt_service[i]).toBeGreaterThan(0);
        expect(yearlyData.dscr[i]).not.toBeNull();
      }

      // After debt tenor, should be zero
      for (let i = DEFAULT_INPUTS.debt_tenor; i < yearlyData.debt_service.length; i++) {
        expect(yearlyData.debt_service[i]).toBe(0);
        expect(yearlyData.dscr[i]).toBeNull();
      }
    });

    it('should have cumulative FCF increasing', () => {
      const yearlyData = calculator.generateYearlyData();

      // Cumulative FCF should generally increase (though could be negative early on)
      const lastYear = yearlyData.cumulative_fcf_to_equity[yearlyData.years.length - 1];
      expect(lastYear).toBeGreaterThan(0); // Should be positive by end of project
    });
  });

  describe('Cost Items Mode', () => {
    it('should handle cost_items and convert to per-MW values', () => {
      const inputsWithCostItems = {
        ...DEFAULT_INPUTS,
        capex_per_mw: undefined, // Not provided
        om_cost_per_mw_year: undefined, // Not provided
        cost_items: [
          {
            name: 'Solar Panels',
            amount: 150_000_000,
            is_capex: true,
            unit_price: 0.15,
            quantity: 1_000_000_000
          },
          {
            name: 'Inverters',
            amount: 50_000_000,
            is_capex: true,
            unit_price: 50_000,
            quantity: 1000
          },
          {
            name: 'O&M',
            amount: 3_600_000,
            is_capex: false
          }
        ]
      };

      const calculator = new SolarFinanceCalculator(inputsWithCostItems as any);

      // Total CapEx = 150M + 50M = 200M
      // CapEx per MW = 200M / 300 MW = 666,667 €/MW
      const totalCapex = calculator.calcTotalCapEx();
      expect(totalCapex).toBeCloseTo(200_000_000, -3);

      // Total OpEx = 3.6M
      // OpEx per MW = 3.6M / 300 MW = 12,000 €/MW-year
      const year1OM = calculator.calcOMYearT(1);
      expect(year1OM).toBeCloseTo(3_600_000, -2);
    });

    it('should throw error if cost_items total CapEx is zero', () => {
      const invalidInputs = {
        ...DEFAULT_INPUTS,
        capex_per_mw: undefined,
        cost_items: [
          {
            name: 'O&M',
            amount: 3_600_000,
            is_capex: false
          }
        ]
      };

      expect(() => new SolarFinanceCalculator(invalidInputs as any)).toThrow('Total CapEx must be greater than 0');
    });

    it('should throw error if cost_items total OpEx is zero', () => {
      const invalidInputs = {
        ...DEFAULT_INPUTS,
        om_cost_per_mw_year: undefined,
        cost_items: [
          {
            name: 'Solar Panels',
            amount: 150_000_000,
            is_capex: true
          }
        ]
      };

      expect(() => new SolarFinanceCalculator(invalidInputs as any)).toThrow('Total OpEx must be greater than 0');
    });
  });

  describe('Performance', () => {
    it('should calculate 300 MW project quickly', () => {
      const start = performance.now();
      const calculator = new SolarFinanceCalculator(DEFAULT_INPUTS);
      const summary = calculator.generateSummaryReport();
      const yearlyData = calculator.generateYearlyData();
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50); // Should complete in < 50ms
      expect(summary).toBeDefined();
      expect(yearlyData).toBeDefined();
    });
  });
});
