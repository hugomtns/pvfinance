import { useState } from 'react';
import type { ProjectResults } from '../types';
import '../styles/Results.css';

interface ResultsProps {
  results: ProjectResults;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercent = (value: number): string => {
  return `${(value * 100).toFixed(2)}%`;
};

const formatNumber = (value: number, decimals = 2): string => {
  return new Intl.NumberFormat('en-EU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

const getAssessmentClass = (assessment: string): string => {
  if (assessment.includes('✅') || assessment.includes('GOOD')) return 'success';
  if (assessment.includes('⚠️') || assessment.includes('MARGINAL')) return 'warning';
  if (assessment.includes('❌') || assessment.includes('POOR')) return 'error';
  return '';
};

export function Results({ results }: ResultsProps) {
  const { project_summary, financing_structure, key_metrics, first_year_operations, assessment } =
    results;

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExportPDF = async () => {
    setIsExporting(true);
    setExportError(null);

    try {
      const response = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(results),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Get the PDF blob
      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PV_Finance_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('PDF export error:', error);
      setExportError('Failed to generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="results-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
        <h2 style={{ margin: 0 }}>Project Financial Analysis</h2>
        <button
          onClick={handleExportPDF}
          disabled={isExporting}
          className="btn btn-primary"
          style={{ padding: '0.625rem 1.25rem' }}
        >
          {isExporting ? 'Generating PDF...' : 'Export to PDF'}
        </button>
      </div>

      {exportError && (
        <div className="error-message" style={{ marginBottom: 'var(--spacing-md)' }}>
          {exportError}
        </div>
      )}

      {/* Project Summary */}
      <div className="results-section">
        <h3>Project Summary</h3>
        <div className="results-grid">
          <div className="result-item">
            <span className="result-label">Capacity</span>
            <span className="result-value">{formatNumber(project_summary.capacity_mw, 1)} MW</span>
          </div>
          <div className="result-item">
            <span className="result-label">Capacity Factor</span>
            <span className="result-value">{formatPercent(project_summary.capacity_factor)}</span>
          </div>
          <div className="result-item">
            <span className="result-label">Project Lifetime</span>
            <span className="result-value">{project_summary.project_lifetime} years</span>
          </div>
          <div className="result-item">
            <span className="result-label">Total CapEx</span>
            <span className="result-value">{formatCurrency(project_summary.total_capex)}</span>
          </div>
          <div className="result-item">
            <span className="result-label">CapEx per MW</span>
            <span className="result-value">{formatCurrency(project_summary.capex_per_mw)}</span>
          </div>
        </div>
      </div>

      {/* Key Metrics - Highlighted */}
      <div className="results-section">
        <h3>Key Metrics</h3>
        <div className="results-grid">
          <div className="metric-card">
            <div className="result-item">
              <span className="result-label">Project IRR</span>
              <span className="result-value">{formatPercent(key_metrics.project_irr)}</span>
            </div>
          </div>
          <div className="metric-card">
            <div className="result-item">
              <span className="result-label">Equity IRR</span>
              <span className="result-value">{formatPercent(key_metrics.equity_irr)}</span>
            </div>
          </div>
          <div className="metric-card">
            <div className="result-item">
              <span className="result-label">LCOE</span>
              <span className="result-value">€{formatNumber(key_metrics.lcoe)}/MWh</span>
            </div>
          </div>
          <div className="metric-card">
            <div className="result-item">
              <span className="result-label">Min DSCR</span>
              <span className="result-value">{formatNumber(key_metrics.min_dscr)}x</span>
            </div>
          </div>
          <div className="result-item">
            <span className="result-label">Avg DSCR</span>
            <span className="result-value">{formatNumber(key_metrics.avg_dscr)}x</span>
          </div>
          <div className="result-item">
            <span className="result-label">Project NPV</span>
            <span className="result-value">{formatCurrency(key_metrics.project_npv)}</span>
          </div>
          <div className="result-item">
            <span className="result-label">PPA Price</span>
            <span className="result-value">€{formatNumber(key_metrics.ppa_price)}/MWh</span>
          </div>
        </div>
      </div>

      {/* Financing Structure */}
      <div className="results-section">
        <h3>Financing Structure</h3>
        <div className="results-grid">
          <div className="result-item">
            <span className="result-label">Final Debt</span>
            <span className="result-value">{formatCurrency(financing_structure.final_debt)}</span>
          </div>
          <div className="result-item">
            <span className="result-label">Equity</span>
            <span className="result-value">{formatCurrency(financing_structure.equity)}</span>
          </div>
          <div className="result-item">
            <span className="result-label">Actual Gearing</span>
            <span className="result-value">{formatPercent(financing_structure.actual_gearing)}</span>
          </div>
          <div className="result-item">
            <span className="result-label">Binding Constraint</span>
            <span className="result-value">{financing_structure.binding_constraint}</span>
          </div>
          <div className="result-item">
            <span className="result-label">Max Debt by DSCR</span>
            <span className="result-value">
              {formatCurrency(financing_structure.max_debt_by_dscr)}
            </span>
          </div>
          <div className="result-item">
            <span className="result-label">Max Debt by Gearing</span>
            <span className="result-value">
              {formatCurrency(financing_structure.max_debt_by_gearing)}
            </span>
          </div>
          <div className="result-item">
            <span className="result-label">Interest Rate</span>
            <span className="result-value">{formatPercent(financing_structure.interest_rate)}</span>
          </div>
          <div className="result-item">
            <span className="result-label">Debt Tenor</span>
            <span className="result-value">{financing_structure.debt_tenor} years</span>
          </div>
          <div className="result-item">
            <span className="result-label">Annual Debt Service</span>
            <span className="result-value">
              {formatCurrency(financing_structure.annual_debt_service)}
            </span>
          </div>
        </div>
      </div>

      {/* First Year Operations */}
      <div className="results-section">
        <h3>First Year Operations</h3>
        <div className="results-grid">
          <div className="result-item">
            <span className="result-label">Energy Production</span>
            <span className="result-value">
              {formatNumber(first_year_operations.energy_production_mwh, 0)} MWh
            </span>
          </div>
          <div className="result-item">
            <span className="result-label">Revenue</span>
            <span className="result-value">{formatCurrency(first_year_operations.revenue)}</span>
          </div>
          <div className="result-item">
            <span className="result-label">O&M Costs</span>
            <span className="result-value">{formatCurrency(first_year_operations.om_costs)}</span>
          </div>
          <div className="result-item">
            <span className="result-label">EBITDA</span>
            <span className="result-value">{formatCurrency(first_year_operations.ebitda)}</span>
          </div>
          <div className="result-item">
            <span className="result-label">CFADS</span>
            <span className="result-value">{formatCurrency(first_year_operations.cfads)}</span>
          </div>
        </div>
      </div>

      {/* Assessment */}
      <div className="results-section">
        <h3>Project Assessment</h3>
        <div className="assessment-list">
          {Object.entries(assessment)
            .filter(([key]) => key !== 'overall')
            .map(([key, value]) => (
              <div key={key} className={`assessment-item ${getAssessmentClass(value)}`}>
                <strong>{key.replace('_', ' ')}</strong>: {value}
              </div>
            ))}
        </div>
        {assessment.overall && (
          <div className={`assessment-overall assessment-item ${getAssessmentClass(assessment.overall)}`}>
            {assessment.overall}
          </div>
        )}
      </div>
    </div>
  );
}
