import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { chartTheme } from '../../utils/chartTheme';
import type { OddsChartPoint } from '../../types/OddsChartPoint';
import { useChartContainer } from '../../hooks/useChartContainer';
import { chartCardInteractiveClass, chartTitleClass } from './chartStyles';

interface AnaliseOddsChartProps {
  data: OddsChartPoint[];
}

export function AnaliseOddsChart({ data }: AnaliseOddsChartProps) {
  const hasData = data.length > 0 && data.some((item) => item.quantidade > 0);
  const chartHeight = 260;
  const { containerRef, hasSize, dimensions } = useChartContainer({ minHeight: 200, minWidth: 200 });
  const chartWidthPx = Math.max(dimensions.width, 0);
  const chartHeightPx = Math.max(dimensions.height, 0);

  return (
    <div className={chartCardInteractiveClass}>
      <h3 className={chartTitleClass}>Distribuição de Odds</h3>
      <div
        ref={containerRef}
        className="w-full"
        style={{ minHeight: chartHeight, height: chartHeight }}
      >
        {!hasSize ? (
          <div className="flex h-full items-center justify-center text-xs font-medium text-foreground-muted">
            Preparando gráfico...
          </div>
        ) : !hasData ? (
          <div className="flex h-full items-center justify-center text-sm font-medium text-foreground-muted">
            Nenhum dado disponível
          </div>
        ) : (
          <AreaChart
            width={chartWidthPx}
            height={chartHeightPx}
            data={data}
            margin={{ top: 5, right: 12, left: -6, bottom: 5 }}
          >
            <defs>
              <linearGradient id={chartTheme.gradients.odds.id} x1="0" y1="0" x2="0" y2="1">
                {chartTheme.gradients.odds.stops.map((stop) => (
                  <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} stopOpacity={stop.opacity} />
                ))}
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
            <XAxis
              dataKey="faixa"
              stroke={chartTheme.axisStroke}
              tick={{ ...chartTheme.axisTick }}
              tickLine={false}
            />
            <YAxis
              stroke={chartTheme.axisStroke}
              tick={{ ...chartTheme.axisTick }}
              tickLine={false}
              axisLine={false}
              label={{
                value: 'Qtd. Apostas',
                angle: -90,
                position: 'insideLeft',
                style: chartTheme.axisLabel,
              }}
            />
            <Tooltip
              contentStyle={chartTheme.tooltip}
              labelStyle={chartTheme.tooltipLabel}
              itemStyle={chartTheme.tooltipItem}
            />
            <Area
              type="monotone"
              dataKey="quantidade"
              stroke={chartTheme.colors.areaPrimary}
              strokeWidth={3}
              fill={`url(#${chartTheme.gradients.odds.id})`}
            />
          </AreaChart>
        )}
      </div>
    </div>
  );
}

export default AnaliseOddsChart;


