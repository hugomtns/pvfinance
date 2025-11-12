import { useState } from 'react';
import { InputForm } from './components/InputForm';
import { Results } from './components/Results';
import { api } from './services/api';
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
      const calculatedResults = await api.calculateProject(inputs);
      setResults(calculatedResults);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
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
              <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                Make sure the backend server is running on port 8000.
              </p>
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
