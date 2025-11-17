import { useState } from 'react';
import type { ProjectResults } from '../types';
import { YearlyDataTable } from './YearlyDataTable';
import { YearlyCharts } from './YearlyCharts';
import { AuditLogView } from './AuditLogView';
import '../styles/Results.css';

interface ResultsProps {
  results: ProjectResults;
}

type TabType = 'summary' | 'calculations';

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
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [showCashFlowAnalysis, setShowCashFlowAnalysis] = useState(true);
  const [cashFlowViewMode, setCashFlowViewMode] = useState<'yearly' | 'monthly'>('yearly');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    includeYearlyChart: true,
    includeYearlyTable: true,
    includeMonthlyChart: false,
    includeMonthlyTable: false,
  });

  const handleExportPDF = async () => {
    setIsExporting(true);
    setExportError(null);
    setShowExportModal(false);

    const payload = {
      ...results,
      export_options: exportOptions,
    };

    try {
      const response = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
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
          onClick={() => setShowExportModal(true)}
          disabled={isExporting}
          className="btn btn-primary"
          style={{ padding: '0.625rem 1.25rem' }}
        >
          Export to PDF
        </button>
      </div>

      {exportError && (
        <div className="error-message" style={{ marginBottom: 'var(--spacing-md)' }}>
          {exportError}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tabs-navigation">
        <button
          className={`tab-button ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          Summary
        </button>
        <button
          className={`tab-button ${activeTab === 'calculations' ? 'active' : ''}`}
          onClick={() => setActiveTab('calculations')}
          disabled={!results.audit_log}
        >
          Detailed Calculations
        </button>
      </div>

      {/* Summary Tab */}
      {activeTab === 'summary' && (
        <div className="tab-content"  >

      {/* Project Summary */}
      <div className="results-section">
        <h3>Project Summary</h3>
        <div className="results-grid">
          <div className="result-item">
            <span className="result-label">Capacity</span>
            <span className="result-value">{formatNumber(project_summary.capacity_mw, 1)} MW</span>
          </div>
          <div className="result-item">
            <span className="result-label" title="P50 Year 0 Yield: The expected first-year energy production in MWh before degradation is applied.">P50 Year 0 Yield</span>
            <span className="result-value">{formatNumber(project_summary.p50_year_0_yield_mwh, 0)} MWh</span>
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
            <span className="result-label" title="Capital Expenditures: The total upfront cost incurred to develop and construct the project until it reaches the Commercial Operation Date (COD). This includes all costs for land, permits, engineering, equipment (panels, inverters, racking), and construction (labor).">Total CapEx</span>
            <span className="result-value">{formatCurrency(project_summary.total_capex)}</span>
          </div>
          <div className="result-item">
            <span className="result-label" title="Capital Expenditures: The total upfront cost incurred to develop and construct the project until it reaches the Commercial Operation Date (COD). This includes all costs for land, permits, engineering, equipment (panels, inverters, racking), and construction (labor).">CapEx per MW</span>
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
              <span className="result-label" title="Internal Rate of Return: The primary metric used by equity investors to measure the profitability of their investment. It is the discount rate at which the Net Present Value (NPV) of all project cash flows equals zero.">Project IRR</span>
              <span className="result-value">{formatPercent(key_metrics.project_irr)}</span>
            </div>
          </div>
          <div className="metric-card">
            <div className="result-item">
              <span className="result-label" title="Internal Rate of Return: The primary metric used by equity investors to measure the profitability of their investment. It is the discount rate at which the Net Present Value (NPV) of all project cash flows equals zero.">Equity IRR</span>
              <span className="result-value">{formatPercent(key_metrics.equity_irr)}</span>
            </div>
          </div>
          <div className="metric-card">
            <div className="result-item">
              <span className="result-label" title="Levelized Cost of Energy: A metric used to compare the lifetime cost of different generation technologies. It represents the breakeven price (€/MWh) at which the project must sell its energy to cover its lifetime costs (CapEx, OpEx, and financing) and achieve a target return.">LCOE</span>
              <span className="result-value">€{formatNumber(key_metrics.lcoe)}/MWh</span>
            </div>
          </div>
          <div className="metric-card">
            <div className="result-item">
              <span className="result-label" title="Debt Service Coverage Ratio: A key metric used by lenders to determine the project's ability to repay its loan. It is calculated as CFADS / Total Debt Service (Principal + Interest). Lenders require this to be above 1.0x (e.g., 1.25x) as a safety buffer.">Min DSCR</span>
              <span className="result-value">{formatNumber(key_metrics.min_dscr)}x</span>
            </div>
          </div>
          <div className="result-item">
            <span className="result-label" title="Debt Service Coverage Ratio: A key metric used by lenders to determine the project's ability to repay its loan. It is calculated as CFADS / Total Debt Service (Principal + Interest). Lenders require this to be above 1.0x (e.g., 1.25x) as a safety buffer.">Avg DSCR</span>
            <span className="result-value">{formatNumber(key_metrics.avg_dscr)}x</span>
          </div>
          <div className="result-item">
            <span className="result-label" title="Net Present Value: A core financial metric that calculates the total value of the project in today's dollars. It sums all future cash flows (positive and negative) after discounting them by a specific rate. A positive NPV means the project is profitable.">Project NPV</span>
            <span className="result-value">{formatCurrency(key_metrics.project_npv)}</span>
          </div>
          <div className="result-item">
            <span className="result-label" title="Power Purchase Agreement: The most critical project contract. It is the long-term (e.g., 15-25 year) sales agreement with a creditworthy offtaker (like a utility) who agrees to purchase all electricity produced by the project at a fixed, often escalating, price.">PPA Price</span>
            <span className="result-value">€{formatNumber(key_metrics.ppa_price)}/MWh</span>
          </div>
          <div className="result-item">
            <span className="result-label" title="Equity Payback Period: The number of years required for cumulative free cash flows to equity to become positive, indicating when equity investors recover their initial investment.">Equity Payback</span>
            <span className="result-value">
              {key_metrics.equity_payback_years !== null
                ? `${formatNumber(key_metrics.equity_payback_years, 1)} years`
                : 'N/A'}
            </span>
          </div>
          <div className="result-item">
            <span className="result-label" title="Project Payback Period: The number of years required for cumulative cash flows available for debt service (CFADS) to recover the total capital expenditure.">Project Payback</span>
            <span className="result-value">
              {key_metrics.project_payback_years !== null
                ? `${formatNumber(key_metrics.project_payback_years, 1)} years`
                : 'N/A'}
            </span>
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
            <span className="result-label" title="Gearing represents the ratio of debt to total capital (debt + equity). It shows how much of the project is financed with debt versus equity.">Actual Gearing</span>
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
            <span className="result-label" title="Megawatt-hour: A unit of energy (production), equal to 1,000 kilowatt-hours (kWh). A project with a 10 MW capacity running at full power for one hour produces 10 MWh of energy. PPAs are priced in €/MWh.">Energy Production</span>
            <span className="result-value">
              {formatNumber(first_year_operations.energy_production_mwh, 0)} MWh
            </span>
          </div>
          <div className="result-item">
            <span className="result-label">Revenue</span>
            <span className="result-value">{formatCurrency(first_year_operations.revenue)}</span>
          </div>
          <div className="result-item">
            <span className="result-label" title="Operations and Maintenance: The ongoing activities required to keep the solar farm running efficiently after it is built. This includes panel cleaning, vegetation management, inverter repairs, and performance monitoring.">O&M Costs</span>
            <span className="result-value">{formatCurrency(first_year_operations.om_costs)}</span>
          </div>
          <div className="result-item">
            <span className="result-label" title="EBITDA (Earnings Before Interest, Taxes, Depreciation, and Amortization): Operating profit before financing costs and accounting adjustments. Calculated as Revenue - O&M Costs.">EBITDA</span>
            <span className="result-value">{formatCurrency(first_year_operations.ebitda)}</span>
          </div>
          <div className="result-item">
            <span className="result-label" title="CFADS (Cash Flow Available for Debt Service): Operating cash flow after taxes but before debt service. This is the cash available to pay lenders and equity investors. Calculated as EBITDA - Taxes.">CFADS</span>
            <span className="result-value">{formatCurrency(first_year_operations.cfads)}</span>
          </div>
        </div>
      </div>

      {/* Cash Flow Analysis - Collapsible with Yearly/Monthly Toggle */}
      {results.yearly_data && (
        <div className="results-section collapsible-section">
          <div
            className="collapsible-header"
            onClick={() => setShowCashFlowAnalysis(!showCashFlowAnalysis)}
          >
            <h3>Cash Flow Analysis</h3>
            <div className="collapsible-toggle">
              <span>{showCashFlowAnalysis ? 'Hide' : 'Show'}</span>
              <span className={`collapsible-toggle-icon ${showCashFlowAnalysis ? 'expanded' : ''}`}>
                ▼
              </span>
            </div>
          </div>
          <div className={`collapsible-content ${showCashFlowAnalysis ? 'expanded' : ''}`}>
            {showCashFlowAnalysis && (
              <div className="collapsible-content-inner">
                {/* Toggle Switch for Yearly/Monthly View */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginBottom: 'var(--spacing-md)',
                  gap: '0.5rem'
                }}>
                  <button
                    className={`btn ${cashFlowViewMode === 'yearly' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setCashFlowViewMode('yearly')}
                    style={{ padding: '0.5rem 1.5rem' }}
                  >
                    Yearly
                  </button>
                  <button
                    className={`btn ${cashFlowViewMode === 'monthly' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setCashFlowViewMode('monthly')}
                    disabled={!results.monthly_data}
                    style={{ padding: '0.5rem 1.5rem' }}
                  >
                    Monthly
                  </button>
                </div>

                {/* Chart */}
                <YearlyCharts
                  data={results.yearly_data}
                  monthlyData={results.monthly_data}
                  mode={cashFlowViewMode}
                  equityPaybackYears={key_metrics.equity_payback_years}
                  projectPaybackYears={key_metrics.project_payback_years}
                />

                {/* Table */}
                <div style={{ marginTop: 'var(--spacing-lg)' }}>
                  <h4 style={{ marginBottom: 'var(--spacing-md)' }}>
                    {cashFlowViewMode === 'yearly' ? 'Yearly' : 'Monthly'} Financial Projections
                  </h4>
                  <YearlyDataTable
                    data={results.yearly_data}
                    monthlyData={results.monthly_data}
                    mode={cashFlowViewMode}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}


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
      )}

      {/* Detailed Calculations Tab */}
      {activeTab === 'calculations' && results.audit_log && (
        <div className="tab-content">
          <AuditLogView data={results.audit_log} />
        </div>
      )}

      {/* Export PDF Modal */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Export PDF Report</h3>
              <button
                className="modal-close"
                onClick={() => setShowExportModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 'var(--spacing-md)', color: 'var(--color-text-secondary)' }}>
                Select the components to include in your PDF report:
              </p>
              <div className="export-options">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeYearlyChart}
                    onChange={(e) => setExportOptions({ ...exportOptions, includeYearlyChart: e.target.checked })}
                  />
                  <span>Cash Flow Chart (Annual)</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeYearlyTable}
                    onChange={(e) => setExportOptions({ ...exportOptions, includeYearlyTable: e.target.checked })}
                  />
                  <span>Cash Flow Table (Annual)</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeMonthlyChart}
                    onChange={(e) => setExportOptions({ ...exportOptions, includeMonthlyChart: e.target.checked })}
                    disabled={!results.monthly_data}
                  />
                  <span>Cash Flow Chart (Monthly){!results.monthly_data && ' (Not available)'}</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeMonthlyTable}
                    onChange={(e) => setExportOptions({ ...exportOptions, includeMonthlyTable: e.target.checked })}
                    disabled={!results.monthly_data}
                  />
                  <span>Cash Flow Table (Monthly){!results.monthly_data && ' (Not available)'}</span>
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowExportModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleExportPDF}
                disabled={isExporting}
              >
                {isExporting ? 'Generating...' : 'Generate PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
