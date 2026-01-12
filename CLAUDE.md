# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PV Finance Calculator is a **frontend-only** web application for calculating financial metrics for utility-scale ground-mounted solar photovoltaic (PV) projects. All calculations run entirely in the browser using TypeScript. It provides detailed financial analysis including IRR, LCOE, DSCR, NPV, financing structure, and cash flow projections.

## Development Commands

### Frontend (React + TypeScript + Vite)

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Run development server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint

# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Architecture

### High-Level Structure

The application uses a **pure frontend architecture** with all logic running in the browser:

- **Frontend**: React 19 SPA with TypeScript running on Vite dev server (port 5173)
- **Calculations**: Pure TypeScript modules, no backend required
- **PDF Generation**: Browser-based using jsPDF
- **Data Flow**: User inputs → Browser calculation engine → UI rendering → PDF export

### Calculator Architecture

**Key modules:**
- `lib/calculator/financial.ts` - Core financial functions (NPV, IRR, PMT, PV)
- `lib/calculator/calculator.ts` - Main calculator class with 23-step calculation chain
- `lib/pdf/generator.ts` - Browser-based PDF generation using jsPDF

**Financial calculation flow:**
1. Accept `ProjectInputs` from React form
2. Instantiate `SolarFinanceCalculator` with inputs
3. Execute 23-step calculation chain
4. Return structured `ProjectResults` with yearly_data, etc.
5. Optionally generate PDF in browser using jsPDF

**Calculator design pattern:**
- The calculator uses a **functional method-per-calculation** pattern
- Each financial metric has its own method (e.g., `calcEBITDAYearT()`, `calcMaxDebtByDSCR()`)
- Methods are pure functions that depend only on inputs and other calc methods
- All calculations use **MW/MWh units** consistently (not kW/kWh)
- No external dependencies - pure TypeScript/JavaScript math

**Key calculation chain:**
1. Energy production with degradation: `P50_Year_0_Yield × (1 - Degradation_Rate)^(year-1)`
2. Revenue with PPA escalation
3. O&M costs with escalation
4. EBITDA = Revenue - O&M
5. CFADS = EBITDA × (1 - Tax_Rate)
6. Debt sizing by two constraints: DSCR and Gearing Ratio (binding constraint wins)
7. Debt service calculation
8. Free cash flow to equity
9. IRR, NPV, LCOE metrics

### Frontend Architecture

**Component structure:**
- `App.tsx` - Main container, manages state for inputs/results, orchestrates API calls
- `InputForm.tsx` - Project parameters form with validation
- `LineItemsManager.tsx` - Manages detailed CapEx/OpEx line items (alternative to simple per-MW costs)
- `Results.tsx` - Display calculation results, export PDF
- `YearlyCharts.tsx` - Recharts visualization of yearly cash flows
- `YearlyDataTable.tsx` - Tabular view of yearly data
- `AuditLogView.tsx` - Display detailed calculation steps and formulas

**State management:**
- No global state library (Redux, Zustand, etc.)
- React state in `App.tsx` for inputs/results
- `useLocalStorage` custom hook for automatic browser persistence
- Props drilling for component communication

**Calculator integration:**
- `App.tsx` instantiates `SolarFinanceCalculator` directly (no API calls)
- All calculations execute synchronously in the browser
- Results update instantly (no network latency)

**TypeScript types:**
- All types defined in `frontend/src/types/index.ts`
- Matches backend Pydantic models (snake_case preserved in JSON)
- Type safety enforced throughout component tree

### Data Flow for Cost Line Items

The application supports two modes for entering costs:

1. **Simple mode**: Single `capex_per_mw` and `om_cost_per_mw_year` values
2. **Detailed mode**: Array of `cost_items` with individual line items

**CapEx items:**
- Have `unit_price` and `quantity` fields
- `amount` is calculated as `unit_price × quantity`
- Examples: Solar panels (€/Wp), Inverters (€/unit), BOS, grid connection

**OpEx items:**
- Have only `amount` field (total annual cost)
- All OpEx items escalate at the single `om_escalation` rate
- Examples: Maintenance, insurance, land lease

