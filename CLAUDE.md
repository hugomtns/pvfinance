# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PV Finance Calculator is a web application for calculating financial metrics for photovoltaic ground-mounted utility-scale solar projects. It provides IRR, LCOE, DSCR, NPV calculations with detailed cost breakdown and PDF export.

**Architecture**: React + TypeScript frontend (Vite) + Python FastAPI backend

## Development Commands

### Backend (Python)

```bash
# Setup
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
source venv/bin/activate       # macOS/Linux
pip install -r requirements.txt

# Run server (port 8000)
python main.py

# Tests
pytest
pytest --cov=. --cov-report=html    # with coverage
pytest -v test_calculator.py        # single file
pytest -k "test_function_name"      # single test
```

### Frontend (React + TypeScript)

```bash
# Setup
cd frontend
npm install

# Development (port 5173)
npm run dev

# Build
npm run build
tsc -b && vite build   # TypeScript compile + Vite build

# Tests
npm test                    # run tests
npm run test:ui            # UI mode
npm run test:coverage      # with coverage

# Lint
npm run lint
```

### Running Both Servers

**Required**: Backend on port 8000, frontend on port 5173 (two terminals)

```bash
# Terminal 1
cd backend && python main.py

# Terminal 2
cd frontend && npm run dev
```

## Core Architecture

### Financial Calculation Flow

The calculator implements a strict dependency chain (see FORMULAS.md):

1. **Total CapEx** = Capacity × CapEx_per_MW (or sum of cost line items)
2. **Annual Energy** = Capacity × Capacity_Factor × 8760 × (1 - Degradation)^(t-1)
   - Capacity_Factor derived from P50_Year_0_Yield / (Capacity × 8760)
3. **Revenue** = Energy × PPA_Price × (1 + PPA_Escalation)^(t-1)
4. **O&M Costs** = Capacity × OM_Cost × (1 + OM_Escalation)^(t-1) (or sum of OpEx items)
5. **EBITDA** = Revenue - O&M
6. **CFADS** = EBITDA × (1 - Tax_Rate)
7. **Debt Sizing** = MIN(PV_of_CFADS / Target_DSCR, Total_CapEx × Gearing_Ratio)
8. **FCF to Equity** = CFADS - Debt_Service (during debt tenor) or CFADS (after)
9. **IRR/NPV** = Calculated from cash flows using Newton-Raphson method

**Critical**: All calculations use MW/MWh units consistently. No kW conversions.

### Data Flow

```
User Input (React Form)
  → API Client (services/api.ts)
  → FastAPI Endpoint (/calculate)
  → SolarFinanceCalculator (calculator.py)
  → Results returned + stored in localStorage
  → Results component displays metrics
  → PDF export via /export-pdf endpoint
```

### Cost Line Items System

**Two modes**: Simple (single CapEx/OpEx values) OR Detailed (line items)

**CapEx items**: Stored with `unit_price` × `quantity` = `amount`
- Example: 1,000,000 solar panels @ €0.25 each = €250,000

**OpEx items**: Stored with total `amount` only
- Example: Annual maintenance = €500,000
- Individual escalation rates deprecated (use global om_escalation)

**Critical**: When cost_items provided, backend derives:
- `capex_per_mw` = sum(capex_items.amount) / capacity
- `om_cost_per_mw_year` = sum(opex_items.amount) / capacity

### Key Files

**Backend**:
- `main.py`: FastAPI app, endpoints, CORS, request validation
- `calculator.py`: All financial calculations (ProjectInputs, SolarFinanceCalculator)
- `pdf_generator.py`: ReportLab PDF generation
- `test_calculator.py`, `test_api.py`: Test suites

**Frontend**:
- `App.tsx`: Main app component, state management
- `components/InputForm.tsx`: Form with all project parameters
- `components/LineItemsManager.tsx`: CapEx/OpEx line items UI (with tabs)
- `components/Results.tsx`: Display all metrics, export PDF
- `components/YearlyDataTable.tsx`, `YearlyCharts.tsx`: Yearly cashflow data
- `components/AuditLogView.tsx`: Calculation audit trail
- `services/api.ts`: API client for backend
- `types/index.ts`: All TypeScript types, DEFAULT_INPUTS
- `hooks/useLocalStorage.ts`: Browser storage persistence
- `data/capexFields.ts`, `data/opexFields.ts`: Autocomplete field definitions
- `utils/designGenerator.ts`: "Fill from Design" feature (generates line items from capacity)

