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
- **Detailed Cost Breakdown**: Custom CapEx and OpEx line items with escalation rates
- **PDF Export**: Professional PDF reports with all results
- **Browser Storage**: Save and load projects locally

## Architecture

The application is built with:

- **Frontend**: React + TypeScript + Vite
- **Calculations**: Pure TypeScript (runs in browser)
- **PDF Generation**: jsPDF (browser-based)
- **Testing**: Vitest

```
pvfinance/
├── frontend/          # React + TypeScript frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── lib/         # Calculator & PDF modules
│   │   ├── styles/      # CSS files
│   │   └── types/       # TypeScript types
│   └── package.json
└── README.md
```

**Note:** This is a 100% frontend application. All calculations run in your browser - no backend server needed!

## Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Git**

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/hugomtns/pvfinance.git
   cd pvfinance
   ```

2. **Install dependencies**:
   ```bash
   cd frontend
   npm install
   ```

### Running the Application

Simply start the dev server:

```bash
cd frontend
npm run dev
```

The application will be available at http://localhost:5173

Open your browser and navigate to http://localhost:5173 to use the application.

## Usage

1. **Enter Project Parameters**:
   - Core parameters: Capacity, Capacity Factor, CapEx, PPA Price, O&M costs
   - **Optional: Use Detailed Cost Line Items** - Break down CapEx and OpEx into individual items
   - Technical parameters: Degradation rate
   - Economic parameters: PPA & O&M escalation rates
   - Financing parameters: Gearing ratio, interest rate, debt tenor, target DSCR
   - Other: Project lifetime, tax rate, discount rate

2. **Add Cost Line Items** (Optional):
   - Toggle "Use Detailed Cost Line Items" to enable
   - Add CapEx items: Solar panels, inverters, BOS, grid connection, etc.
   - Add OpEx items: Maintenance, insurance, land lease, etc.
   - Set escalation rates for each OpEx item
   - View running totals for CapEx and OpEx

3. **Calculate**:
   - Click the "Calculate" button
   - The backend will process the inputs and return comprehensive financial analysis

4. **Review Results**:
   - Project summary
   - Key financial metrics (IRR, LCOE, DSCR, NPV)
   - Financing structure
   - First year operations
   - Cost breakdown (if line items were used)
   - Project assessment with recommendations

5. **Export PDF Report**:
   - Click "Export to PDF" button
   - Download professional PDF report with all results
   - Includes cost breakdown if line items were used

6. **Save/Load Projects**:
   - Projects are automatically saved to browser localStorage
   - Reopen the page to continue where you left off

## Testing

```bash
cd frontend
npm test
```

Run with UI:
```bash
npm run test:ui
```

Run with coverage:
```bash
npm run test:coverage
```

## Development

The application uses:
- **Vite** for fast development and building
- **React 19** with TypeScript
- **CSS** for styling (no Tailwind)
- **Vitest** for testing
- **jsPDF** for PDF generation

Hot Module Replacement (HMR) is enabled by default when running `npm run dev`.

### Project Structure

```
frontend/src/
├── lib/
│   ├── calculator/      # Financial calculation engine
│   │   ├── financial.ts # NPV, IRR, PMT, PV functions
│   │   └── calculator.ts # Main calculator (23-step model)
│   └── pdf/            # PDF generation
│       ├── generator.ts # PDF layout and sections
│       └── formatter.ts # Number/currency formatting
├── components/         # React UI components
├── types/             # TypeScript type definitions
└── styles/            # CSS stylesheets
```

### Building for Production

```bash
cd frontend
npm run build
```

The production build will be in `frontend/dist/`

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

### Application won't start

- Ensure Node.js 18+ is installed
- Delete `node_modules` and run `npm install` again
- Check port 5173 is not in use

### Tests failing

- Ensure all dependencies are installed: `npm install`
- Clear caches: `rm -rf node_modules && npm install`
- Check Node.js version: `node --version`

### PDF export not working

- Check browser console for errors
- Ensure you're using a modern browser (Chrome, Firefox, Safari, Edge)
- Try clearing browser cache

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
