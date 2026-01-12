/**
 * Solar Finance Calculator
 *
 * TypeScript implementation of 23-step financial model for utility-scale solar projects
 * Ported from original Python calculator
 */

import { irr, pmt } from './financial';
import type { ProjectInputs, ProjectResults, ProjectSummary, FinancingStructure, KeyMetrics, FirstYearOperations, Assessment, YearlyData } from '../../types';

export class SolarFinanceCalculator {
  private inputs: ProjectInputs;

  constructor(inputs: ProjectInputs) {
    // Preprocess inputs (handle cost_items if provided)
    this.inputs = this.preprocessInputs(inputs);
  }

  /**
   * Preprocess inputs: handle cost_items mode
   * If cost_items provided, sum them and convert to per-MW values
   */
  private preprocessInputs(inputs: ProjectInputs): ProjectInputs {
    if (inputs.cost_items && inputs.cost_items.length > 0) {
      // Sum CapEx items
      const totalCapex = inputs.cost_items
        .filter(item => item.is_capex)
        .reduce((sum, item) => sum + item.amount, 0);

      // Sum OpEx items
      const totalOpex = inputs.cost_items
        .filter(item => !item.is_capex)
        .reduce((sum, item) => sum + item.amount, 0);

      // Validate minimums
      if (totalCapex <= 0) {
        throw new Error('Total CapEx must be greater than 0');
      }
      if (totalOpex <= 0) {
        throw new Error('Total OpEx must be greater than 0');
      }

      // Convert to per-MW values
      return {
        ...inputs,
        capex_per_mw: totalCapex / inputs.capacity,
        om_cost_per_mw_year: totalOpex / inputs.capacity
      };
    }

    // Validate required fields if not using cost_items
    if (!inputs.capex_per_mw || inputs.capex_per_mw <= 0) {
      throw new Error('capex_per_mw is required and must be greater than 0');
    }
    if (!inputs.om_cost_per_mw_year || inputs.om_cost_per_mw_year <= 0) {
      throw new Error('om_cost_per_mw_year is required and must be greater than 0');
    }

    return inputs;
  }

  // =================================================================
  // INTERMEDIATE CALCULATIONS
  // =================================================================

  /**
   * Derived Capacity Factor = P50_Year_0_Yield / (Capacity × 8760)
   */
  calcCapacityFactor(): number {
    return this.inputs.p50_year_0_yield / (this.inputs.capacity * 8760);
  }

  /**
   * 1. Total CapEx = Capacity × CapEx_per_MW
   */
  calcTotalCapEx(): number {
    return this.inputs.capacity * this.inputs.capex_per_mw!;
  }

  /**
   * 2. Energy production for year t with degradation
   * Energy = P50_Year_0_Yield × (1 - Degradation)^(year-1)
   */
  calcEnergyYearT(year: number): number {
    return this.inputs.p50_year_0_yield * Math.pow(1 - this.inputs.degradation_rate, year - 1);
  }

  /**
   * 3. Revenue for year t with PPA escalation
   * Revenue = Energy × PPA_Price × (1 + Escalation)^(year-1)
   */
  calcRevenueYearT(year: number): number {
    const energy = this.calcEnergyYearT(year);
    return energy * this.inputs.ppa_price * Math.pow(1 + this.inputs.ppa_escalation, year - 1);
  }

  /**
   * 4. O&M costs for year t with escalation
   * OM = Capacity × OM_Cost × (1 + Escalation)^(year-1)
   */
  calcOMYearT(year: number): number {
    return this.inputs.capacity * this.inputs.om_cost_per_mw_year! *
           Math.pow(1 + this.inputs.om_escalation, year - 1);
  }

  /**
   * 5. EBITDA for year t
   * EBITDA = Revenue - OM
   */
  calcEBITDAYearT(year: number): number {
    const revenue = this.calcRevenueYearT(year);
    const om = this.calcOMYearT(year);
    return revenue - om;
  }

  /**
   * 6. CFADS (Cash Flow Available for Debt Service) for year t
   * CFADS = EBITDA × (1 - Tax_Rate)
   */
  calcCFADSYearT(year: number): number {
    const ebitda = this.calcEBITDAYearT(year);
    return ebitda * (1 - this.inputs.tax_rate);
  }

  /**
   * 7. Present Value of CFADS over debt tenor
   * PV of CFADS = Sum of [CFADS / (1+Interest)^year] for debt tenor only
   */
  calcPVofCFADS(): number {
    let pvTotal = 0;
    for (let year = 1; year <= this.inputs.debt_tenor; year++) {
      const cfads = this.calcCFADSYearT(year);
      const discountFactor = Math.pow(1 + this.inputs.interest_rate, year);
      pvTotal += cfads / discountFactor;
    }
    return pvTotal;
  }

