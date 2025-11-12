// Cost line item types
export interface CostLineItem {
  name: string;
  amount: number;
  is_capex: boolean;
  escalation_rate: number;
}

// Project input types
export interface ProjectInputs {
  // Required inputs
  capacity: number;
  capacity_factor: number;
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

export interface ProjectResults {
  project_summary: ProjectSummary;
  financing_structure: FinancingStructure;
  key_metrics: KeyMetrics;
  first_year_operations: FirstYearOperations;
  assessment: Assessment;
  cost_items_breakdown?: CostItemsBreakdown;
}

// Default values
export const DEFAULT_INPUTS: ProjectInputs = {
  capacity: 50,
  capacity_factor: 0.22,
  capex_per_mw: 1_000_000,
  ppa_price: 70,
  om_cost_per_mw_year: 15_000,
  degradation_rate: 0.004,
  ppa_escalation: 0.01,
  om_escalation: 0.01,
  gearing_ratio: 0.75,
  interest_rate: 0.045,
  debt_tenor: 15,
  target_dscr: 1.30,
  project_lifetime: 25,
  tax_rate: 0.25,
  discount_rate: 0.08,
};
