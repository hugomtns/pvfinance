// CAPEX fields from fields.md
// Structured with categories and field names

export interface CapexCategory {
  title: string;
  fields: string[];
}

export const CAPEX_FIELDS: CapexCategory[] = [
  {
    title: "Development & Pre-Construction",
    fields: [
      "Planning (internal)",
      "Planning (external)",
      "Geodetic survey",
      "Geotechnical survey",
      "Topographic survey",
      "UXO survey",
      "Archeological supervision",
      "Environmental supervision",
    ],
  },
  {
    title: "PV Equipment",
    fields: [
      "PV modules",
      "Spare modules for breakage",
      "Inverters",
    ],
  },
  {
    title: "Mounting & Installation",
    fields: [
      "Mounting structure/substructure",
      "Complete installation works",
      "Grounding ring",
    ],
  },
  {
    title: "Electrical Infrastructure",
    fields: [
      "MV cables (various sizes)",
      "MV transformer stations (various capacities)",
      "MV switchgear",
      "MV/HV substation + cable route",
      "Shunt reactor",
      "MV cable installation",
      "HV cable installation",
      "DC string cables",
      "DC main cables",
      "AC cables",
      "String combiner boxes (SCBs)",
      "MC plugs",
      "Data cables",
      "Fiber optic cables",
    ],
  },
  {
    title: "Monitoring & Control Systems",
    fields: [
      "Data logger/transformer monitoring box",
      "Handover station",
      "Weather station",
      "SCADA system",
    ],
  },
  {
    title: "Site Infrastructure",
    fields: [
      "Fencing (material & gateways)",
      "CCTV security system",
      "Site entrances & culverts",
      "Roads and site access",
      "Transformer foundations",
      "General earthworks & leveling",
      "Compound area hardening",
      "Drainage system",
      "Landscaping (grass, bushes, trees)",
    ],
  },
  {
    title: "Construction Support",
    fields: [
      "Diesel & water",
      "Electricity generator",
      "Office container",
      "Warehouse container",
      "Construction site safety equipment",
      "Health and safety coordinator",
    ],
  },
  {
    title: "Logistics & Financial",
    fields: [
      "Transport & logistics",
      "Bonds",
      "Contingencies",
    ],
  },
];

// Flatten all fields for easy searching
export const ALL_CAPEX_FIELDS = CAPEX_FIELDS.flatMap(category => category.fields);