  /**
   * 8. Maximum debt by DSCR constraint
   * Max Debt by DSCR = PV_of_CFADS / Target_DSCR
   */
  calcMaxDebtByDSCR(): number {
    const pvCfads = this.calcPVofCFADS();
    return pvCfads / this.inputs.target_dscr;
  }

  /**
   * 9. Maximum debt by Gearing constraint
   * Max Debt by Gearing = Total_CapEx × Gearing_Ratio
   */
  calcMaxDebtByGearing(): number {
    const totalCapex = this.calcTotalCapEx();
    return totalCapex * this.inputs.gearing_ratio;
  }

  /**
   * 10. Final Debt (binding constraint)
   * Final Debt = MIN(Max_Debt_by_DSCR, Max_Debt_by_Gearing)
   */
  calcFinalDebt(): number {
    const maxDebtDSCR = this.calcMaxDebtByDSCR();
    const maxDebtGearing = this.calcMaxDebtByGearing();
    return Math.min(maxDebtDSCR, maxDebtGearing);
  }

  /**
   * 11. Equity investment
   * Equity = Total_CapEx - Final_Debt
   */
  calcEquity(): number {
    const totalCapex = this.calcTotalCapEx();
    const finalDebt = this.calcFinalDebt();
    return totalCapex - finalDebt;
  }

  /**
   * 12. Annual Debt Service using PMT formula
   */
  calcAnnualDebtService(): number {
    const finalDebt = this.calcFinalDebt();
    return -pmt(
      this.inputs.interest_rate,
      this.inputs.debt_tenor,
      finalDebt,
      0
    );
  }

  /**
   * 13. Free Cash Flow to Equity for year t
   * FCF to Equity = CFADS - Debt Service (if year <= Tenor) else CFADS
   */
  calcFCFtoEquityYearT(year: number): number {
    const cfads = this.calcCFADSYearT(year);

    if (year <= this.inputs.debt_tenor) {
      const annualDS = this.calcAnnualDebtService();
      return cfads - annualDS;
    } else {
      return cfads;
    }
  }

  /**
   * 14. NPV of Costs = Total_CapEx + Sum of discounted OM
   */
  calcNPVofCosts(): number {
    const totalCapex = this.calcTotalCapEx();
    let pvOM = 0;

    for (let year = 1; year <= this.inputs.project_lifetime; year++) {
      const om = this.calcOMYearT(year);
      const discountFactor = Math.pow(1 + this.inputs.discount_rate, year);
      pvOM += om / discountFactor;
    }

    return totalCapex + pvOM;
  }

  /**
   * 15. NPV of Energy = Sum of discounted energy production
   */
  calcNPVofEnergy(): number {
    let pvEnergy = 0;

    for (let year = 1; year <= this.inputs.project_lifetime; year++) {
      const energy = this.calcEnergyYearT(year);
      const discountFactor = Math.pow(1 + this.inputs.discount_rate, year);
      pvEnergy += energy / discountFactor;
    }

    return pvEnergy;
  }

  /**
   * 16. DSCR for year t
   * DSCR = CFADS / Annual_Debt_Service
   */
  calcDSCRYearT(year: number): number | null {
    if (year > this.inputs.debt_tenor) {
      return null; // No debt service after tenor
    }

    const cfads = this.calcCFADSYearT(year);
    const annualDS = this.calcAnnualDebtService();

    if (annualDS === 0) {
      return null;
    }

    return cfads / annualDS;
  }

  // =================================================================
  // KEY OUTPUTS
  // =================================================================

  /**
   * Project IRR: Rate where NPV of project cash flows = 0
   * Cash flows: [-Total_CapEx, CFADS_year_1, CFADS_year_2, ..., CFADS_year_n]
   */
  calcProjectIRR(): number {
    const cashFlows: number[] = [];

    // Year 0: Initial investment (negative)
    const totalCapex = this.calcTotalCapEx();
    cashFlows.push(-totalCapex);

    // Years 1 to Project_Lifetime: CFADS
    for (let year = 1; year <= this.inputs.project_lifetime; year++) {
      const cfads = this.calcCFADSYearT(year);
      cashFlows.push(cfads);
    }

    return irr(cashFlows);
  }

  /**
   * Equity IRR: Rate where NPV of equity cash flows = 0
   * Cash flows: [-Equity, FCF_year_1, FCF_year_2, ..., FCF_year_n]
   */
  calcEquityIRR(): number {
    const cashFlows: number[] = [];

    // Year 0: Equity investment (negative)
    const equity = this.calcEquity();
    cashFlows.push(-equity);

    // Years 1 to Project_Lifetime: FCF to Equity
    for (let year = 1; year <= this.inputs.project_lifetime; year++) {
      const fcf = this.calcFCFtoEquityYearT(year);
      cashFlows.push(fcf);
    }

    return irr(cashFlows);
  }

