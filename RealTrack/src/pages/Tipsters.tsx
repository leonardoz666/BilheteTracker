import { useCallback, useMemo, useState } from 'react';
import { FixedSizeList as List, type ListChildComponentProps } from 'react-window';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { tipsterService } from '../services/api';
import { useTipsters } from '../hooks/useTipsters';
import { usePagination } from '../hooks/usePagination';
import { type ApiTipster, type ApiError } from '../types/api';
import { cn } from '../components/ui/utils';
import { toast } from '../utils/toast';

const sectionCardClass =
  'rounded-3xl border border-border/30 bg-background-card/80 p-6 shadow-card backdrop-blur-sm';
const gradientCardClass =
  'relative overflow-hidden rounded-3xl border border-border/30 bg-background-card/80 p-6 shadow-card backdrop-blur-sm bg-brand-radial';
const inputClass =
  'w-full rounded-2xl border border-border/40 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-foreground-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-emerald/30';
const primaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-2xl border border-brand-emerald/40 bg-brand-emerald/10 px-5 py-2.5 text-sm font-semibold text-brand-emerald transition hocus:bg-brand-emerald/20';
const ghostButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-2xl border border-transparent px-4 py-2 text-sm font-semibold text-foreground transition hocus:border-border/60 hocus:text-brand-emerald';
const destructiveGhostButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-2xl border border-transparent px-3 py-2 text-sm font-semibold text-danger transition hocus:border-danger/40 hocus:bg-danger/10';

