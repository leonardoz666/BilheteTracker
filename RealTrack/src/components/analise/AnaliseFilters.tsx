import { Filter } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { CASAS_APOSTAS } from '../../constants/casasApostas';
import { STATUS_APOSTAS } from '../../constants/statusApostas';
import { useTipsters } from '../../hooks/useTipsters';
import { useBancas } from '../../hooks/useBancas';
import DateInput from '../DateInput';
import FilterPopover from '../FilterPopover';
import type { AnaliseFilters } from '../../types/AnaliseFilters';

interface AnaliseFiltersProps {
  value: AnaliseFilters;
  onChange: (next: AnaliseFilters) => void;
}

const initialFilters: AnaliseFilters = {
  bancaId: '',
  status: '',
  tipster: '',
  casa: '',
  esporte: '',
  evento: '',
  dataInicio: '',
  dataFim: '',
  oddMin: '',
  oddMax: '',
};

export function AnaliseFilters({ value, onChange }: AnaliseFiltersProps) {
  const { tipsters } = useTipsters();
  const { bancas } = useBancas();
  const [open, setOpen] = useState(false);
  const [pendingFilters, setPendingFilters] = useState<AnaliseFilters>(value);

  const filterButtonClass =
    'inline-flex items-center gap-2 rounded-full border border-border/20 bg-gradient-to-r from-brand-emerald to-brand-teal px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_25px_rgba(16,185,129,0.35)] transition hover:from-brand-hover hover:to-brand-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-emerald/40';
  const filterCountClass =
    'rounded-full bg-white/20 px-2 text-xs font-semibold tracking-wide text-white shadow-inner';
  const panelClass = 'grid gap-4 md:grid-cols-2';
  const fieldClass = 'flex flex-col gap-2 rounded-2xl border border-border/40 bg-background-card/40 p-4 shadow-sm shadow-black/0 backdrop-blur';
  const labelClass = 'text-2xs font-semibold uppercase tracking-[0.4em] text-foreground-muted';
  const inputClass =
    'w-full rounded-2xl border border-border/50 bg-background px-4 py-3 text-sm text-foreground placeholder:text-foreground-muted shadow-sm transition focus-visible:border-brand-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-emerald/30';
  const hintClass = 'text-xs leading-relaxed text-foreground-muted';

  const handleFilterChange = useCallback(
    <K extends keyof AnaliseFilters>(field: K, fieldValue: AnaliseFilters[K]) => {
      setPendingFilters((prev) => ({ ...prev, [field]: fieldValue }));
    },
    [],
  );

  const handleApply = useCallback(() => {
    onChange(pendingFilters);
    setOpen(false);
  }, [onChange, pendingFilters]);

  const handleClear = useCallback(() => {
    const nextFilters = { ...initialFilters, bancaId: value.bancaId };
    setPendingFilters(nextFilters);
    onChange(nextFilters);
    setOpen(false);
  }, [onChange, value.bancaId]);

  const activeFiltersCount = useMemo(
    () =>
      Object.entries(value)
        .filter(([key, filterValue]) => key !== 'bancaId' && filterValue !== '')
        .length,
    [value],
  );

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        className={filterButtonClass}
        onClick={() => {
          setPendingFilters(value);
          setOpen((prev) => !prev);
        }}
      >
        <Filter size={16} /> Filtros{' '}
        {activeFiltersCount > 0 && <span className={filterCountClass}>{activeFiltersCount}</span>}
      </button>
      <FilterPopover
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        onClear={handleClear}
        footer={
          <button
            type="button"
            className="w-full rounded-2xl bg-brand-linear px-4 py-3 text-sm font-semibold text-white shadow-glow transition active:scale-[0.99]"
            onClick={handleApply}
          >
            Aplicar filtros
          </button>
        }
        maxWidth="1200px" // largura máxima ainda maior para filtros de análise
      >
        <div className={panelClass} data-filter-context="true">
          <div className={fieldClass}>
            <label className={labelClass}>Banca</label>
            <select
              value={pendingFilters.bancaId}
              onChange={(event) => handleFilterChange('bancaId', event.target.value)}
              className={inputClass}
            >
              <option value="" disabled hidden>
                {bancas.length > 0 ? 'Selecione a banca' : 'Nenhuma banca disponível'}
              </option>
              {bancas.map((banca) => (
                <option key={banca.id} value={banca.id}>
                  {banca.nome}
                </option>
              ))}
            </select>
          </div>
          <div className={fieldClass}>
            <label className={labelClass}>Status</label>
            <select
              value={pendingFilters.status}
              onChange={(event) => handleFilterChange('status', event.target.value)}
              className={inputClass}
            >
              <option value="" disabled hidden>
                Selecione um status
              </option>
              {STATUS_APOSTAS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div className={fieldClass}>
            <label className={labelClass}>Tipsters</label>
            <select
              value={pendingFilters.tipster}
              onChange={(event) => handleFilterChange('tipster', event.target.value)}
              className={inputClass}
            >
              <option value="" disabled hidden>
                Selecione…
              </option>
              {tipsters
                .filter((tipster) => tipster.ativo)
                .map((tipster) => (
                  <option key={tipster.id} value={tipster.nome}>
                    {tipster.nome}
                  </option>
                ))}
            </select>
          </div>
          <div className={fieldClass}>
            <label className={labelClass}>Casa de Apostas</label>
            <select
              value={pendingFilters.casa}
              onChange={(event) => handleFilterChange('casa', event.target.value)}
              className={inputClass}
            >
              <option value="" disabled hidden>
                Selecione a casa
              </option>
              {CASAS_APOSTAS.map((casa) => (
                <option key={casa} value={casa}>
                  {casa}
                </option>
              ))}
            </select>
          </div>
          <div className={fieldClass}>
            <label className={labelClass}>Evento, Mercado ou Aposta</label>
            <input
              type="text"
              value={pendingFilters.evento}
              onChange={(event) => handleFilterChange('evento', event.target.value)}
              placeholder="Digite o nome do evento, mercado ou aposta"
              className={inputClass}
            />
          </div>
          <div className={fieldClass}>
            <label className={labelClass}>Data do Evento (De)</label>
            <DateInput
              value={pendingFilters.dataInicio}
              onChange={(dateValue) => handleFilterChange('dataInicio', dateValue)}
              placeholder="dd/mm/aaaa"
              className={inputClass}
            />
          </div>
          <div className={fieldClass}>
            <label className={labelClass}>Data do Evento (Até)</label>
            <DateInput
              value={pendingFilters.dataFim}
              onChange={(dateValue) => handleFilterChange('dataFim', dateValue)}
              placeholder="dd/mm/aaaa"
              className={inputClass}
            />
            <p className={hintClass}>
              Se só preencher &quot;De&quot;, será filtrado apenas nesta data. Se preencher &quot;Até&quot;, será
              considerado como intervalo.
            </p>
          </div>
          <div className={fieldClass}>
            <label className={labelClass}>ODD</label>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="number"
                value={pendingFilters.oddMin}
                onChange={(event) => handleFilterChange('oddMin', event.target.value)}
                placeholder="Mínimo"
                step="0.01"
                className={inputClass}
              />
              <input
                type="number"
                value={pendingFilters.oddMax}
                onChange={(event) => handleFilterChange('oddMax', event.target.value)}
                placeholder="Máximo"
                step="0.01"
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </FilterPopover>
    </div>
  );
}

export default AnaliseFilters;