  /**
   * LCOE (Levelized Cost of Energy)
   * LCOE = NPV_of_Costs / NPV_of_Energy
   */
  calcLCOE(): number {
    const npvCosts = this.calcNPVofCosts();
    const npvEnergy = this.calcNPVofEnergy();
    return npvCosts / npvEnergy;
  }

  /**
   * Minimum DSCR over debt tenor
   */
  calcMinimumDSCR(): number | null {
    const dscrValues: number[] = [];
    for (let year = 1; year <= this.inputs.debt_tenor; year++) {
      const dscr = this.calcDSCRYearT(year);
      if (dscr !== null) {
        dscrValues.push(dscr);
      }
    }

    return dscrValues.length > 0 ? Math.min(...dscrValues) : null;
  }

  /**
   * Average DSCR over debt tenor
   */
  calcAverageDSCR(): number | null {
    const dscrValues: number[] = [];
    for (let year = 1; year <= this.inputs.debt_tenor; year++) {
      const dscr = this.calcDSCRYearT(year);
      if (dscr !== null) {
        dscrValues.push(dscr);
      }
    }

    if (dscrValues.length === 0) {
      return null;
    }

    const sum = dscrValues.reduce((a, b) => a + b, 0);
    return sum / dscrValues.length;
  }

  /**
   * Project NPV = -Total_CapEx + Sum of discounted CFADS
   */
  calcProjectNPV(): number {
    const totalCapex = this.calcTotalCapEx();
    let pvCfads = 0;

    for (let year = 1; year <= this.inputs.project_lifetime; year++) {
      const cfads = this.calcCFADSYearT(year);
      const discountFactor = Math.pow(1 + this.inputs.discount_rate, year);
      pvCfads += cfads / discountFactor;
    }

    return -totalCapex + pvCfads;
  }

  // =================================================================
  // SUMMARY REPORT
  // =================================================================

  /**
   * Generate comprehensive project summary
   */
  generateSummaryReport(): Omit<ProjectResults, 'yearly_data' | 'audit_log' | 'cost_items_breakdown'> {
    // Calculate all intermediates
    const totalCapex = this.calcTotalCapEx();
    const finalDebt = this.calcFinalDebt();
    const equity = this.calcEquity();
    const maxDebtDSCR = this.calcMaxDebtByDSCR();
    const maxDebtGearing = this.calcMaxDebtByGearing();

    // Determine binding constraint
    const bindingConstraint = maxDebtDSCR < maxDebtGearing ? 'DSCR' : 'Gearing';

    // Calculate outputs
    const projectIRR = this.calcProjectIRR();
    const equityIRR = this.calcEquityIRR();
    const lcoe = this.calcLCOE();
    const minDSCR = this.calcMinimumDSCR();
    const avgDSCR = this.calcAverageDSCR();
    const projectNPV = this.calcProjectNPV();

    // First year operations
    const year1Energy = this.calcEnergyYearT(1);
    const year1Revenue = this.calcRevenueYearT(1);
    const year1OM = this.calcOMYearT(1);
    const year1EBITDA = this.calcEBITDAYearT(1);
    const year1CFADS = this.calcCFADSYearT(1);

    const projectSummary: ProjectSummary = {
      capacity_mw: this.inputs.capacity,
      capacity_factor: this.calcCapacityFactor(),
      p50_year_0_yield_mwh: this.inputs.p50_year_0_yield,
      project_lifetime: this.inputs.project_lifetime,
      total_capex: totalCapex,
      capex_per_mw: this.inputs.capex_per_mw!
    };

    const financingStructure: FinancingStructure = {
      max_debt_by_dscr: maxDebtDSCR,
      max_debt_by_gearing: maxDebtGearing,
      final_debt: finalDebt,
      equity: equity,
      actual_gearing: finalDebt / totalCapex,
      binding_constraint: bindingConstraint,
      interest_rate: this.inputs.interest_rate,
      debt_tenor: this.inputs.debt_tenor,
      annual_debt_service: this.calcAnnualDebtService()
    };

    const keyMetrics: KeyMetrics = {
      project_irr: projectIRR,
      equity_irr: equityIRR,
      lcoe: lcoe,
      min_dscr: minDSCR!,
      avg_dscr: avgDSCR!,
      project_npv: projectNPV,
      ppa_price: this.inputs.ppa_price
    };

    const firstYearOperations: FirstYearOperations = {
      energy_production_mwh: year1Energy,
      revenue: year1Revenue,
      om_costs: year1OM,
      ebitda: year1EBITDA,
      cfads: year1CFADS
    };

    const assessment = this.assessProject(projectIRR, equityIRR, minDSCR);

    return {
      project_summary: projectSummary,
      financing_structure: financingStructure,
      key_metrics: keyMetrics,
      first_year_operations: firstYearOperations,
      assessment: assessment
    };
  }

