import { chartCardInteractiveClass, chartTitleClass } from './chartStyles';

// Placeholder de componente para futuras extensões de stake.
// Mantido simples para não alterar comportamento atual da página.

export function AnaliseStakeChart() {
  return (
    <div className={chartCardInteractiveClass}>
      <h3 className={chartTitleClass}>Stake</h3>
      <div className="flex h-[260px] min-h-[200px] items-center justify-center text-sm font-medium text-foreground-muted">
        Em breve
      </div>
    </div>
  );
}

export default AnaliseStakeChart;


