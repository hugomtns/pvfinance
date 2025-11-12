# PV Finance Calculator

A comprehensive web application for calculating financial metrics for photovoltaic (PV) ground-mounted utility-scale solar projects.

## Overview

This application provides detailed financial analysis for solar projects, including:

- **Project IRR & Equity IRR**: Internal rate of return calculations
- **LCOE**: Levelized Cost of Energy
- **DSCR**: Debt Service Coverage Ratio
- **NPV**: Net Present Value
- **Financing Structure**: Debt sizing by DSCR and gearing ratio
- **Cash Flow Analysis**: Revenue, EBITDA, CFADS projections

## Architecture

The application is built with:

- **Frontend**: React + TypeScript + Vite
- **Backend**: Python + FastAPI
- **Testing**: Vitest (frontend) + pytest (backend)

```
pvfinance/
├── frontend/          # React + TypeScript frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── services/    # API client
│   │   ├── styles/      # CSS files
│   │   └── types/       # TypeScript types
│   └── package.json
├── backend/           # Python FastAPI backend
│   ├── main.py          # FastAPI app
│   ├── calculator.py    # Financial calculator
│   ├── test_*.py        # Tests
│   └── requirements.txt
└── README.md
```

## Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.9+
- **Git**

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/hugomtns/pvfinance.git
   cd pvfinance
   ```

2. **Set up the backend**:
   ```bash
   cd backend
   python -m venv venv

   # Windows
   venv\Scripts\activate

   # macOS/Linux
   source venv/bin/activate

   pip install -r requirements.txt
   ```

3. **Set up the frontend**:
   ```bash
   cd ../frontend
   npm install
   ```

### Running the Application

You'll need **two terminal windows** running simultaneously:

#### Terminal 1: Backend Server

```bash
cd backend
# Activate virtual environment (if not already activated)
python main.py
```

The backend API will be available at http://localhost:8000

- API Documentation: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

#### Terminal 2: Frontend Dev Server

```bash
cd frontend
npm run dev
```

The frontend will be available at http://localhost:5173

Open your browser and navigate to http://localhost:5173 to use the application.

## Usage

1. **Enter Project Parameters**:
   - Core parameters: Capacity, Capacity Factor, CapEx, PPA Price, O&M costs
   - Technical parameters: Degradation rate
   - Economic parameters: PPA & O&M escalation rates
   - Financing parameters: Gearing ratio, interest rate, debt tenor, target DSCR
   - Other: Project lifetime, tax rate, discount rate

2. **Calculate**:
   - Click the "Calculate" button
   - The backend will process the inputs and return comprehensive financial analysis

3. **Review Results**:
   - Project summary
   - Key financial metrics (IRR, LCOE, DSCR, NPV)
   - Financing structure
   - First year operations
   - Project assessment with recommendations

## Testing

### Backend Tests

```bash
cd backend
pytest
```

Run with coverage:
```bash
pytest --cov=. --cov-report=html
```

### Frontend Tests

```bash
cd frontend
npm test
```

Run with UI:
```bash
npm run test:ui
```

## API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Main Endpoints

- `GET /health` - Health check
- `GET /defaults` - Get default parameter values
- `POST /calculate` - Calculate project financials

Example request to `/calculate`:

```json
{
  "capacity": 50,
  "capacity_factor": 0.22,
  "capex_per_mw": 1000000,
  "ppa_price": 70,
  "om_cost_per_mw_year": 15000,
  "degradation_rate": 0.004,
  "ppa_escalation": 0.01,
  "om_escalation": 0.01,
  "gearing_ratio": 0.75,
  "interest_rate": 0.045,
  "debt_tenor": 15,
  "target_dscr": 1.30,
  "project_lifetime": 25,
  "tax_rate": 0.25,
  "discount_rate": 0.08
}
```

## Development

### Frontend Development

The frontend uses:
- **Vite** for fast development and building
- **React 19** with TypeScript
- **CSS** for styling (no Tailwind)
- **Vitest** for testing

Hot Module Replacement (HMR) is enabled by default when running `npm run dev`.

### Backend Development

The backend uses:
- **FastAPI** for the REST API
- **Pydantic** for data validation
- **NumPy** for calculations
- **pytest** for testing

Auto-reload is enabled when running `python main.py` in development mode.

### Adding New Features

1. Create a new branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Run tests: `npm test` (frontend) and `pytest` (backend)
4. Commit: `git commit -m "Add your feature"`
5. Push: `git push origin feature/your-feature-name`
6. Create a Pull Request

## Project Structure

### Frontend Components

- `InputForm.tsx` - Form for entering project parameters
- `Results.tsx` - Display of calculation results

### Backend Modules

- `main.py` - FastAPI application and endpoints
- `calculator.py` - Financial calculation engine
- `test_api.py` - API endpoint tests
- `test_calculator.py` - Calculator logic tests

## Calculation Methodology

The calculator implements a comprehensive financial model based on:

1. **Energy Production**: Accounts for capacity factor and degradation
2. **Revenue**: PPA price with optional escalation
3. **Operating Costs**: O&M costs with escalation
4. **Tax**: Corporate tax on EBITDA
5. **Debt Sizing**: Limited by both DSCR and gearing ratio
6. **Cash Flows**: CFADS and FCF to equity
7. **Metrics**: IRR (project & equity), LCOE, NPV, DSCR

For detailed formulas, see `FORMULAS.md`.

## Troubleshooting

### Backend won't start

- Ensure Python 3.9+ is installed
- Activate virtual environment
- Install dependencies: `pip install -r requirements.txt`
- Check port 8000 is not in use

### Frontend shows connection error

- Ensure backend is running on port 8000
- Check browser console for errors
- Verify API proxy configuration in `vite.config.ts`

### Tests failing

- Ensure all dependencies are installed
- Check Node.js and Python versions
- Clear caches: `npm clean-install` or delete `node_modules`

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Contact

For questions or support, please open an issue on GitHub.

---

Built with ❤️ for the solar finance community.
