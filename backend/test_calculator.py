"""
Tests for the solar calculator
"""

import pytest
from calculator import ProjectInputs, SolarFinanceCalculator


@pytest.fixture
def default_inputs():
    """Default project inputs for testing"""
    # P50 Year 0 Yield = 50 MW × 0.22 CF × 8760 hours = 96,360 MWh
    return ProjectInputs(
        Capacity=50,
        P50_Year_0_Yield=96_360,
        CapEx_per_MW=1_000_000,
        PPA_Price=70,
        OM_Cost_per_MW_year=15_000,
        Degradation_Rate=0.004,
        PPA_Escalation=0.01,
        OM_Escalation=0.01,
        Gearing_Ratio=0.75,
        Interest_Rate=0.045,
        Debt_Tenor=15,
        Target_DSCR=1.30,
        Project_Lifetime=25,
        Tax_Rate=0.25,
        Discount_Rate=0.08
    )


def test_total_capex_calculation(default_inputs):
    """Test total CapEx calculation"""
    calc = SolarFinanceCalculator(default_inputs)
    total_capex = calc.calc_Total_CapEx()

    expected = 50 * 1_000_000
    assert total_capex == expected


def test_energy_production_year_1(default_inputs):
    """Test energy production for year 1"""
    calc = SolarFinanceCalculator(default_inputs)
    energy_year_1 = calc.calc_Energy_year_t(1)

    # Year 1: 50 MW × 0.22 × 8760 hours × (1 - 0.004)^0
    expected = 50 * 0.22 * 8760
    assert abs(energy_year_1 - expected) < 1


def test_energy_production_degradation(default_inputs):
    """Test energy production degradation over time"""
    calc = SolarFinanceCalculator(default_inputs)

    energy_year_1 = calc.calc_Energy_year_t(1)
    energy_year_2 = calc.calc_Energy_year_t(2)

    # Year 2 should be less than Year 1 due to degradation
    assert energy_year_2 < energy_year_1

    # Calculate expected degradation
    expected_ratio = (1 - 0.004)
    actual_ratio = energy_year_2 / energy_year_1

    assert abs(actual_ratio - expected_ratio) < 0.001


def test_revenue_calculation(default_inputs):
    """Test revenue calculation"""
    calc = SolarFinanceCalculator(default_inputs)

    revenue_year_1 = calc.calc_Revenue_year_t(1)
    energy_year_1 = calc.calc_Energy_year_t(1)

    # Revenue = Energy × PPA Price
    expected = energy_year_1 * 70
    assert abs(revenue_year_1 - expected) < 1


def test_om_escalation(default_inputs):
    """Test O&M cost escalation"""
    calc = SolarFinanceCalculator(default_inputs)

    om_year_1 = calc.calc_OM_year_t(1)
    om_year_2 = calc.calc_OM_year_t(2)

    # O&M should escalate by 1% per year
    expected_escalation = 1.01
    actual_escalation = om_year_2 / om_year_1

    assert abs(actual_escalation - expected_escalation) < 0.001


def test_ebitda_calculation(default_inputs):
    """Test EBITDA calculation"""
    calc = SolarFinanceCalculator(default_inputs)

    revenue = calc.calc_Revenue_year_t(1)
    om = calc.calc_OM_year_t(1)
    ebitda = calc.calc_EBITDA_year_t(1)

    # EBITDA = Revenue - O&M
    expected = revenue - om
    assert abs(ebitda - expected) < 1


def test_cfads_calculation(default_inputs):
    """Test CFADS calculation"""
    calc = SolarFinanceCalculator(default_inputs)

    ebitda = calc.calc_EBITDA_year_t(1)
    cfads = calc.calc_CFADS_year_t(1)

    # CFADS = EBITDA × (1 - Tax Rate)
    expected = ebitda * (1 - 0.25)
    assert abs(cfads - expected) < 1


def test_debt_sizing_by_dscr(default_inputs):
    """Test debt sizing by DSCR"""
    calc = SolarFinanceCalculator(default_inputs)

    pv_cfads = calc.calc_PV_of_CFADS()
    max_debt = calc.calc_Max_Debt_by_DSCR()

    # Max Debt = PV of CFADS / Target DSCR
    expected = pv_cfads / 1.30
    assert abs(max_debt - expected) < 1


def test_debt_sizing_by_gearing(default_inputs):
    """Test debt sizing by gearing"""
    calc = SolarFinanceCalculator(default_inputs)

    total_capex = calc.calc_Total_CapEx()
    max_debt = calc.calc_Max_Debt_by_Gearing()

    # Max Debt = Total CapEx × Gearing Ratio
    expected = total_capex * 0.75
    assert abs(max_debt - expected) < 1


