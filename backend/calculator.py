"""
Simplified Solar Project Finance Calculator - REVISED
Based on explicit calculation chain with MW/MWh units throughout
"""

import numpy as np
from dataclasses import dataclass
from typing import List, Dict


# Financial functions
def npv_calc(rate, values):
    """Calculate Net Present Value"""
    return sum(val / (1 + rate) ** i for i, val in enumerate(values))


def irr_calc(values, guess=0.1):
    """Calculate Internal Rate of Return using Newton's method"""
    def npv_at_rate(rate):
        return sum(val / (1 + rate) ** i for i, val in enumerate(values))
    
    def npv_derivative(rate):
        return sum(-i * val / (1 + rate) ** (i + 1) for i, val in enumerate(values))
    
    rate = guess
    for _ in range(100):
        npv_val = npv_at_rate(rate)
        if abs(npv_val) < 1e-6:
            return rate
        npv_deriv = npv_derivative(rate)
        if abs(npv_deriv) < 1e-10:
            break
        rate = rate - npv_val / npv_deriv
    
    return rate


def pmt_calc(rate, nper, pv, fv=0):
    """Calculate periodic payment for a loan"""
    if rate == 0:
        return -(pv + fv) / nper
    
    return -rate * (pv * (1 + rate) ** nper + fv) / ((1 + rate) ** nper - 1)


def pv_calc(rate, nper, pmt, fv=0):
    """Calculate present value of annuity"""
    if rate == 0:
        return -(pmt * nper + fv)
    
    return -(pmt * ((1 + rate) ** nper - 1) / rate + fv) / (1 + rate) ** nper


@dataclass
class ProjectInputs:
    """Core project inputs - using MW/MWh units throughout"""

    # Required inputs
    Capacity: float  # MW
    P50_Year_0_Yield: float  # MWh (Year 0/Year 1 energy production before degradation)
    CapEx_per_MW: float  # €/MW
    PPA_Price: float  # €/MWh
    OM_Cost_per_MW_year: float  # €/MW-year

    # Technical parameters with defaults
    Degradation_Rate: float = 0.004  # decimal per year (0.004 = 0.4%/year)
    
    # Economic parameters with defaults
    PPA_Escalation: float = 0.0  # decimal per year
    OM_Escalation: float = 0.01  # decimal per year (0.01 = 1%/year)
    
    # Financing parameters
    Gearing_Ratio: float = 0.75  # decimal (0.75 = 75% debt)
    Interest_Rate: float = 0.045  # decimal (0.045 = 4.5%)
    Debt_Tenor: int = 15  # years
    Target_DSCR: float = 1.30  # ratio
    
    # Project timeline
    Project_Lifetime: int = 25  # years
    
    # Tax and discount
    Tax_Rate: float = 0.25  # decimal (0.25 = 25%)
    Discount_Rate: float = 0.08  # decimal (0.08 = 8%)