**Backend processing:**
- If `cost_items` provided: Sum all CapEx amounts → `capex_per_mw`, Sum all OpEx amounts → `om_cost_per_mw_year`
- Calculator doesn't distinguish between simple vs. detailed mode internally
- Results include `cost_items_breakdown` if detailed mode was used

### Testing Philosophy

**Backend tests:**
- `test_calculator.py` - Unit tests for calculation methods
- `test_api.py` - Integration tests for API endpoints
- Uses pytest fixtures for common test data
- Validates financial calculations against known results
- Tests edge cases (zero values, extreme gearing ratios, etc.)

**Frontend tests:**
- `InputForm.test.tsx` - Component rendering, user interactions
- `Results.test.tsx` - Results display, PDF export button
- Uses Vitest + React Testing Library
- Tests user workflows, not implementation details

## Important Implementation Details

### Pure Frontend Architecture

- **No backend server required** - all calculations run in browser
- **No API calls** - calculator instantiated directly in React components
- **No CORS issues** - everything runs on same origin
- **Instant calculations** - no network latency

### Energy Yield vs. Capacity Factor

The application uses **P50 Year 0 Yield (MWh)** as the primary input, not capacity factor. The capacity factor is derived:

```
Capacity_Factor = P50_Year_0_Yield / (Capacity × 8760 hours)
```

This approach is more precise for financial modeling as it directly represents expected energy production.

### Debt Sizing Logic

The application calculates debt using **two independent constraints**:

1. **DSCR constraint**: `Max_Debt = PV(CFADS during debt tenor) / Target_DSCR`
2. **Gearing constraint**: `Max_Debt = Total_CapEx × Gearing_Ratio`

The **binding constraint** is the lower of the two. Results clearly indicate which constraint limited the debt.

### PDF Export

The PDF export happens **browser-side**:
1. User clicks "Export PDF" button
2. `PDFReportGenerator` class generates PDF using jsPDF
3. PDF blob created in memory
4. Browser triggers download using `URL.createObjectURL()`

All PDF generation logic is in `lib/pdf/generator.ts` using jsPDF + jspdf-autotable.

## Common Development Scenarios

### Adding a new financial metric

1. Add calculation method to `SolarFinanceCalculator` in `lib/calculator/calculator.ts`
2. Call new method in the `generateSummaryReport()` method
3. Update TypeScript type in `frontend/src/types/index.ts`
4. Display new metric in `Results.tsx`
5. Add tests in `lib/calculator/calculator.test.ts`

### Modifying input parameters

1. Update TypeScript `ProjectInputs` interface in `frontend/src/types/index.ts`
2. Add form field in `InputForm.tsx`
3. Update `DEFAULT_INPUTS` in `frontend/src/types/index.ts`
4. Update calculator logic in `lib/calculator/calculator.ts` if needed
5. Update tests to include new parameter

### Running during development

Single terminal window:

```bash
cd frontend
npm run dev
```

Then open http://localhost:5173 in your browser.

## Key Files Reference

| File | Purpose |
|------|---------|
| `backend/calculator.py` | Core financial calculation engine (932 lines) |
| `backend/main.py` | FastAPI endpoints and request/response models (276 lines) |
| `backend/pdf_generator.py` | PDF report generation with ReportLab (384 lines) |
| `frontend/src/App.tsx` | Main application container and state management |
| `frontend/src/components/InputForm.tsx` | Project parameters form |
| `frontend/src/components/LineItemsManager.tsx` | Detailed cost breakdown manager |
| `frontend/src/components/Results.tsx` | Results display and PDF export |
| `frontend/src/types/index.ts` | All TypeScript type definitions |
| `frontend/src/services/api.ts` | API client wrapper |
| `frontend/vite.config.ts` | Vite configuration including API proxy |

## Git Workflow

The repository uses a simple trunk-based workflow:
- Main branch: `master`
- Recent commits show features like "Fill from Design", CAPEX/OPEX line items, PDF export
- Commit messages are concise and descriptive
