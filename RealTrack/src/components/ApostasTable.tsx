/**
 * Componente de Tabela de Apostas
 * 
 * Exibe lista de apostas em formato de tabela com ações
 */

import { Pencil, Trash2 } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import EmptyState from './EmptyState';
import type { ApiBetWithBank } from '../types/api';
import { cn } from './ui/utils';
import {
  betStatusPillBaseClass,
  betStatusPillVariants,
  getBetStatusIcon,
} from '../constants/betStatusStyles';
import { normalizarEsporteParaOpcao } from '../constants/esportes';

// ============================================
// Tipos
// ============================================

interface ApostasTableProps {
  apostas: ApiBetWithBank[];
  expanded: boolean;
  onToggleExpand: () => void;
  onOpenStatusModal: (aposta: ApiBetWithBank) => void;
  onEdit: (aposta: ApiBetWithBank) => void;
  onDelete: (aposta: ApiBetWithBank) => void;
  showDevButton?: boolean;
  onSeedTestBets?: () => void;
}

// ============================================
// Helpers
// ============================================

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const formatOptionalText = (value: string | null | undefined): string => {
  if (typeof value !== 'string') {
    return '-';
  }
  const trimmed = value.trim();
  return trimmed === '' ? '-' : trimmed;
};

// ============================================
// Componente
// ============================================

export default function ApostasTable({
  apostas,
  expanded,
  onToggleExpand,
  onOpenStatusModal,
  onEdit,
  onDelete,
  showDevButton = false,
  onSeedTestBets,
}: ApostasTableProps) {
  return (
    <div className="rounded-lg border border-white/5 bg-[#0f2d29] p-6 text-white shadow-[0_25px_45px_rgba(0,0,0,0.25)] backdrop-blur-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h3 className="text-xl font-semibold">Apostas</h3>
        <div className="flex flex-wrap gap-2">
          {showDevButton && onSeedTestBets && (
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-2xl border border-white/15 px-4 py-2 text-sm font-semibold text-white/80 transition hocus:border-brand-emerald/60 hocus:text-brand-emerald"
              onClick={onSeedTestBets}
              title="Gerar 200 apostas de teste (apenas desenvolvimento)"
            >
              Gerar testes
            </button>
          )}
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-2xl border border-white/15 px-4 py-2 text-sm font-semibold text-white/80 transition hocus:border-brand-emerald/60 hocus:text-brand-emerald"
            onClick={onToggleExpand}
          >
            {expanded ? 'Recolher' : 'Expandir'}
          </button>
        </div>
      </div>

      {apostas.length === 0 ? (
        <EmptyState
          title="Nenhuma aposta"
          description="Cadastre uma nova aposta para começar a acompanhar resultados."
        />
      ) : (
        <div className={cn('mt-4 overflow-hidden rounded-2xl border border-white/10', expanded ? '' : 'max-h-[420px]')}>
          <div className={cn('overflow-x-auto', expanded ? 'overflow-y-auto' : 'overflow-y-auto')}>
            <table className="min-w-full divide-y divide-white/10 text-sm text-white">
              <thead className="bg-white/5 text-left text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                <tr>
                  <th className="px-4 py-3">Casa de Aposta</th>
                  <th className="px-4 py-3">Tipster</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Esporte</th>
                  <th className="px-4 py-3">Evento</th>
                  <th className="px-4 py-3">Aposta</th>
                  <th className="px-4 py-3">Mercado</th>
                  <th className="px-4 py-3">Stake</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Retorno Obtido</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {apostas.map((aposta) => (
                  <ApostaRow
                    key={aposta.id}
                    aposta={aposta}
                    onOpenStatusModal={onOpenStatusModal}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Componente de Linha
// ============================================

interface ApostaRowProps {
  aposta: ApiBetWithBank;
  onOpenStatusModal: (aposta: ApiBetWithBank) => void;
  onEdit: (aposta: ApiBetWithBank) => void;
  onDelete: (aposta: ApiBetWithBank) => void;
}

function ApostaRow({ aposta, onOpenStatusModal, onEdit, onDelete }: ApostaRowProps) {
  const statusVariant = betStatusPillVariants[aposta.status] ?? betStatusPillVariants.default;

  return (
    <tr className="text-sm text-white">
      <td className="px-4 py-4 font-medium text-white">{formatOptionalText(aposta.casaDeAposta)}</td>
      <td className="px-4 py-4 text-white/80">{formatOptionalText(aposta.tipster)}</td>
      <td className="px-4 py-4 text-white/60">{formatDate(aposta.dataEvento)}</td>
      <td className="px-4 py-4 text-white/80">{normalizarEsporteParaOpcao(aposta.esporte)}</td>
      <td className="px-4 py-4 text-white/80">{aposta.evento}</td>
      <td className="px-4 py-4 text-white/80">{aposta.aposta}</td>
      <td className="px-4 py-4 text-white/80">{aposta.mercado}</td>
      <td className="px-4 py-4">
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-white">{formatCurrency(aposta.valorApostado)}</span>
          <span className="text-2xs uppercase tracking-[0.3em] text-white/50">
            Odd: {aposta.odd}
          </span>
        </div>
      </td>
      <td className="px-4 py-4">
        <button
          type="button"
          onClick={() => onOpenStatusModal(aposta)}
          className={cn(betStatusPillBaseClass, 'text-xs', statusVariant)}
        >
          {getBetStatusIcon(aposta.status, { className: 'h-4 w-4' })}
          {aposta.status}
        </button>
      </td>
      <td className="px-4 py-4 font-semibold text-white">
        {aposta.retornoObtido != null ? formatCurrency(aposta.retornoObtido) : '-'}
      </td>
      <td className="px-4 py-4">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-2xl border border-white/15 px-3 py-2 text-xs font-semibold text-white/80 transition hocus:border-brand-emerald/60 hocus:text-brand-emerald"
            onClick={() => onEdit(aposta)}
            title="Editar aposta"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-2xl border border-rose-400/40 px-3 py-2 text-xs font-semibold text-rose-300 transition hocus:bg-rose-500/15"
            onClick={() => onDelete(aposta)}
            title="Deletar aposta"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}