class SolarFinanceCalculator:
    """Calculator implementing explicit financial model"""

    def __init__(self, inputs: ProjectInputs):
        self.inputs = inputs

    # =================================================================
    # INTERMEDIATE CALCULATIONS
    # =================================================================

    def calc_Capacity_Factor(self) -> float:
        """Derived Capacity Factor = P50_Year_0_Yield / (Capacity × 8760)"""
        return self.inputs.P50_Year_0_Yield / (self.inputs.Capacity * 8760)

    def calc_Total_CapEx(self) -> float:
        """1. Total CapEx = Capacity × CapEx_per_MW"""
        return self.inputs.Capacity * self.inputs.CapEx_per_MW

    def calc_Energy_year_t(self, year: int) -> float:
        """2. Energy = P50_Year_0_Yield × (1 - Degradation)^(year-1)"""
        return self.inputs.P50_Year_0_Yield * (1 - self.inputs.Degradation_Rate) ** (year - 1)
    
    def calc_Revenue_year_t(self, year: int) -> float:
        """3. Revenue = Energy × PPA_Price × (1 + Escalation)^(year-1)"""
        energy = self.calc_Energy_year_t(year)
        return energy * self.inputs.PPA_Price * (1 + self.inputs.PPA_Escalation) ** (year - 1)
    
    def calc_OM_year_t(self, year: int) -> float:
        """4. OM = Capacity × OM_Cost × (1 + Escalation)^(year-1)"""
        return (
            self.inputs.Capacity 
            * self.inputs.OM_Cost_per_MW_year 
            * (1 + self.inputs.OM_Escalation) ** (year - 1)
        )
    
    def calc_EBITDA_year_t(self, year: int) -> float:
        """5. EBITDA = Revenue - OM"""
        revenue = self.calc_Revenue_year_t(year)
        om = self.calc_OM_year_t(year)
        return revenue - om
    
    def calc_CFADS_year_t(self, year: int) -> float:
        """6. CFADS = EBITDA × (1 - Tax_Rate)"""
        ebitda = self.calc_EBITDA_year_t(year)
        return ebitda * (1 - self.inputs.Tax_Rate)
    
    def calc_PV_of_CFADS(self) -> float:
        """7. PV of CFADS = Sum of [CFADS / (1+Interest)^year] for debt tenor only"""
        pv_total = 0
        for year in range(1, self.inputs.Debt_Tenor + 1):
            cfads = self.calc_CFADS_year_t(year)
            discount_factor = (1 + self.inputs.Interest_Rate) ** year
            pv_total += cfads / discount_factor
        return pv_total
    
    def calc_Max_Debt_by_DSCR(self) -> float:
        """8. Max Debt by DSCR = PV_of_CFADS / Target_DSCR"""
        pv_cfads = self.calc_PV_of_CFADS()
        return pv_cfads / self.inputs.Target_DSCR
    
    def calc_Max_Debt_by_Gearing(self) -> float:
        """9. Max Debt by Gearing = Total_CapEx × Gearing_Ratio"""
        total_capex = self.calc_Total_CapEx()
        return total_capex * self.inputs.Gearing_Ratio
    
    def calc_Final_Debt(self) -> float:
        """10. Final Debt = MIN(Max_Debt_by_DSCR, Max_Debt_by_Gearing)"""
        max_debt_dscr = self.calc_Max_Debt_by_DSCR()
        max_debt_gearing = self.calc_Max_Debt_by_Gearing()
        return min(max_debt_dscr, max_debt_gearing)
    
    def calc_Equity(self) -> float:
        """11. Equity = Total_CapEx - Final_Debt"""
        total_capex = self.calc_Total_CapEx()
        final_debt = self.calc_Final_Debt()
        return total_capex - final_debt
    
    def calc_Annual_Debt_Service(self) -> float:
        """12. Annual Debt Service using PMT formula"""
        final_debt = self.calc_Final_Debt()
        return -pmt_calc(
            rate=self.inputs.Interest_Rate,
            nper=self.inputs.Debt_Tenor,
            pv=final_debt,
            fv=0
        )
    
    def calc_FCF_to_Equity_year_t(self, year: int) -> float:
        """13. FCF to Equity = CFADS - Debt Service (if year <= Tenor) else CFADS"""
        cfads = self.calc_CFADS_year_t(year)
        
        if year <= self.inputs.Debt_Tenor:
            annual_ds = self.calc_Annual_Debt_Service()
            return cfads - annual_ds
        else:
            return cfads
    
    def calc_NPV_of_Costs(self) -> float:
        """14. NPV of Costs = Total_CapEx + Sum of discounted OM"""
        total_capex = self.calc_Total_CapEx()
        pv_om = 0
        
        for year in range(1, self.inputs.Project_Lifetime + 1):
            om = self.calc_OM_year_t(year)
            discount_factor = (1 + self.inputs.Discount_Rate) ** year
            pv_om += om / discount_factor
        
        return total_capex + pv_om
    
    def calc_NPV_of_Energy(self) -> float:
        """15. NPV of Energy = Sum of discounted energy production"""
        pv_energy = 0
        
        for year in range(1, self.inputs.Project_Lifetime + 1):
            energy = self.calc_Energy_year_t(year)
            discount_factor = (1 + self.inputs.Discount_Rate) ** year
            pv_energy += energy / discount_factor
        
        return pv_energy
    
    def calc_DSCR_year_t(self, year: int) -> float:
        """16. DSCR = CFADS / Annual_Debt_Service"""
        if year > self.inputs.Debt_Tenor:
            return None  # No debt service after tenor
        
        cfads = self.calc_CFADS_year_t(year)
        annual_ds = self.calc_Annual_Debt_Service()
        
        if annual_ds == 0:
            return None
        
        return cfads / annual_ds
    
    # =================================================================
    # KEY OUTPUTS
    # =================================================================
    
    def calc_Project_IRR(self) -> float:
        """
        Project IRR: Rate where NPV of project cash flows = 0
        Cash flows: [-Total_CapEx, CFADS_year_1, CFADS_year_2, ..., CFADS_year_n]
        """
        cash_flows = []
        
        # Year 0: Initial investment (negative)
        total_capex = self.calc_Total_CapEx()
        cash_flows.append(-total_capex)
        
        # Years 1 to Project_Lifetime: CFADS
        for year in range(1, self.inputs.Project_Lifetime + 1):
            cfads = self.calc_CFADS_year_t(year)
            cash_flows.append(cfads)
        
        return irr_calc(cash_flows)
    
    def calc_Equity_IRR(self) -> float:
        """
        Equity IRR: Rate where NPV of equity cash flows = 0
        Cash flows: [-Equity, FCF_year_1, FCF_year_2, ..., FCF_year_n]
        """
        cash_flows = []
        
        # Year 0: Equity investment (negative)
        equity = self.calc_Equity()
        cash_flows.append(-equity)
        
        # Years 1 to Project_Lifetime: FCF to Equity
        for year in range(1, self.inputs.Project_Lifetime + 1):
            fcf = self.calc_FCF_to_Equity_year_t(year)
            cash_flows.append(fcf)
        
        return irr_calc(cash_flows)
    
    def calc_LCOE(self) -> float:
        """LCOE = NPV_of_Costs / NPV_of_Energy"""
        npv_costs = self.calc_NPV_of_Costs()
        npv_energy = self.calc_NPV_of_Energy()
        return npv_costs / npv_energy
    
    def calc_Minimum_DSCR(self) -> float:
        """Minimum DSCR over debt tenor"""
        dscr_values = []
        for year in range(1, self.inputs.Debt_Tenor + 1):
            dscr = self.calc_DSCR_year_t(year)
            if dscr is not None:
                dscr_values.append(dscr)
        
        return min(dscr_values) if dscr_values else None
    
    def calc_Average_DSCR(self) -> float:
        """Average DSCR over debt tenor"""
        dscr_values = []
        for year in range(1, self.inputs.Debt_Tenor + 1):
            dscr = self.calc_DSCR_year_t(year)
            if dscr is not None:
                dscr_values.append(dscr)
        
        return sum(dscr_values) / len(dscr_values) if dscr_values else None
    
    def calc_Project_NPV(self) -> float:
        """
        Project NPV = -Total_CapEx + Sum of discounted CFADS
        """
        total_capex = self.calc_Total_CapEx()
        pv_cfads = 0

        for year in range(1, self.inputs.Project_Lifetime + 1):
            cfads = self.calc_CFADS_year_t(year)
            discount_factor = (1 + self.inputs.Discount_Rate) ** year
            pv_cfads += cfads / discount_factor

        return -total_capex + pv_cfads

    def calc_Equity_Payback_Period(self) -> float:
        """
        Calculate equity payback period in years (when cumulative FCF to equity becomes positive)
        Returns fractional years with linear interpolation for sub-year precision
        Returns None if payback never occurs within project lifetime
        """
        cumulative_fcf = 0
        prev_cumulative = 0

        for year in range(1, self.inputs.Project_Lifetime + 1):
            fcf = self.calc_FCF_to_Equity_year_t(year)
            prev_cumulative = cumulative_fcf
            cumulative_fcf += fcf

            # Check if we crossed zero (payback achieved)
            if prev_cumulative < 0 and cumulative_fcf >= 0:
                # Linear interpolation to find fractional year
                # prev_cumulative + fraction * fcf = 0
                # fraction = -prev_cumulative / fcf
                fraction = -prev_cumulative / fcf if fcf != 0 else 0
                return year - 1 + fraction

        # If cumulative is still negative after all years, no payback
        return None if cumulative_fcf < 0 else self.inputs.Project_Lifetime

    def calc_Project_Payback_Period(self) -> float:
        """
        Calculate project payback period in years (when cumulative CFADS recovers total CapEx)
        Returns fractional years with linear interpolation for sub-year precision
        Returns None if payback never occurs within project lifetime
        """
        total_capex = self.calc_Total_CapEx()
        cumulative_cfads = 0
        prev_cumulative = 0

        for year in range(1, self.inputs.Project_Lifetime + 1):
            cfads = self.calc_CFADS_year_t(year)
            prev_cumulative = cumulative_cfads
            cumulative_cfads += cfads

            # Check if we recovered the CapEx
            if cumulative_cfads >= total_capex:
                # Linear interpolation to find fractional year
                # prev_cumulative + fraction * cfads = total_capex
                # fraction = (total_capex - prev_cumulative) / cfads
                fraction = (total_capex - prev_cumulative) / cfads if cfads != 0 else 0
                return year - 1 + fraction

        # If cumulative CFADS never reaches CapEx, no payback
        return None if cumulative_cfads < total_capex else self.inputs.Project_Lifetime

    # =================================================================
    # SUMMARY REPORT
    # =================================================================
    
    def generate_summary_report(self) -> Dict:
        """Generate comprehensive project summary"""
        
        # Calculate all intermediates
        total_capex = self.calc_Total_CapEx()
        final_debt = self.calc_Final_Debt()
        equity = self.calc_Equity()
        max_debt_dscr = self.calc_Max_Debt_by_DSCR()
        max_debt_gearing = self.calc_Max_Debt_by_Gearing()
        
        # Determine binding constraint
        binding_constraint = "DSCR" if max_debt_dscr < max_debt_gearing else "Gearing"
        
        # Calculate outputs
        project_irr = self.calc_Project_IRR()
        equity_irr = self.calc_Equity_IRR()
        lcoe = self.calc_LCOE()
        min_dscr = self.calc_Minimum_DSCR()
        avg_dscr = self.calc_Average_DSCR()
        project_npv = self.calc_Project_NPV()
        equity_payback = self.calc_Equity_Payback_Period()
        project_payback = self.calc_Project_Payback_Period()
        
        # First year operations
        year1_energy = self.calc_Energy_year_t(1)
        year1_revenue = self.calc_Revenue_year_t(1)
        year1_om = self.calc_OM_year_t(1)
        year1_ebitda = self.calc_EBITDA_year_t(1)
        year1_cfads = self.calc_CFADS_year_t(1)
        
        return {
            "project_summary": {
                "capacity_mw": self.inputs.Capacity,
                "capacity_factor": self.calc_Capacity_Factor(),
                "p50_year_0_yield_mwh": self.inputs.P50_Year_0_Yield,
                "project_lifetime": self.inputs.Project_Lifetime,
                "total_capex": total_capex,
                "capex_per_mw": self.inputs.CapEx_per_MW
            },
            "financing_structure": {
                "max_debt_by_dscr": max_debt_dscr,
                "max_debt_by_gearing": max_debt_gearing,
                "final_debt": final_debt,
                "equity": equity,
                "actual_gearing": final_debt / total_capex,
                "binding_constraint": binding_constraint,
                "interest_rate": self.inputs.Interest_Rate,
                "debt_tenor": self.inputs.Debt_Tenor,
                "annual_debt_service": self.calc_Annual_Debt_Service()
            },
            "key_metrics": {
                "project_irr": project_irr,
                "equity_irr": equity_irr,
                "lcoe": lcoe,
                "min_dscr": min_dscr,
                "avg_dscr": avg_dscr,
                "project_npv": project_npv,
                "ppa_price": self.inputs.PPA_Price,
                "equity_payback_years": equity_payback,
                "project_payback_years": project_payback
            },
            "first_year_operations": {
                "energy_production_mwh": year1_energy,
                "revenue": year1_revenue,
                "om_costs": year1_om,
                "ebitda": year1_ebitda,
                "cfads": year1_cfads
            },
            "assessment": self.assess_project(project_irr, equity_irr, min_dscr)
        }

    def generate_yearly_data(self) -> Dict:
        """Generate year-by-year data for all operational metrics"""
        years = list(range(1, self.inputs.Project_Lifetime + 1))
        annual_debt_service = self.calc_Annual_Debt_Service()

        # Initialize arrays for each metric
        energy_production_mwh = []
        revenue = []
        om_costs = []
        ebitda = []
        cfads = []
        fcf_to_equity = []
        debt_service = []
        dscr = []
        cumulative_fcf = 0
        cumulative_fcf_list = []

        # Calculate values for each year
        for year in years:
            # Energy and financial metrics
            energy = self.calc_Energy_year_t(year)
            rev = self.calc_Revenue_year_t(year)
            om = self.calc_OM_year_t(year)
            ebit = self.calc_EBITDA_year_t(year)
            cf = self.calc_CFADS_year_t(year)
            fcf = self.calc_FCF_to_Equity_year_t(year)

            energy_production_mwh.append(energy)
            revenue.append(rev)
            om_costs.append(om)
            ebitda.append(ebit)
            cfads.append(cf)
            fcf_to_equity.append(fcf)

            # Debt service (only during debt tenor)
            if year <= self.inputs.Debt_Tenor:
                debt_service.append(annual_debt_service)
                dscr_val = self.calc_DSCR_year_t(year)
                dscr.append(dscr_val if dscr_val is not None else 0)
            else:
                debt_service.append(0)
                dscr.append(None)

            # Cumulative FCF to equity
            cumulative_fcf += fcf
            cumulative_fcf_list.append(cumulative_fcf)

        return {
            "years": years,
            "energy_production_mwh": energy_production_mwh,
            "revenue": revenue,
            "om_costs": om_costs,
            "ebitda": ebitda,
            "cfads": cfads,
            "fcf_to_equity": fcf_to_equity,
            "debt_service": debt_service,
            "dscr": dscr,
            "cumulative_fcf_to_equity": cumulative_fcf_list
        }

    def generate_calculation_audit_log(self) -> Dict:
        """
        Generate detailed audit log showing all calculation steps with formulas and values.
        Returns a structured log for transparency and verification of all calculations.
        """
        # Calculate all intermediates first
        capacity_factor = self.calc_Capacity_Factor()
        total_capex = self.calc_Total_CapEx()
        max_debt_dscr = self.calc_Max_Debt_by_DSCR()
        max_debt_gearing = self.calc_Max_Debt_by_Gearing()
        final_debt = self.calc_Final_Debt()
        equity = self.calc_Equity()
        annual_debt_service = self.calc_Annual_Debt_Service()
        pv_cfads = self.calc_PV_of_CFADS()

        # Year 1 values for examples
        year1_energy = self.calc_Energy_year_t(1)
        year1_revenue = self.calc_Revenue_year_t(1)
        year1_om = self.calc_OM_year_t(1)
        year1_ebitda = self.calc_EBITDA_year_t(1)
        year1_cfads = self.calc_CFADS_year_t(1)
        year1_fcf = self.calc_FCF_to_Equity_year_t(1)
        year1_dscr = self.calc_DSCR_year_t(1)

        # Key metrics
        project_irr = self.calc_Project_IRR()
        equity_irr = self.calc_Equity_IRR()
        lcoe = self.calc_LCOE()
        min_dscr = self.calc_Minimum_DSCR()
        avg_dscr = self.calc_Average_DSCR()
        project_npv = self.calc_Project_NPV()
        npv_costs = self.calc_NPV_of_Costs()
        npv_energy = self.calc_NPV_of_Energy()

        # Determine binding constraint
        binding_constraint = "DSCR" if max_debt_dscr < max_debt_gearing else "Gearing"

        audit_log = {
            "formulas_reference": [
                {
                    "category": "Intermediate Calculations",
                    "formulas": [
                        "Capacity Factor = P50 Year 0 Yield / (Capacity × 8760)",
                        "Total CapEx = Capacity × CapEx per MW",
                        "Energy (year t) = P50 Year 0 Yield × (1 - Degradation Rate)^(t-1)",
                        "Revenue (year t) = Energy × PPA Price × (1 + PPA Escalation)^(t-1)",
                        "O&M (year t) = Capacity × O&M Cost per MW × (1 + O&M Escalation)^(t-1)",
                        "EBITDA (year t) = Revenue - O&M",
                        "CFADS (year t) = EBITDA × (1 - Tax Rate)",
                        "PV of CFADS = Σ [CFADS(t) / (1 + Interest Rate)^t] for t=1 to Debt Tenor",
                        "Max Debt by DSCR = PV of CFADS / Target DSCR",
                        "Max Debt by Gearing = Total CapEx × Gearing Ratio",
                        "Final Debt = MIN(Max Debt by DSCR, Max Debt by Gearing)",
                        "Equity = Total CapEx - Final Debt",
                        "Annual Debt Service = PMT(Interest Rate, Debt Tenor, Final Debt)",
                        "FCF to Equity (year t) = CFADS - Debt Service (if t ≤ Tenor), else CFADS",
                        "DSCR (year t) = CFADS / Annual Debt Service",
                        "NPV of Costs = Total CapEx + Σ [O&M(t) / (1 + Discount Rate)^t]",
                        "NPV of Energy = Σ [Energy(t) / (1 + Discount Rate)^t]"
                    ]
                },
                {
                    "category": "Key Output Metrics",
                    "formulas": [
                        "Project IRR = Rate where NPV([-Total CapEx, CFADS₁, CFADS₂, ..., CFADSₙ]) = 0",
                        "Equity IRR = Rate where NPV([-Equity, FCF₁, FCF₂, ..., FCFₙ]) = 0",
                        "LCOE = NPV of Costs / NPV of Energy",
                        "Minimum DSCR = MIN(DSCR(t)) for t=1 to Debt Tenor",
                        "Average DSCR = AVERAGE(DSCR(t)) for t=1 to Debt Tenor",
                        "Project NPV = -Total CapEx + Σ [CFADS(t) / (1 + Discount Rate)^t]"
                    ]
                }
            ],
            "calculation_steps": [
                {
                    "step_number": 1,
                    "name": "Capacity Factor",
                    "formula": "P50 Year 0 Yield / (Capacity × 8760)",
                    "inputs": {
                        "P50 Year 0 Yield": self.inputs.P50_Year_0_Yield,
                        "Capacity": self.inputs.Capacity
                    },
                    "calculation": f"{self.inputs.P50_Year_0_Yield:,.0f} / ({self.inputs.Capacity:,.0f} × 8,760)",
                    "result": capacity_factor,
                    "unit": "ratio"
                },
                {
                    "step_number": 2,
                    "name": "Total CapEx",
                    "formula": "Capacity × CapEx per MW",
                    "inputs": {
                        "Capacity": self.inputs.Capacity,
                        "CapEx per MW": self.inputs.CapEx_per_MW
                    },
                    "calculation": f"{self.inputs.Capacity:,.0f} × {self.inputs.CapEx_per_MW:,.0f}",
                    "result": total_capex,
                    "unit": "€"
                },
                {
                    "step_number": 3,
                    "name": "Energy Production Year 1",
                    "formula": "P50 Year 0 Yield × (1 - Degradation Rate)^(year-1)",
                    "inputs": {
                        "P50 Year 0 Yield": self.inputs.P50_Year_0_Yield,
                        "Degradation Rate": self.inputs.Degradation_Rate,
                        "Year": 1
                    },
                    "calculation": f"{self.inputs.P50_Year_0_Yield:,.0f} × (1 - {self.inputs.Degradation_Rate})^0",
                    "result": year1_energy,
                    "unit": "MWh"
                },
                {
                    "step_number": 4,
                    "name": "Revenue Year 1",
                    "formula": "Energy × PPA Price × (1 + PPA Escalation)^(year-1)",
                    "inputs": {
                        "Energy": year1_energy,
                        "PPA Price": self.inputs.PPA_Price,
                        "PPA Escalation": self.inputs.PPA_Escalation,
                        "Year": 1
                    },
                    "calculation": f"{year1_energy:,.0f} × {self.inputs.PPA_Price:,.2f} × (1 + {self.inputs.PPA_Escalation})^0",
                    "result": year1_revenue,
                    "unit": "€"
                },
                {
                    "step_number": 5,
                    "name": "O&M Costs Year 1",
                    "formula": "Capacity × O&M Cost per MW × (1 + O&M Escalation)^(year-1)",
                    "inputs": {
                        "Capacity": self.inputs.Capacity,
                        "O&M Cost per MW": self.inputs.OM_Cost_per_MW_year,
                        "O&M Escalation": self.inputs.OM_Escalation,
                        "Year": 1
                    },
                    "calculation": f"{self.inputs.Capacity:,.0f} × {self.inputs.OM_Cost_per_MW_year:,.0f} × (1 + {self.inputs.OM_Escalation})^0",
                    "result": year1_om,
                    "unit": "€"
                },
                {
                    "step_number": 6,
                    "name": "EBITDA Year 1",
                    "formula": "Revenue - O&M",
                    "inputs": {
                        "Revenue": year1_revenue,
                        "O&M": year1_om
                    },
                    "calculation": f"{year1_revenue:,.0f} - {year1_om:,.0f}",
                    "result": year1_ebitda,
                    "unit": "€"
                },
                {
                    "step_number": 7,
                    "name": "CFADS Year 1",
                    "formula": "EBITDA × (1 - Tax Rate)",
                    "inputs": {
                        "EBITDA": year1_ebitda,
                        "Tax Rate": self.inputs.Tax_Rate
                    },
                    "calculation": f"{year1_ebitda:,.0f} × (1 - {self.inputs.Tax_Rate})",
                    "result": year1_cfads,
                    "unit": "€"
                },
                {
                    "step_number": 8,
                    "name": "PV of CFADS (Debt Tenor)",
                    "formula": "Σ [CFADS(t) / (1 + Interest Rate)^t] for t=1 to Debt Tenor",
                    "inputs": {
                        "Interest Rate": self.inputs.Interest_Rate,
                        "Debt Tenor": self.inputs.Debt_Tenor
                    },
                    "calculation": f"Sum of discounted CFADS over {self.inputs.Debt_Tenor} years",
                    "result": pv_cfads,
                    "unit": "€"
                },
                {
                    "step_number": 9,
                    "name": "Max Debt by DSCR",
                    "formula": "PV of CFADS / Target DSCR",
                    "inputs": {
                        "PV of CFADS": pv_cfads,
                        "Target DSCR": self.inputs.Target_DSCR
                    },
                    "calculation": f"{pv_cfads:,.0f} / {self.inputs.Target_DSCR}",
                    "result": max_debt_dscr,
                    "unit": "€"
                },
                {
                    "step_number": 10,
                    "name": "Max Debt by Gearing",
                    "formula": "Total CapEx × Gearing Ratio",
                    "inputs": {
                        "Total CapEx": total_capex,
                        "Gearing Ratio": self.inputs.Gearing_Ratio
                    },
                    "calculation": f"{total_capex:,.0f} × {self.inputs.Gearing_Ratio}",
                    "result": max_debt_gearing,
                    "unit": "€"
                },
                {
                    "step_number": 11,
                    "name": "Final Debt",
                    "formula": "MIN(Max Debt by DSCR, Max Debt by Gearing)",
                    "inputs": {
                        "Max Debt by DSCR": max_debt_dscr,
                        "Max Debt by Gearing": max_debt_gearing
                    },
                    "calculation": f"MIN({max_debt_dscr:,.0f}, {max_debt_gearing:,.0f})",
                    "result": final_debt,
                    "unit": "€"
                },
                {
                    "step_number": 12,
                    "name": "Equity",
                    "formula": "Total CapEx - Final Debt",
                    "inputs": {
                        "Total CapEx": total_capex,
                        "Final Debt": final_debt
                    },
                    "calculation": f"{total_capex:,.0f} - {final_debt:,.0f}",
                    "result": equity,
                    "unit": "€"
                },
                {
                    "step_number": 13,
                    "name": "Annual Debt Service",
                    "formula": "PMT(Interest Rate, Debt Tenor, Final Debt)",
                    "inputs": {
                        "Interest Rate": self.inputs.Interest_Rate,
                        "Debt Tenor": self.inputs.Debt_Tenor,
                        "Final Debt": final_debt
                    },
                    "calculation": f"PMT({self.inputs.Interest_Rate}, {self.inputs.Debt_Tenor}, {final_debt:,.0f})",
                    "result": annual_debt_service,
                    "unit": "€"
                },
                {
                    "step_number": 14,
                    "name": "FCF to Equity Year 1",
                    "formula": "CFADS - Debt Service",
                    "inputs": {
                        "CFADS": year1_cfads,
                        "Annual Debt Service": annual_debt_service
                    },
                    "calculation": f"{year1_cfads:,.0f} - {annual_debt_service:,.0f}",
                    "result": year1_fcf,
                    "unit": "€"
                },
                {
                    "step_number": 15,
                    "name": "DSCR Year 1",
                    "formula": "CFADS / Annual Debt Service",
                    "inputs": {
                        "CFADS": year1_cfads,
                        "Annual Debt Service": annual_debt_service
                    },
                    "calculation": f"{year1_cfads:,.0f} / {annual_debt_service:,.0f}",
                    "result": year1_dscr if year1_dscr else 0,
                    "unit": "x"
                },
                {
                    "step_number": 16,
                    "name": "NPV of Costs",
                    "formula": "Total CapEx + Σ [O&M(t) / (1 + Discount Rate)^t]",
                    "inputs": {
                        "Total CapEx": total_capex,
                        "Discount Rate": self.inputs.Discount_Rate,
                        "Project Lifetime": self.inputs.Project_Lifetime
                    },
                    "calculation": f"{total_capex:,.0f} + Sum of discounted O&M over {self.inputs.Project_Lifetime} years",
                    "result": npv_costs,
                    "unit": "€"
                },
                {
                    "step_number": 17,
                    "name": "NPV of Energy",
                    "formula": "Σ [Energy(t) / (1 + Discount Rate)^t]",
                    "inputs": {
                        "Discount Rate": self.inputs.Discount_Rate,
                        "Project Lifetime": self.inputs.Project_Lifetime
                    },
                    "calculation": f"Sum of discounted energy over {self.inputs.Project_Lifetime} years",
                    "result": npv_energy,
                    "unit": "MWh"
                },
                {
                    "step_number": 18,
                    "name": "Project IRR",
                    "formula": "Rate where NPV of project cash flows = 0",
                    "inputs": {
                        "Initial Investment": -total_capex,
                        "Annual CFADS": "Years 1 to Project Lifetime"
                    },
                    "calculation": f"IRR([-{total_capex:,.0f}, CFADS₁, ..., CFADS₂₅])",
                    "result": project_irr,
                    "unit": "%"
                },
                {
                    "step_number": 19,
                    "name": "Equity IRR",
                    "formula": "Rate where NPV of equity cash flows = 0",
                    "inputs": {
                        "Equity Investment": -equity,
                        "Annual FCF": "Years 1 to Project Lifetime"
                    },
                    "calculation": f"IRR([-{equity:,.0f}, FCF₁, ..., FCF₂₅])",
                    "result": equity_irr,
                    "unit": "%"
                },
                {
                    "step_number": 20,
                    "name": "LCOE",
                    "formula": "NPV of Costs / NPV of Energy",
                    "inputs": {
                        "NPV of Costs": npv_costs,
                        "NPV of Energy": npv_energy
                    },
                    "calculation": f"{npv_costs:,.0f} / {npv_energy:,.0f}",
                    "result": lcoe,
                    "unit": "€/MWh"
                },
                {
                    "step_number": 21,
                    "name": "Minimum DSCR",
                    "formula": "MIN(DSCR(t)) for t=1 to Debt Tenor",
                    "inputs": {
                        "Debt Tenor": self.inputs.Debt_Tenor
                    },
                    "calculation": f"Minimum DSCR over {self.inputs.Debt_Tenor} years",
                    "result": min_dscr if min_dscr else 0,
                    "unit": "x"
                },
                {
                    "step_number": 22,
                    "name": "Average DSCR",
                    "formula": "AVERAGE(DSCR(t)) for t=1 to Debt Tenor",
                    "inputs": {
                        "Debt Tenor": self.inputs.Debt_Tenor
                    },
                    "calculation": f"Average DSCR over {self.inputs.Debt_Tenor} years",
                    "result": avg_dscr if avg_dscr else 0,
                    "unit": "x"
                },
                {
                    "step_number": 23,
                    "name": "Project NPV",
                    "formula": "-Total CapEx + Σ [CFADS(t) / (1 + Discount Rate)^t]",
                    "inputs": {
                        "Total CapEx": total_capex,
                        "Discount Rate": self.inputs.Discount_Rate,
                        "Project Lifetime": self.inputs.Project_Lifetime
                    },
                    "calculation": f"-{total_capex:,.0f} + Sum of discounted CFADS over {self.inputs.Project_Lifetime} years",
                    "result": project_npv,
                    "unit": "€"
                }
            ],
            "binding_constraint": {
                "debt_sizing": {
                    "max_by_dscr": max_debt_dscr,
                    "max_by_gearing": max_debt_gearing,
                    "chosen": final_debt,
                    "constraint": binding_constraint,
                    "reason": f"{'DSCR limits the debt amount to maintain the target coverage ratio of ' + str(self.inputs.Target_DSCR) + 'x' if binding_constraint == 'DSCR' else 'Gearing ratio limits debt to ' + str(int(self.inputs.Gearing_Ratio * 100)) + '% of total CapEx'}"
                }
            },
            "key_assumptions": {
                "Capacity (MW)": self.inputs.Capacity,
                "P50 Year 0 Yield (MWh)": self.inputs.P50_Year_0_Yield,
                "CapEx per MW (€)": self.inputs.CapEx_per_MW,
                "PPA Price (€/MWh)": self.inputs.PPA_Price,
                "O&M Cost per MW per year (€)": self.inputs.OM_Cost_per_MW_year,
                "Degradation Rate": self.inputs.Degradation_Rate,
                "PPA Escalation": self.inputs.PPA_Escalation,
                "O&M Escalation": self.inputs.OM_Escalation,
                "Gearing Ratio": self.inputs.Gearing_Ratio,
                "Interest Rate": self.inputs.Interest_Rate,
                "Debt Tenor (years)": self.inputs.Debt_Tenor,
                "Target DSCR": self.inputs.Target_DSCR,
                "Project Lifetime (years)": self.inputs.Project_Lifetime,
                "Tax Rate": self.inputs.Tax_Rate,
                "Discount Rate": self.inputs.Discount_Rate
            }
        }

        return audit_log

    def assess_project(self, project_irr: float, equity_irr: float, min_dscr: float) -> Dict[str, str]:
        """Simple go/no-go assessment"""
        assessments = {}

        # Project IRR
        if project_irr >= 0.08:
            assessments['project_irr'] = "✅ GOOD - Exceeds 8% threshold"
        elif project_irr >= 0.06:
            assessments['project_irr'] = "⚠️ MARGINAL - Between 6-8%"
        else:
            assessments['project_irr'] = "❌ POOR - Below 6%"

        # Equity IRR
        if equity_irr >= 0.12:
            assessments['equity_irr'] = "✅ GOOD - Exceeds 12% threshold"
        elif equity_irr >= 0.09:
            assessments['equity_irr'] = "⚠️ MARGINAL - Between 9-12%"
        else:
            assessments['equity_irr'] = "❌ POOR - Below 9%"

        # DSCR
        if min_dscr >= 1.30:
            assessments['dscr'] = "✅ GOOD - Exceeds 1.30x threshold"
        elif min_dscr >= 1.20:
            assessments['dscr'] = "⚠️ MARGINAL - Between 1.20-1.30x"
        else:
            assessments['dscr'] = "❌ POOR - Below 1.20x"

        # Overall
        if all('✅' in v for v in assessments.values()):
            assessments['overall'] = "✅ RECOMMEND - Proceed to detailed financing"
        elif all('❌' not in v for v in assessments.values()):
            assessments['overall'] = "⚠️ REVIEW - May be viable with optimization"
        else:
            assessments['overall'] = "❌ DO NOT PROCEED - Economics not viable"

        return assessments


