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
import type { YearlyData, MonthlyDataPoint } from '../types';
import '../styles/YearlyData.css';

interface YearlyChartsProps {
  data: YearlyData;
  monthlyData?: MonthlyDataPoint[];
  mode?: 'yearly' | 'monthly';
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

export function YearlyCharts({
  data,
  monthlyData,
  mode = 'yearly',
  equityPaybackYears,
  projectPaybackYears
}: YearlyChartsProps) {
  // Calculate the single closest month to break-even for monthly mode
  const breakEvenMonth = equityPaybackYears !== null && equityPaybackYears !== undefined
    ? Math.round(equityPaybackYears * 12)
    : null;

  // Transform data for charts based on mode
  const chartData = mode === 'monthly' && monthlyData
    ? monthlyData.map((point, index) => {
        const periodLabel = `Y${point.year}M${point.month}`;
        const isYearBoundary = point.month === 1;

        // Calculate position for break-even marker (in months)
        const monthPosition = (point.year - 1) * 12 + point.month;

        return {
          year: periodLabel,
          displayLabel: isYearBoundary ? `Y${point.year}` : '',
          isYearBoundary,
          monthPosition,
          energy: Math.round(point.energy_production_mwh),
          revenue: point.revenue,
          omCosts: -Math.abs(point.om_costs),
          debtService: -Math.abs(point.debt_service),
          fcfToEquity: point.fcf_to_equity,
          cumulativeFCF: point.cumulative_fcf_to_equity,
          // Only mark ONE month as break-even (the closest one)
          isBreakeven: breakEvenMonth !== null && monthPosition === breakEvenMonth
        };
      })
    : data.years.map((year, index) => ({
        year,
        displayLabel: year.toString(),
        isYearBoundary: true,
        monthPosition: year,
        energy: Math.round(data.energy_production_mwh[index]),
        revenue: data.revenue[index],
        omCosts: -Math.abs(data.om_costs[index]),
        debtService: -Math.abs(data.debt_service[index]),
        taxes: -(data.ebitda[index] - data.cfads[index]),
        fcfToEquity: data.fcf_to_equity[index],
        cumulativeFCF: data.cumulative_fcf_to_equity[index],
        isBreakeven: equityPaybackYears !== null && equityPaybackYears !== undefined
          ? Math.abs(year - equityPaybackYears) < 0.6
          : false
      }));

  // For monthly mode, create explicit tick positions for year boundaries
  const xAxisTicks = mode === 'monthly' && monthlyData
    ? chartData
        .filter((d: any) => d.isYearBoundary)
        .map((d: any) => d.year)
    : undefined;

  // Add conditional data fields for positive/negative areas
  // Include transition points in both datasets to avoid gaps
  const enrichedChartData = chartData.map((d: any, index: number) => {
    const prev = chartData[index - 1];
    const next = chartData[index + 1];

    // Check if this point is adjacent to a zero crossing
    const isLastNegative = d.cumulativeFCF < 0 && next && next.cumulativeFCF >= 0;
    const isFirstPositive = d.cumulativeFCF >= 0 && prev && prev.cumulativeFCF < 0;

    return {
      ...d,
      // Include transition points in both datasets
      cumulativeFCFNegative: (d.cumulativeFCF < 0 || isFirstPositive) ? d.cumulativeFCF : null,
      cumulativeFCFPositive: (d.cumulativeFCF >= 0 || isLastNegative) ? d.cumulativeFCF : null,
    };
  });

  return (
    <div className="yearly-charts-container">
      {/* Cumulative Free Cash Flow to Equity */}
      <div className="chart-section">
        <h4>Cumulative Free Cash Flow to Equity</h4>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={enrichedChartData} margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
            <defs>
              {/* Green gradient for positive FCF */}
              <linearGradient id="colorFCFPositive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
              </linearGradient>
              {/* Red gradient for negative FCF */}
              <linearGradient id="colorFCFNegative" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="year"
              label={{
                value: mode === 'monthly' ? 'Time (Years)' : 'Year',
                position: 'insideBottom',
                offset: -5
              }}
              stroke="#6b7280"
              ticks={xAxisTicks}
              interval={mode === 'monthly' ? 0 : 'preserveStartEnd'}
              tick={(props: any) => {
                const { x, y, payload } = props;
                // Find the data point for this tick
                const dataPoint = chartData.find((d: any) => d.year === payload.value);
                const displayValue = dataPoint?.displayLabel || payload.value;

                return (
                  <text x={x} y={y + 10} textAnchor="middle" fill="#6b7280" fontSize={12}>
                    {displayValue}
                  </text>
                );
              }}
            />
            <YAxis
              label={{ value: 'Cumulative Cash Flow (€)', angle: -90, position: 'insideLeft', dx: -30 }}
              tickFormatter={formatCurrency}
              stroke="#6b7280"
            />
            <Tooltip
              formatter={(value: number) => {
                const color = value >= 0 ? '#10b981' : '#ef4444';
                return [
                  <span style={{ color, fontWeight: 'bold' }}>{formatCurrency(value)}</span>,
                  'Cumulative FCF'
                ];
              }}
              contentStyle={{ backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '6px' }}
            />
            <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />
            {/* Area for negative FCF (red) */}
            <Area
              type="monotone"
              dataKey="cumulativeFCFNegative"
              stroke="#ef4444"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorFCFNegative)"
              name="Cumulative FCF to Equity"
              connectNulls={true}
              isAnimationActive={false}
            />
            {/* Area for positive FCF (green) */}
            <Area
              type="monotone"
              dataKey="cumulativeFCFPositive"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorFCFPositive)"
              name="Cumulative FCF to Equity"
              connectNulls={true}
              isAnimationActive={false}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                if (payload.isBreakeven) {
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={8}
                      fill="#3b82f6"
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
          {mode === 'monthly' ? 'Monthly' : 'Yearly'} cumulative cash flow to equity investors over project lifetime.
          {equityPaybackYears !== null && equityPaybackYears !== undefined && (
            <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>
              {' '}Break-even (equity recovered) at {mode === 'monthly'
                ? `month ${Math.round(equityPaybackYears * 12)} (year ${equityPaybackYears.toFixed(1)})`
                : `year ${equityPaybackYears.toFixed(1)}`}.
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
