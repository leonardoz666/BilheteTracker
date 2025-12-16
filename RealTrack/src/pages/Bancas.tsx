import { AlertTriangle, Copy, Eye, LineChart, Loader2, Pencil, Share2, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useBancas } from '../hooks/useBancas';
import { apiClient, bancaService, type Banca, type BancaStats } from '../services/api';
import { formatNumber } from '../utils/formatters';
import { eventBus } from '../utils/eventBus';
import { cn } from '../components/ui/utils';

interface EditFormState {
  nome: string;
  descricao: string;
  valorInicial: string;
  ativa: boolean;
  padrao: boolean;
  compartilhamento: boolean;
}

interface ConfirmDeleteState {
  open: boolean;
  banca: Banca | null;
  loading: boolean;
}

interface BetApi {
  createdAt?: string | null;
  dataEvento?: string | null;
  data?: string | null;
}

const defaultForm: EditFormState = {
  nome: '',
  descricao: '',
  valorInicial: '',
  ativa: true,
  padrao: false,
  compartilhamento: false,
};

const sectionCardClass =
  'rounded-3xl border border-border/30 bg-background-card/80 p-6 shadow-card backdrop-blur-sm';
const dashboardCardShellClass =
  'rounded-lg border border-white/5 bg-[#0f2d29] p-6 text-white shadow-[0_25px_45px_rgba(0,0,0,0.25)] backdrop-blur-sm';
const summaryCardBaseClass =
  'rounded-lg border border-white/5 bg-[#10322e] p-6 text-white shadow-[0_25px_45px_rgba(0,0,0,0.25)] backdrop-blur-sm';
const modalCardClass = 'rounded-2xl border border-border/30 bg-background px-5 py-5';
const cardLabelClass = 'text-2xs uppercase tracking-[0.3em] text-foreground-muted';

