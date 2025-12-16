import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { authService, apostaService, telegramService } from '../services/api';
import { AuthManager } from '../lib/auth';
import { type ApiBetWithBank, type ApiError } from '../types/api';
import { STATUS_APOSTAS } from '../constants/statusApostas';
import { normalizarEsporteParaOpcao } from '../constants/esportes';
import { signalTelegramUpdate } from '../utils/telegramSync';

const toRetornoString = (value: number) => (Number.isFinite(value) ? value.toString() : '');

const STATUS_WITH_RETURNS = ['Ganha', 'Meio Ganha', 'Cashout'];

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        sendData: (data: string) => void;
        MainButton: {
          text: string;
          setText: (text: string) => void;
          onClick: (callback: () => void) => void;
          show: () => void;
          hide: () => void;
          showProgress: (leaveActive?: boolean) => void;
          hideProgress: () => void;
        };
      };
    };
  }
}

export default function TelegramStatus() {
  const [searchParams] = useSearchParams();
  const betId = searchParams.get('betId');
  const messageId = searchParams.get('messageId');
  const chatId = searchParams.get('chatId');
  const [aposta, setAposta] = useState<ApiBetWithBank | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [retornoObtido, setRetornoObtido] = useState('');

  const isTelegram = typeof window !== 'undefined' && window.Telegram?.WebApp;
  const [authenticated, setAuthenticated] = useState(false);

  // Autenticar via Telegram Web App
  useEffect(() => {
    const authenticateTelegram = async () => {
      const webapp = window.Telegram?.WebApp;
      if (isTelegram && webapp?.initData) {
        try {
          const data = await authService.telegramAuth(webapp.initData);
          if (typeof data.token === 'string') {
            // Token gerenciado via httpOnly cookies
            setAuthenticated(true);
          }
        } catch (err: unknown) {
          console.error('Erro ao autenticar via Telegram:', err);
          setError('Erro ao autenticar. Verifique se sua conta está vinculada ao Telegram.');
        }
      } else {
        // Se não estiver no Telegram, verificar se já está autenticado
        const isAuth = await AuthManager.checkAuth();
        if (isAuth) {
          setAuthenticated(true);
        } else {
          setError('Você precisa estar logado para alterar o status.');
        }
      }
    };

    void authenticateTelegram();
  }, [isTelegram]);

  const fetchAposta = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apostaService.getAll();
      const apostasArray = response.apostas;
      const apostaEncontrada = apostasArray.find(a => a.id === betId);
      if (apostaEncontrada) {
        setAposta(apostaEncontrada);
        setStatus(apostaEncontrada.status);
        setRetornoObtido(toRetornoString(apostaEncontrada.retornoObtido));
      } else {
        setError('Aposta não encontrada');
      }
    } catch (err) {
      console.error('Erro ao buscar aposta:', err);
      setError('Erro ao carregar aposta');
    } finally {
      setLoading(false);
    }
  }, [betId]);

  useEffect(() => {
    if (betId && authenticated) {
      void fetchAposta();
    }
  }, [betId, authenticated, fetchAposta]);

  const handleSave = useCallback(async () => {
    if (!betId || !aposta) return;

    // Prevenir múltiplas chamadas simultâneas
    if (saving) {
      console.warn('Salvamento já em andamento, ignorando chamada duplicada');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const payload: { status: string; retornoObtido?: number | null } = {
        status: status
      };

      if (STATUS_WITH_RETURNS.includes(status) && retornoObtido) {
        payload.retornoObtido = parseFloat(retornoObtido);
      } else if (!STATUS_WITH_RETURNS.includes(status)) {
        payload.retornoObtido = null;
      }

      await apostaService.update(betId, payload);

      // Atualizar mensagem do Telegram se messageId e chatId estiverem disponíveis
      if (messageId && chatId) {
        void telegramService.updateBetMessage(betId, messageId, chatId).catch((err: unknown) => {
          console.warn('Erro ao atualizar mensagem do Telegram:', err);
        });
      }

      // Disparar sincronização para atualizar a página principal
      signalTelegramUpdate();

      // Fechar a janela sem enviar dados para evitar mensagem do Telegram
      if (isTelegram) {
        window.Telegram.WebApp.close();
      } else {
        window.close();
      }
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = apiError.response?.data?.error;
      setError(typeof errorMessage === 'string' ? errorMessage : 'Erro ao salvar status');
      if (isTelegram) {
        window.Telegram.WebApp.MainButton.hideProgress();
      }
    } finally {
      setSaving(false);
    }
  }, [betId, aposta, status, retornoObtido, isTelegram, saving, messageId, chatId]);

  useEffect(() => {
    if (isTelegram && authenticated) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
      window.Telegram.WebApp.MainButton.setText('Salvar Status');
      window.Telegram.WebApp.MainButton.show();
      window.Telegram.WebApp.MainButton.onClick(() => void handleSave());
    }
  }, [isTelegram, authenticated, handleSave]);

  if (!authenticated || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-5 text-center text-foreground">
        <p className="text-sm text-foreground-muted">
          {!authenticated ? 'Autenticando...' : 'Carregando...'}
        </p>
      </div>
    );
  }

  if (error && !aposta) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-5 text-center">
        <p className="text-base font-semibold text-danger">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 text-foreground">
      <h2 className="mb-6 text-2xl font-semibold">📚 Alterar Status</h2>

      {aposta && (
        <div className="mb-6 rounded-xl border border-border/60 bg-background/70 p-4 shadow-sm">
          <p className="mb-2 font-medium">Evento: {aposta.evento}</p>
          <p className="mb-2 text-sm text-foreground-muted">Esporte: {normalizarEsporteParaOpcao(aposta.esporte)}</p>
          <p className="text-sm text-foreground-muted">
            Valor: R$ {aposta.valorApostado.toFixed(2)} | Odd: {aposta.odd}
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-danger/90 px-4 py-3 text-sm font-medium text-white">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium">Status *</label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              if (!STATUS_WITH_RETURNS.includes(e.target.value)) {
                setRetornoObtido('');
              }
            }}
            className="w-full rounded-lg border border-border/60 bg-background px-3 py-3 text-base text-foreground shadow-sm focus:border-brand-emerald focus:outline-none focus:ring-2 focus:ring-brand-emerald/30"
          >
            {STATUS_APOSTAS.filter(s => s !== 'Tudo').map(statusOption => (
              <option key={statusOption} value={statusOption}>{statusOption}</option>
            ))}
          </select>
        </div>

        {STATUS_WITH_RETURNS.includes(status) && (
          <div>
            <label className="mb-2 block text-sm font-medium">Retorno Obtido *</label>
            <input
              type="number"
              step="0.01"
              value={retornoObtido}
              onChange={(e) => setRetornoObtido(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-border/60 bg-background px-3 py-3 text-base text-foreground shadow-sm focus:border-brand-emerald focus:outline-none focus:ring-2 focus:ring-brand-emerald/30"
            />
            <p className="mt-2 text-sm text-foreground-muted">Valor recebido após a aposta ser concluída</p>
          </div>
        )}
      </div>

      {!isTelegram && (
        <button
          onClick={handleSave}
          disabled={saving}
          className={`mt-6 w-full rounded-lg px-5 py-4 text-base font-semibold text-white transition-colors ${saving
            ? 'cursor-not-allowed bg-foreground-muted'
            : 'bg-brand-emerald hover:bg-brand-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-emerald'}`}
        >
          {saving ? 'Salvando...' : 'Salvar Status'}
        </button>
      )}
    </div>
  );
}

