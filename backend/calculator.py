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
    Capacity_Factor: float  # decimal (e.g., 0.22 for 22%)
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
    
    def calc_Total_CapEx(self) -> float:
        """1. Total CapEx = Capacity × CapEx_per_MW"""
        return self.inputs.Capacity * self.inputs.CapEx_per_MW
    
    def calc_Energy_year_t(self, year: int) -> float:
        """2. Energy = Capacity × CF × 8760 × (1 - Degradation)^(year-1)"""
        return (
            self.inputs.Capacity 
            * self.inputs.Capacity_Factor 
            * 8760 
            * (1 - self.inputs.Degradation_Rate) ** (year - 1)
        )
    
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
        
        # First year operations
        year1_energy = self.calc_Energy_year_t(1)
        year1_revenue = self.calc_Revenue_year_t(1)
        year1_om = self.calc_OM_year_t(1)
        year1_ebitda = self.calc_EBITDA_year_t(1)
        year1_cfads = self.calc_CFADS_year_t(1)
        
        return {
            "project_summary": {
                "capacity_mw": self.inputs.Capacity,
                "capacity_factor": self.inputs.Capacity_Factor,
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
                "ppa_price": self.inputs.PPA_Price
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
    project = ProjectInputs(
        Capacity=50,  # MW
        Capacity_Factor=0.22,  # 22%
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