export default function Bancas() {
  const { bancas: remoteBancas, loading, error, invalidateCache } = useBancas();
  const [bancas, setBancas] = useState<Banca[]>(remoteBancas);
  const [selectedBanco, setSelectedBanco] = useState<Banca | null>(null);
  const [statsOverride, setStatsOverride] = useState<BancaStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [editBanco, setEditBanco] = useState<Banca | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>(defaultForm);
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState>({
    open: false,
    banca: null,
    loading: false,
  });

  useEffect(() => {
    // Ordena: banca principal (padrao: true) sempre no topo
    const ordered = [...remoteBancas].sort((a, b) => {
      if (a.padrao === b.padrao) return 0;
      return a.padrao ? -1 : 1;
    });
    setBancas(ordered);
  }, [remoteBancas]);

  const refreshFromEvent = useCallback(() => {
    invalidateCache();
  }, [invalidateCache]);

  useEffect(() => {
    const unsubscribes = [
      eventBus.on('banca:created', refreshFromEvent),
      eventBus.on('banca:saved', refreshFromEvent),
      eventBus.on('banca:updated', refreshFromEvent),
      eventBus.on('banca:deleted', refreshFromEvent),
    ];

    return () => {
      unsubscribes.forEach((unsubscribe) => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
    };
  }, [refreshFromEvent]);

  const summaryCards = useMemo(() => {
    const totalViews = bancas.reduce((sum, banca) => sum + banca.visualizacoes, 0);
    const totalVisitors = bancas.reduce((sum, banca) => sum + banca.visitantes, 0);
    const activeBancas = bancas.filter((bancaItem) => bancaItem.status === 'Ativa').length;
    const conversion = totalViews === 0 ? '0%' : `${Math.min(100, Math.round((totalVisitors / totalViews) * 100))}%`;

    return [
      {
        title: 'Total de visualizações',
        value: formatNumber(totalViews),
        helper: 'Últimos 30 dias',
        icon: <Eye className="h-5 w-5" />,
      },
      {
        title: 'Visitantes únicos',
        value: formatNumber(totalVisitors),
        helper: 'Audiência orgânica',
        icon: <Eye className="h-5 w-5" />,
      },
      {
        title: 'Bancas ativas',
        value: String(activeBancas),
        helper: `de ${bancas.length} registradas`,
        icon: <LineChart className="h-5 w-5" />,
      },
      {
        title: 'Taxa de conversão',
        value: conversion,
        helper: 'Visitantes / visualizações',
        icon: <LineChart className="h-5 w-5" />,
      },
    ];
  }, [bancas]);

  const statsData = selectedBanco ? statsOverride ?? selectedBanco.stats : null;

  const handleOpenStats = async (banca: Banca) => {
    setSelectedBanco(banca);
    setStatsOverride(null);
    setStatsLoading(true);

    try {
      const response = await apiClient.get<BetApi[]>('/apostas', { params: { bancaId: banca.id } });
      const views = computeViewsFromBets(response.data);
      setStatsOverride({
        ...banca.stats,
        views,
      });
    } catch (err) {
      console.warn('Não foi possível carregar métricas detalhadas.', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const openEditModal = (banca: Banca) => {
    setEditBanco(banca);
    setEditForm({
      nome: banca.nome,
      descricao: banca.descricao,
      valorInicial: '',
      ativa: banca.status === 'Ativa',
      padrao: banca.padrao,
      compartilhamento: false,
    });
  };

  const handleEditChange = <Key extends keyof EditFormState>(field: Key, value: EditFormState[Key]) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleTogglePadrao = async (banca: Banca) => {
    const newValue = !banca.padrao;
    setBancas((prev) =>
      prev.map((item) => {
        if (item.id === banca.id) {
          return { ...item, padrao: newValue };
        }
        if (newValue) {
          return { ...item, padrao: false };
        }
        return item;
      })
    );

    try {
      await bancaService.update(banca.id, { ePadrao: newValue });
      invalidateCache();
    } catch (err) {
      console.error('Não foi possível atualizar o status padrão da banca.', err);
      invalidateCache();
    }
  };

  const handleToggleStatus = async (banca: Banca) => {
    const nextStatus = banca.status === 'Ativa' ? 'Inativa' : 'Ativa';
    setBancas((prev) =>
      prev.map((item) => (item.id === banca.id ? { ...item, status: nextStatus } : item))
    );

    try {
      await bancaService.update(banca.id, { status: nextStatus });
      invalidateCache();
    } catch (err) {
      console.error('Não foi possível atualizar o status da banca.', err);
      invalidateCache();
    }
  };

  const handleSaveBanco = async () => {
    if (!editBanco) return;
    setSavingEdit(true);

    try {
      // Parse saldoInicial if provided
      let saldoInicial: number | undefined;
      if (editForm.valorInicial.trim()) {
        const normalized = editForm.valorInicial.replace(/\./g, '').replace(',', '.');
        const parsed = parseFloat(normalized);
        if (!isNaN(parsed) && parsed >= 0) {
          saldoInicial = parsed;
        }
      }

      await bancaService.update(editBanco.id, {
        nome: editForm.nome,
        descricao: editForm.descricao,
        status: editForm.ativa ? 'Ativa' : 'Inativa',
        ePadrao: editForm.padrao,
        saldoInicial,
      });
      setEditBanco(null);
      setStatsOverride(null);
      invalidateCache();
    } catch (err) {
      console.error('Não foi possível salvar a banca.', err);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteBanco = async () => {
    if (!confirmDelete.banca) return;
    setConfirmDelete((prev) => ({ ...prev, loading: true }));

    try {
      await bancaService.delete(confirmDelete.banca.id);
      setConfirmDelete({ open: false, banca: null, loading: false });
      invalidateCache();
    } catch (err) {
      console.error('Não foi possível excluir a banca.', err);
      setConfirmDelete((prev) => ({ ...prev, loading: false }));
    }
  };

  return (
    <div className="space-y-6 text-foreground">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Bancas</h1>
        <p className="text-sm text-foreground-muted">Gerencie todas as suas bancas cadastradas.</p>
      </div>

      {error && (
        <div className={cn(sectionCardClass, 'border-rose-500/30 bg-rose-500/5 text-sm text-rose-200')}>
          {error.message}
        </div>
      )}

      <section className={cn(dashboardCardShellClass, 'space-y-6')}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className={cn(cardLabelClass, 'text-white/70')}>Bancas compartilhadas</p>
            <h2 className="text-2xl font-semibold text-white">Lista completa</h2>
          </div>
          <p className="text-sm text-white/70">Gerencie o status, padrão e links públicos.</p>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-white/70">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : bancas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 px-6 py-12 text-center text-sm text-white/70">
            Nenhuma banca cadastrada ainda.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-white/5 text-white/70">
                <tr>
                  <th className="px-4 py-3 text-left text-2xs font-semibold uppercase tracking-[0.3em]">Banca</th>
                  <th className="px-4 py-3 text-left text-2xs font-semibold uppercase tracking-[0.3em]">Descrição</th>
                  <th className="px-4 py-3 text-left text-2xs font-semibold uppercase tracking-[0.3em]">Status</th>
                  <th className="px-4 py-3 text-left text-2xs font-semibold uppercase tracking-[0.3em]">Padrão</th>
                  <th className="px-4 py-3 text-left text-2xs font-semibold uppercase tracking-[0.3em]">Última visualização</th>
                  <th className="px-4 py-3 text-left text-2xs font-semibold uppercase tracking-[0.3em]">Criado em</th>
                  <th className="px-4 py-3 text-right text-2xs font-semibold uppercase tracking-[0.3em]">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {bancas.map((banca) => (
                  <tr key={banca.id} className="transition hover:bg-white/5">
                    <td className="px-4 py-4 align-middle">
                      <div className="space-y-1">
                        <p className="font-semibold text-white">{banca.nome}</p>
                        <p className="text-xs text-white/60">ID: {banca.id}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-middle text-white/70">{banca.descricao}</td>
                    <td className="px-4 py-4 align-middle">
                      <SwitchControl
                        checked={banca.status === 'Ativa'}
                        onToggle={() => void handleToggleStatus(banca)}
                        label={`Alternar status da banca ${banca.nome}`}
                      />
                    </td>
                    <td className="px-4 py-4 align-middle">
                      <SwitchControl
                        checked={banca.padrao}
                        onToggle={() => void handleTogglePadrao(banca)}
                        label={`Alternar banca padrão para ${banca.nome}`}
                      />
                    </td>
                    <td className="px-4 py-4 align-middle text-white/70">{banca.ultimaVisualizacao}</td>
                    <td className="px-4 py-4 align-middle text-white/70">{banca.criadoEm}</td>
                    <td className="px-4 py-4 align-middle">
                      <div className="flex justify-end gap-2">
                        <ActionIconButton
                          label="Ver estatísticas"
                          icon={<LineChart className="h-4 w-4" />}
                          onClick={() => void handleOpenStats(banca)}
                        />
                        <ActionIconButton
                          label="Copiar link de compartilhamento"
                          icon={<Share2 className="h-4 w-4" />}
                          onClick={() => {
                            void copyToClipboard(banca.stats.infoLink.url);
                          }}
                        />
                        <ActionIconButton
                          label="Editar banca"
                          icon={<Pencil className="h-4 w-4" />}
                          onClick={() => openEditModal(banca)}
                        />
                        <ActionIconButton
                          label="Excluir banca"
                          icon={<Trash2 className="h-4 w-4" />}
                          variant="danger"
                          onClick={() => setConfirmDelete({ open: true, banca, loading: false })}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ModalShell
        open={!!selectedBanco}
        title={selectedBanco ? `Estatísticas detalhadas - ${selectedBanco.nome}` : ''}
        onClose={() => {
          setSelectedBanco(null);
          setStatsOverride(null);
        }}
        maxWidth="max-w-4xl"
      >
        {statsLoading ? (
          <div className="flex h-40 items-center justify-center text-foreground-muted">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : statsData ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(
                Object.entries(statsData.views) as [keyof BancaStats['views'], number][]
              ).map(([key, value]) => (
                <div key={key} className={modalCardClass}>
                  <p className="text-xs uppercase tracking-[0.2em] text-foreground-muted">
                    {key === 'hoje' && 'Hoje'}
                    {key === 'semana' && 'Semana'}
                    {key === 'mes' && 'Mês'}
                    {key === 'total' && 'Total'}
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
                  <p className="text-xs text-foreground-muted">visualizações</p>
                </div>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className={cn(modalCardClass, 'space-y-3')}>
                <p className={cardLabelClass}>Link público</p>
                <div className="flex items-center gap-3 rounded-2xl border border-border/40 bg-background px-4 py-3 text-sm">
                  <span className="flex-1 truncate text-foreground">{statsData.infoLink.url}</span>
                  <ActionIconButton
                    label="Copiar link"
                    icon={<Copy className="h-4 w-4" />}
                    onClick={() => {
                      void copyToClipboard(statsData.infoLink.url);
                    }}
                  />
                </div>
                <p className="text-xs text-foreground-muted">Criado em {statsData.infoLink.criadoEm}</p>
              </div>

              <div className={cn(modalCardClass, 'space-y-3')}>
                <p className={cardLabelClass}>Engajamento</p>
                <div className="space-y-2 text-sm">
                  <StatHighlight label="Taxa de visitantes únicos" value={`${statsData.engajamento.taxaVisitantes}%`} />
                  <StatHighlight label="Média de visualizações / dia" value={statsData.engajamento.mediaVisualizacoesDia} />
                  <StatHighlight label="Última atividade" value={statsData.engajamento.ultimaAtividade} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground-muted">Não encontramos métricas para esta banca.</p>
        )}
      </ModalShell>

      <ModalShell
        open={!!editBanco}
        title="Editar banca"
        onClose={() => {
          setEditBanco(null);
          setSavingEdit(false);
        }}
        maxWidth="max-w-2xl"
      >
        {editBanco && (
          <EditBancoForm
            form={editForm}
            onChange={handleEditChange}
            onCancel={() => setEditBanco(null)}
            onSubmit={handleSaveBanco}
            saving={savingEdit}
          />
        )}
      </ModalShell>

      <ModalShell
        open={confirmDelete.open}
        title="Excluir banca"
        onClose={() => setConfirmDelete({ open: false, banca: null, loading: false })}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-danger/40 bg-danger/10 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-danger" />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Tem certeza?</p>
              <p className="text-sm text-foreground-muted">
                Essa ação remove permanentemente a banca {confirmDelete.banca?.nome ?? ''} e seus dados de compartilhamento.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              className="rounded-2xl border border-border/40 px-4 py-2 text-sm text-foreground hocus:border-brand-emerald/40"
              onClick={() => setConfirmDelete({ open: false, banca: null, loading: false })}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="rounded-2xl border border-danger/50 bg-danger/15 px-4 py-2 text-sm font-semibold text-danger hocus:bg-danger/20"
              onClick={() => {
                void handleDeleteBanco();
              }}
              disabled={confirmDelete.loading}
            >
              {confirmDelete.loading ? 'Excluindo...' : 'Excluir banca'}
            </button>
          </div>
        </div>
      </ModalShell>
    </div>
  );
}

function SwitchControl({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-emerald/40',
        checked ? 'border-brand-emerald/50 bg-brand-emerald/20' : 'border-danger/50 bg-danger/10'
      )}
      onClick={onToggle}
    >
      <span className="sr-only">{label}</span>
      <span
        className={cn(
          'inline-block h-4 w-4 rounded-full transition shadow-sm',
          checked ? 'translate-x-6 bg-brand-emerald' : 'translate-x-1 bg-danger'
        )}
      />
    </button>
  );
}

function ActionIconButton({
  icon,
  label,
  onClick,
  variant = 'default',
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  variant?: 'default' | 'danger';
}) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-10 w-10 items-center justify-center rounded-2xl border text-white/70 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-emerald/30',
        variant === 'danger'
          ? 'border-danger/40 bg-danger/15 text-danger/80 hocus:bg-danger/20'
          : 'border-white/15 bg-white/5 hocus:border-brand-emerald/40 hocus:bg-white/10'
      )}
      onClick={onClick}
      aria-label={label}
    >
      {icon}
    </button>
  );
}

function ModalShell({
  open,
  title,
  onClose,
  children,
  maxWidth = 'max-w-3xl',
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-10"
      onClick={onClose}
    >
      <div
        className={cn(
          'w-full rounded-3xl border border-border/40 bg-background-surface/95 p-6 text-foreground shadow-glass',
          maxWidth
        )}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className={cardLabelClass}>Modal</p>
            <h3 className="text-2xl font-semibold text-foreground">{title}</h3>
          </div>
          <button
            type="button"
            className="rounded-full border border-border/30 bg-background px-3 py-2 text-sm text-foreground-muted transition hocus:border-brand-emerald/40 hocus:text-brand-emerald"
            onClick={onClose}
            aria-label="Fechar"
          >
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StatHighlight({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/30 bg-background px-4 py-2 text-sm">
      <span className="text-foreground-muted">{label}</span>
      <strong className="text-foreground">{value}</strong>
    </div>
  );
}

interface EditFormProps {
  form: EditFormState;
  onChange: <Key extends keyof EditFormState>(field: Key, value: EditFormState[Key]) => void;
  onCancel: () => void;
  onSubmit: () => void;
  saving: boolean;
}

function EditBancoForm({ form, onChange, onCancel, onSubmit, saving }: EditFormProps) {
  const inputClass =
    'w-full rounded-2xl border border-border/40 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-foreground-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-emerald/30';

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Nome da banca</label>
        <input className={inputClass} value={form.nome} onChange={(event) => onChange('nome', event.target.value)} />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Descrição</label>
        <textarea
          rows={3}
          className={cn(inputClass, 'resize-none')}
          value={form.descricao}
          onChange={(event) => onChange('descricao', event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Valor inicial</label>
        <input
          className={inputClass}
          value={form.valorInicial}
          placeholder="0,00"
          onChange={(event) => onChange('valorInicial', event.target.value)}
        />
      </div>

      <div className="space-y-4">
        <div className="space-y-3">
          <ToggleLine
            title="Banca ativa"
            description="Ativar ou desativar esta banca no sistema."
            value={form.ativa}
            onToggle={() => onChange('ativa', !form.ativa)}
          />
          <ToggleLine
            title="Banca padrão"
            description="Defina para onde novas apostas serão direcionadas."
            value={form.padrao}
            onToggle={() => onChange('padrao', !form.padrao)}
          />
          <ToggleLine
            title="Compartilhamento público"
            description="Permitir que outras pessoas visualizem esta banca."
            value={form.compartilhamento}
            onToggle={() => onChange('compartilhamento', !form.compartilhamento)}
          />
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          className="rounded-2xl border border-border/40 px-4 py-2 text-sm text-foreground hocus:border-brand-emerald/40"
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="rounded-2xl border border-brand-emerald/40 bg-brand-emerald/10 px-4 py-2 text-sm font-semibold text-brand-emerald hocus:bg-brand-emerald/20"
          disabled={saving}
        >
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </form>
  );
}

function ToggleLine({
  title,
  description,
  value,
  onToggle,
}: {
  title: string;
  description: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/40 bg-background px-4 py-3">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-foreground-muted">{description}</p>
      </div>
      <SwitchControl checked={value} onToggle={onToggle} label={title} />
    </div>
  );
}

const computeViewsFromBets = (bets?: BetApi[]): BancaStats['views'] => {
  if (!Array.isArray(bets)) {
    return { hoje: 0, semana: 0, mes: 0, total: 0 };
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - 6);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const getDate = (bet: BetApi) => new Date(bet.createdAt ?? bet.dataEvento ?? bet.data ?? Date.now());

  let hoje = 0;
  let semana = 0;
  let mes = 0;

  bets.forEach((bet) => {
    const date = getDate(bet);
    if (Number.isNaN(date.getTime())) return;
    if (date >= startOfDay) hoje += 1;
    if (date >= startOfWeek) semana += 1;
    if (date >= startOfMonth) mes += 1;
  });

  return {
    hoje,
    semana,
    mes,
    total: bets.length,
  };
};

const copyToClipboard = async (value?: string) => {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
  } catch (err) {
    console.error('Não foi possível copiar o valor.', err);
  }
};

