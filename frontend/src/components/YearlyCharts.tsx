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
    // Mark the break-even point for highlighting
    isBreakeven: equityPaybackYears !== null && equityPaybackYears !== undefined
      ? Math.abs(year - equityPaybackYears) < 0.6  // Highlight year closest to payback
      : false
  }));

  return (
    <div className="yearly-charts-container">
      {/* Cumulative Free Cash Flow to Equity */}
      <div className="chart-section">
        <h4>Cumulative Free Cash Flow to Equity</h4>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
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
              label={{ value: 'Cumulative Cash Flow (€)', angle: -90, position: 'insideLeft', dx: -30 }}
              tickFormatter={formatCurrency}
              stroke="#6b7280"
            />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), 'Cumulative FCF']}
              contentStyle={{ backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '6px' }}
            />
            <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />
            {equityPaybackYears !== null && equityPaybackYears !== undefined && (
              <ReferenceLine
                x={equityPaybackYears}
                stroke="#dc2626"
                strokeWidth={3}
                label={{
                  value: `Break-even`,
                  position: 'insideTopRight',
                  fill: '#dc2626',
                  fontSize: 14,
                  fontWeight: 'bold',
                  offset: 10
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
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                if (payload.isBreakeven) {
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={8}
                      fill="#dc2626"
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  );
                }
                return null;
              }}
              activeDot={{ r: 6 }}
            />
          </AreaChart>
        </ResponsiveContainer>
        <p className="chart-caption">
          Cumulative cash flow to equity investors over project lifetime.
          {equityPaybackYears !== null && equityPaybackYears !== undefined && (
            <span style={{ fontWeight: 'bold', color: '#dc2626' }}>
              {' '}Break-even (equity recovered) at year {equityPaybackYears.toFixed(1)}.
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