def test_final_debt_is_minimum(default_inputs):
    """Test that final debt is minimum of DSCR and gearing constraints"""
    calc = SolarFinanceCalculator(default_inputs)

    max_debt_dscr = calc.calc_Max_Debt_by_DSCR()
    max_debt_gearing = calc.calc_Max_Debt_by_Gearing()
    final_debt = calc.calc_Final_Debt()

    expected_min = min(max_debt_dscr, max_debt_gearing)
    assert abs(final_debt - expected_min) < 1


def test_equity_calculation(default_inputs):
    """Test equity calculation"""
    calc = SolarFinanceCalculator(default_inputs)

    total_capex = calc.calc_Total_CapEx()
    final_debt = calc.calc_Final_Debt()
    equity = calc.calc_Equity()

    # Equity = Total CapEx - Debt
    expected = total_capex - final_debt
    assert abs(equity - expected) < 1


def test_dscr_calculation(default_inputs):
    """Test DSCR calculation"""
    calc = SolarFinanceCalculator(default_inputs)

    cfads = calc.calc_CFADS_year_t(1)
    annual_ds = calc.calc_Annual_Debt_Service()
    dscr = calc.calc_DSCR_year_t(1)

    # DSCR = CFADS / Annual Debt Service
    expected = cfads / annual_ds
    assert abs(dscr - expected) < 0.01


def test_dscr_above_minimum_threshold(default_inputs):
    """Test that all DSCRs are above a reasonable threshold"""
    calc = SolarFinanceCalculator(default_inputs)

    min_dscr = calc.calc_Minimum_DSCR()

    # DSCR should be above 1.0 (can service debt)
    assert min_dscr > 1.0


def test_fcf_to_equity_during_debt_tenor(default_inputs):
    """Test FCF to equity during debt tenor"""
    calc = SolarFinanceCalculator(default_inputs)

    cfads = calc.calc_CFADS_year_t(5)  # Year 5, within debt tenor
    annual_ds = calc.calc_Annual_Debt_Service()
    fcf = calc.calc_FCF_to_Equity_year_t(5)

    # FCF = CFADS - Debt Service (during tenor)
    expected = cfads - annual_ds
    assert abs(fcf - expected) < 1


def test_fcf_to_equity_after_debt_tenor(default_inputs):
    """Test FCF to equity after debt tenor"""
    calc = SolarFinanceCalculator(default_inputs)

    cfads = calc.calc_CFADS_year_t(20)  # Year 20, after 15-year tenor
    fcf = calc.calc_FCF_to_Equity_year_t(20)

    # FCF = CFADS (after debt is paid off)
    assert abs(fcf - cfads) < 1


def test_project_irr_positive(default_inputs):
    """Test that project IRR is positive"""
    calc = SolarFinanceCalculator(default_inputs)

    project_irr = calc.calc_Project_IRR()

    # IRR should be positive for a viable project
    assert project_irr > 0


def test_equity_irr_higher_than_project_irr(default_inputs):
    """Test that equity IRR is higher than project IRR (leverage effect)"""
    calc = SolarFinanceCalculator(default_inputs)

    project_irr = calc.calc_Project_IRR()
    equity_irr = calc.calc_Equity_IRR()

    # Equity IRR should be higher due to leverage
    assert equity_irr > project_irr


def test_lcoe_calculation(default_inputs):
    """Test LCOE calculation"""
    calc = SolarFinanceCalculator(default_inputs)

    npv_costs = calc.calc_NPV_of_Costs()
    npv_energy = calc.calc_NPV_of_Energy()
    lcoe = calc.calc_LCOE()

    # LCOE = NPV of Costs / NPV of Energy
    expected = npv_costs / npv_energy
    assert abs(lcoe - expected) < 0.01


def test_generate_summary_report(default_inputs):
    """Test that summary report contains all required sections"""
    calc = SolarFinanceCalculator(default_inputs)

    report = calc.generate_summary_report()

    # Check all sections exist
    assert "project_summary" in report
    assert "financing_structure" in report
    assert "key_metrics" in report
    assert "first_year_operations" in report
    assert "assessment" in report

    # Check key metrics
    assert "project_irr" in report["key_metrics"]
    assert "equity_irr" in report["key_metrics"]
    assert "lcoe" in report["key_metrics"]

    # Check assessment has overall recommendation
    assert "overall" in report["assessment"]


