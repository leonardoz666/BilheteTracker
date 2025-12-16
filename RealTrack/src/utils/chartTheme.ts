export const ROI_GRADIENT_ID = 'roiGradient';
export const ODDS_GRADIENT_ID = 'oddsGradient';

export const chartTheme = {
  gridStroke: 'var(--bg-hover)',
  axisStroke: 'var(--text)',
  colors: {
    grid: 'var(--bg-hover)',
    axis: 'var(--text)',
    text: 'var(--text)',
    muted: 'var(--muted)',
    tooltipBg: 'var(--surface)',
    tooltipBorder: 'var(--border)',
    tooltipShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
    tooltipLabel: 'var(--text)',
    tooltipItem: 'var(--muted)',
    linePrimary: '#2563eb',
    lineSecondary: 'var(--success)',
    lineFill: 'rgba(37, 99, 235, 0.3)',
    areaPrimary: 'var(--success)',
    borderSuccess: 'var(--border-success)'
  },
  axisTick: {
    fill: 'var(--text)',
    fontSize: 11
  },
  axisLabel: {
    fill: 'var(--text)',
    fontSize: 11
  },
  tooltip: {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: 14,
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)'
  },
  tooltipDark: {
    backgroundColor: 'rgb(var(--ui-card, 12 35 30) / 0.92)',
    border: '1px solid rgb(var(--ui-border, 148 163 184) / 0.4)',
    borderRadius: 16,
    color: '#fff'
  },
  tooltipLabel: {
    color: 'var(--text)',
    fontWeight: 600,
    marginBottom: 4
  },
  tooltipItem: {
    color: 'var(--muted)'
  },
  legendProps: {
    wrapperStyle: {
      paddingTop: 16,
      color: 'var(--muted)',
      fontSize: 12
    },
    iconType: 'circle' as const
  },
  barRadius: [10, 10, 0, 0] as [number, number, number, number],
  lineDot: {
    r: 4,
    strokeWidth: 2,
    stroke: '#2563eb',
    fill: 'rgba(37, 99, 235, 0.35)'
  },
  lineActiveDot: {
    r: 6,
    strokeWidth: 2,
    stroke: '#2563eb',
    fill: 'var(--surface)'
  },
  gradients: {
    roi: {
      id: ROI_GRADIENT_ID,
      stops: [
        { offset: '0%', color: '#2563eb', opacity: 0.95 },
        { offset: '100%', color: '#2563eb', opacity: 0.2 }
      ]
    },
    odds: {
      id: ODDS_GRADIENT_ID,
      stops: [
        { offset: '0%', color: 'var(--success)', opacity: 0.9 },
        { offset: '100%', color: 'var(--success)', opacity: 0.1 }
      ]
    },
    winRate: {
      id: 'winRateGradient',
      stops: [
        { offset: '5%', color: 'var(--success)', opacity: 0.9 },
        { offset: '50%', color: 'var(--success)', opacity: 0.8 },
        { offset: '95%', color: 'var(--success)', opacity: 0.6 }
      ]
    }
  }
};

export type ChartTheme = typeof chartTheme;

