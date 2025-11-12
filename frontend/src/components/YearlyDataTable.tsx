import type { YearlyData } from '../types';
import '../styles/YearlyData.css';

interface YearlyDataTableProps {
  data: YearlyData;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatNumber = (value: number, decimals = 0): string => {
  return new Intl.NumberFormat('en-EU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export function YearlyDataTable({ data }: YearlyDataTableProps) {
  return (
    <div className="yearly-table-container">
      <table className="yearly-table">
        <thead>
          <tr>
            <th>Year</th>
            <th title="Megawatt-hour: A unit of energy (production), equal to 1,000 kilowatt-hours (kWh).">Energy (MWh)</th>
            <th>Revenue (€)</th>
            <th title="Operations and Maintenance: The ongoing activities required to keep the solar farm running efficiently.">O&M Costs (€)</th>
            <th>EBITDA (€)</th>
            <th>CFADS (€)</th>
            <th>Debt Service (€)</th>
            <th title="Debt Service Coverage Ratio: A key metric used by lenders to determine the project's ability to repay its loan.">DSCR</th>
            <th>FCF to Equity (€)</th>
            <th>Cumulative FCF (€)</th>
          </tr>
        </thead>
        <tbody>
          {data.years.map((year, index) => (
            <tr key={year} className={index % 2 === 0 ? 'even' : 'odd'}>
              <td className="year-cell">{year}</td>
              <td className="number-cell">{formatNumber(data.energy_production_mwh[index], 0)}</td>
              <td className="currency-cell">{formatCurrency(data.revenue[index])}</td>
              <td className="currency-cell">{formatCurrency(data.om_costs[index])}</td>
              <td className="currency-cell">{formatCurrency(data.ebitda[index])}</td>
              <td className="currency-cell">{formatCurrency(data.cfads[index])}</td>
              <td className="currency-cell">{formatCurrency(data.debt_service[index])}</td>
              <td className="number-cell">
                {data.dscr[index] !== null ? `${formatNumber(data.dscr[index]!, 2)}x` : '—'}
              </td>
              <td className="currency-cell">{formatCurrency(data.fcf_to_equity[index])}</td>
              <td className={`currency-cell ${data.cumulative_fcf_to_equity[index] >= 0 ? 'positive' : 'negative'}`}>
                {formatCurrency(data.cumulative_fcf_to_equity[index])}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