### State Management

**No Redux/Context**: Simple useState in App.tsx
- `results`: ProjectResults from backend
- `isLoading`: calculation in progress
- `error`: error messages

**Persistence**: useLocalStorage hook auto-saves/loads project inputs to browser localStorage

### API Endpoints

- `GET /health`: Health check
- `GET /defaults`: Get default parameter values
- `POST /calculate`: Calculate project financials (main endpoint)
- `POST /export-pdf`: Generate PDF report from results

### TypeScript Types

All types defined in `frontend/src/types/index.ts`:
- `ProjectInputs`: Request payload
- `ProjectResults`: Response with all calculations
- `CostLineItem`: CapEx/OpEx line item structure
- Nested: `ProjectSummary`, `FinancingStructure`, `KeyMetrics`, `FirstYearOperations`, `Assessment`, `YearlyData`, `AuditLog`

### Testing

**Backend**: pytest with fixtures in conftest.py (if present)
- Test all calculator methods
- Test API endpoints with httpx.AsyncClient

**Frontend**: Vitest + React Testing Library
- Test form inputs, validation
- Test results display
- Mock API calls in tests

### Railway Deployment

Backend configured for Railway with:
- `Procfile`: `web: uvicorn main:app --host 0.0.0.0 --port $PORT`
- `runtime.txt`: Python version
- `nixpacks.toml`: Build configuration
- CORS allows Railway/Vercel/Netlify domains via regex

## Important Patterns

### Adding New Input Parameters

1. Add to `ProjectInputs` dataclass in `backend/calculator.py`
2. Add to `ProjectInputsRequest` in `backend/main.py` (with Pydantic validation)
3. Add to `ProjectInputs` interface in `frontend/src/types/index.ts`
4. Add form field in `frontend/src/components/InputForm.tsx`
5. Update DEFAULT_INPUTS in `types/index.ts`
6. Update tests

### Adding New Metrics

1. Add calculation method to `SolarFinanceCalculator` class
2. Add to results dict in `calculate()` method
3. Add to response model in `main.py`
4. Add to TypeScript types in `types/index.ts`
5. Display in `Results.tsx`
6. Update PDF generator if needed

### Calculator Method Naming

Methods in `SolarFinanceCalculator` follow naming:
- `calc_X()`: Calculate intermediate value X
- `calc_X_year_t(t)`: Calculate X for specific year t
- `calc_X_over_lifetime()`: Calculate X for all years (returns list)

### Line Items "Fill from Design"

The "Fill from Design" feature (`utils/designGenerator.ts`) auto-generates line items based on capacity:
- **CapEx**: Solar panels, inverters, trackers, BOS, grid connection, development (all with unit prices × quantities)
- **OpEx**: O&M, insurance, land lease, asset management (all with yearly amounts)
- Uses industry-standard costs scaled by project capacity

## Common Tasks

### Debug Calculation Issues

1. Check `audit_log` in results (contains all calculation steps with formulas)
2. Compare intermediate values in `AuditLogView` component
3. Verify units (MW vs kW, MWh vs kWh)
4. Check FORMULAS.md for reference calculations

### Fix CORS Issues

Edit `allowed_origins` and `allow_origin_regex` in `backend/main.py`. Use FRONTEND_URL env var for production.

### Update Default Values

Edit `DEFAULT_INPUTS` in `frontend/src/types/index.ts` (currently 300 MW project with 22% CF)

### Add Autocomplete Suggestions

Edit `frontend/src/data/capexFields.ts` or `opexFields.ts` to add suggested field names for line items.

## Financial Model Reference

See `FORMULAS.md` for complete calculation chain with examples.

Key formulas:
- **LCOE** = NPV_of_Costs / NPV_of_Energy
- **DSCR** = CFADS / Annual_Debt_Service
- **Project IRR**: Rate where NPV(-CapEx + sum(CFADS_discounted)) = 0
- **Equity IRR**: Rate where NPV(-Equity + sum(FCF_to_Equity_discounted)) = 0
- **Debt Sizing**: Constrained by BOTH target DSCR and gearing ratio (uses minimum)

## Code Style

- **Backend**: Follow PEP 8, use type hints, docstrings for classes
- **Frontend**: ESLint configured, use TypeScript strict mode, functional components only
- **No emojis** in code unless in user-facing strings
- **Use proper units** in variable names (e.g., `capacity_mw`, `energy_mwh`)