# =================================================================
# EXAMPLE USAGE
# =================================================================

def example_usage():
    """Example of how to use the calculator"""
    
    # Define project inputs (note: using MW units now, not kW)
    # P50 Year 0 Yield calculated as: 50 MW × 0.22 CF × 8760 hours = 96,360 MWh
    project = ProjectInputs(
        Capacity=50,  # MW
        P50_Year_0_Yield=96_360,  # MWh (Year 0 energy production)
        CapEx_per_MW=1_000_000,  # €1,000,000/MW = €1,000/kW
        PPA_Price=70,  # €70/MWh
        OM_Cost_per_MW_year=15_000,  # €15,000/MW-year = €15/kW-year
        Degradation_Rate=0.004,  # 0.4% per year
        PPA_Escalation=0.01,  # 1% per year
        OM_Escalation=0.01,  # 1% per year
        Gearing_Ratio=0.75,  # 75% debt
        Interest_Rate=0.045,  # 4.5%
        Debt_Tenor=15,  # years
        Target_DSCR=1.30,
        Project_Lifetime=25,
        Tax_Rate=0.25,
        Discount_Rate=0.08
    )
    
    # Create calculator
    calc = SolarFinanceCalculator(project)
    
    # Generate report
    report = calc.generate_summary_report()
    
    # Print results
    print("=" * 80)
    print("SOLAR PROJECT FINANCIAL ANALYSIS")
    print("=" * 80)
    
    print(f"\nPROJECT SUMMARY:")
    print(f"  Capacity: {report['project_summary']['capacity_mw']} MW")
    print(f"  Total CapEx: €{report['project_summary']['total_capex']:,.0f}")
    
    print(f"\nFINANCING STRUCTURE:")
    print(f"  Max Debt (DSCR): €{report['financing_structure']['max_debt_by_dscr']:,.0f}")
    print(f"  Max Debt (Gearing): €{report['financing_structure']['max_debt_by_gearing']:,.0f}")
    print(f"  Final Debt: €{report['financing_structure']['final_debt']:,.0f}")
    print(f"  Equity: €{report['financing_structure']['equity']:,.0f}")
    print(f"  Actual Gearing: {report['financing_structure']['actual_gearing']:.1%}")
    print(f"  Binding Constraint: {report['financing_structure']['binding_constraint']}")
    print(f"  Annual Debt Service: €{report['financing_structure']['annual_debt_service']:,.0f}")
    
    print(f"\nKEY METRICS:")
    print(f"  Project IRR: {report['key_metrics']['project_irr']:.2%}")
    print(f"  Equity IRR: {report['key_metrics']['equity_irr']:.2%}")
    print(f"  LCOE: €{report['key_metrics']['lcoe']:.2f}/MWh")
    print(f"  Project NPV: €{report['key_metrics']['project_npv']:,.0f}")
    print(f"  Min DSCR: {report['key_metrics']['min_dscr']:.2f}x")
    print(f"  Avg DSCR: {report['key_metrics']['avg_dscr']:.2f}x")
    
    print(f"\nFIRST YEAR OPERATIONS:")
    print(f"  Energy Production: {report['first_year_operations']['energy_production_mwh']:,.0f} MWh")
    print(f"  Revenue: €{report['first_year_operations']['revenue']:,.0f}")
    print(f"  OM Costs: €{report['first_year_operations']['om_costs']:,.0f}")
    print(f"  EBITDA: €{report['first_year_operations']['ebitda']:,.0f}")
    print(f"  CFADS: €{report['first_year_operations']['cfads']:,.0f}")
    
    print(f"\nASSESSMENT:")
    for metric, result in report['assessment'].items():
        print(f"  {metric.upper()}: {result}")
    
    print("\n" + "=" * 80)
    
    return report


if __name__ == "__main__":
    report = example_usage()
