/**
 * Formulário de Aposta
 * 
 * Componente para criar/editar apostas
 */

import { useCallback, type FormEvent } from 'react';
import DateInput from './DateInput';
import { ESPORTES } from '../constants/esportes';
import { TIPOS_APOSTA } from '../constants/tiposAposta';
import { STATUS_APOSTAS } from '../constants/statusApostas';
import { CASAS_APOSTAS } from '../constants/casasApostas';
import type { ApiBankroll, ApiTipster } from '../types/api';
import { cn } from './ui/utils';

// ============================================
// Tipos
// ============================================

export interface ApostaFormData {
  bancaId: string;
  esporte: string;
  evento: string; // era jogo
  aposta: string; // novo campo
  torneio: string;
  pais: string;
  mercado: string;
  tipoAposta: string;
  valorApostado: string;
  odd: string;
  bonus: string;
  dataEvento: string;
  tipster: string;
  status: string;
  casaDeAposta: string;
  retornoObtido: string;
}

export interface ApostaFormErrors {
  bancaId?: string;
  esporte?: string;
  evento?: string;
  aposta?: string;
  mercado?: string;
  tipoAposta?: string;
  valorApostado?: string;
  odd?: string;
  dataEvento?: string;
  casaDeAposta?: string;
  retornoObtido?: string;
}

interface ApostaFormProps {
  formData: ApostaFormData;
  onChange: (field: keyof ApostaFormData, value: string) => void;
  onSubmit: (e?: FormEvent) => void | Promise<void>;
  bancas: ApiBankroll[];
  tipsters: ApiTipster[];
  errors?: ApostaFormErrors;
  isEditing?: boolean;
  saving?: boolean;
  notice?: string;
}

// Status que requerem retorno
const STATUS_WITH_RETURNS = ['Ganha', 'Meio Ganha'];

// ============================================
// Componente
// ============================================