export default function Tipsters() {
  const { tipsters, loading, invalidateCache } = useTipsters();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTipster, setEditingTipster] = useState<ApiTipster | null>(null);
  const [formData, setFormData] = useState({ nome: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleOpenModal = useCallback((tipster?: ApiTipster) => {
    if (tipster) {
      setEditingTipster(tipster);
      setFormData({ nome: tipster.nome });
    } else {
      setEditingTipster(null);
      setFormData({ nome: '' });
    }
    setError('');
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setEditingTipster(null);
    setFormData({ nome: '' });
    setError('');
  }, []);

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    const nome = formData.nome.trim();
    if (!nome) {
      setError('Informe o nome do tipster.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (editingTipster) {
        await tipsterService.update(editingTipster.id, { nome });
      } else {
        await tipsterService.create({ nome });
      }
      invalidateCache();
      handleCloseModal();
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = apiError.response?.data?.error;
      setError(typeof errorMessage === 'string' ? errorMessage : 'Erro ao salvar tipster');
    } finally {
      setSaving(false);
    }
  }, [editingTipster, formData.nome, handleCloseModal, invalidateCache]);

  const handleToggleActive = useCallback(async (tipster: ApiTipster) => {
    try {
      await tipsterService.update(tipster.id, { ativo: !tipster.ativo });
      invalidateCache();
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = apiError.response?.data?.error;
      toast.error(typeof errorMessage === 'string' ? errorMessage : 'Erro ao atualizar tipster');
    }
  }, [invalidateCache]);

  const handleDelete = useCallback(async (tipster: ApiTipster) => {
    if (!window.confirm(`Tem certeza que deseja deletar o tipster "${tipster.nome}"?`)) {
      return;
    }

    try {
      await tipsterService.remove(tipster.id);
      invalidateCache();
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = apiError.response?.data?.error;
      toast.error(typeof errorMessage === 'string' ? errorMessage : 'Erro ao deletar tipster');
    }
  }, [invalidateCache]);

  const tipsterCount = tipsters.length;
  const { paginatedItems, page, totalPages, setPage } = usePagination(tipsters, 50);

  const renderedTipsters = useMemo(() => paginatedItems, [paginatedItems]);

  const Row = useCallback(({ index, style }: ListChildComponentProps) => {
    const tipster = renderedTipsters[index];
    return (
      <div style={style} className="pr-2">
        <TipsterCard
          key={tipster.id}
          tipster={tipster}
          onEdit={() => handleOpenModal(tipster)}
          onDelete={() => handleDelete(tipster)}
          onToggleActive={() => handleToggleActive(tipster)}
        />
      </div>
    );
  }, [renderedTipsters, handleDelete, handleOpenModal, handleToggleActive]);

  return (
    <div className="space-y-8 text-foreground">
      <PageHeader title="Tipsters" subtitle="Gerencie sua lista de especialistas e mantenha tudo organizado" />

      <section className={gradientCardClass}>
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-2xs uppercase tracking-[0.3em] text-foreground-muted">Resumo</p>
            <h2 className="text-3xl font-semibold text-transparent bg-gradient-to-r from-brand-emerald via-teal-200 to-white bg-clip-text">
              {tipsterCount > 0 ? `${tipsterCount} tipster${tipsterCount > 1 ? 's' : ''}` : 'Sem tipsters ainda'}
            </h2>
            <p className="mt-1 text-sm text-foreground-muted">
              Crie, organize e ajuste a atividade dos tipsters usados nas suas bancas.
            </p>
          </div>
          <button type="button" className={primaryButtonClass} onClick={() => handleOpenModal()}>
            <Plus className="h-4 w-4" /> Novo tipster
          </button>
        </div>
      </section>

      {loading ? (
        <div className={sectionCardClass}>
          <p className="text-sm text-foreground-muted animate-pulse">Carregando tipsters...</p>
        </div>
      ) : tipsterCount === 0 ? (
        <div className={sectionCardClass}>
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-border/40 bg-background">
              <Plus className="h-6 w-6 text-brand-emerald" />
            </div>
            <div>
              <p className="text-base font-semibold">Nenhum tipster cadastrado</p>
              <p className="mt-1 text-sm text-foreground-muted">
                Adicione seu primeiro tipster para começar a acompanhar desempenhos e organizar resultados.
              </p>
            </div>
            <button type="button" className={primaryButtonClass} onClick={() => handleOpenModal()}>
              <Plus className="h-4 w-4" /> Adicionar tipster
            </button>
          </div>
        </div>
      ) : (
        <section className={sectionCardClass}>
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/20 pb-4">
            <div>
              <p className="text-2xs uppercase tracking-[0.3em] text-foreground-muted">Lista</p>
              <h3 className="text-xl font-semibold text-foreground">Meus tipsters</h3>
            </div>
            <button type="button" className={primaryButtonClass} onClick={() => handleOpenModal()}>
              <Plus className="h-4 w-4" /> Adicionar
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <List
              height={600}
              itemCount={renderedTipsters.length}
              itemSize={130}
              width="100%"
            >
              {Row}
            </List>

            <div className="flex items-center justify-between pt-4 text-sm text-foreground-muted">
              <span>Mostrando página {page} de {totalPages}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`${ghostButtonClass} disabled:opacity-50`}
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  className={`${ghostButtonClass} disabled:opacity-50`}
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={editingTipster ? 'Editar Tipster' : 'Adicionar Tipster'}
        size="sm"
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Nome do tipster *</label>
            <input
              type="text"
              value={formData.nome}
              onChange={(event) => setFormData({ nome: event.target.value })}
              placeholder="Ex: Tipster A, João Silva, etc."
              className={inputClass}
              required
              autoFocus
            />
          </div>

          {error && (
            <div className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button type="button" className={ghostButtonClass} onClick={handleCloseModal} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className={primaryButtonClass} disabled={saving || !formData.nome.trim()}>
              {saving ? 'Salvando...' : editingTipster ? 'Salvar alterações' : 'Adicionar tipster'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

interface TipsterCardProps {
  tipster: ApiTipster;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}

function TipsterCard({ tipster, onEdit, onDelete, onToggleActive }: TipsterCardProps) {
  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-border/20 bg-background/60 p-4 shadow-card md:flex-row md:items-center md:justify-between">
      <div>
        <h4 className="text-lg font-semibold text-foreground">{tipster.nome}</h4>
        <div className="mt-1 text-sm text-foreground-muted">Status atual do tipster</div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onToggleActive}
          className={cn(
            'inline-flex items-center gap-2 rounded-2xl border px-3 py-1.5 text-xs font-semibold transition',
            tipster.ativo
              ? 'border-brand-emerald/60 bg-brand-emerald/15 text-brand-emerald'
              : 'border-border/60 bg-transparent text-foreground-muted'
          )}
        >
          {tipster.ativo ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
          {tipster.ativo ? 'Ativo' : 'Inativo'}
        </button>

        <button type="button" className={ghostButtonClass} onClick={onEdit} aria-label="Editar tipster">
          <Pencil className="h-4 w-4" />
        </button>
        <button type="button" className={destructiveGhostButtonClass} onClick={onDelete} aria-label="Remover tipster">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