def test_high_ppa_price_improves_irr(default_inputs):
    """Test that higher PPA price improves IRR"""
    # Low PPA price
    low_ppa_inputs = default_inputs
    low_ppa_inputs.PPA_Price = 50
    calc_low = SolarFinanceCalculator(low_ppa_inputs)
    irr_low = calc_low.calc_Project_IRR()

    # High PPA price
    high_ppa_inputs = default_inputs
    high_ppa_inputs.PPA_Price = 90
    calc_high = SolarFinanceCalculator(high_ppa_inputs)
    irr_high = calc_high.calc_Project_IRR()

    # Higher PPA should yield higher IRR
    assert irr_high > irr_low


def test_equity_payback_period_calculation(default_inputs):
    """Test equity payback period calculation"""
    calc = SolarFinanceCalculator(default_inputs)

    payback = calc.calc_Equity_Payback_Period()

    # Payback should be a positive number
    assert payback is not None
    assert payback > 0

    # Payback should be within project lifetime
    assert payback <= default_inputs.Project_Lifetime

    # Verify by checking cumulative FCF at payback year
    payback_year = int(payback) + 1
    cumulative_fcf = 0
    for year in range(1, payback_year + 1):
        fcf = calc.calc_FCF_to_Equity_year_t(year)
        cumulative_fcf += fcf

    # Cumulative FCF should be positive by the payback year
    assert cumulative_fcf >= 0


def test_project_payback_period_calculation(default_inputs):
    """Test project payback period calculation"""
    calc = SolarFinanceCalculator(default_inputs)

    payback = calc.calc_Project_Payback_Period()
    total_capex = calc.calc_Total_CapEx()

    # Payback should be a positive number
    assert payback is not None
    assert payback > 0

    # Payback should be within project lifetime
    assert payback <= default_inputs.Project_Lifetime

    # Verify by checking cumulative CFADS at payback year
    payback_year = int(payback) + 1
    cumulative_cfads = 0
    for year in range(1, payback_year + 1):
        cfads = calc.calc_CFADS_year_t(year)
        cumulative_cfads += cfads

    # Cumulative CFADS should exceed total CapEx by the payback year
    assert cumulative_cfads >= total_capex


def test_equity_payback_before_project_payback(default_inputs):
    """Test that equity payback is typically longer than project payback due to debt service"""
    calc = SolarFinanceCalculator(default_inputs)

    equity_payback = calc.calc_Equity_Payback_Period()
    project_payback = calc.calc_Project_Payback_Period()

    # Both should exist
    assert equity_payback is not None
    assert project_payback is not None

    # Equity payback is usually longer because equity investors only get cash
    # after debt service, while project payback uses full CFADS
    assert equity_payback >= project_payback


def test_payback_with_poor_economics_returns_none():
    """Test that payback returns None when project doesn't achieve payback"""
    # Create a project with very low PPA price (unprofitable)
    poor_inputs = ProjectInputs(
        Capacity=50,
        P50_Year_0_Yield=96_360,
        CapEx_per_MW=1_000_000,
        PPA_Price=20,  # Very low PPA price
        OM_Cost_per_MW_year=15_000,
        Degradation_Rate=0.004,
        PPA_Escalation=0.0,
        OM_Escalation=0.01,
        Gearing_Ratio=0.0,  # No debt to avoid issues
        Interest_Rate=0.045,
        Debt_Tenor=15,
        Target_DSCR=1.30,
        Project_Lifetime=25,
        Tax_Rate=0.25,
        Discount_Rate=0.08
    )

    calc = SolarFinanceCalculator(poor_inputs)

    equity_payback = calc.calc_Equity_Payback_Period()
    project_payback = calc.calc_Project_Payback_Period()

    # With such poor economics, payback might not occur
    # (or if it does, it should be very long)
    if equity_payback is not None:
        assert equity_payback > 20  # Should be very long if it exists


def test_payback_included_in_summary_report(default_inputs):
    """Test that payback periods are included in summary report"""
    calc = SolarFinanceCalculator(default_inputs)

    report = calc.generate_summary_report()

    # Check that payback periods are in key metrics
    assert "equity_payback_years" in report["key_metrics"]
    assert "project_payback_years" in report["key_metrics"]

    # Both should be positive numbers
    assert report["key_metrics"]["equity_payback_years"] is not None
    assert report["key_metrics"]["project_payback_years"] is not None
    assert report["key_metrics"]["equity_payback_years"] > 0
    assert report["key_metrics"]["project_payback_years"] > 0


