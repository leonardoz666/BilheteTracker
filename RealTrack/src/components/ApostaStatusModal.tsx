/**
 * Modal de Atualização de Status de Aposta
 * 
 * Permite alterar o status de uma aposta e calcular retorno automaticamente
 */

import { useState, useCallback } from 'react';
import { useToast } from '../contexts/ToastContext';
import Modal from './Modal';
import { useToast } from '../contexts/ToastContext';
import { STATUS_APOSTAS } from '../constants/statusApostas';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency } from '../utils/formatters';
import { useToast } from '../contexts/ToastContext';
import {
  STATUS_WITH_RETURNS,
  calcularRetornoObtido,
  parseNullableNumber,
  type StatusFormState,
} from '../hooks/useApostasManager';
import type { ApiBetWithBank } from '../types/api';
import { useToast } from '../contexts/ToastContext';
import { cn } from './ui/utils';
import { useToast } from '../contexts/ToastContext';
import {
  betStatusPillBaseClass,
  betStatusPillVariants,
  getBetStatusIcon,
} from '../constants/betStatusStyles';

// ============================================
// Tipos
// ============================================

interface ApostaStatusModalProps {
  isOpen: boolean;
  aposta: ApiBetWithBank | null;
  onClose: () => void;
  onConfirm: (statusData: StatusFormState) => Promise<void>;
  loading?: boolean;
}

// ============================================
// Componente
// ============================================

export default function ApostaStatusModal({
  isOpen,
  aposta,
  onClose,
  onConfirm,
  loading = false,
}: ApostaStatusModalProps) {
  if (!aposta) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Atualizar Status">
      {isOpen ? (
        <StatusFormContent
          key={aposta.id}
          aposta={aposta}
          onClose={onClose}
          onConfirm={onConfirm}
          loading={loading}
        />
      ) : null}
    </Modal>
  );
}

interface StatusFormContentProps {
  aposta: ApiBetWithBank;
  onClose: () => void;
  onConfirm: (statusData: StatusFormState) => Promise<void>;
  loading: boolean;
}

function StatusFormContent({ aposta, onClose, onConfirm, loading }: StatusFormContentProps) {
  const [formData, setFormData] = useState<StatusFormState>({
    status: aposta.status,
    retornoObtido: aposta.retornoObtido != null ? aposta.retornoObtido.toString() : '',
  });

  const handleSubmit = useCallback(async () => {
    if (!formData.status) {
      showToast('Selecione um status', 'error');
      return;
    }
    await onConfirm(formData);
  }, [formData, onConfirm]);

  const manualRetornoValue = parseNullableNumber(formData.retornoObtido);
  const retornoPreview = STATUS_WITH_RETURNS.includes(formData.status)
    ? (manualRetornoValue ??
      calcularRetornoObtido(
        formData.status,
        aposta.valorApostado,
        aposta.odd,
        manualRetornoValue
      ) ??
      0)
    : 0;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/40 bg-background px-4 py-3 text-sm text-foreground">
        <div className="space-y-2">
          <p className="flex items-center justify-between gap-4">
            <span className="text-foreground-muted">Evento</span>
            <span className="font-semibold">{aposta.evento}</span>
          </p>
          <p className="flex items-center justify-between gap-4">
            <span className="text-foreground-muted">Mercado</span>
            <span className="font-semibold">{aposta.mercado}</span>
          </p>
          <p className="flex items-center justify-between gap-4">
            <span className="text-foreground-muted">Valor Apostado</span>
            <span className="font-semibold">{formatCurrency(aposta.valorApostado)}</span>
          </p>
          <p className="flex items-center justify-between gap-4">
            <span className="text-foreground-muted">Odd</span>
            <span className="font-semibold">{aposta.odd.toFixed(2)}</span>
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-foreground">Status *</p>
        <div className="space-y-2">
          {STATUS_APOSTAS.filter((s) => s !== 'Tudo').map((status) => {
            const isSelected = formData.status === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    status,
                    retornoObtido: STATUS_WITH_RETURNS.includes(status) ? prev.retornoObtido : ''
                  }))
                }
                className={cn(
                  betStatusPillBaseClass,
                  'w-full justify-start px-5 py-3 text-base',
                  betStatusPillVariants[status] ?? betStatusPillVariants.default,
                  isSelected && 'ring-2 ring-white/70 drop-shadow-[0_18px_35px_rgba(3,7,18,0.45)]'
                )}
                aria-pressed={isSelected}
              >
                <span className="flex items-center gap-2 text-white">
                  {getBetStatusIcon(status, { className: 'h-5 w-5 text-white' })}
                  {status}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {STATUS_WITH_RETURNS.includes(formData.status) && (
        <div className="space-y-2">
          <label htmlFor="retorno-input" className="text-sm font-semibold text-foreground">
            Retorno Obtido
            <span className="ml-2 text-xs font-normal text-foreground-muted">
              (deixe vazio para calcular automaticamente)
            </span>
          </label>
          <input
            id="retorno-input"
            type="number"
            step="0.01"
            placeholder={`Calculado: ${formatCurrency(retornoPreview)}`}
            value={formData.retornoObtido}
            onChange={(e) => setFormData((prev) => ({ ...prev, retornoObtido: e.target.value }))}
            className="w-full rounded-2xl border border-border/50 bg-background px-4 py-3 text-sm focus-visible:border-brand-emerald focus-visible:ring-2 focus-visible:ring-brand-emerald/30"
          />
          <div className="text-sm text-foreground-muted">
            <span>Retorno previsto: </span>
            <strong className={cn('font-semibold', retornoPreview > 0 && 'text-brand-emerald')}>
              {formatCurrency(retornoPreview)}
            </strong>
          </div>
        </div>
      )}

      {formData.status && !STATUS_WITH_RETURNS.includes(formData.status) && formData.status !== 'Pendente' && (
        <div className="rounded-2xl border border-border/40 bg-background px-4 py-3 text-sm text-foreground">
          <p>
            {formData.status === 'Perdida' && '❌ Esta aposta será marcada como perdida.'}
            {formData.status === 'Meio Perdida' && '⚠️ Metade do valor será considerado perdido.'}
            {formData.status === 'Reembolsada' && '🔄 O valor apostado será devolvido.'}
            {formData.status === 'Void' && '⛔ Esta aposta será anulada.'}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-border/20 pt-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-2xl border border-border/40 px-5 py-3 text-sm font-semibold text-foreground transition hocus:border-brand-emerald/60 hocus:text-brand-emerald disabled:opacity-60"
          onClick={onClose}
          disabled={loading}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-2xl bg-brand-linear px-5 py-3 text-sm font-semibold text-white shadow-glow transition active:scale-[0.98] disabled:opacity-60"
          onClick={() => void handleSubmit()}
          disabled={loading || !formData.status}
        >
          {loading ? 'Salvando...' : 'Atualizar Status'}
        </button>
      </div>
    </div>
  );
}
