/**
 * Solar Finance Calculator
 *
 * TypeScript implementation of 23-step financial model for utility-scale solar projects
 * Ported from original Python calculator
 */

import { irr, pmt } from './financial';
import { NORTHERN_HEMISPHERE_MONTHLY_FACTORS, MONTH_NAMES } from './constants';
import type { ProjectInputs, ProjectResults, ProjectSummary, FinancingStructure, KeyMetrics, FirstYearOperations, Assessment, YearlyData, MonthlyDataPoint, AuditLog, FormulaReference, CalculationStep } from '../../types';

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
  generateSummaryReport(): Omit<ProjectResults, 'yearly_data' | 'monthly_data' | 'audit_log' | 'cost_items_breakdown'> {
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
      ppa_price: this.inputs.ppa_price,
      equity_payback_years: this.calcEquityPaybackPeriod(),
      project_payback_years: this.calcProjectPaybackPeriod()
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
   * Monthly Calculations
   * These methods distribute annual values across 12 months using seasonal factors
   */

  calcEnergyMonthT(year: number, month: number): number {
    const annualEnergy = this.calcEnergyYearT(year);
    const seasonalFactor = NORTHERN_HEMISPHERE_MONTHLY_FACTORS[month - 1];
    return annualEnergy * seasonalFactor;
  }

  calcRevenueMonthT(year: number, month: number): number {
    const monthlyEnergy = this.calcEnergyMonthT(year, month);
    const ppaPriceYear = this.inputs.ppa_price * Math.pow(1 + this.inputs.ppa_escalation, year - 1);
    return monthlyEnergy * ppaPriceYear;
  }

  calcOMMonthT(year: number, _month: number): number {
    const annualOM = this.calcOMYearT(year);
    return annualOM / 12; // Evenly distributed
  }

  calcEBITDAMonthT(year: number, month: number): number {
    const monthlyRevenue = this.calcRevenueMonthT(year, month);
    const monthlyOM = this.calcOMMonthT(year, month);
    return monthlyRevenue - monthlyOM;
  }

  calcCFADSMonthT(year: number, month: number): number {
    const monthlyEBITDA = this.calcEBITDAMonthT(year, month);
    return monthlyEBITDA * (1 - this.inputs.tax_rate);
  }

  calcDebtServiceMonthT(year: number, _month: number): number {
    if (year > this.inputs.debt_tenor) {
      return 0;
    }
    const annualDS = this.calcAnnualDebtService();
    return annualDS / 12; // Evenly distributed
  }

  calcFCFtoEquityMonthT(year: number, month: number): number {
    const monthlyCFADS = this.calcCFADSMonthT(year, month);
    const monthlyDS = this.calcDebtServiceMonthT(year, month);
    return monthlyCFADS - monthlyDS;
  }

  /**
   * Generate monthly data for all years
   */
  generateMonthlyData(): MonthlyDataPoint[] {
    const monthlyData: MonthlyDataPoint[] = [];
    const equity = this.calcEquity();
    let cumulativeFCF = -equity;

    for (let year = 1; year <= this.inputs.project_lifetime; year++) {
      for (let month = 1; month <= 12; month++) {
        const fcf = this.calcFCFtoEquityMonthT(year, month);
        cumulativeFCF += fcf;

        monthlyData.push({
          year,
          month,
          month_name: MONTH_NAMES[month - 1],
          energy_production_mwh: this.calcEnergyMonthT(year, month),
          revenue: this.calcRevenueMonthT(year, month),
          om_costs: this.calcOMMonthT(year, month),
          ebitda: this.calcEBITDAMonthT(year, month),
          cfads: this.calcCFADSMonthT(year, month),
          debt_service: this.calcDebtServiceMonthT(year, month),
          fcf_to_equity: fcf,
          cumulative_fcf_to_equity: cumulativeFCF
        });
      }
    }

    return monthlyData;
  }

  /**
   * Calculate equity payback period (when cumulative FCF to equity becomes positive)
   * Returns fractional years using linear interpolation, or null if never breaks even
   */
  calcEquityPaybackPeriod(): number | null {
    const equity = this.calcEquity();
    let cumulativeFCF = -equity;
    let prevCumulative = cumulativeFCF;

    for (let year = 1; year <= this.inputs.project_lifetime; year++) {
      const fcf = this.calcFCFtoEquityYearT(year);
      prevCumulative = cumulativeFCF;
      cumulativeFCF += fcf;

      // Check for zero crossing
      if (prevCumulative < 0 && cumulativeFCF >= 0) {
        // Linear interpolation to find fractional year
        const fraction = -prevCumulative / fcf;
        return year - 1 + fraction;
      }
    }

    // Check if breaks even at end
    return cumulativeFCF >= 0 ? this.inputs.project_lifetime : null;
  }

  /**
   * Calculate project payback period (when cumulative CFADS exceeds total CapEx)
   * Returns fractional years using linear interpolation, or null if never breaks even
   */
  calcProjectPaybackPeriod(): number | null {
    const totalCapex = this.calcTotalCapEx();
    let cumulativeCFADS = 0;
    let prevCumulative = 0;

    for (let year = 1; year <= this.inputs.project_lifetime; year++) {
      const cfads = this.calcCFADSYearT(year);
      prevCumulative = cumulativeCFADS;
      cumulativeCFADS += cfads;

      // Check for zero crossing
      if (prevCumulative < totalCapex && cumulativeCFADS >= totalCapex) {
        // Linear interpolation
        const fraction = (totalCapex - prevCumulative) / cfads;
        return year - 1 + fraction;
      }
    }

    return cumulativeCFADS >= totalCapex ? this.inputs.project_lifetime : null;
  }

  /**
   * Generate detailed audit log with formulas, calculation steps, and binding constraint analysis
   */
  generateAuditLog(): AuditLog {
    // Helper function for formatting currency
    const formatCurrency = (value: number): string => {
      return `€${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    // Build formulas reference (5 categories)
    const formulasReference: FormulaReference[] = [
      {
        category: "Energy Production",
        formulas: [
          "Energy_year_t = P50_Year_0_Yield × (1 - Degradation_Rate)^(t-1)",
          "Monthly_Energy = Annual_Energy × Seasonal_Factor[month]",
          "Capacity_Factor = P50_Year_0_Yield / (Capacity × 8760 hours)"
        ]
      },
      {
        category: "Revenue & Costs",
        formulas: [
          "Revenue_year_t = Energy_year_t × PPA_Price × (1 + PPA_Escalation)^(t-1)",
          "OM_year_t = Capacity × OM_Cost_per_MW × (1 + OM_Escalation)^(t-1)",
          "EBITDA = Revenue - OM_Costs"
        ]
      },
      {
        category: "Cash Flows",
        formulas: [
          "CFADS = EBITDA × (1 - Tax_Rate)",
          "FCF_to_Equity = CFADS - Debt_Service",
          "Debt_Service = PMT(Interest_Rate, Debt_Tenor, -Debt_Amount)"
        ]
      },
      {
        category: "Debt Sizing",
        formulas: [
          "PV_of_CFADS = Sum of [CFADS_t / (1 + Interest_Rate)^t] for t=1 to Debt_Tenor",
          "Max_Debt_by_DSCR = PV_of_CFADS / Target_DSCR",
          "Max_Debt_by_Gearing = Total_CapEx × Gearing_Ratio",
          "Final_Debt = MIN(Max_Debt_by_DSCR, Max_Debt_by_Gearing)",
          "Equity = Total_CapEx - Final_Debt",
          "DSCR_year_t = CFADS_year_t / Annual_Debt_Service"
        ]
      },
      {
        category: "Returns & Metrics",
        formulas: [
          "Project_IRR: NPV([-CapEx, CFADS_1, ..., CFADS_n]) = 0",
          "Equity_IRR: NPV([-Equity, FCF_1, ..., FCF_n]) = 0",
          "LCOE = NPV(All_Costs) / NPV(All_Energy)",
          "Project_NPV = NPV([-CapEx, CFADS_1, ..., CFADS_n]) at Discount_Rate",
          "Equity_Payback = Year when Cumulative_FCF_to_Equity ≥ 0",
          "Project_Payback = Year when Cumulative_CFADS ≥ Total_CapEx"
        ]
      }
    ];

    // Build calculation steps with Year 1 examples
    const totalCapex = this.calcTotalCapEx();
    const capacityFactor = this.calcCapacityFactor();
    const energyYear1 = this.calcEnergyYearT(1);
    const revenueYear1 = this.calcRevenueYearT(1);
    const omYear1 = this.calcOMYearT(1);
    const ebitdaYear1 = this.calcEBITDAYearT(1);
    const cfadsYear1 = this.calcCFADSYearT(1);
    const pvCFADS = this.calcPVofCFADS();
    const maxDebtDSCR = this.calcMaxDebtByDSCR();
    const maxDebtGearing = this.calcMaxDebtByGearing();
    const finalDebt = this.calcFinalDebt();
    const equity = this.calcEquity();
    const annualDS = this.calcAnnualDebtService();
    const fcfYear1 = this.calcFCFtoEquityYearT(1);
    const dscrYear1 = this.calcDSCRYearT(1);
    const projectIRR = this.calcProjectIRR();
    const equityIRR = this.calcEquityIRR();
    const lcoe = this.calcLCOE();
    const minDSCR = this.calcMinimumDSCR();
    const avgDSCR = this.calcAverageDSCR();
    const projectNPV = this.calcProjectNPV();

    const calculationSteps: CalculationStep[] = [
      {
        step_number: 1,
        name: "Total CapEx",
        formula: "Total_CapEx = Capacity × CapEx_per_MW",
        inputs: { Capacity: this.inputs.capacity, CapEx_per_MW: this.inputs.capex_per_mw! },
        calculation: `${this.inputs.capacity} MW × ${formatCurrency(this.inputs.capex_per_mw!)}/MW`,
        result: totalCapex,
        unit: "€"
      },
      {
        step_number: 2,
        name: "Capacity Factor",
        formula: "CF = P50_Year_0_Yield / (Capacity × 8760)",
        inputs: { P50_Yield: this.inputs.p50_year_0_yield, Capacity: this.inputs.capacity },
        calculation: `${this.inputs.p50_year_0_yield.toLocaleString()} MWh / (${this.inputs.capacity} MW × 8760 h)`,
        result: capacityFactor,
        unit: "%"
      },
      {
        step_number: 3,
        name: "Energy Production (Year 1)",
        formula: "Energy_1 = P50_Year_0_Yield",
        inputs: { P50_Year_0_Yield: this.inputs.p50_year_0_yield },
        calculation: `${this.inputs.p50_year_0_yield.toLocaleString()} MWh`,
        result: energyYear1,
        unit: "MWh"
      },
      {
        step_number: 4,
        name: "Revenue (Year 1)",
        formula: "Revenue_1 = Energy_1 × PPA_Price",
        inputs: { Energy: energyYear1, PPA_Price: this.inputs.ppa_price },
        calculation: `${energyYear1.toLocaleString()} MWh × €${this.inputs.ppa_price}/MWh`,
        result: revenueYear1,
        unit: "€"
      },
      {
        step_number: 5,
        name: "O&M Costs (Year 1)",
        formula: "OM_1 = Capacity × OM_Cost_per_MW",
        inputs: { Capacity: this.inputs.capacity, OM_per_MW: this.inputs.om_cost_per_mw_year! },
        calculation: `${this.inputs.capacity} MW × ${formatCurrency(this.inputs.om_cost_per_mw_year!)}/MW`,
        result: omYear1,
        unit: "€"
      },
      {
        step_number: 6,
        name: "EBITDA (Year 1)",
        formula: "EBITDA_1 = Revenue_1 - OM_1",
        inputs: { Revenue: revenueYear1, OM: omYear1 },
        calculation: `${formatCurrency(revenueYear1)} - ${formatCurrency(omYear1)}`,
        result: ebitdaYear1,
        unit: "€"
      },
      {
        step_number: 7,
        name: "CFADS (Year 1)",
        formula: "CFADS_1 = EBITDA_1 × (1 - Tax_Rate)",
        inputs: { EBITDA: ebitdaYear1, Tax_Rate: this.inputs.tax_rate },
        calculation: `${formatCurrency(ebitdaYear1)} × (1 - ${(this.inputs.tax_rate * 100).toFixed(1)}%)`,
        result: cfadsYear1,
        unit: "€"
      },
      {
        step_number: 8,
        name: "PV of CFADS (during debt tenor)",
        formula: "PV_CFADS = Sum[CFADS_t / (1+r)^t]",
        inputs: { Debt_Tenor: this.inputs.debt_tenor, Interest_Rate: this.inputs.interest_rate },
        calculation: `Sum of discounted CFADS for ${this.inputs.debt_tenor} years`,
        result: pvCFADS,
        unit: "€"
      },
      {
        step_number: 9,
        name: "Max Debt by DSCR",
        formula: "Max_Debt = PV_CFADS / Target_DSCR",
        inputs: { PV_CFADS: pvCFADS, Target_DSCR: this.inputs.target_dscr },
        calculation: `${formatCurrency(pvCFADS)} / ${this.inputs.target_dscr.toFixed(2)}`,
        result: maxDebtDSCR,
        unit: "€"
      },
      {
        step_number: 10,
        name: "Max Debt by Gearing",
        formula: "Max_Debt = Total_CapEx × Gearing_Ratio",
        inputs: { Total_CapEx: totalCapex, Gearing_Ratio: this.inputs.gearing_ratio },
        calculation: `${formatCurrency(totalCapex)} × ${(this.inputs.gearing_ratio * 100).toFixed(0)}%`,
        result: maxDebtGearing,
        unit: "€"
      },
      {
        step_number: 11,
        name: "Final Debt (binding constraint)",
        formula: "Debt = MIN(Max_by_DSCR, Max_by_Gearing)",
        inputs: { Max_by_DSCR: maxDebtDSCR, Max_by_Gearing: maxDebtGearing },
        calculation: `MIN(${formatCurrency(maxDebtDSCR)}, ${formatCurrency(maxDebtGearing)})`,
        result: finalDebt,
        unit: "€"
      },
      {
        step_number: 12,
        name: "Equity",
        formula: "Equity = Total_CapEx - Debt",
        inputs: { Total_CapEx: totalCapex, Debt: finalDebt },
        calculation: `${formatCurrency(totalCapex)} - ${formatCurrency(finalDebt)}`,
        result: equity,
        unit: "€"
      },
      {
        step_number: 13,
        name: "Annual Debt Service",
        formula: "DS = PMT(Interest_Rate, Debt_Tenor, -Debt)",
        inputs: { Interest_Rate: this.inputs.interest_rate, Debt_Tenor: this.inputs.debt_tenor, Debt: finalDebt },
        calculation: `PMT(${(this.inputs.interest_rate * 100).toFixed(2)}%, ${this.inputs.debt_tenor} yrs, ${formatCurrency(finalDebt)})`,
        result: annualDS,
        unit: "€"
      },
      {
        step_number: 14,
        name: "FCF to Equity (Year 1)",
        formula: "FCF_1 = CFADS_1 - Debt_Service",
        inputs: { CFADS: cfadsYear1, Debt_Service: annualDS },
        calculation: `${formatCurrency(cfadsYear1)} - ${formatCurrency(annualDS)}`,
        result: fcfYear1,
        unit: "€"
      },
      {
        step_number: 15,
        name: "DSCR (Year 1)",
        formula: "DSCR_1 = CFADS_1 / Debt_Service",
        inputs: { CFADS: cfadsYear1, Debt_Service: annualDS },
        calculation: `${formatCurrency(cfadsYear1)} / ${formatCurrency(annualDS)}`,
        result: dscrYear1 || 0,
        unit: "x"
      },
      {
        step_number: 16,
        name: "Project IRR",
        formula: "IRR: NPV([-CapEx, CFADS...]) = 0",
        inputs: { Total_CapEx: totalCapex, Project_Lifetime: this.inputs.project_lifetime },
        calculation: `Newton's method on ${this.inputs.project_lifetime}-year cash flows`,
        result: projectIRR,
        unit: "%"
      },
      {
        step_number: 17,
        name: "Equity IRR",
        formula: "IRR: NPV([-Equity, FCF...]) = 0",
        inputs: { Equity: equity, Project_Lifetime: this.inputs.project_lifetime },
        calculation: `Newton's method on ${this.inputs.project_lifetime}-year cash flows`,
        result: equityIRR,
        unit: "%"
      },
      {
        step_number: 18,
        name: "LCOE",
        formula: "LCOE = NPV(Costs) / NPV(Energy)",
        inputs: { Discount_Rate: this.inputs.discount_rate },
        calculation: `NPV of costs / NPV of energy at ${(this.inputs.discount_rate * 100).toFixed(0)}%`,
        result: lcoe,
        unit: "€/MWh"
      },
      {
        step_number: 19,
        name: "Minimum DSCR",
        formula: "Min_DSCR = MIN(DSCR_1, ..., DSCR_n)",
        inputs: { Debt_Tenor: this.inputs.debt_tenor },
        calculation: `Minimum DSCR over ${this.inputs.debt_tenor} years`,
        result: minDSCR || 0,
        unit: "x"
      },
      {
        step_number: 20,
        name: "Average DSCR",
        formula: "Avg_DSCR = AVG(DSCR_1, ..., DSCR_n)",
        inputs: { Debt_Tenor: this.inputs.debt_tenor },
        calculation: `Average DSCR over ${this.inputs.debt_tenor} years`,
        result: avgDSCR || 0,
        unit: "x"
      },
      {
        step_number: 21,
        name: "Project NPV",
        formula: "NPV = Sum[CFADS_t / (1+r)^t] - CapEx",
        inputs: { Discount_Rate: this.inputs.discount_rate },
        calculation: `NPV at ${(this.inputs.discount_rate * 100).toFixed(0)}% discount rate`,
        result: projectNPV,
        unit: "€"
      }
    ];

    // Binding constraint analysis
    const bindingConstraint = {
      debt_sizing: {
        max_by_dscr: maxDebtDSCR,
        max_by_gearing: maxDebtGearing,
        chosen: finalDebt,
        constraint: maxDebtDSCR < maxDebtGearing ? 'DSCR' : 'Gearing',
        reason: maxDebtDSCR < maxDebtGearing
          ? `DSCR constraint is binding. The project's cash flows can only support ${formatCurrency(maxDebtDSCR)} of debt while maintaining the target DSCR of ${this.inputs.target_dscr.toFixed(2)}x. The gearing constraint would have allowed ${formatCurrency(maxDebtGearing)}.`
          : `Gearing constraint is binding. Lenders limit debt to ${(this.inputs.gearing_ratio * 100).toFixed(0)}% of total CapEx (${formatCurrency(maxDebtGearing)}). The DSCR constraint would have allowed ${formatCurrency(maxDebtDSCR)}.`
      }
    };

    // Key assumptions
    const keyAssumptions: Record<string, number> = {
      'Capacity (MW)': this.inputs.capacity,
      'P50 Year 0 Yield (MWh)': this.inputs.p50_year_0_yield,
      'CapEx per MW (€)': this.inputs.capex_per_mw!,
      'PPA Price (€/MWh)': this.inputs.ppa_price,
      'O&M per MW per Year (€)': this.inputs.om_cost_per_mw_year!,
      'Degradation Rate (%)': this.inputs.degradation_rate * 100,
      'PPA Escalation (%)': this.inputs.ppa_escalation * 100,
      'O&M Escalation (%)': this.inputs.om_escalation * 100,
      'Gearing Ratio (%)': this.inputs.gearing_ratio * 100,
      'Interest Rate (%)': this.inputs.interest_rate * 100,
      'Debt Tenor (years)': this.inputs.debt_tenor,
      'Target DSCR (x)': this.inputs.target_dscr,
      'Tax Rate (%)': this.inputs.tax_rate * 100,
      'Discount Rate (%)': this.inputs.discount_rate * 100,
      'Project Lifetime (years)': this.inputs.project_lifetime
    };

    return {
      formulas_reference: formulasReference,
      calculation_steps: calculationSteps,
      binding_constraint: bindingConstraint,
      key_assumptions: keyAssumptions
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
