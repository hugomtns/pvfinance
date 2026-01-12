import {
  LineChart,
  Line,
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
  monthlyData?: MonthlyDataPoint[] | null;
  mode?: 'yearly' | 'monthly';
  equityPaybackYears?: number | null;
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

export function YearlyCharts({ data, monthlyData, mode = 'yearly', equityPaybackYears }: YearlyChartsProps) {
  // Determine which data to use
  const useMonthlyView = mode === 'monthly' && monthlyData && monthlyData.length > 0;

  // Transform data for charts based on mode
  const chartData = useMonthlyView
    ? monthlyData!.map((point, index) => ({
        period: `${point.month_name.substring(0, 3)} ${point.year}`,
        periodIndex: index,
        year: point.year,
        month: point.month,
        energy: Math.round(point.energy_production_mwh),
        revenue: point.revenue,
        omCosts: -Math.abs(point.om_costs),
        debtService: -Math.abs(point.debt_service),
        taxes: -(point.ebitda - point.cfads),
        fcfToEquity: point.fcf_to_equity,
        cumulativeFCF: point.cumulative_fcf_to_equity,
      }))
    : data.years.map((year, index) => ({
        period: year.toString(),
        periodIndex: index,
        year,
        energy: Math.round(data.energy_production_mwh[index]),
        revenue: data.revenue[index],
        omCosts: -Math.abs(data.om_costs[index]),
        debtService: -Math.abs(data.debt_service[index]),
        taxes: -(data.ebitda[index] - data.cfads[index]),
        fcfToEquity: data.fcf_to_equity[index],
        cumulativeFCF: data.cumulative_fcf_to_equity[index],
      }));

  // Calculate break-even point
  let breakEvenIndex = -1;
  if (equityPaybackYears !== null && equityPaybackYears !== undefined) {
    if (useMonthlyView) {
      // Monthly: Convert years to months
      breakEvenIndex = Math.round(equityPaybackYears * 12);
    } else {
      // Yearly: Round to nearest year
      breakEvenIndex = Math.round(equityPaybackYears);
    }
  }

  // Enrich chart data with break-even info and split negative/positive areas
  const enrichedChartData = chartData.map((d, idx) => {
    const isBreakeven = idx === breakEvenIndex;
    const prevCum = idx > 0 ? chartData[idx - 1].cumulativeFCF : chartData[0].cumulativeFCF;
    const nextCum = idx < chartData.length - 1 ? chartData[idx + 1].cumulativeFCF : d.cumulativeFCF;

    // Determine if this point should be in negative or positive area
    const cumulativeFCFNegative = d.cumulativeFCF < 0 || (prevCum < 0 && d.cumulativeFCF >= 0) ? d.cumulativeFCF : null;
    const cumulativeFCFPositive = d.cumulativeFCF >= 0 || (d.cumulativeFCF < 0 && nextCum >= 0) ? d.cumulativeFCF : null;

    return {
      ...d,
      isBreakeven,
      cumulativeFCFNegative,
      cumulativeFCFPositive,
    };
  });

  return (
    <div className="yearly-charts-container">
      {/* Chart 1: Line Chart - Operational Metrics */}
      <div className="chart-section" id="operational-metrics-chart">
        <h4>Operational Metrics Over Time</h4>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={enrichedChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="period"
              label={{ value: useMonthlyView ? 'Month' : 'Year', position: 'insideBottom', offset: -5 }}
              stroke="#6b7280"
              interval={useMonthlyView ? 'preserveStartEnd' : 0}
              angle={useMonthlyView ? -45 : 0}
              textAnchor={useMonthlyView ? 'end' : 'middle'}
              height={useMonthlyView ? 80 : 30}
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

      {/* Chart 2: Cumulative Cash Flow */}
      <div className="chart-section" id={useMonthlyView ? 'monthly-fcf-chart' : 'yearly-fcf-chart'}>
        <h4>Cumulative Free Cash Flow to Equity</h4>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={enrichedChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id="colorFCFNegative" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3}/>
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorFCFPositive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="period"
              label={{ value: useMonthlyView ? 'Month' : 'Year', position: 'insideBottom', offset: -5 }}
              stroke="#6b7280"
              interval={useMonthlyView ? 'preserveStartEnd' : 0}
              angle={useMonthlyView ? -45 : 0}
              textAnchor={useMonthlyView ? 'end' : 'middle'}
              height={useMonthlyView ? 80 : 30}
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
            <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="5 5" />

            {/* Negative area (red) */}
            <Area
              type="monotone"
              dataKey="cumulativeFCFNegative"
              stroke="#ef4444"
              strokeWidth={2}
              fill="url(#colorFCFNegative)"
              connectNulls={true}
              name="Cumulative FCF (Negative)"
            />

            {/* Positive area (green) with break-even marker */}
            <Area
              type="monotone"
              dataKey="cumulativeFCFPositive"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#colorFCFPositive)"
              connectNulls={true}
              name="Cumulative FCF (Positive)"
              dot={(props: any) => {
                if (props.payload.isBreakeven) {
                  return (
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={8}
                      fill="#3b82f6"
                      stroke="#ffffff"
                      strokeWidth={3}
                    />
                  );
                }
                return null;
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
        <p className="chart-caption">
          Running total of equity cash flows over time. {equityPaybackYears !== null && equityPaybackYears !== undefined
            ? `Blue marker indicates break-even at ${equityPaybackYears.toFixed(1)} years.`
            : 'Crossing zero indicates payback of initial equity investment.'}
        </p>
      </div>
    </div>
  );
}