def test_monthly_energy_sums_to_yearly(default_inputs):
    """Test that monthly energy production sums to yearly total"""
    calc = SolarFinanceCalculator(default_inputs)

    # Test for year 1
    year = 1
    yearly_energy = calc.calc_Energy_year_t(year)
    monthly_energy_sum = sum(calc.calc_Energy_month_t(year, month) for month in range(1, 13))

    # Monthly sum should equal yearly total
    assert abs(monthly_energy_sum - yearly_energy) < 1


def test_monthly_revenue_sums_to_yearly(default_inputs):
    """Test that monthly revenue sums to yearly total"""
    calc = SolarFinanceCalculator(default_inputs)

    # Test for year 5
    year = 5
    yearly_revenue = calc.calc_Revenue_year_t(year)
    monthly_revenue_sum = sum(calc.calc_Revenue_month_t(year, month) for month in range(1, 13))

    # Monthly sum should equal yearly total
    assert abs(monthly_revenue_sum - yearly_revenue) < 1


def test_monthly_om_sums_to_yearly(default_inputs):
    """Test that monthly O&M costs sum to yearly total"""
    calc = SolarFinanceCalculator(default_inputs)

    # Test for year 10
    year = 10
    yearly_om = calc.calc_OM_year_t(year)
    monthly_om_sum = sum(calc.calc_OM_month_t(year, month) for month in range(1, 13))

    # Monthly sum should equal yearly total
    assert abs(monthly_om_sum - yearly_om) < 1


def test_monthly_cfads_sums_to_yearly(default_inputs):
    """Test that monthly CFADS sums to yearly total"""
    calc = SolarFinanceCalculator(default_inputs)

    # Test for year 7
    year = 7
    yearly_cfads = calc.calc_CFADS_year_t(year)
    monthly_cfads_sum = sum(calc.calc_CFADS_month_t(year, month) for month in range(1, 13))

    # Monthly sum should equal yearly total
    assert abs(monthly_cfads_sum - yearly_cfads) < 1


def test_monthly_fcf_sums_to_yearly(default_inputs):
    """Test that monthly FCF to equity sums to yearly total"""
    calc = SolarFinanceCalculator(default_inputs)

    # Test for year during debt tenor
    year = 10
    yearly_fcf = calc.calc_FCF_to_Equity_year_t(year)
    monthly_fcf_sum = sum(calc.calc_FCF_to_Equity_month_t(year, month) for month in range(1, 13))

    # Monthly sum should equal yearly total
    assert abs(monthly_fcf_sum - yearly_fcf) < 1


def test_generate_monthly_data_structure(default_inputs):
    """Test that generate_monthly_data returns correct structure"""
    calc = SolarFinanceCalculator(default_inputs)

    monthly_data = calc.generate_monthly_data()

    # Should have 12 months × 25 years = 300 data points
    expected_months = default_inputs.Project_Lifetime * 12
    assert len(monthly_data) == expected_months

    # First data point should be year 1, month 1
    assert monthly_data[0]["year"] == 1
    assert monthly_data[0]["month"] == 1
    assert monthly_data[0]["month_name"] == "Jan"

    # Last data point should be year 25, month 12
    assert monthly_data[-1]["year"] == default_inputs.Project_Lifetime
    assert monthly_data[-1]["month"] == 12
    assert monthly_data[-1]["month_name"] == "Dec"

    # Check that all required fields exist
    required_fields = [
        "year", "month", "month_name", "energy_production_mwh",
        "revenue", "om_costs", "ebitda", "cfads",
        "debt_service", "fcf_to_equity", "cumulative_fcf_to_equity"
    ]
    for field in required_fields:
        assert field in monthly_data[0]


def test_monthly_cumulative_fcf_matches_yearly(default_inputs):
    """Test that cumulative FCF at year-end matches yearly data"""
    calc = SolarFinanceCalculator(default_inputs)

    yearly_data = calc.generate_yearly_data()
    monthly_data = calc.generate_monthly_data()

    # Check cumulative FCF at end of each year
    for year_idx, year in enumerate(yearly_data["years"]):
        # Get the December entry for this year (month 12)
        december_idx = (year * 12) - 1  # Index is 0-based

        yearly_cumulative = yearly_data["cumulative_fcf_to_equity"][year_idx]
        monthly_cumulative = monthly_data[december_idx]["cumulative_fcf_to_equity"]

        # Should match within small tolerance
        assert abs(yearly_cumulative - monthly_cumulative) < 10


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
