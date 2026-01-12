// Cost line item types
export interface CostLineItem {
  name: string;
  amount: number;  // For OpEx: total amount. For CapEx: calculated from unit_price × quantity
  is_capex: boolean;
  category: string;  // Category grouping for UI organization
  // CapEx-specific fields
  unit_price?: number;  // Price per item (CapEx only)
  quantity?: number;    // Number of items (CapEx only)
  unit?: string;        // Display unit (e.g., "MW", "panels", "meters")
  margin_percent?: number;  // CapEx-only: margin override (uses global if undefined)
}

// Template types for saving/loading cost breakdowns
export interface CostTemplate {
  id: string;              // UUID for deduplication
  name: string;            // User-defined template name
  description?: string;    // Optional description
  created_at: string;      // ISO timestamp
  updated_at: string;      // ISO timestamp
  version: number;         // Schema version (start at 1)

  // Template content
  capex_items: CostLineItem[];
  opex_items: CostLineItem[];
  global_margin: number;

  // Metadata
  category?: string;       // User-defined category (e.g., "Solar", "Wind")
  tags?: string[];         // Optional tags for filtering
}

export interface TemplateListItem {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  item_count: number;  // Total CAPEX + OPEX items
}

// Project input types
export interface ProjectInputs {
  // Required inputs
  capacity: number;
  p50_year_0_yield: number;  // MWh - Year 0/Year 1 energy production
  capex_per_mw?: number;  // Optional if using cost_items
  ppa_price: number;
  om_cost_per_mw_year?: number;  // Optional if using cost_items

  // Optional cost line items
  cost_items?: CostLineItem[];

  // Technical parameters with defaults
  degradation_rate: number;

  // Economic parameters with defaults
  ppa_escalation: number;
  om_escalation: number;

  // Financing parameters
  gearing_ratio: number;
  interest_rate: number;
  debt_tenor: number;
  target_dscr: number;

  // Project timeline
  project_lifetime: number;

  // Tax and discount
  tax_rate: number;
  discount_rate: number;
}

// Project results types
export interface ProjectSummary {
  capacity_mw: number;
  capacity_factor: number;
  p50_year_0_yield_mwh: number;
  project_lifetime: number;
  total_capex: number;
  capex_per_mw: number;
}

export interface FinancingStructure {
  max_debt_by_dscr: number;
  max_debt_by_gearing: number;
  final_debt: number;
  equity: number;
  actual_gearing: number;
  binding_constraint: string;
  interest_rate: number;
  debt_tenor: number;
  annual_debt_service: number;
}

export interface KeyMetrics {
  project_irr: number;
  equity_irr: number;
  lcoe: number;
  min_dscr: number;
  avg_dscr: number;
  project_npv: number;
  ppa_price: number;
  equity_payback_years: number | null;
  project_payback_years: number | null;
}

export interface FirstYearOperations {
  energy_production_mwh: number;
  revenue: number;
  om_costs: number;
  ebitda: number;
  cfads: number;
}

export interface Assessment {
  project_irr: string;
  equity_irr: string;
  dscr: string;
  overall: string;
}

export interface CostItemsBreakdown {
  items: CostLineItem[];
  total_capex: number;
  total_opex_year_1: number;
}

export interface YearlyData {
  years: number[];
  energy_production_mwh: number[];
  revenue: number[];
  om_costs: number[];
  ebitda: number[];
  cfads: number[];
  fcf_to_equity: number[];
  debt_service: number[];
  dscr: (number | null)[];
  cumulative_fcf_to_equity: number[];
}

export interface MonthlyDataPoint {
  year: number;
  month: number;
  month_name: string;
  energy_production_mwh: number;
  revenue: number;
  om_costs: number;
  ebitda: number;
  cfads: number;
  debt_service: number;
  fcf_to_equity: number;
  cumulative_fcf_to_equity: number;
}

export interface CalculationStep {
  step_number: number;
  name: string;
  formula: string;
  inputs: Record<string, number | string>;
  calculation: string;
  result: number;
  unit: string;
}

export interface FormulaReference {
  category: string;
  formulas: string[];
}

export interface AuditLog {
  formulas_reference: FormulaReference[];
  calculation_steps: CalculationStep[];
  binding_constraint: {
    debt_sizing: {
      max_by_dscr: number;
      max_by_gearing: number;
      chosen: number;
      constraint: string;
      reason: string;
    };
  };
  key_assumptions: Record<string, number>;
}

export interface ProjectResults {
  project_summary: ProjectSummary;
  financing_structure: FinancingStructure;
  key_metrics: KeyMetrics;
  first_year_operations: FirstYearOperations;
  assessment: Assessment;
  cost_items_breakdown?: CostItemsBreakdown;
  yearly_data?: YearlyData;
  monthly_data?: MonthlyDataPoint[];
  audit_log?: AuditLog;
}

// Default values for 300 MW utility-scale ground mount project
// P50 Year 0 Yield calculated as: 300 MW × 0.22 CF × 8760 hours = 577,920 MWh
export const DEFAULT_INPUTS: ProjectInputs = {
  capacity: 300,
  p50_year_0_yield: 577_920,  // MWh
  capex_per_mw: 850_000,
  ppa_price: 65,
  om_cost_per_mw_year: 12_000,
  degradation_rate: 0.004,
  ppa_escalation: 0.0,
  om_escalation: 0.01,
  gearing_ratio: 0.75,
  interest_rate: 0.045,
  debt_tenor: 15,
  target_dscr: 1.30,
  project_lifetime: 25,
  tax_rate: 0.25,
  discount_rate: 0.08,
};
