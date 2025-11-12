Solar Financial Model - Complete Calculation Chain
KEY INPUTS
InputUnitExampleCapacityMW50Capacity_Factordecimal0.22CapEx_per_MW€/MW1,000,000PPA_Price€/MWh70O&M_Cost_per_MW_year€/MW-yr15,000Degradation_Ratedecimal/yr0.004PPA_Escalationdecimal/yr0.00O&M_Escalationdecimal/yr0.01Gearing_Ratiodecimal0.75Interest_Ratedecimal0.045Debt_Tenoryears15Target_DSCRratio1.30Project_Lifetimeyears25Tax_Ratedecimal0.25Discount_Ratedecimal0.08

KEY INTERMEDIATE VARIABLES
1. Total CapEx

Total_CapEx = Capacity × CapEx_per_MW

Example: 50 × 1,000,000 = €50,000,000

2. Annual Energy Production (for year t)

Energy_year_t = Capacity × Capacity_Factor × 8,760 × (1 - Degradation_Rate)^(t-1)

Example Year 1: 50 × 0.22 × 8,760 × (1 - 0.004)^0 = 96,360 MWh
Example Year 2: 50 × 0.22 × 8,760 × (1 - 0.004)^1 = 95,974 MWh

3. Annual Revenue (for year t)

Revenue_year_t = Energy_year_t × PPA_Price × (1 + PPA_Escalation)^(t-1)

Example Year 1: 96,360 × 70 × (1 + 0)^0 = €6,745,200
Example Year 2: 95,974 × 70 × (1 + 0)^1 = €6,718,180

4. Annual O&M (for year t)

O&M_year_t = Capacity × O&M_Cost_per_MW_year × (1 + O&M_Escalation)^(t-1)

Example Year 1: 50 × 15,000 × (1 + 0.01)^0 = €750,000
Example Year 2: 50 × 15,000 × (1 + 0.01)^1 = €757,500

5. Annual EBITDA (for year t)

EBITDA_year_t = Revenue_year_t - O&M_year_t

Example Year 1: 6,745,200 - 750,000 = €5,995,200
Example Year 2: 6,718,180 - 757,500 = €5,960,680

6. Annual CFADS (for year t)

CFADS_year_t = EBITDA_year_t × (1 - Tax_Rate)

Example Year 1: 5,995,200 × (1 - 0.25) = €4,496,400
Example Year 2: 5,960,680 × (1 - 0.25) = €4,470,510

7. PV of CFADS

PV_of_CFADS = Sum from year 1 to Debt_Tenor of [CFADS_year_t ÷ (1 + Interest_Rate)^t]

Example: 
  Year 1: 4,496,400 ÷ (1.045)^1 = 4,301,340
  Year 2: 4,470,510 ÷ (1.045)^2 = 4,094,267
  ...
  Year 15: 4,108,000 ÷ (1.045)^15 = 2,123,134
  
  PV_of_CFADS = 4,301,340 + 4,094,267 + ... + 2,123,134 = €54,123,456
  
 8. Max Debt by DSCR
 
 Max_Debt_by_DSCR = PV_of_CFADS ÷ Target_DSCR

Example: 54,123,456 ÷ 1.30 = €41,633,428

9. Max Debt by Gearing

Max_Debt_by_Gearing = Total_CapEx × Gearing_Ratio

Example: 50,000,000 × 0.75 = €37,500,000

10. Final Debt Amount

Final_Debt = MINIMUM(Max_Debt_by_DSCR, Max_Debt_by_Gearing)

Example: MINIMUM(41,633,428, 37,500,000) = €37,500,000

11. Equity Amount

Equity = Total_CapEx - Final_Debt

Example: 50,000,000 - 37,500,000 = €12,500,000

12. Annual Debt Service

Annual_Debt_Service = Final_Debt × [Interest_Rate × (1 + Interest_Rate)^Debt_Tenor] ÷ [(1 + Interest_Rate)^Debt_Tenor - 1]

