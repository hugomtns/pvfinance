import type { CostLineItem } from '../types';
import { ALL_CAPEX_FIELDS } from '../data/capexFields';
import { ALL_OPEX_FIELDS } from '../data/opexFields';

/**
 * Design Generator for PV Finance
 * Generates realistic CAPEX and OPEX line items based on system capacity
 * Assumptions: Ground-mounted systems, 2025 market prices
 */

// ============================================================================
// PRICING CONSTANTS (2025 Market Prices)
// ============================================================================

const PRICING = {
  // PV Equipment - competitive market rates
  SOLAR_MODULE_UNIT_PRICE: 100, // €/panel (550W panels, ~€0.18/W)
  SOLAR_MODULE_WATTAGE: 550, // W per panel
  STRING_INVERTER_UNIT_PRICE: 4200, // € per 100kW inverter
  STRING_INVERTER_CAPACITY_KW: 100, // kW per inverter
  COMBINER_BOX_UNIT_PRICE: 600, // € per box
  COMBINER_BOXES_PER_MW: 4, // boxes per MW

  // Mounting & Installation - optimized for ground mount
  MOUNTING_STRUCTURE_PER_KW: 55, // €/kW for fixed tilt ground mount
  FOUNDATIONS_PER_KW: 40, // €/kW for civil works

  // Electrical Infrastructure - efficient sizing
  DC_CABLE_UNIT_PRICE: 50, // €/m for DC cables
  DC_CABLE_METERS_PER_MW: 150, // meters of DC cable per MW
  AC_CABLE_UNIT_PRICE: 75, // €/m for AC cables
  AC_CABLE_METERS_PER_MW: 200, // meters of AC cable per MW
  MV_TRANSFORMER_UNIT_PRICE: 60000, // € per transformer
  MV_TRANSFORMER_CAPACITY_MW: 5, // MW capacity per transformer
  GRID_CONNECTION_PER_MW: 38000, // € per MW for grid connection equipment

  // Monitoring & Control - standard systems
  SCADA_BASE_COST: 30000, // € base cost
  SCADA_PER_MW: 6000, // € per MW additional

  // Site Infrastructure - efficient design
  FENCING_UNIT_PRICE: 50, // €/m for perimeter fencing
  FENCING_METERS_PER_HECTARE: 400, // m of fencing per hectare
  HECTARES_PER_MW: 2, // hectares per MW for ground mount
  ACCESS_ROADS_PER_MW: 11000, // € per MW for access roads

  // Construction & Services - competitive labor rates
  LABOR_INSTALLATION_PER_KW: 90, // €/kW for installation labor
  PROJECT_MANAGEMENT_PER_MW: 18000, // € per MW
  ENGINEERING_DESIGN_PER_MW: 18000, // € per MW

  // OPEX (Annual Costs) - efficient operations
  PREVENTIVE_MAINTENANCE_PER_MW_YEAR: 12500, // €/MW/year
  MODULE_CLEANING_PER_MW_YEAR: 4500, // €/MW/year (2-3x cleaning)
  ASSET_MANAGEMENT_PER_MW_YEAR: 2800, // €/MW/year
  INSURANCE_PERCENT_OF_CAPEX: 0.003, // 0.3% of CAPEX per year
  LAND_LEASE_PER_MW_YEAR: 2400, // €/MW/year
  SCADA_MAINTENANCE_PER_MW_YEAR: 1700, // €/MW/year
  GRID_CONNECTION_FEE_PER_MW_YEAR: 1000, // €/MW/year
  LEGAL_COMPLIANCE_PER_MW_YEAR: 1000, // €/MW/year
};

// DC/AC ratio for inverter sizing
const DC_AC_RATIO = 1.25;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Rounds a number to 2 decimal places
 */
const round = (num: number): number => Math.round(num * 100) / 100;

/**
 * Creates a CAPEX line item
 */
const createCapexItem = (
  name: string,
  quantity: number,
  unitPrice: number
): CostLineItem => ({
  name,
  quantity: round(quantity),
  unit_price: round(unitPrice),
  amount: round(quantity * unitPrice),
  is_capex: true,
});

/**
 * Creates an OPEX line item
 */
const createOpexItem = (name: string, amount: number): CostLineItem => ({
  name,
  amount: round(amount),
  is_capex: false,
});

/**
 * Validates that a field name exists in the dropdown options
 */
const validateCapexField = (name: string): boolean => {
  return ALL_CAPEX_FIELDS.includes(name);
};

const validateOpexField = (name: string): boolean => {
  return ALL_OPEX_FIELDS.includes(name);
};

// ============================================================================
// CAPEX GENERATOR
// ============================================================================

/**
 * Generates essential CAPEX line items for a ground-mounted PV system
 * @param capacityMW - System capacity in MW (AC)
 * @returns Array of CAPEX line items with realistic quantities and prices
 */
