/**
 * Modal de Upload de Bilhete/Ticket
 * 
 * Permite upload de imagem de bilhete para extração via OCR/IA
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Upload, RefreshCw } from 'lucide-react';
import Modal from './Modal';
import { cn } from './ui/utils';
import { toast } from '../utils/toast';

// ============================================
// Tipos
// ============================================

export interface UploadTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProcess: (file: File, ocrText?: string) => Promise<void>;
  loading?: boolean;
}

// ============================================
// Componente
// ============================================

export default function UploadTicketModal({
  isOpen,
  onClose,
  onProcess,
  loading = false,
}: UploadTicketModalProps) {
  if (!isOpen) return null;

  return (
    <UploadTicketModalContent
      isOpen={isOpen}
      onClose={onClose}
      onProcess={onProcess}
      loading={loading}
    />
  );
}

type UploadTicketModalContentProps = UploadTicketModalProps;

function UploadTicketModalContent({
  isOpen,
  onClose,
  onProcess,
  loading = false,
}: UploadTicketModalContentProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [ocrExtracting, setOcrExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const preview = useMemo(() => {
    if (!selectedFile) return null;
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          setSelectedFile(file);
          e.preventDefault();
          break;
        }
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione uma imagem válida (PNG, JPG ou JPEG)');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleProcess = async () => {
    if (!selectedFile) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }
    await onProcess(selectedFile, ocrText.trim() || undefined);
  };

  const handleClose = () => {
    if (loading || ocrExtracting) return;
    setSelectedFile(null);
    setOcrText('');
    setOcrExtracting(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Upload de Bilhete">
      <div className="space-y-5">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="upload-ticket-input"
        />

        <div>
          <label
            htmlFor="upload-ticket-input"
            className={cn(
              'group flex min-h-[220px] w-full flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border/50 bg-background-card/70 px-6 py-10 text-center text-foreground transition-all hocus:border-brand-emerald/60 hocus:bg-background cursor-pointer',
              (loading || ocrExtracting) && 'pointer-events-none opacity-60'
            )}
          >
            {preview ? (
              <div className="flex flex-col items-center gap-4">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-80 w-full rounded-2xl border border-border/40 object-contain"
                />
                <span className="text-sm text-foreground-muted">Clique para selecionar outra imagem</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-12 w-12 text-foreground-muted transition group-hover:text-brand-emerald" />
                <span className="text-sm font-semibold text-foreground">Clique para selecionar uma imagem</span>
                <span className="text-sm text-foreground-muted">PNG, JPG ou JPEG (máx. 10MB)</span>
                <span className="text-xs text-foreground-muted">ou pressione Ctrl+V para colar</span>
              </div>
            )}
          </label>
        </div>

        {preview && (
          <div className="flex flex-col gap-3 border-t border-border/20 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-2xl border border-border/40 px-5 py-3 text-sm font-semibold text-foreground transition hocus:border-brand-emerald/60 hocus:text-brand-emerald disabled:opacity-60"
              onClick={handleClose}
              disabled={loading || ocrExtracting}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-2xl bg-brand-linear px-5 py-3 text-sm font-semibold text-white shadow-glow transition active:scale-[0.98] disabled:opacity-60"
              onClick={() => void handleProcess()}
              disabled={loading || ocrExtracting}
            >
              {ocrExtracting ? 'Preparando...' : loading ? 'Processando...' : 'Processar Bilhete'}
            </button>
          </div>
        )}

        {loading && (
          <div className="rounded-3xl border border-brand-emerald/40 bg-brand-emerald/10 px-4 py-3 text-sm font-semibold text-brand-emerald">
            <div className="flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Analisando bilhete com IA...</span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
