import React from 'react';
import type { YearlyData, MonthlyDataPoint } from '../types';
import '../styles/YearlyData.css';

interface YearlyDataTableProps {
  data: YearlyData;
  monthlyData?: MonthlyDataPoint[] | null;
  mode?: 'yearly' | 'monthly';
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

export function YearlyDataTable({ data, monthlyData, mode = 'yearly' }: YearlyDataTableProps) {
  const useMonthlyView = mode === 'monthly' && monthlyData && monthlyData.length > 0;

  // Render monthly view
  if (useMonthlyView) {
    // Group monthly data by year
    const groupedMonthlyData = monthlyData!.reduce((acc, point) => {
      if (!acc[point.year]) acc[point.year] = [];
      acc[point.year].push(point);
      return acc;
    }, {} as Record<number, MonthlyDataPoint[]>);

    return (
      <div className="yearly-table-container">
        <table className="yearly-table monthly-table">
          <thead>
            <tr>
              <th>Period</th>
              <th title="Megawatt-hour: A unit of energy (production), equal to 1,000 kilowatt-hours (kWh).">Energy (MWh)</th>
              <th>Revenue (€)</th>
              <th title="Operations and Maintenance: The ongoing activities required to keep the solar farm running efficiently.">O&M Costs (€)</th>
              <th title="EBITDA (Earnings Before Interest, Taxes, Depreciation, and Amortization): Operating profit before financing costs and accounting adjustments.">EBITDA (€)</th>
              <th title="CFADS (Cash Flow Available for Debt Service): Operating cash flow after taxes but before debt service.">CFADS (€)</th>
              <th>Debt Service (€)</th>
              <th title="FCF to Equity (Free Cash Flow to Equity): The cash available to equity investors after all operating costs, taxes, and debt service are paid.">FCF to Equity (€)</th>
              <th>Cumulative FCF (€)</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(groupedMonthlyData).map(([year, months]) => (
              <React.Fragment key={year}>
                <tr className="year-header-row">
                  <td colSpan={9}><strong>Year {year}</strong></td>
                </tr>
                {months.map((point) => (
                  <tr key={`${year}-${point.month}`}>
                    <td className="year-cell">{point.month_name}</td>
                    <td className="number-cell">{formatNumber(point.energy_production_mwh, 0)}</td>
                    <td className="currency-cell">{formatCurrency(point.revenue)}</td>
                    <td className="currency-cell">{formatCurrency(point.om_costs)}</td>
                    <td className="currency-cell">{formatCurrency(point.ebitda)}</td>
                    <td className="currency-cell">{formatCurrency(point.cfads)}</td>
                    <td className="currency-cell">{formatCurrency(point.debt_service)}</td>
                    <td className="currency-cell">{formatCurrency(point.fcf_to_equity)}</td>
                    <td className={`currency-cell ${point.cumulative_fcf_to_equity >= 0 ? 'positive' : 'negative'}`}>
                      {formatCurrency(point.cumulative_fcf_to_equity)}
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Render yearly view (default)
  return (
    <div className="yearly-table-container">
      <table className="yearly-table">
        <thead>
          <tr>
            <th>Year</th>
            <th title="Megawatt-hour: A unit of energy (production), equal to 1,000 kilowatt-hours (kWh).">Energy (MWh)</th>
            <th>Revenue (€)</th>
            <th title="Operations and Maintenance: The ongoing activities required to keep the solar farm running efficiently.">O&M Costs (€)</th>
            <th title="EBITDA (Earnings Before Interest, Taxes, Depreciation, and Amortization): Operating profit before financing costs and accounting adjustments. Calculated as Revenue - O&M Costs.">EBITDA (€)</th>
            <th title="CFADS (Cash Flow Available for Debt Service): Operating cash flow after taxes but before debt service. This is the cash available to pay lenders and equity investors. Calculated as EBITDA - Taxes.">CFADS (€)</th>
            <th>Debt Service (€)</th>
            <th title="Debt Service Coverage Ratio: A key metric used by lenders to determine the project's ability to repay its loan.">DSCR</th>
            <th title="FCF to Equity (Free Cash Flow to Equity): The cash available to equity investors after all operating costs, taxes, and debt service are paid. Calculated as CFADS - Debt Service.">FCF to Equity (€)</th>
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