export const generateCapexItems = (capacityMW: number): CostLineItem[] => {
  if (capacityMW <= 0) {
    console.warn('Capacity must be greater than 0');
    return [];
  }

  const capacityKW = capacityMW * 1000;
  const capacityW = capacityMW * 1_000_000;
  const dcCapacityW = capacityW * DC_AC_RATIO; // DC capacity considering DC/AC ratio

  const items: CostLineItem[] = [];

  // ------------------------------------------------------------------------
  // PV EQUIPMENT
  // ------------------------------------------------------------------------

  // PV modules
  const numPanels = Math.round(dcCapacityW / PRICING.SOLAR_MODULE_WATTAGE);
  items.push(
    createCapexItem(
      'PV modules',
      numPanels,
      PRICING.SOLAR_MODULE_UNIT_PRICE
    )
  );

  // Inverters
  const numInverters = Math.ceil(
    capacityKW / PRICING.STRING_INVERTER_CAPACITY_KW
  );
  items.push(
    createCapexItem(
      'Inverters',
      numInverters,
      PRICING.STRING_INVERTER_UNIT_PRICE
    )
  );

  // String combiner boxes (SCBs)
  const numCombinerBoxes = Math.ceil(
    capacityMW * PRICING.COMBINER_BOXES_PER_MW
  );
  items.push(
    createCapexItem(
      'String combiner boxes (SCBs)',
      numCombinerBoxes,
      PRICING.COMBINER_BOX_UNIT_PRICE
    )
  );

  // ------------------------------------------------------------------------
  // MOUNTING & INSTALLATION
  // ------------------------------------------------------------------------

  // Mounting structure/substructure (quantity in MW for cleaner display)
  items.push(
    createCapexItem(
      'Mounting structure/substructure',
      capacityMW,
      PRICING.MOUNTING_STRUCTURE_PER_KW * 1000 // Convert to per-MW pricing
    )
  );

  // Complete installation works (quantity in MW for cleaner display)
  items.push(
    createCapexItem(
      'Complete installation works',
      capacityMW,
      PRICING.LABOR_INSTALLATION_PER_KW * 1000 // Convert to per-MW pricing
    )
  );

  // ------------------------------------------------------------------------
  // ELECTRICAL INFRASTRUCTURE
  // ------------------------------------------------------------------------

  // DC string cables
  const dcCableLength = Math.round(
    capacityMW * PRICING.DC_CABLE_METERS_PER_MW
  );
  items.push(
    createCapexItem('DC string cables', dcCableLength, PRICING.DC_CABLE_UNIT_PRICE)
  );

  // AC cables
  const acCableLength = Math.round(
    capacityMW * PRICING.AC_CABLE_METERS_PER_MW
  );
  items.push(
    createCapexItem('AC cables', acCableLength, PRICING.AC_CABLE_UNIT_PRICE)
  );

  // MV transformer stations (various capacities)
  const numTransformers = Math.ceil(
    capacityMW / PRICING.MV_TRANSFORMER_CAPACITY_MW
  );
  items.push(
    createCapexItem(
      'MV transformer stations (various capacities)',
      numTransformers,
      PRICING.MV_TRANSFORMER_UNIT_PRICE
    )
  );

  // MV/HV substation + cable route
  items.push(
    createCapexItem(
      'MV/HV substation + cable route',
      capacityMW,
      PRICING.GRID_CONNECTION_PER_MW
    )
  );

  // ------------------------------------------------------------------------
  // MONITORING & CONTROL SYSTEMS
  // ------------------------------------------------------------------------

  // SCADA system
  const scadaCost = PRICING.SCADA_BASE_COST + capacityMW * PRICING.SCADA_PER_MW;
  items.push(createCapexItem('SCADA system', 1, scadaCost));

  // ------------------------------------------------------------------------
  // SITE INFRASTRUCTURE
  // ------------------------------------------------------------------------

  // Fencing (material & gateways)
  const siteHectares = capacityMW * PRICING.HECTARES_PER_MW;
  const fencingLength = Math.round(
    siteHectares * PRICING.FENCING_METERS_PER_HECTARE
  );
  items.push(
    createCapexItem(
      'Fencing (material & gateways)',
      fencingLength,
      PRICING.FENCING_UNIT_PRICE
    )
  );

  // Roads and site access
  items.push(
    createCapexItem('Roads and site access', capacityMW, PRICING.ACCESS_ROADS_PER_MW)
  );

  // Transformer foundations
  const numFoundations = numTransformers; // One foundation per transformer
  items.push(
    createCapexItem(
      'Transformer foundations',
      numFoundations,
      PRICING.FOUNDATIONS_PER_KW * 100 // Scale up for transformer foundations
    )
  );

  // General earthworks & leveling
  items.push(
    createCapexItem(
      'General earthworks & leveling',
      capacityMW,
      14000 // €14k per MW for earthworks
    )
  );

  // ------------------------------------------------------------------------
  // DEVELOPMENT & PRE-CONSTRUCTION
  // ------------------------------------------------------------------------

  // Planning (external)
  items.push(
    createCapexItem(
      'Planning (external)',
      capacityMW,
      PRICING.ENGINEERING_DESIGN_PER_MW + PRICING.PROJECT_MANAGEMENT_PER_MW
    )
  );

  // Validate all field names exist in dropdown
  const invalidFields = items.filter(
    (item) => !validateCapexField(item.name)
  );
  if (invalidFields.length > 0) {
    console.error(
      'Invalid CAPEX field names:',
      invalidFields.map((i) => i.name)
    );
  }

  return items;
};