  /**
   * Generate year-by-year data for all operational metrics
   */
  generateYearlyData(): YearlyData {
    const years = Array.from({ length: this.inputs.project_lifetime }, (_, i) => i + 1);
    const annualDebtService = this.calcAnnualDebtService();

    const energyProductionMwh: number[] = [];
    const revenue: number[] = [];
    const omCosts: number[] = [];
    const ebitda: number[] = [];
    const cfads: number[] = [];
    const fcfToEquity: number[] = [];
    const debtService: number[] = [];
    const dscr: (number | null)[] = [];
    const cumulativeFCFToEquity: number[] = [];

    let cumulativeFCF = 0;

    for (let year = 1; year <= this.inputs.project_lifetime; year++) {
      energyProductionMwh.push(this.calcEnergyYearT(year));
      revenue.push(this.calcRevenueYearT(year));
      omCosts.push(this.calcOMYearT(year));
      ebitda.push(this.calcEBITDAYearT(year));
      cfads.push(this.calcCFADSYearT(year));

      const fcf = this.calcFCFtoEquityYearT(year);
      fcfToEquity.push(fcf);
      cumulativeFCF += fcf;
      cumulativeFCFToEquity.push(cumulativeFCF);

      // Debt service: only during debt tenor
      if (year <= this.inputs.debt_tenor) {
        debtService.push(annualDebtService);
        dscr.push(this.calcDSCRYearT(year));
      } else {
        debtService.push(0);
        dscr.push(null);
      }
    }

    return {
      years,
      energy_production_mwh: energyProductionMwh,
      revenue,
      om_costs: omCosts,
      ebitda,
      cfads,
      fcf_to_equity: fcfToEquity,
      debt_service: debtService,
      dscr,
      cumulative_fcf_to_equity: cumulativeFCFToEquity
    };
  }

  /**
   * Assess project viability based on key metrics
   */
  private assessProject(projectIRR: number, equityIRR: number, minDSCR: number | null): Assessment {
    // IRR thresholds
    const projectIRRPct = projectIRR * 100;
    const equityIRRPct = equityIRR * 100;

    let projectIRRStatus: string;
    if (projectIRRPct >= 8) {
      projectIRRStatus = `✓ Strong at ${projectIRRPct.toFixed(2)}% (target: >8%)`;
    } else if (projectIRRPct >= 6) {
      projectIRRStatus = `○ Acceptable at ${projectIRRPct.toFixed(2)}% (target: >8%)`;
    } else {
      projectIRRStatus = `✗ Weak at ${projectIRRPct.toFixed(2)}% (target: >8%)`;
    }

    let equityIRRStatus: string;
    if (equityIRRPct >= 12) {
      equityIRRStatus = `✓ Strong at ${equityIRRPct.toFixed(2)}% (target: >12%)`;
    } else if (equityIRRPct >= 10) {
      equityIRRStatus = `○ Acceptable at ${equityIRRPct.toFixed(2)}% (target: >12%)`;
    } else {
      equityIRRStatus = `✗ Weak at ${equityIRRPct.toFixed(2)}% (target: >12%)`;
    }

    let dscrStatus: string;
    if (minDSCR === null) {
      dscrStatus = '— No debt';
    } else if (minDSCR >= 1.35) {
      dscrStatus = `✓ Strong at ${minDSCR.toFixed(2)}x (minimum: >1.30x)`;
    } else if (minDSCR >= 1.20) {
      dscrStatus = `○ Acceptable at ${minDSCR.toFixed(2)}x (minimum: >1.30x)`;
    } else {
      dscrStatus = `✗ Weak at ${minDSCR.toFixed(2)}x (minimum: >1.30x)`;
    }

    // Overall assessment
    let overall: string;
    const strongCount = (projectIRRPct >= 8 ? 1 : 0) +
                       (equityIRRPct >= 12 ? 1 : 0) +
                       (minDSCR !== null && minDSCR >= 1.35 ? 1 : 0);

    if (strongCount === 3) {
      overall = 'Project shows strong financials across all key metrics. Recommended for investment.';
    } else if (strongCount >= 2) {
      overall = 'Project shows acceptable financials with room for improvement. Consider optimization.';
    } else {
      overall = 'Project financials are below targets. Review assumptions and consider restructuring.';
    }

    return {
      project_irr: projectIRRStatus,
      equity_irr: equityIRRStatus,
      dscr: dscrStatus,
      overall
    };
  }
}
