import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { YearlyData } from '../types';
import '../styles/YearlyData.css';

interface YearlyChartsProps {
  data: YearlyData;
  equityPaybackYears?: number | null;
  projectPaybackYears?: number | null;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: 'compact',
    compactDisplay: 'short',
  }).format(value);
};

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-EU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: 'compact',
    compactDisplay: 'short',
  }).format(value);
};

export function YearlyCharts({ data, equityPaybackYears, projectPaybackYears }: YearlyChartsProps) {
  // Transform data for charts
  const chartData = data.years.map((year, index) => ({
    year,
    energy: Math.round(data.energy_production_mwh[index]),
    revenue: data.revenue[index],
    omCosts: -Math.abs(data.om_costs[index]), // Negative for waterfall
    debtService: -Math.abs(data.debt_service[index]), // Negative for waterfall
    taxes: -(data.ebitda[index] - data.cfads[index]), // Negative for waterfall (EBITDA - CFADS = Tax)
    fcfToEquity: data.fcf_to_equity[index],
    cumulativeFCF: data.cumulative_fcf_to_equity[index],
  }));

  return (
    <div className="yearly-charts-container">
      {/* Chart 1: Line Chart - Operational Metrics */}
      <div className="chart-section">
        <h4>Operational Metrics Over Time</h4>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="year"
              label={{ value: 'Year', position: 'insideBottom', offset: -5 }}
              stroke="#6b7280"
            />
            <YAxis
              yAxisId="left"
              label={{ value: 'Revenue / Costs (€)', angle: -90, position: 'insideLeft' }}
              tickFormatter={formatCurrency}
              stroke="#6b7280"
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              label={{ value: 'Energy (MWh)', angle: 90, position: 'insideRight' }}
              tickFormatter={formatNumber}
              stroke="#6b7280"
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === 'Energy Production') return [formatNumber(value) + ' MWh', name];
                return [formatCurrency(value), name];
              }}
              contentStyle={{ backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '6px' }}
            />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="revenue"
              stroke="#10b981"
              strokeWidth={2}
              name="Revenue"
              dot={false}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="omCosts"
              stroke="#ef4444"
              strokeWidth={2}
              name="O&M Costs"
              dot={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="energy"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Energy Production"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
        <p className="chart-caption">
          Shows how energy production decreases due to degradation while revenue increases from PPA escalation.
        </p>
      </div>

      {/* Chart 2: Waterfall - Cash Flow Breakdown */}
      <div className="chart-section">
        <h4>Annual Cash Flow Waterfall</h4>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="year"
              label={{ value: 'Year', position: 'insideBottom', offset: -5 }}
              stroke="#6b7280"
            />
            <YAxis
              label={{ value: 'Cash Flow (€)', angle: -90, position: 'insideLeft' }}
              tickFormatter={formatCurrency}
              stroke="#6b7280"
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(Math.abs(value))}
              contentStyle={{ backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '6px' }}
            />
            <Legend />
            <ReferenceLine y={0} stroke="#000" />
            <Bar dataKey="revenue" stackId="a" fill="#10b981" name="Revenue" />
            <Bar dataKey="omCosts" stackId="a" fill="#ef4444" name="O&M Costs" />
            <Bar dataKey="taxes" stackId="a" fill="#f59e0b" name="Taxes" />
            <Bar dataKey="debtService" stackId="a" fill="#8b5cf6" name="Debt Service" />
            <Bar dataKey="fcfToEquity" stackId="b" fill="#3b82f6" name="FCF to Equity" />
          </BarChart>
        </ResponsiveContainer>
        <p className="chart-caption">
          Breakdown of annual cash flows showing revenue inflows and cost/debt outflows, with net FCF to equity.
        </p>
      </div>

      {/* Chart 3: Cumulative Cash Flow */}
      <div className="chart-section">
        <h4>Cumulative Free Cash Flow to Equity</h4>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id="colorFCF" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="year"
              label={{ value: 'Year', position: 'insideBottom', offset: -5 }}
              stroke="#6b7280"
            />
            <YAxis
              label={{ value: 'Cumulative Cash Flow (€)', angle: -90, position: 'insideLeft' }}
              tickFormatter={formatCurrency}
              stroke="#6b7280"
            />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), 'Cumulative FCF']}
              contentStyle={{ backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '6px' }}
            />
            <ReferenceLine y={0} stroke="#000" strokeDasharray="3 3" label="Breakeven" />
            {equityPaybackYears !== null && equityPaybackYears !== undefined && (
              <ReferenceLine
                x={Math.ceil(equityPaybackYears)}
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{
                  value: `Equity Payback: ${equityPaybackYears.toFixed(1)} yrs`,
                  position: 'top',
                  fill: '#ef4444',
                  fontSize: 12,
                  fontWeight: 'bold'
                }}
              />
            )}
            <Area
              type="monotone"
              dataKey="cumulativeFCF"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorFCF)"
              name="Cumulative FCF to Equity"
            />
          </AreaChart>
        </ResponsiveContainer>
        <p className="chart-caption">
          Running total of equity cash flows over time. Crossing zero indicates payback of initial equity investment.
          {equityPaybackYears !== null && equityPaybackYears !== undefined && (
            <span style={{ fontWeight: 'bold', color: '#ef4444' }}>
              {' '}Equity payback achieved at year {equityPaybackYears.toFixed(1)}.
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
