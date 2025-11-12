import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Results } from './Results';
import type { ProjectResults } from '../types';

const mockResults: ProjectResults = {
  project_summary: {
    capacity_mw: 50,
    capacity_factor: 0.22,
    project_lifetime: 25,
    total_capex: 50_000_000,
    capex_per_mw: 1_000_000,
  },
  financing_structure: {
    max_debt_by_dscr: 41_633_428,
    max_debt_by_gearing: 37_500_000,
    final_debt: 37_500_000,
    equity: 12_500_000,
    actual_gearing: 0.75,
    binding_constraint: 'Gearing',
    interest_rate: 0.045,
    debt_tenor: 15,
    annual_debt_service: 3_491_250,
  },
  key_metrics: {
    project_irr: 0.0805,
    equity_irr: 0.1225,
    lcoe: 58.97,
    min_dscr: 1.29,
    avg_dscr: 1.24,
    project_npv: 8_456_789,
    ppa_price: 70,
  },
  first_year_operations: {
    energy_production_mwh: 96_360,
    revenue: 6_745_200,
    om_costs: 750_000,
    ebitda: 5_995_200,
    cfads: 4_496_400,
  },
  assessment: {
    project_irr: '✅ GOOD - Exceeds 8% threshold',
    equity_irr: '✅ GOOD - Exceeds 12% threshold',
    dscr: '⚠️ MARGINAL - Between 1.20-1.30x',
    overall: '⚠️ REVIEW - May be viable with optimization',
  },
};

describe('Results', () => {
  it('renders main heading', () => {
    render(<Results results={mockResults} />);
    expect(screen.getByText('Project Financial Analysis')).toBeInTheDocument();
  });

  it('renders all section headings', () => {
    render(<Results results={mockResults} />);

    expect(screen.getByText('Project Summary')).toBeInTheDocument();
    expect(screen.getByText('Key Metrics')).toBeInTheDocument();
    expect(screen.getByText('Financing Structure')).toBeInTheDocument();
    expect(screen.getByText('First Year Operations')).toBeInTheDocument();
    expect(screen.getByText('Project Assessment')).toBeInTheDocument();
  });

  it('displays project capacity', () => {
    render(<Results results={mockResults} />);
    expect(screen.getByText('50.0 MW')).toBeInTheDocument();
  });

  it('displays capacity factor as percentage', () => {
    render(<Results results={mockResults} />);
    expect(screen.getByText('22.00%')).toBeInTheDocument();
  });

  it('displays project lifetime', () => {
    render(<Results results={mockResults} />);
    expect(screen.getByText('25 years')).toBeInTheDocument();
  });

  it('displays project IRR as percentage', () => {
    render(<Results results={mockResults} />);
    expect(screen.getByText('8.05%')).toBeInTheDocument();
  });

  it('displays equity IRR as percentage', () => {
    render(<Results results={mockResults} />);
    expect(screen.getByText('12.25%')).toBeInTheDocument();
  });

  it('displays LCOE with unit', () => {
    render(<Results results={mockResults} />);
    expect(screen.getByText('€58.97/MWh')).toBeInTheDocument();
  });

  it('displays DSCR values with multiplier', () => {
    render(<Results results={mockResults} />);
    expect(screen.getByText('1.29x')).toBeInTheDocument();
    expect(screen.getByText('1.24x')).toBeInTheDocument();
  });

  it('displays binding constraint', () => {
    render(<Results results={mockResults} />);
    expect(screen.getByText('Gearing')).toBeInTheDocument();
  });

  it('displays energy production in MWh', () => {
    render(<Results results={mockResults} />);
    expect(screen.getByText(/96,360 MWh/)).toBeInTheDocument();
  });

  it('displays assessment items', () => {
    render(<Results results={mockResults} />);

    expect(screen.getByText(/GOOD - Exceeds 8% threshold/)).toBeInTheDocument();
    expect(screen.getByText(/GOOD - Exceeds 12% threshold/)).toBeInTheDocument();
    expect(screen.getByText(/MARGINAL - Between 1.20-1.30x/)).toBeInTheDocument();
    expect(screen.getByText(/REVIEW - May be viable with optimization/)).toBeInTheDocument();
  });

  it('applies correct CSS class for success assessment', () => {
    render(<Results results={mockResults} />);

    const successElements = screen.getAllByText(/GOOD/);
    successElements.forEach((element) => {
      expect(element.closest('.assessment-item')).toHaveClass('success');
    });
  });

  it('applies correct CSS class for warning assessment', () => {
    render(<Results results={mockResults} />);

    const warningElement = screen.getByText(/MARGINAL/);
    expect(warningElement.closest('.assessment-item')).toHaveClass('warning');
  });

  it('formats currency values with Euro symbol', () => {
    render(<Results results={mockResults} />);

    // Check that Euro symbols are present (currency formatter adds €)
    const currencyValues = screen.getAllByText(/€/);
    expect(currencyValues.length).toBeGreaterThan(0);
  });

  it('displays debt tenor in years', () => {
    render(<Results results={mockResults} />);
    expect(screen.getByText('15 years')).toBeInTheDocument();
  });
});
