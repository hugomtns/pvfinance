import type { AuditLog } from '../types';
import '../styles/AuditLogView.css';

interface AuditLogViewProps {
  data: AuditLog;
}

export function AuditLogView({ data }: AuditLogViewProps) {
  const formatNumber = (value: number, unit: string): string => {
    if (unit === '%') {
      return `${(value * 100).toFixed(2)}%`;
    } else if (unit === 'x' || unit === 'ratio') {
      return `${value.toFixed(4)}${unit === 'x' ? 'x' : ''}`;
    } else if (unit === '€' || unit === '€/MWh') {
      return `€${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}${unit === '€/MWh' ? '/MWh' : ''}`;
    } else if (unit === 'MWh') {
      return `${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} MWh`;
    } else {
      return `${value.toLocaleString('en-US')} ${unit}`;
    }
  };

  const formatAssumptionValue = (key: string, value: number): string => {
    // Check if it's a rate/ratio field
    if (key.includes('Rate') || key.includes('Ratio') || key.includes('Escalation')) {
      return `${(value * 100).toFixed(2)}%`;
    } else if (key.includes('DSCR')) {
      return `${value.toFixed(2)}x`;
    } else if (key.includes('€')) {
      return `€${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    } else if (key.includes('MWh')) {
      return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    } else if (key.includes('MW') && !key.includes('MWh')) {
      return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    } else {
      return value.toLocaleString('en-US');
    }
  };

  return (
    <div className="audit-log-view">
      {/* Formulas Reference */}
      <div className="audit-section formulas-reference">
        <h3>Formulas Reference</h3>
        <p className="section-description">
          Complete list of formulas used in the calculations
        </p>
        {data.formulas_reference.map((category, idx) => (
          <div key={idx} className="formula-category">
            <h4>{category.category}</h4>
            <ul className="formula-list">
              {category.formulas.map((formula, fIdx) => (
                <li key={fIdx} className="formula-item">
                  <code>{formula}</code>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Key Assumptions */}
      <div className="audit-section key-assumptions">
        <h3>Key Assumptions</h3>
        <p className="section-description">
          Input parameters used in all calculations
        </p>
        <div className="assumptions-grid">
          {Object.entries(data.key_assumptions).map(([key, value]) => (
            <div key={key} className="assumption-item">
              <span className="assumption-label">{key}:</span>
              <span className="assumption-value">{formatAssumptionValue(key, value)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Calculation Steps */}
      <div className="audit-section calculation-steps">
        <h3>Detailed Calculation Steps</h3>
        <p className="section-description">
          Step-by-step breakdown of all calculations with formulas, inputs, and results
        </p>
        <div className="steps-list">
          {data.calculation_steps.map((step) => (
            <div key={step.step_number} className="calculation-step">
              <div className="step-header">
                <span className="step-number">Step {step.step_number}</span>
                <span className="step-name">{step.name}</span>
              </div>
              <div className="step-content">
                <div className="step-row">
                  <span className="step-label">Formula:</span>
                  <code className="step-formula">{step.formula}</code>
                </div>
                <div className="step-row">
                  <span className="step-label">Inputs:</span>
                  <div className="step-inputs">
                    {Object.entries(step.inputs).map(([key, value]) => (
                      <div key={key} className="input-item">
                        <span className="input-key">{key}:</span>
                        <span className="input-value">
                          {typeof value === 'number'
                            ? value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 4 })
                            : value
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="step-row">
                  <span className="step-label">Calculation:</span>
                  <code className="step-calculation">{step.calculation}</code>
                </div>
                <div className="step-row step-result-row">
                  <span className="step-label">Result:</span>
                  <span className="step-result">{formatNumber(step.result, step.unit)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Binding Constraint */}
      <div className="audit-section binding-constraint">
        <h3>Binding Constraint Analysis</h3>
        <p className="section-description">
          Explanation of the constraint that limits debt sizing
        </p>
        <div className="constraint-details">
          <div className="constraint-comparison">
            <div className="constraint-option">
              <span className="constraint-label">Max Debt by DSCR:</span>
              <span className="constraint-value">
                €{data.binding_constraint.debt_sizing.max_by_dscr.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="constraint-option">
              <span className="constraint-label">Max Debt by Gearing:</span>
              <span className="constraint-value">
                €{data.binding_constraint.debt_sizing.max_by_gearing.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
          <div className={`constraint-chosen ${data.binding_constraint.debt_sizing.constraint.toLowerCase()}`}>
            <span className="constraint-label">Chosen Debt Amount:</span>
            <span className="constraint-value">
              €{data.binding_constraint.debt_sizing.chosen.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="constraint-reason">
            <strong>Binding Constraint: {data.binding_constraint.debt_sizing.constraint}</strong>
            <p>{data.binding_constraint.debt_sizing.reason}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
