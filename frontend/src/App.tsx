import { useState } from 'react';
import { InputForm } from './components/InputForm';
import { Results } from './components/Results';
import { SolarFinanceCalculator } from './lib/calculator';
import type { ProjectInputs, ProjectResults } from './types';
import './styles/App.css';

function App() {
  const [results, setResults] = useState<ProjectResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = async (inputs: ProjectInputs) => {
    setIsLoading(true);
    setError(null);

    try {
      // Run calculation in browser (no API call)
      const calculator = new SolarFinanceCalculator(inputs);

      // Generate all results
      const summary = calculator.generateSummaryReport();
      const yearlyData = calculator.generateYearlyData();

      // Build cost breakdown if cost_items provided
      const costItemsBreakdown = inputs.cost_items ? {
        items: inputs.cost_items,
        total_capex: inputs.cost_items
          .filter(item => item.is_capex)
          .reduce((sum, item) => sum + item.amount, 0),
        total_opex_year_1: inputs.cost_items
          .filter(item => !item.is_capex)
          .reduce((sum, item) => sum + item.amount, 0)
      } : undefined;

      const calculatedResults: ProjectResults = {
        ...summary,
        yearly_data: yearlyData,
        cost_items_breakdown: costItemsBreakdown,
        audit_log: undefined // Not implemented in frontend yet
      };

      setResults(calculatedResults);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred during calculation');
      }
      console.error('Calculation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>PV Finance Calculator</h1>
        <p>Financial analysis tool for photovoltaic ground-mounted utility scale projects</p>
      </header>

      {error && (
        <div className="error-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div style={{ flex: 1 }}>
              <h3>Error</h3>
              <p>{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                padding: '0 0.5rem',
                color: 'inherit',
                lineHeight: 1
              }}
              title="Dismiss error"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <InputForm onSubmit={handleCalculate} isLoading={isLoading} />

      {results && <Results results={results} />}
    </div>
  );
}

export default App;