Example: 
  Annual_Debt_Service = 37,500,000 × [0.045 × (1.045)^15] ÷ [(1.045)^15 - 1]
                      = 37,500,000 × [0.045 × 1.935] ÷ [0.935]
                      = 37,500,000 × 0.0931
                      = €3,491,250
					  
13. Free Cash Flow to Equity (for year t)

IF year t ≤ Debt_Tenor:
    FCF_to_Equity_year_t = CFADS_year_t - Annual_Debt_Service
ELSE:
    FCF_to_Equity_year_t = CFADS_year_t

Example Year 1:  4,496,400 - 3,491,250 = €1,005,150
Example Year 15: 4,108,000 - 3,491,250 = €616,750
Example Year 16: 4,082,000 - 0 = €4,082,000
Example Year 25: 4,108,000 - 0 = €4,108,000

14. NPV of Costs

NPV_of_Costs = Total_CapEx + Sum from year 1 to Project_Lifetime of [O&M_year_t ÷ (1 + Discount_Rate)^t]

Example:
  Year 0: 50,000,000
  Year 1: 750,000 ÷ (1.08)^1 = 694,444
  Year 2: 757,500 ÷ (1.08)^2 = 649,846
  ...
  Year 25: 961,000 ÷ (1.08)^25 = 140,234
  
  NPV_of_Costs = 50,000,000 + 694,444 + 649,846 + ... + 140,234 = €58,456,789
  
15. NPV of Energy

NPV_of_Energy = Sum from year 1 to Project_Lifetime of [Energy_year_t ÷ (1 + Discount_Rate)^t]

Example:
  Year 1: 96,360 ÷ (1.08)^1 = 89,222 MWh
  Year 2: 95,974 ÷ (1.08)^2 = 82,239 MWh
  ...
  Year 25: 87,500 ÷ (1.08)^25 = 12,766 MWh
  
  NPV_of_Energy = 89,222 + 82,239 + ... + 12,766 = 1,042,567 MWh
  
16. DSCR (for year t, only years 1 to Debt_Tenor)

DSCR_year_t = CFADS_year_t ÷ Annual_Debt_Service

Example Year 1: 4,496,400 ÷ 3,491,250 = 1.29
Example Year 2: 4,470,510 ÷ 3,491,250 = 1.28
Example Year 15: 4,108,000 ÷ 3,491,250 = 1.18

KEY OUTPUTS
1. Project IRR

Project_IRR = The rate where:
    -Total_CapEx + Sum from year 1 to Project_Lifetime of [CFADS_year_t ÷ (1 + Project_IRR)^t] = 0

Solved numerically using Newton-Raphson method.

Example: Project_IRR = 0.078 = 7.8%

2. Equity IRR

Equity_IRR = The rate where:
    -Equity + Sum from year 1 to Project_Lifetime of [FCF_to_Equity_year_t ÷ (1 + Equity_IRR)^t] = 0

Solved numerically using Newton-Raphson method.

Example: Equity_IRR = 0.112 = 11.2%

3. LCOE

LCOE = NPV_of_Costs ÷ NPV_of_Energy

Example: 58,456,789 ÷ 1,042,567 = €56.08/MWh

4. Minimum DSCR

Minimum_DSCR = MINIMUM(DSCR_year_1, DSCR_year_2, ..., DSCR_year_Debt_Tenor)

Example: MINIMUM(1.29, 1.28, ..., 1.18) = 1.18

5. Average DSCR

Average_DSCR = (DSCR_year_1 + DSCR_year_2 + ... + DSCR_year_Debt_Tenor) ÷ Debt_Tenor

Example: (1.29 + 1.28 + ... + 1.18) ÷ 15 = 1.24

6. Project NPV

Project_NPV = -Total_CapEx + Sum from year 1 to Project_Lifetime of [CFADS_year_t ÷ (1 + Discount_Rate)^t]

Example: -50,000,000 + 4,496,400/(1.08)^1 + ... + 4,108,000/(1.08)^25 = €8,456,789