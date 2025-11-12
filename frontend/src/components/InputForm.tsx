import { useState, useEffect } from 'react';
import type { ProjectInputs } from '../types';
import { DEFAULT_INPUTS } from '../types';
import '../styles/InputForm.css';

interface InputFormProps {
  onSubmit: (inputs: ProjectInputs) => void;
  isLoading: boolean;
}

export function InputForm({ onSubmit, isLoading }: InputFormProps) {
  const [inputs, setInputs] = useState<ProjectInputs>(DEFAULT_INPUTS);

  const handleChange = (field: keyof ProjectInputs, value: string) => {
    setInputs((prev) => ({
      ...prev,
      [field]: parseFloat(value) || 0,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(inputs);
  };

  const handleReset = () => {
    setInputs(DEFAULT_INPUTS);
  };

  return (
    <form className="input-form" onSubmit={handleSubmit}>
      <h2>Project Parameters</h2>

      {/* Required Inputs */}
      <div className="form-section">
        <h3>Core Parameters</h3>
        <div className="form-grid">
          <div className="form-field">
            <label>
              Capacity <span className="label-hint">(MW)</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={inputs.capacity}
              onChange={(e) => handleChange('capacity', e.target.value)}
              required
              min="0"
            />
          </div>

          <div className="form-field">
            <label>
              Capacity Factor <span className="label-hint">(e.g., 0.22 for 22%)</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={inputs.capacity_factor}
              onChange={(e) => handleChange('capacity_factor', e.target.value)}
              required
              min="0"
              max="1"
            />
          </div>

          <div className="form-field">
            <label>
              CapEx per MW <span className="label-hint">(€)</span>
            </label>
            <input
              type="number"
              step="1000"
              value={inputs.capex_per_mw}
              onChange={(e) => handleChange('capex_per_mw', e.target.value)}
              required
              min="0"
            />
          </div>

          <div className="form-field">
            <label>
              PPA Price <span className="label-hint">(€/MWh)</span>
            </label>
            <input
              type="number"
              step="1"
              value={inputs.ppa_price}
              onChange={(e) => handleChange('ppa_price', e.target.value)}
              required
              min="0"
            />
          </div>

          <div className="form-field">
            <label>
              O&M Cost per MW <span className="label-hint">(€/year)</span>
            </label>
            <input
              type="number"
              step="100"
              value={inputs.om_cost_per_mw_year}
              onChange={(e) => handleChange('om_cost_per_mw_year', e.target.value)}
              required
              min="0"
            />
          </div>
        </div>
      </div>

      {/* Technical Parameters */}
      <div className="form-section">
        <h3>Technical Parameters</h3>
        <div className="form-grid">
          <div className="form-field">
            <label>
              Degradation Rate <span className="label-hint">(decimal/year, e.g., 0.004)</span>
            </label>
            <input
              type="number"
              step="0.001"
              value={inputs.degradation_rate}
              onChange={(e) => handleChange('degradation_rate', e.target.value)}
              min="0"
              max="0.1"
            />
          </div>
        </div>
      </div>

      {/* Economic Parameters */}
      <div className="form-section">
        <h3>Economic Parameters</h3>
        <div className="form-grid">
          <div className="form-field">
            <label>
              PPA Escalation <span className="label-hint">(decimal/year, e.g., 0.01)</span>
            </label>
            <input
              type="number"
              step="0.001"
              value={inputs.ppa_escalation}
              onChange={(e) => handleChange('ppa_escalation', e.target.value)}
              min="-0.1"
              max="0.1"
            />
          </div>

          <div className="form-field">
            <label>
              O&M Escalation <span className="label-hint">(decimal/year, e.g., 0.01)</span>
            </label>
            <input
              type="number"
              step="0.001"
              value={inputs.om_escalation}
              onChange={(e) => handleChange('om_escalation', e.target.value)}
              min="-0.1"
              max="0.1"
            />
          </div>
        </div>
      </div>

      {/* Financing Parameters */}
      <div className="form-section">
        <h3>Financing Parameters</h3>
        <div className="form-grid">
          <div className="form-field">
            <label>
              Gearing Ratio <span className="label-hint">(decimal, e.g., 0.75)</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={inputs.gearing_ratio}
              onChange={(e) => handleChange('gearing_ratio', e.target.value)}
              min="0"
              max="1"
            />
          </div>

          <div className="form-field">
            <label>
              Interest Rate <span className="label-hint">(decimal, e.g., 0.045)</span>
            </label>
            <input
              type="number"
              step="0.001"
              value={inputs.interest_rate}
              onChange={(e) => handleChange('interest_rate', e.target.value)}
              min="0"
              max="0.2"
            />
          </div>

          <div className="form-field">
            <label>
              Debt Tenor <span className="label-hint">(years)</span>
            </label>
            <input
              type="number"
              value={inputs.debt_tenor}
              onChange={(e) => handleChange('debt_tenor', e.target.value)}
              min="1"
              max="30"
            />
          </div>

          <div className="form-field">
            <label>
              Target DSCR <span className="label-hint">(ratio, e.g., 1.30)</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={inputs.target_dscr}
              onChange={(e) => handleChange('target_dscr', e.target.value)}
              min="1"
            />
          </div>
        </div>
      </div>

      {/* Project Timeline & Other */}
      <div className="form-section">
        <h3>Other Parameters</h3>
        <div className="form-grid">
          <div className="form-field">
            <label>
              Project Lifetime <span className="label-hint">(years)</span>
            </label>
            <input
              type="number"
              value={inputs.project_lifetime}
              onChange={(e) => handleChange('project_lifetime', e.target.value)}
              min="1"
              max="50"
            />
          </div>

          <div className="form-field">
            <label>
              Tax Rate <span className="label-hint">(decimal, e.g., 0.25)</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={inputs.tax_rate}
              onChange={(e) => handleChange('tax_rate', e.target.value)}
              min="0"
              max="1"
            />
          </div>

          <div className="form-field">
            <label>
              Discount Rate <span className="label-hint">(decimal, e.g., 0.08)</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={inputs.discount_rate}
              onChange={(e) => handleChange('discount_rate', e.target.value)}
              min="0"
              max="0.3"
            />
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          {isLoading ? 'Calculating...' : 'Calculate'}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleReset}
          disabled={isLoading}
        >
          Reset to Defaults
        </button>
      </div>
    </form>
  );
}
