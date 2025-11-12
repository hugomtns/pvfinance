import { useState, useEffect } from 'react';
import type { ProjectInputs, CostLineItem } from '../types';
import { DEFAULT_INPUTS } from '../types';
import { LineItemsManager } from './LineItemsManager';
import { useLocalStorage } from '../hooks/useLocalStorage';
import '../styles/InputForm.css';

interface InputFormProps {
  onSubmit: (inputs: ProjectInputs) => void;
  isLoading: boolean;
}

export function InputForm({ onSubmit, isLoading }: InputFormProps) {
  const [inputs, setInputs] = useLocalStorage<ProjectInputs>('pvfinance_current_project', DEFAULT_INPUTS);
  const [useLineItems, setUseLineItems] = useState(false);
  const [capexItems, setCapexItems] = useState<CostLineItem[]>([]);
  const [opexItems, setOpexItems] = useState<CostLineItem[]>([]);

  const handleChange = (field: keyof ProjectInputs, value: string) => {
    setInputs((prev) => ({
      ...prev,
      [field]: parseFloat(value) || 0,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Build inputs object with cost_items if in line items mode
    const submissionInputs: ProjectInputs = {
      ...inputs,
      cost_items: useLineItems ? [...capexItems, ...opexItems] : undefined,
    };

    onSubmit(submissionInputs);
  };

  const handleReset = () => {
    setInputs(DEFAULT_INPUTS);
    setCapexItems([]);
    setOpexItems([]);
    setUseLineItems(false);
  };

  const handleLineItemsToggle = (enabled: boolean) => {
    setUseLineItems(enabled);
    if (!enabled) {
      // Reset line items when disabling
      setCapexItems([]);
      setOpexItems([]);
    }
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

          {!useLineItems && (
            <>
              <div className="form-field">
                <label title="The total upfront cost incurred to develop and construct the project until it reaches the Commercial Operation Date (COD). This includes all costs for land, permits, engineering, equipment (panels, inverters, racking), and construction (labor).">
                  CapEx per MW <span className="label-hint">(€)</span>
                </label>
                <input
                  type="number"
                  step="1000"
                  value={inputs.capex_per_mw || 0}
                  onChange={(e) => handleChange('capex_per_mw', e.target.value)}
                  required={!useLineItems}
                  min="0"
                />
              </div>

              <div className="form-field">
                <label title="The ongoing activities required to keep the solar farm running efficiently after it is built. This includes panel cleaning, vegetation management, inverter repairs, and performance monitoring.">
                  O&M Cost per MW <span className="label-hint">(€/year)</span>
                </label>
                <input
                  type="number"
                  step="100"
                  value={inputs.om_cost_per_mw_year || 0}
                  onChange={(e) => handleChange('om_cost_per_mw_year', e.target.value)}
                  required={!useLineItems}
                  min="0"
                />
              </div>
            </>
          )}

          <div className="form-field">
            <label title="Power Purchase Agreement: The most critical project contract. It is the long-term (e.g., 15-25 year) sales agreement with a creditworthy offtaker (like a utility) who agrees to purchase all electricity produced by the project at a fixed, often escalating, price.">
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
        </div>
      </div>

      {/* Line Items Section */}
      <div className="form-section">
        <h3>Cost Breakdown (Optional)</h3>
        <LineItemsManager
          enabled={useLineItems}
          onToggle={handleLineItemsToggle}
          capexItems={capexItems}
          opexItems={opexItems}
          onCapexItemsChange={setCapexItems}
          onOpexItemsChange={setOpexItems}
        />
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
            <label title="Operating Expenditures: The recurring, annual costs to operate the project after COD. This includes the O&M contract, land lease payments, property taxes, insurance, and asset management fees.">
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
            <label title="Debt Service Coverage Ratio: A key metric used by lenders to determine the project's ability to repay its loan. It is calculated as CFADS / Total Debt Service (Principal + Interest). Lenders require this to be above 1.0x (e.g., 1.25x) as a safety buffer.">
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