export default function ApostaForm({
  formData,
  onChange,
  onSubmit,
  bancas,
  tipsters,
  errors = {},
  isEditing = false,
  saving = false,
  notice,
}: ApostaFormProps) {
  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    onSubmit(e);
  }, [onSubmit]);

  const handleStatusChange = useCallback((value: string) => {
    onChange('status', value);
    if (!STATUS_WITH_RETURNS.includes(value)) {
      if (formData.retornoObtido !== '') {
        onChange('retornoObtido', '');
      }
    }
  }, [formData.retornoObtido, onChange]);

  const handleRetornoChange = useCallback((value: string) => {
    onChange('retornoObtido', value);
  }, [onChange]);

  // Tipsters ativos
  const activeTipsters = tipsters.filter(t => t.ativo);

  const inputClass = 'w-full rounded-2xl border border-border/50 bg-background px-4 py-3 text-sm text-foreground placeholder:text-foreground-muted transition focus-visible:border-brand-emerald focus-visible:ring-2 focus-visible:ring-brand-emerald/30';
  const buttonClass = 'inline-flex items-center justify-center rounded-2xl bg-brand-linear px-5 py-3 text-sm font-semibold text-white shadow-glow transition active:scale-[0.98] disabled:opacity-60';

  return (
    <>
      {notice && (
        <div className="mb-6 rounded-2xl border border-brand-emerald/40 bg-brand-emerald/10 px-4 py-3 text-sm text-brand-emerald">
          {notice}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-2">
        {/* Banca */}
        {bancas.length > 0 && (
          <div className="flex flex-col gap-2 sm:col-span-2">
            <label className="text-sm font-semibold text-foreground">Banca *</label>
            <select 
              value={formData.bancaId}
              onChange={(e) => onChange('bancaId', e.target.value)}
              className={cn(inputClass, !formData.bancaId && 'text-foreground-muted')}
            >
              <option value="" disabled hidden>Selecione uma banca</option>
              {bancas.map((banca) => (
                <option key={banca.id} value={banca.id}>
                  {banca.nome} {banca.ePadrao ? '(Padrão)' : ''}
                </option>
              ))}
            </select>
            {errors.bancaId && <span className="text-sm text-danger">{errors.bancaId}</span>}
          </div>
        )}

        {/* Esporte */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-foreground">Esporte *</label>
          <select 
            value={formData.esporte}
            onChange={(e) => onChange('esporte', e.target.value)}
            className={cn(inputClass, !formData.esporte && 'text-foreground-muted')}
          >
            <option value="" disabled hidden>Selecione uma opção…</option>
            {ESPORTES.map((esporte) => (
              <option key={esporte} value={esporte}>
                {esporte}
              </option>
            ))}
          </select>
          {errors.esporte && <span className="text-sm text-danger">{errors.esporte}</span>}
        </div>

        {/* Evento */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-foreground">Evento *</label>
          <input 
            type="text" 
            value={formData.evento}
            onChange={(e) => onChange('evento', e.target.value)}
            className={inputClass}
          />
          {errors.evento && <span className="text-sm text-danger">{errors.evento}</span>}
        </div>

        {/* Aposta */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-foreground">Aposta *</label>
          <input 
            type="text" 
            value={formData.aposta}
            onChange={(e) => onChange('aposta', e.target.value)}
            className={inputClass}
          />
          {errors.aposta && <span className="text-sm text-danger">{errors.aposta}</span>}
        </div>

        {/* Torneio removido temporariamente */}

        {/* Mercado */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-foreground">Mercado *</label>
          <input 
            type="text" 
            value={formData.mercado}
            onChange={(e) => onChange('mercado', e.target.value)}
            placeholder="Mercado"
            className={inputClass}
          />
          {errors.mercado && <span className="text-sm text-danger">{errors.mercado}</span>}
        </div>

        {/* Tipo de Aposta */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-foreground">Tipo de Aposta *</label>
          <select 
            value={formData.tipoAposta}
            onChange={(e) => onChange('tipoAposta', e.target.value)}
            className={cn(inputClass, !formData.tipoAposta && 'text-foreground-muted')}
          >
            <option value="" disabled hidden>Selecione o tipo</option>
            {TIPOS_APOSTA.map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo}
              </option>
            ))}
          </select>
          {errors.tipoAposta && <span className="text-sm text-danger">{errors.tipoAposta}</span>}
        </div>

        {/* Valor Apostado */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-foreground">Valor Apostado *</label>
          <input
            type="number"
            value={formData.valorApostado}
            onChange={(e) => onChange('valorApostado', e.target.value)}
            placeholder="0"
            step="0.01"
            min="0.01"
            className={inputClass}
          />
          {errors.valorApostado && <span className="text-sm text-danger">{errors.valorApostado}</span>}
        </div>

        {/* Odd */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-foreground">Odd *</label>
          <input
            type="number"
            value={formData.odd}
            onChange={(e) => onChange('odd', e.target.value)}
            placeholder="0"
            step="0.01"
            min="0.01"
            className={inputClass}
          />
          {errors.odd && <span className="text-sm text-danger">{errors.odd}</span>}
        </div>

        {/* Bônus */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-foreground">Bônus</label>
          <input
            type="number"
            value={formData.bonus}
            onChange={(e) => onChange('bonus', e.target.value)}
            placeholder="0"
            step="0.01"
            min="0"
            className={inputClass}
          />
        </div>

        {/* Data do Evento */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-foreground">Data do Evento *</label>
          <DateInput
            value={formData.dataEvento}
            onChange={(value) => onChange('dataEvento', value)}
            placeholder="dd/mm/aaaa"
            className="w-full"
          />
          {errors.dataEvento && <span className="text-sm text-danger">{errors.dataEvento}</span>}
        </div>

        {/* Tipster */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-foreground">Tipster</label>
          <select 
            value={formData.tipster}
            onChange={(e) => onChange('tipster', e.target.value)}
            className={cn(inputClass, !formData.tipster && 'text-foreground-muted')}
          >
            <option value="" disabled hidden>Selecione…</option>
            {activeTipsters.map((tipster) => (
              <option key={tipster.id} value={tipster.nome}>
                {tipster.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-foreground">Status *</label>
          <select 
            value={formData.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className={cn(inputClass, !formData.status && 'text-foreground-muted')}
          >
            {STATUS_APOSTAS.filter((status) => status !== 'Tudo').map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {/* Casa de Aposta */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-foreground">Casa de Aposta *</label>
          <select 
            value={formData.casaDeAposta}
            onChange={(e) => onChange('casaDeAposta', e.target.value)}
            className={cn(inputClass, !formData.casaDeAposta && 'text-foreground-muted')}
          >
            <option value="" disabled hidden>Selecione uma opção…</option>
            {CASAS_APOSTAS.map((casa) => (
              <option key={casa} value={casa}>
                {casa}
              </option>
            ))}
          </select>
          {errors.casaDeAposta && <span className="text-sm text-danger">{errors.casaDeAposta}</span>}
        </div>

        {/* Retorno Obtido - só aparece para status com retorno */}
        {STATUS_WITH_RETURNS.includes(formData.status) && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-foreground">Retorno Obtido *</label>
            <input 
              type="number" 
              value={formData.retornoObtido}
              onChange={(e) => handleRetornoChange(e.target.value)}
              placeholder="0" 
              step="0.01"
              min="0.01"
              className={inputClass}
            />
            {errors.retornoObtido && <span className="text-sm text-danger">{errors.retornoObtido}</span>}
          </div>
        )}

        {/* Botão Submit */}
        <div className="sm:col-span-2">
          <button 
            type="submit"
            className={cn(buttonClass, 'w-full justify-center')}
            disabled={saving}
          >
            {saving ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Aposta'}
          </button>
        </div>
      </form>
    </>
  );
}
