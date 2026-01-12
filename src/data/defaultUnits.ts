/**
 * Default unit mappings for predefined CAPEX and OPEX items
 * Units are metric and display-only (don't affect calculations)
 */

export const DEFAULT_CAPEX_UNITS: Record<string, string> = {
  // Development & Pre-Construction
  "Planning (internal)": "MW",
  "Planning (external)": "MW",
  "Geodetic survey": "hectares",
  "Geotechnical survey": "hectares",
  "Topographic survey": "hectares",
  "UXO survey": "hectares",
  "Archeological supervision": "days",
  "Environmental supervision": "days",

  // PV Equipment
  "PV modules": "panels",
  "Spare modules for breakage": "panels",
  "Inverters": "units",

  // Mounting & Installation
  "Mounting structure/substructure": "tons",
  "Complete installation works": "MW",
  "Grounding ring": "meters",

  // Electrical Infrastructure
  "MV cables": "meters",
  "MV transformer stations": "units",
  "MV switchgear": "units",
  "MV/HV substation + cable route": "MW",
  "Shunt reactor": "units",
  "MV cable installation": "meters",
  "HV cable installation": "meters",
  "DC string cables": "meters",
  "DC main cables": "meters",
  "AC cables": "meters",
  "String combiner boxes (SCBs)": "units",
  "MC plugs": "units",
  "Data cables": "meters",
  "Fiber optic cables": "meters",

  // Monitoring & Control Systems
  "Data logger/transformer monitoring box": "units",
  "Handover station": "units",
  "Weather station": "units",
  "SCADA system": "system",

  // Site Infrastructure
  "Fencing (material & gateways)": "meters",
  "CCTV security system": "cameras",
  "Site entrances & culverts": "units",
  "Roads and site access": "meters",
  "Transformer foundations": "units",
  "General earthworks & leveling": "hectares",
  "Compound area hardening": "m²",
  "Drainage system": "meters",
  "Landscaping (grass, bushes, trees)": "hectares",

  // Construction Support
  "Diesel & water": "liters",
  "Electricity generator": "kW",
  "Office container": "units",
  "Warehouse container": "units",
  "Construction site safety equipment": "sets",
  "Health and safety coordinator": "days",

  // Logistics & Financial
  "Transport & logistics": "MW",
  "Bonds": "% of CAPEX",
  "Contingencies": "% of CAPEX",
};

export const DEFAULT_OPEX_UNITS: Record<string, string> = {
  // Operations & Maintenance
  "O&M contract (preventive & corrective maintenance)": "MW/year",
  "Panel cleaning": "MW/year",
  "Vegetation management": "hectares/year",
  "Spare parts & consumables": "MW/year",

  // Asset Management
  "Asset management services": "MW/year",
  "Performance monitoring & reporting": "MW/year",

  // Insurance
  "Insurance (all-risk, liability, business interruption)": "% of CAPEX",

  // Land & Property
  "Land lease": "hectares/year",
  "Property taxes & fees": "MW/year",

  // Monitoring & Control
  "SCADA & monitoring systems": "MW/year",
  "Remote monitoring services": "MW/year",

  // Security
  "Security services & CCTV": "MW/year",

  // Grid Connection
  "Grid connection & network fees": "MW/year",
  "Metering services": "MW/year",

  // Utilities & Services
  "Site utilities (water, electricity, internet)": "MW/year",

  // Compliance & Professional Services
  "Environmental compliance & permits": "MW/year",
  "Professional fees (legal, audit, consulting)": "MW/year",
};