// ============================================================================
// OPEX GENERATOR
// ============================================================================

/**
 * Generates essential OPEX line items for a ground-mounted PV system
 * @param capacityMW - System capacity in MW (AC)
 * @returns Array of OPEX line items with realistic annual costs
 */
export const generateOpexItems = (capacityMW: number): CostLineItem[] => {
  if (capacityMW <= 0) {
    console.warn('Capacity must be greater than 0');
    return [];
  }

  const items: CostLineItem[] = [];

  // ------------------------------------------------------------------------
  // OPERATIONS & MAINTENANCE
  // ------------------------------------------------------------------------

  // O&M contract (preventive & corrective maintenance)
  const maintenanceCost =
    capacityMW * PRICING.PREVENTIVE_MAINTENANCE_PER_MW_YEAR;
  items.push(createOpexItem('O&M contract (preventive & corrective maintenance)', maintenanceCost));

  // Panel cleaning
  const cleaningCost = capacityMW * PRICING.MODULE_CLEANING_PER_MW_YEAR;
  items.push(createOpexItem('Panel cleaning', cleaningCost));

  // ------------------------------------------------------------------------
  // ASSET MANAGEMENT
  // ------------------------------------------------------------------------

  // Asset management services
  const assetMgmtCost = capacityMW * PRICING.ASSET_MANAGEMENT_PER_MW_YEAR;
  items.push(createOpexItem('Asset management services', assetMgmtCost));

  // ------------------------------------------------------------------------
  // INSURANCE
  // ------------------------------------------------------------------------

  // Insurance (all-risk, liability, business interruption)
  // Note: This is a placeholder calculation. Ideally, we'd pass in total CAPEX
  // For now, use a typical CAPEX of €800k per MW
  const estimatedCapex = capacityMW * 800000;
  const insuranceCost = estimatedCapex * PRICING.INSURANCE_PERCENT_OF_CAPEX;
  items.push(createOpexItem('Insurance (all-risk, liability, business interruption)', insuranceCost));

  // ------------------------------------------------------------------------
  // LAND & PROPERTY
  // ------------------------------------------------------------------------

  // Land lease
  const landLeaseCost = capacityMW * PRICING.LAND_LEASE_PER_MW_YEAR;
  items.push(createOpexItem('Land lease', landLeaseCost));

  // ------------------------------------------------------------------------
  // MONITORING & CONTROL
  // ------------------------------------------------------------------------

  // SCADA & monitoring systems
  const scadaMaintCost = capacityMW * PRICING.SCADA_MAINTENANCE_PER_MW_YEAR;
  items.push(createOpexItem('SCADA & monitoring systems', scadaMaintCost));

  // ------------------------------------------------------------------------
  // GRID CONNECTION
  // ------------------------------------------------------------------------

  // Grid connection & network fees
  const gridFee = capacityMW * PRICING.GRID_CONNECTION_FEE_PER_MW_YEAR;
  items.push(createOpexItem('Grid connection & network fees', gridFee));

  // ------------------------------------------------------------------------
  // COMPLIANCE & PROFESSIONAL SERVICES
  // ------------------------------------------------------------------------

  // Professional fees (legal, audit, consulting)
  const legalCost = capacityMW * PRICING.LEGAL_COMPLIANCE_PER_MW_YEAR;
  items.push(createOpexItem('Professional fees (legal, audit, consulting)', legalCost));

  // Validate all field names exist in dropdown
  const invalidFields = items.filter((item) => !validateOpexField(item.name));
  if (invalidFields.length > 0) {
    console.error(
      'Invalid OPEX field names:',
      invalidFields.map((i) => i.name)
    );
  }

  return items;
};

// ============================================================================
// SUMMARY CALCULATIONS
// ============================================================================

/**
 * Calculates total CAPEX from generated items
 */
export const calculateTotalCapex = (items: CostLineItem[]): number => {
  return items.reduce((sum, item) => sum + item.amount, 0);
};

/**
 * Calculates total annual OPEX from generated items
 */
export const calculateTotalOpex = (items: CostLineItem[]): number => {
  return items.reduce((sum, item) => sum + item.amount, 0);
};

/**
 * Calculates CAPEX per MW
 */
export const calculateCapexPerMW = (
  items: CostLineItem[],
  capacityMW: number
): number => {
  if (capacityMW <= 0) return 0;
  return calculateTotalCapex(items) / capacityMW;
};

/**
 * Calculates OPEX per MW per year
 */
export const calculateOpexPerMW = (
  items: CostLineItem[],
  capacityMW: number
): number => {
  if (capacityMW <= 0) return 0;
  return calculateTotalOpex(items) / capacityMW;
};
