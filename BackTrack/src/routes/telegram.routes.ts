import express from 'express';
import fetch from 'node-fetch';
import type { Bankroll, Bet } from '@prisma/client';
import { config } from 'dotenv';
import { prisma } from '../lib/prisma.js';
import { emitBetEvent } from '../utils/betEvents.js';
import { log } from '../utils/logger.js';
import { betUpdateRateLimiter } from '../middleware/rateLimiter.js';
import { normalizarEsporteParaOpcao } from '../utils/esportes.js';

const router: express.Router = express.Router();

config();

const getTelegramBotToken = () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN não configurado no .env');
  }
  return token;
};

const getSupportBotToken = () => {
  // Token do bot de suporte (opcional, se não configurado usa o token principal)
  return process.env.TELEGRAM_SUPPORT_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
};

const ensureConfig = () => {
  getTelegramBotToken();
};

// URL do microserviço bilhete-tracker (novo pipeline).
// Ex.: https://bilhete-tracker.onrender.com
const BILHETE_TRACKER_BASE = (process.env.BILHETE_TRACKER_URL || 'https://bilhete-tracker.onrender.com').replace(/\/$/, '');
// Endpoint HTTP do novo serviço para processar bilhetes a partir de URL de imagem.
const BILHETE_TRACKER_PROCESS_ENDPOINT = `${BILHETE_TRACKER_BASE}/api/process-image`;
const BILHETE_TRACKER_TIMEOUT_MS = parseInt(process.env.BILHETE_TRACKER_TIMEOUT_MS || '60000', 10);

type BilheteTrackerTicket = {
  casaDeAposta?: string;
  tipster?: string;
  esporte?: string;
  jogo?: string;
  torneio?: string;
  pais?: string;
  mercado?: string;
  tipoAposta?: string;
  valorApostado?: number;
  odd?: number;
  dataJogo?: string;
  status?: string;
  aposta?: string;
  apostaDetalhada?: string;
};

type BilheteTrackerResponse = {
  success?: boolean;
  ticket?: BilheteTrackerTicket;
  error?: string;
  message?: string;
};

type NormalizedTicketData = {
  casaDeAposta: string;
  tipster: string;
  esporte: string;
  jogo: string;
  torneio: string;
  pais: string;
  mercado: string;
  tipoAposta: string;
  valorApostado: number;
  odd: number;
  dataJogo: string;
  status: string;
  aposta?: string | string[];
};

// Estrutura mínima esperada do bilhete final retornado pelo
// novo pipeline bilhete-tracker.
type BilheteFinalFromTracker = {
  esporte: string | null;
  torneio: string | null;
  evento: string | null;
  aposta: string;
  mercado: string;
  valorApostado: number | null;
  odd: number | null;
  retornoPotencial: number | null;
  tipo: 'Simples' | 'Multipla' | 'Pré' | 'Ao vivo' | null;
  data: string | null;
  bonus: number | null;
  apostasDetalhadas: unknown[];
};

const normalizeDateValue = (raw?: string | null): string => {
  if (!raw) return '';
  const value = raw.trim();
  if (!value) return '';

  // Retorna diretamente se já estiver em um formato ISO parseável
  const isoMatch = value.match(/^\d{4}-\d{2}-\d{2}/);
  if (isoMatch) {
    return value;
  }

  const brMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (brMatch) {
    const [, day, month, year, hour = '00', minute = '00', second = '00'] = brMatch;
    return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  }

  return '';
};

const normalizeBilheteTrackerTicket = (ticket: BilheteTrackerTicket): NormalizedTicketData => ({
  casaDeAposta: ticket.casaDeAposta || '',
  tipster: ticket.tipster || '',
  esporte: normalizarEsporteParaOpcao(ticket.esporte || '') || (ticket.esporte || ''),
  jogo: ticket.jogo || '',
  torneio: ticket.torneio || '',
  pais: ticket.pais || 'Mundo',
  mercado: ticket.mercado || '',
  tipoAposta: ticket.tipoAposta || 'Simples',
  valorApostado: typeof ticket.valorApostado === 'number' ? ticket.valorApostado : Number(ticket.valorApostado) || 0,
  odd: typeof ticket.odd === 'number' ? ticket.odd : Number(ticket.odd) || 0,
  dataJogo: normalizeDateValue(ticket.dataJogo),
  status: ticket.status || 'Pendente',
  aposta: (ticket.aposta as any) ?? ticket.apostaDetalhada ?? ''
});

const normalizeBilheteFinalFromNewPipeline = (ticket: BilheteFinalFromTracker): NormalizedTicketData => {
  const esporteOriginal = ticket.esporte || '';
  const esporteNormalizado = normalizarEsporteParaOpcao(esporteOriginal);
  const esporteFinal = esporteNormalizado || esporteOriginal;
  
  log.debug({
    esporteOriginal,
    esporteNormalizado,
    esporteFinal
  }, 'Normalizando esporte');
  
  return {
    casaDeAposta: '',
    tipster: '',
    esporte: esporteFinal,
    jogo: ticket.evento || '',
    torneio: ticket.torneio || '',
    pais: 'Mundo',
    mercado: ticket.mercado || '',
    tipoAposta: ticket.tipo || 'Simples',
    valorApostado: ticket.valorApostado ?? 0,
    odd: ticket.odd ?? 0,
    dataJogo: normalizeDateValue(ticket.data),
    status: 'Pendente',
    aposta: ticket.aposta || ''
  };
};

// Implementação usando o microserviço bilhete-tracker externo.
// Envia apenas a URL pública do arquivo hospedado no Telegram;
// o serviço bilhete-tracker se encarrega de chamar OCR.space,
// Groq e aplicar o pipeline completo.
const processTicketViaBilheteTracker = async (
  _base64Image: string,
  _mimeType: string,
  filePath: string
) => {
  const token = getTelegramBotToken();
  const imageUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BILHETE_TRACKER_TIMEOUT_MS);

  try {
    const response = await fetch(BILHETE_TRACKER_PROCESS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl }),
      signal: controller.signal
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`bilhete-tracker retornou status ${response.status}: ${text}`);
    }

    const bilheteFinal = (await response.json()) as BilheteFinalFromTracker;
    
    log.debug({
      esporte: bilheteFinal.esporte,
      evento: bilheteFinal.evento,
      torneio: bilheteFinal.torneio
    }, 'Bilhete-tracker response received');
    
    return normalizeBilheteFinalFromNewPipeline(bilheteFinal);
  } finally {
    clearTimeout(timeout);
  }
};

const extractCommandParam = (text?: string | null): string | null => {
  if (!text) return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  const [, ...rest] = trimmed.split(/\s+/);
  if (rest.length === 0) return null;
  const rawParam = rest.join(' ').trim();
  if (!rawParam) return null;
  try {
    return decodeURIComponent(rawParam);
  } catch {
    return rawParam;
  }
};

const normalizeAccountId = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const cleaned = trimmed.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!cleaned) return null;
  return cleaned.toLowerCase();
};

const MARKET_LABEL_PATTERN = /^(aposta|odd|retorno|retornos?\spotenciais?|valor|stake|cotação|apostas?)[:]?/i;
const MARKET_CONNECTOR_PATTERN = /^(?:o|e|ou)\s+/i;
const MARKET_STAT_KEYWORDS = [
  'ponto',
  'pontos',
  'rebote',
  'rebotes',
  'assistencia',
  'assistencias',
  'assist',
  'gol',
  'gols',
  'escanteio',
  'escanteios',
  'cartao',
  'cartoes',
  'cartao amarelo',
  'cartao vermelho',
  'faltas',
  'finalizacao',
  'finalizacoes',
  'finalizacao no alvo',
  'finalizacoes no alvo',
  'arremesso',
  'arremessos',
  'chutes',
  'triplos',
  'duplos',
  'p+r',
  'p+a',
  'r+a',
  'rebotes+pontos',
  'rebotes+assistencias',
  'pontos+assistencias',
  'pontos+rebotes',
  'rebotes+assist',
  'pontos+rebotes+assistencias',
  'passes',
  'tackles',
  'defesas',
  'interceptacoes',
  'steals',
  'roubos',
  'bloqueios',
  'aces',
  'games',
  'sets',
  'breaks',
  'quebras'
];

const normalizeMarketKeyword = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9+&\s]/g, '')
    .trim()
    .toLowerCase();

const containsStatKeyword = (value: string): boolean => {
  const normalized = normalizeMarketKeyword(value);
  if (!normalized) {
    return false;
  }
  return MARKET_STAT_KEYWORDS.some((keyword) => normalized.includes(keyword));
};

const needsStatDescriptor = (segment: string): boolean => {
  if (!segment) {
    return false;
  }
  if (containsStatKeyword(segment)) {
    return false;
  }

  const normalized = normalizeMarketKeyword(segment);
  if (!normalized) {
    return false;
  }

  const raw = segment.trim();
  if (/\d+\s*\+$/.test(raw)) {
    return true;
  }
  if (/\b(?:mais|menos|over|under|abaixo|acima)\b/.test(normalized)) {
    return true;
  }
  if (/\b(?:mais|menos)\s+de\b/.test(normalized) && /\d/.test(normalized)) {
    return true;
  }
  return false;
};

const isStatDescriptor = (segment: string): boolean => containsStatKeyword(segment);

const extractMarketSelections = (market?: string | null): string[] => {
  if (!market) {
    return [];
  }

  const normalized = market.trim();
  if (!normalized || normalized === 'N/D') {
    return [];
  }

  const cleaned = normalized
    .replace(/\r/g, '\n')
    .replace(/R\$\s*[\d.,]+/gi, '\n')
    .replace(/Odd[s]?[^^\n]*[\d.,]+/gi, '\n')
    .split(/\n+/)
    .reduce<string[]>((acc, segment) => {
      const pieces = segment.split(/\s{2,}|[|]/);
      for (const piece of pieces) {
        const trimmed = piece.trim();
        if (!trimmed) continue;

        const normalizedPiece = trimmed
          .replace(/R\$\s*[\d.,]+/gi, '')
          .replace(/\s{2,}/g, ' ')
          .replace(/^[^a-zA-ZÀ-ÿ0-9]+/, '')
          .replace(/^[\d\s.,:;()\-]+/, '')
          .replace(MARKET_CONNECTOR_PATTERN, '')
          .trim();

        if (!normalizedPiece) continue;
        if (!/[a-zA-ZÀ-ÿ]/.test(normalizedPiece)) continue;
        if (MARKET_LABEL_PATTERN.test(normalizedPiece)) continue;
        if (/^[\d.,]+$/.test(normalizedPiece.replace(',', '.'))) continue;

        acc.push(normalizedPiece);
      }
      return acc;
    }, []);

  const mergedSegments: string[] = [];
  for (let i = 0; i < cleaned.length; i += 1) {
    const segment = cleaned[i];
    const next = cleaned[i + 1];
    if (next && needsStatDescriptor(segment) && isStatDescriptor(next)) {
      mergedSegments.push(`${segment} ${next}`);
      i += 1;
      continue;
    }
    mergedSegments.push(segment);
  }

  const deduped: string[] = [];
  for (const segment of mergedSegments) {
    const lower = segment.toLowerCase();
    if (!deduped.some((existing) => existing.toLowerCase() === lower)) {
      deduped.push(segment);
    }
  }

  return deduped;
};

const normalizeTextSegments = (value: unknown, separator = '\n'): string => {
  if (value === null || value === undefined) {
    return '';
  }

  if (Array.isArray(value)) {
    return value
      .map((segment) => (typeof segment === 'string' ? segment.trim() : ''))
      .filter(Boolean)
      .join(separator);
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return '';
};

const EVENT_EXCLUSION_KEYWORDS = [
  'assist',
  'assistência',
  'assistencia',
  'rebote',
  'rebotes',
  'rebound',
  'ponto',
  'pontos',
  'point',
  'points',
  'odd',
  'stake',
  'mais',
  'menos',
  'over',
  'under',
  'handicap',
  'cartão',
  'cartao',
  'corner',
  'escanteio',
  'gol',
  'gols',
  'golos',
  'jogador',
  'player',
  'ambas',
  'btts',
  'cashout',
  'aposta',
  'resultado',
  'placar'
];

const EVENT_CONNECTORS = [
  { regex: /\bvs\b/i, split: /\bvs\b/i },
  { regex: /\bversus\b/i, split: /\bversus\b/i },
  { regex: /@/, split: /@/ },
  { regex: /\b x \b/i, split: /\b x \b/i },
  { regex: /\s-\s/, split: /\s-\s/ }
];

const isLikelyEventPart = (part: string): boolean => {
  const trimmed = part.trim();
  if (!trimmed) {
    return false;
  }

  if (!/[a-zA-ZÀ-ÿ]/.test(trimmed)) {
    return false;
  }

  const lower = trimmed.toLowerCase();
  if (EVENT_EXCLUSION_KEYWORDS.some((kw) => lower.includes(kw))) {
    return false;
  }

  if (/\d+\s*\+/.test(trimmed)) {
    return false;
  }

  return true;
};

const isLikelyEventName = (value: string): boolean => {
  const text = value.trim().replace(/\s+/g, ' ');
  if (!text) {
    return false;
  }

  for (const connector of EVENT_CONNECTORS) {
    if (connector.regex.test(text)) {
      const parts = text
        .split(connector.split)
        .map((part) => part.trim())
        .filter(Boolean);

      if (parts.length >= 2 && parts.every(isLikelyEventPart)) {
        return true;
      }
    }
  }

  return false;
};

const deriveMarketFromBetSelections = (apostaText: string, evento?: string): string | null => {
  if (!apostaText) {
    return null;
  }

  const lines = apostaText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return null;
  }

  const eventoNormalizado = evento ? evento.trim().toLowerCase() : '';

  const collected = new Set<string>();

  for (const line of lines) {
    let base = line
      .replace(/^[-•]+\s*/, '')
      .trim();

    if (!base) {
      continue;
    }

     const baseLower = base.toLowerCase();

    if (eventoNormalizado && baseLower === eventoNormalizado) {
      continue;
    }

    if (isLikelyEventName(base)) {
      continue;
    }

    if (base.includes('→')) {
      base = base.split('→')[0]?.trim() || base;
    } else if (base.includes(':')) {
      base = base.split(':')[0]?.trim() || base;
    } else if (base.includes('-')) {
      const parts = base.split('-');
      const tail = parts[parts.length - 1]?.trim() ?? '';
      const cleanedTail = tail.replace(/[0-9+.,%]/g, '').trim();
      if (cleanedTail) {
        base = cleanedTail;
      }
    }

    base = base.replace(/[0-9+.,%]/g, '').trim();

    if (!base) {
      const fallbackTokens = line
        .replace(/[0-9+.,%]/g, ' ')
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(Boolean);
      base = fallbackTokens.pop() || '';
    }

    if (base) {
      collected.add(base);
    }
  }

  if (collected.size === 0) {
    return null;
  }

  return Array.from(collected).join(' / ');
};

const formatMarketText = (market?: string | null): string => {
  const selections = extractMarketSelections(market);
  if (selections.length > 0) {
    return selections.join('\n');
  }
  if (typeof market === 'string' && market.trim() !== '') {
    return market.trim();
  }
  return 'N/D';
};

type DeriveEventOptions = {
  normalizedGame?: string;
  apostaText?: string;
  mercadoText?: string;
  caption?: string | null;
};

const deriveEventName = ({ normalizedGame, apostaText, mercadoText, caption }: DeriveEventOptions): string | null => {
  if (normalizedGame && isLikelyEventName(normalizedGame)) {
    return normalizedGame.trim();
  }

  const candidates: string[] = [];

  const appendCandidatesFromText = (text?: string | null) => {
    if (!text) {
      return;
    }

    text
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        candidates.push(line);
      });
  };

  appendCandidatesFromText(normalizedGame);
  appendCandidatesFromText(caption || undefined);
  appendCandidatesFromText(apostaText);
  appendCandidatesFromText(mercadoText);

  const seen = new Set<string>();
  for (const candidate of candidates) {
    const normalized = candidate.trim();
    if (!normalized) {
      continue;
    }
    const lower = normalized.toLowerCase();
    if (seen.has(lower)) {
      continue;
    }
    seen.add(lower);
    if (isLikelyEventName(normalized)) {
      return normalized;
    }
  }

  return normalizedGame?.trim() || null;
};

const sendTelegramMessage = async (chatId: number, text: string, replyMarkup?: any, replyToMessageId?: number, useSupportBot = false) => {
  try {
    const token = useSupportBot ? getSupportBotToken() : getTelegramBotToken();
    const body: any = { 
      chat_id: chatId, 
      text
    };
    
    if (replyMarkup) {
      body.reply_markup = replyMarkup;
    }
    
    if (replyToMessageId) {
      body.reply_to_message_id = replyToMessageId;
    }
    
    log.info('Enviando mensagem ao Telegram');
    
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      log.error({ 
        status: response.status,
        statusText: response.statusText,
        errorText
      }, 'Erro HTTP ao enviar mensagem ao Telegram');
      return { ok: false, description: errorText, error_code: response.status };
    }
    
    const result = await response.json() as { ok: boolean; result?: { message_id: number }; description?: string; error_code?: number };
    
    if (!result.ok) {
      log.error({ 
        error: result.description, 
        code: result.error_code
      }, 'Erro ao enviar mensagem ao Telegram');
    } else {
      log.info('Mensagem enviada ao Telegram com sucesso');
    }
    
    return result;
  } catch (error) {
    log.error({ error }, 'Falha ao enviar mensagem ao Telegram');
    return null;
  }
};

const answerCallbackQuery = async (callbackQueryId: string, text?: string, showAlert = false, url?: string) => {
  try {
    const token = getTelegramBotToken();
    const body: any = {
      callback_query_id: callbackQueryId,
      text,
      show_alert: showAlert
    };
    
    if (url) {
      body.url = url;
    }
    
    log.info({ 
      callbackQueryId, 
      hasText: !!text, 
      text, 
      showAlert 
    }, 'Respondendo callback query');
    
    const response = await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      log.error({ 
        status: response.status,
        statusText: response.statusText,
        errorText,
        callbackQueryId
      }, 'Erro HTTP ao responder callback query');
      return;
    }
    
    const result = await response.json() as { ok: boolean; description?: string };
    if (!result.ok) {
      log.error({ 
        result, 
        callbackQueryId 
      }, 'Erro ao responder callback query');
    } else {
      log.info({ callbackQueryId }, 'Callback query respondido com sucesso');
    }
  } catch (error) {
    log.error({ error, callbackQueryId }, 'Falha ao responder callback query');
  }
};

const editMessageText = async (chatId: number, messageId: number, text: string, replyMarkup?: any) => {
  try {
    const token = getTelegramBotToken();
    const body: any = {
      chat_id: chatId,
      message_id: messageId,
      text
    };
    
    if (replyMarkup) {
      body.reply_markup = replyMarkup;
    }
    
    const response = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      log.error({ 
        status: response.status,
        errorText
      }, 'Erro HTTP ao editar mensagem');
      return;
    }
    
    const result = await response.json() as { ok: boolean; description?: string };
    if (!result.ok) {
      log.error({ description: result.description }, 'Erro ao editar mensagem');
    } else {
      log.info('Mensagem editada com sucesso');
    }
  } catch (error) {
    log.error(error, 'Falha ao editar mensagem do Telegram');
  }
};

const editMessageReplyMarkup = async (chatId: number, messageId: number, replyMarkup: any) => {
  try {
    const token = getTelegramBotToken();
    const body: any = {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: replyMarkup
    };

    const response = await fetch(`https://api.telegram.org/bot${token}/editMessageReplyMarkup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error({
        status: response.status,
        errorText
      }, 'Erro HTTP ao editar reply markup do Telegram');
      return;
    }

    const result = await response.json() as { ok: boolean; description?: string };
    if (!result.ok) {
      log.error({ description: result.description }, 'Erro ao editar reply markup do Telegram');
    } else {
      log.info('Reply markup editado com sucesso');
    }
  } catch (error) {
    log.error(error, 'Falha ao editar reply markup do Telegram');
  }
};

const deleteMessage = async (chatId: number, messageId: number) => {
  try {
    const token = getTelegramBotToken();
    await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId
      })
    });
  } catch (error) {
    log.error(error, 'Falha ao deletar mensagem do Telegram');
  }
};

const downloadTelegramFile = async (fileId: string) => {
  ensureConfig();
  const token = getTelegramBotToken();
  const fileInfoResp = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
  const fileInfo = await fileInfoResp.json() as { result?: { file_path?: string } };
  const filePath = fileInfo?.result?.file_path;
  if (!filePath) {
    throw new Error('Não foi possível obter o arquivo do Telegram');
  }
  const fileResp = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
  if (!fileResp.ok) {
    throw new Error('Falha ao baixar arquivo do Telegram');
  }
  const buffer = Buffer.from(await fileResp.arrayBuffer());
  return { base64: buffer.toString('base64'), filePath };
};

const STATUS_EMOJIS: Record<string, string> = {
  Ganha: '✅',
  Perdida: '❌',
  Pendente: '⏳',
  'Meio Ganha': '🌗',
  'Meio Perdida': '🌘',
  Reembolsada: '💱',
  Cashout: '💰',
  Void: '⚪️'
};

const formatBetMessage = (bet: Bet, banca: Bankroll) => {
  let esporteFormatado = normalizarEsporteParaOpcao(bet.esporte || '') || bet.esporte || '';
  try {
    const formatCurrency = (value: number) => {
      if (!value || isNaN(value)) return 'R$ 0,00';
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value);
    };

    const formatDate = (date: Date | string | null) => {
      if (!date) return 'N/D';
      try {
        return new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }).format(new Date(date));
      } catch {
        return 'N/D';
      }
    };

    const formatTime = (date: Date | string | null) => {
      if (!date) return 'N/D';
      try {
        return new Intl.DateTimeFormat('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }).format(new Date(date));
      } catch {
        return 'N/D';
      }
    };

    const valorApostado = bet.valorApostado || 0;
    const odd = bet.odd || 1;
    const retornoPotencial = valorApostado * odd;

    let lucroPrejuizo: number | null = null;
    const retornoValido = typeof bet.retornoObtido === 'number' ? bet.retornoObtido : null;

    switch (bet.status) {
      case 'Ganha':
        lucroPrejuizo = retornoValido !== null ? retornoValido - valorApostado : null;
        break;
      case 'Perdida':
        lucroPrejuizo = -valorApostado;
        break;
      case 'Meio Ganha':
        if (retornoValido !== null) {
          lucroPrejuizo = (retornoValido - valorApostado) / 2;
        } else {
          const potencialLucro = retornoPotencial - valorApostado;
          lucroPrejuizo = potencialLucro / 2;
        }
        break;
      case 'Meio Perdida':
        lucroPrejuizo = -valorApostado / 2;
        break;
      case 'Reembolsada':
        lucroPrejuizo = 0;
        break;
      case 'Cashout':
        lucroPrejuizo = retornoValido !== null ? retornoValido - valorApostado : null;
        break;
      default:
        lucroPrejuizo = null;
    }

    let lucroPrejuizoText = 'Sem lucro ou prejuízo.';
    if (lucroPrejuizo !== null) {
      if (lucroPrejuizo > 0) {
        lucroPrejuizoText = `Lucro: ${formatCurrency(lucroPrejuizo)}`;
      } else if (lucroPrejuizo < 0) {
        lucroPrejuizoText = `Prejuízo: ${formatCurrency(Math.abs(lucroPrejuizo))}`;
      } else {
        lucroPrejuizoText = 'Sem lucro ou prejuízo.';
      }
    }

    const statusEmoji = STATUS_EMOJIS[bet.status] || '⏳';
    const statusText = `${statusEmoji} Status: ${bet.status || 'Pendente'}`;

    // A partir de agora, o campo "🎯 Mercado" exibe APENAS o que
    // foi salvo em bet.mercado (vindo do bilhete-tracker ou inserido
    // manualmente), sem heurísticas extras.
    const mercadoDisplayClean =
      typeof bet.mercado === 'string' && bet.mercado.trim() !== ''
        ? bet.mercado.trim()
        : 'N/D';

    // Formatar a linha de aposta SEM reconstruir ou aplicar heurísticas.
    // Usamos exatamente o que foi salvo em bet.aposta (vindo do
    // bilhete-tracker ou inserido manualmente).
    const apostaBruta = (bet.aposta || '').trim();

    let apostaLine: string;
    if (!apostaBruta) {
      apostaLine = `🎰 Aposta: ${bet.jogo || 'N/D'}`;
    } else if (apostaBruta.includes('\n')) {
      const lines = apostaBruta
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean);
      const primary = lines[0] || 'N/D';
      const remaining = lines.slice(1);
      const suffix = remaining.length > 0 ? `\n${remaining.join('\n')}` : '';
      apostaLine = `🎰 Aposta: ${primary}${suffix}`;
    } else {
      apostaLine = `🎰 Aposta: ${apostaBruta}`;
    }

    return `✅ Bilhete processado com sucesso

  🆔 ID: ${bet.id}
  💰 Banca: ${banca?.nome || 'N/D'}
  ${statusText}
  💎 ${lucroPrejuizoText}
  🏀 Esporte: ${esporteFormatado || 'N/D'}
  🏆 Torneio: ${bet.torneio || 'N/D'}
  ⚔️ Evento: ${bet.jogo || 'N/D'}
  ${apostaLine}
  🎯 Mercado: ${mercadoDisplayClean}
  💰 Valor Apostado: ${formatCurrency(valorApostado)}
  🎲 Odd: ${odd}
  💵 Retorno Potencial: ${formatCurrency(retornoPotencial)}
  📄 Tipo: ${bet.tipoAposta || 'Simples'}
  📅 Data: ${formatDate(bet.dataJogo)}
  🎁 Bônus: ${(bet.bonus || 0) > 0 ? formatCurrency(bet.bonus) : 'Não'}
  🏠 Casa: ${bet.casaDeAposta || 'N/D'}
  👤 Tipster: ${bet.tipster || 'N/D'}`;
  } catch (error) {
    log.error(error, 'Erro ao formatar mensagem da aposta');
    return `✅ Bilhete processado com sucesso!\n\n🆔 ID: ${bet.id}\n💰 Banca: ${banca?.nome || 'N/D'}\n🏀 Esporte: ${esporteFormatado || 'N/D'}`;
  }
};

const getFrontendBaseUrl = (): string | null => {
  if (!process.env.FRONTEND_URL) {
    return null;
  }

  let baseUrl = process.env.FRONTEND_URL.trim();
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = `https://${baseUrl}`;
  }

  return baseUrl.replace(/\/$/, '');
};

const buildEditWebAppUrl = (betId: string, messageId?: number, chatId?: number): string | null => {
  const baseUrl = getFrontendBaseUrl();
  if (!baseUrl) {
    return null;
  }

  const params = new URLSearchParams({ betId });
  if (typeof messageId === 'number') {
    params.append('messageId', messageId.toString());
  }
  if (typeof chatId === 'number') {
    params.append('chatId', chatId.toString());
  }

  return `${baseUrl}/telegram/edit?${params.toString()}`;
};

const keyboardHasWebAppButton = (keyboard: any): boolean => {
  if (!keyboard?.inline_keyboard) {
    return false;
  }

  return keyboard.inline_keyboard.some((row: any[]) =>
    row.some((button: any) => Boolean(button?.web_app))
  );
};

const createBetInlineKeyboard = (betId: string, messageId?: number, chatId?: number) => {
  const frontendUrl = process.env.FRONTEND_URL;
  const excluirCallback = `excluir_${betId}`;
  const editarCallback = `editar_${betId}`;
  const statusCallback = `alterar_status_${betId}`;
  
  // Verificar tamanho dos callbacks (limite do Telegram: 64 bytes)
  const maxCallbackSize = 64;
  const excluirSize = Buffer.byteLength(excluirCallback, 'utf8');
  const editarSize = Buffer.byteLength(editarCallback, 'utf8');
  const statusSize = Buffer.byteLength(statusCallback, 'utf8');
  
  if (editarSize > maxCallbackSize || excluirSize > maxCallbackSize || statusSize > maxCallbackSize) {
    log.error({ 
      editarSize,
      excluirSize,
      statusSize,
      maxCallbackSize 
    }, 'Callback data excede limite do Telegram!');
  }
  
  const editWebAppUrl = messageId && chatId ? buildEditWebAppUrl(betId, messageId, chatId) : null;

  const keyboard = editWebAppUrl
    ? {
        inline_keyboard: [
          [
            { text: '✏️ Editar', web_app: { url: editWebAppUrl } },
            { text: '🗑️ Excluir', callback_data: excluirCallback }
          ],
          [
            { text: '📚 Alterar Status', callback_data: statusCallback }
          ]
        ]
      }
    : {
        inline_keyboard: [
          [
            { text: '✏️ Editar', callback_data: editarCallback },
            { text: '🗑️ Excluir', callback_data: excluirCallback }
          ],
          [
            { text: '📚 Alterar Status', callback_data: statusCallback }
          ]
        ]
      };
  
  // Validar estrutura do keyboard
  if (!keyboard || !keyboard.inline_keyboard || !Array.isArray(keyboard.inline_keyboard)) {
    log.error('Keyboard inválido ao criar botões inline');
    throw new Error('Keyboard inválido ao criar botões inline');
  }
  
  if (keyboard.inline_keyboard.length === 0) {
    log.error('Keyboard sem botões ao criar botões inline');
    throw new Error('Keyboard sem botões ao criar botões inline');
  }
  
  log.info('Botões inline criados');
  
  return keyboard;
};

const STATUS_ACTIONS = {
  GANHA: { text: '✅ Ganha', value: 'Ganha' },
  PERDIDA: { text: '❌ Perdida', value: 'Perdida' },
  PENDENTE: { text: '⏳ Pendente', value: 'Pendente' },
  MEIO_GANHA: { text: '🌗 Meio-Ganha', value: 'Meio Ganha' },
  MEIO_PERDIDA: { text: '🌘 Meio-Perdida', value: 'Meio Perdida' },
  REEMBOLSADA: { text: '💱 Reembolsada', value: 'Reembolsada' }
} as const;

type StatusActionKey = keyof typeof STATUS_ACTIONS;

type InlineButton = {
  text: string;
  callback_data: string;
};

const STATUS_KEYBOARD_LAYOUT: StatusActionKey[][] = [
  ['GANHA', 'PERDIDA'],
  ['PENDENTE'],
  ['MEIO_GANHA', 'MEIO_PERDIDA'],
  ['REEMBOLSADA']
];

const createStatusInlineKeyboard = (betId: string) => {
  const rows: InlineButton[][] = STATUS_KEYBOARD_LAYOUT.map((row) =>
    row.map((key) => ({
      text: STATUS_ACTIONS[key].text,
      callback_data: `status:${key}:${betId}`
    }))
  );

  rows.push([
    {
      text: '⬅️ Voltar para o bilhete',
      callback_data: `status:BACK:${betId}`
    }
  ]);

  return { inline_keyboard: rows };
};

const calculateRetornoObtidoFromStatus = (bet: Bet, status: string): number | null => {
  const valorApostado = bet.valorApostado || 0;
  const odd = bet.odd || 1;

  switch (status) {
    case 'Ganha':
    case 'Meio Ganha':
      return Number((valorApostado * odd).toFixed(2));
    case 'Reembolsada':
      return Number(valorApostado.toFixed(2));
    default:
      return null;
  }
};

router.post('/webhook', async (req, res) => {
  try {
    ensureConfig();
    if (process.env.TELEGRAM_WEBHOOK_SECRET) {
      // Express normaliza headers para lowercase, mas vamos verificar ambas as formas
      const secret = req.headers['x-telegram-bot-api-secret-token'] || 
                     req.headers['X-Telegram-Bot-Api-Secret-Token'];
      
      if (!secret) {
        log.warn({ 
          headers: Object.keys(req.headers),
          allHeaders: Object.entries(req.headers).filter(([key]) => 
            key.toLowerCase().includes('telegram') || key.toLowerCase().includes('secret')
          )
        }, 'Webhook chamado sem secret token');
        return res.status(403).json({ error: 'Secret token não fornecido' });
      }
      
      if (typeof secret !== 'string' || secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
        log.warn({ 
          received: typeof secret === 'string' ? secret.substring(0, 5) + '...' : 'não é string',
          receivedLength: typeof secret === 'string' ? secret.length : 0,
          expected: process.env.TELEGRAM_WEBHOOK_SECRET?.substring(0, 5) + '...',
          expectedLength: process.env.TELEGRAM_WEBHOOK_SECRET?.length || 0
        }, 'Secret token inválido');
        return res.status(403).json({ error: 'Secret token inválido' });
      }
    }

    const update = req.body;
    
    log.info({
      hasCallbackQuery: !!update.callback_query,
      hasMessage: !!update.message,
      updateType: update.callback_query ? 'callback_query' : update.message ? 'message' : 'unknown'
    }, 'Webhook recebido');
    
    // Processar callback queries (cliques em botões inline)
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const callbackData = callbackQuery.data;
      const chatId = callbackQuery.message?.chat?.id;
      const messageId = callbackQuery.message?.message_id;
      const telegramUserId = String(callbackQuery.from.id);

      log.info({
        callbackData,
        chatId,
        messageId,
        telegramUserId,
        callbackQueryId: callbackQuery.id,
        fullCallback: JSON.stringify(callbackQuery)
      }, 'Callback query recebido - processando...');
      
      // Processar de forma assíncrona mas responder ao webhook rapidamente
      (async () => {
        try {

        if (!callbackData) {
          log.warn({ callbackQueryId: callbackQuery.id }, 'Callback sem data');
          await answerCallbackQuery(callbackQuery.id);
          return;
        }

        // Verificar se o usuário está vinculado
        const user = await prisma.user.findFirst({
          where: { telegramId: telegramUserId },
          include: { bancas: { include: { apostas: true } } }
        });

        if (!user) {
          log.warn({ telegramUserId, callbackData }, 'Usuário não encontrado para callback');
          await answerCallbackQuery(callbackQuery.id, 'Usuário não encontrado. Vincule sua conta primeiro.', true);
          return;
        }

        log.info({ userId: user.id, callbackData }, 'Processando callback para usuário');

      // Processar exclusão de aposta
      if (callbackData.startsWith('excluir_')) {
        try {
          const betId = callbackData.replace('excluir_', '');
          
          log.info({ 
            betId, 
            userId: user.id, 
            callbackDataOriginal: callbackData,
            betIdLength: betId.length,
            betIdIsEmpty: !betId || betId.length === 0
          }, 'Processando exclusão de aposta');
          
          if (!betId || betId.length === 0) {
            log.error({ callbackData }, 'BetId vazio ao processar exclusão');
            await answerCallbackQuery(callbackQuery.id, 'Erro: ID da aposta não encontrado.', true);
            return;
          }

          // Verificar se a aposta pertence ao usuário
          // Debug log removed
          // Debug log removed
          // Debug log removed
          
          const aposta = await prisma.bet.findFirst({
            where: { id: betId },
            include: {
              banca: {
                select: { usuarioId: true }
              }
            }
          });

          // Debug log removed
          if (aposta) {
            // Debug log removed
            // Debug log removed
            // Debug log removed
            // Debug log removed
            // Debug log removed
          }

          if (!aposta || aposta.banca.usuarioId !== user.id) {
            // Error log removed
            // Error log removed
            if (aposta) {
              // Error log removed
              // Error log removed
            }
            log.warn({ betId, userId: user.id, apostaFound: !!aposta }, 'Aposta não encontrada ou sem permissão');
            await answerCallbackQuery(callbackQuery.id, 'Aposta não encontrada ou você não tem permissão para excluí-la.', true);
            return;
          }
          
          // Debug log removed

          // Excluir a aposta
          await prisma.bet.delete({
            where: { id: betId }
          });

          emitBetEvent({
            userId: user.id,
            type: 'deleted',
            payload: { betId }
          });

          // Atualizar a mensagem para indicar que foi excluída
          if (chatId && messageId) {
            const mensagemAtualizada = `✅ Bilhete excluído com sucesso.\n\n🆔 ID: ${betId}\n\nEsta aposta foi removida do sistema.`;
            await editMessageText(chatId, messageId, mensagemAtualizada, { inline_keyboard: [] });
          }

          await answerCallbackQuery(callbackQuery.id, 'Aposta excluída com sucesso!');
          log.info({ betId }, 'Aposta excluída com sucesso');
          return;
        } catch (error) {
          log.error({ error, betId: callbackData.replace('excluir_', '') }, 'Erro ao processar exclusão');
          await answerCallbackQuery(callbackQuery.id, 'Erro ao excluir aposta. Tente novamente.', true);
          return;
        }
      }

      // Processar edição de aposta
      if (callbackData.startsWith('editar_')) {
        try {
          const betId = callbackData.replace('editar_', '');
          // Debug log removed
          // Debug log removed
          // Debug log removed
          
          log.info({ 
            betId, 
            userId: user.id, 
            callbackDataOriginal: callbackData,
            betIdLength: betId.length,
            betIdIsEmpty: !betId || betId.length === 0
          }, 'Processando edição de aposta');
          
          if (!betId || betId.length === 0) {
            // Error log removed
            log.error({ callbackData }, 'BetId vazio ao processar edição');
            await answerCallbackQuery(callbackQuery.id, 'Erro: ID da aposta não encontrado.', true);
            return;
          }

          // Verificar se a aposta pertence ao usuário
          log.debug({ betId }, 'Buscando aposta no banco para edição');
          
          const aposta = await prisma.bet.findFirst({
            where: { id: betId },
            include: {
              banca: {
                select: { usuarioId: true }
              }
            }
          });

          // Debug log removed
          if (aposta) {
            // Debug log removed
            // Debug log removed
            // Debug log removed
            // Debug log removed
            // Debug log removed
          }

          if (!aposta || aposta.banca.usuarioId !== user.id) {
            // Error log removed
            log.warn({ betId, userId: user.id, apostaFound: !!aposta }, 'Aposta não encontrada ou sem permissão para editar');
            await answerCallbackQuery(callbackQuery.id, 'Aposta não encontrada ou você não tem permissão para editá-la.', true);
            return;
          }
          
          // Debug log removed
          
          // Abrir WebApp de edição com messageId e chatId
          const messageId = callbackQuery.message?.message_id;
          const chatId = callbackQuery.message?.chat?.id;
          
          if (messageId && chatId) {
            try {
              const upgradedKeyboard = createBetInlineKeyboard(betId, messageId, chatId);
              if (keyboardHasWebAppButton(upgradedKeyboard)) {
                await editMessageReplyMarkup(chatId, messageId, upgradedKeyboard);
                await answerCallbackQuery(callbackQuery.id, 'Botão atualizado! Toque em ✏️ Editar novamente para abrir o editor.');
                log.info({ betId, messageId, chatId }, 'Inline keyboard atualizado para WebApp via callback');
                return;
              }
            } catch (error) {
              log.warn({ error, betId, messageId, chatId }, 'Falha ao atualizar inline keyboard para WebApp');
            }
          }

          const fallbackUrl = buildEditWebAppUrl(betId);
          if (fallbackUrl && chatId) {
            await sendTelegramMessage(chatId, 'Use o botão abaixo para abrir o editor.', {
              inline_keyboard: [
                [
                  { text: '✏️ Abrir editor', web_app: { url: fallbackUrl } }
                ]
              ]
            });
            await answerCallbackQuery(callbackQuery.id, 'Enviei um botão com o editor. Caso não apareça, verifique se o FRONTEND_URL está correto.', true);
            log.warn({ betId, chatId }, 'Fallback enviado para abrir editor do Telegram');
            return;
          }

          await answerCallbackQuery(callbackQuery.id, 'Não foi possível abrir o editor agora. Verifique a configuração do FRONTEND_URL.', true);
          log.warn({ betId }, 'Callback de edição recebido, mas não foi possível abrir Web App');
          return;
        } catch (error) {
          log.error({ error, betId: callbackData.replace('editar_', '') }, 'Erro ao processar edição');
          await answerCallbackQuery(callbackQuery.id, 'Erro ao processar edição. Tente novamente.', true);
          return;
        }
      }

      // Processar alteração de status
      if (callbackData.startsWith('alterar_status_')) {
        try {
          const betId = callbackData.replace('alterar_status_', '');
          // Debug log removed
          // Debug log removed
          // Debug log removed
          
          log.info({ 
            betId, 
            userId: user.id, 
            callbackDataOriginal: callbackData,
            betIdLength: betId.length,
            betIdIsEmpty: !betId || betId.length === 0
          }, 'Processando alteração de status');
          
          if (!betId || betId.length === 0) {
            // Error log removed
            log.error({ callbackData }, 'BetId vazio ao processar alteração de status');
            await answerCallbackQuery(callbackQuery.id, 'Erro: ID da aposta não encontrado.', true);
            return;
          }

          // Verificar se a aposta pertence ao usuário
          log.debug({ betId }, 'Buscando aposta no banco para alteração de status');
          
          const aposta = await prisma.bet.findFirst({
            where: { id: betId },
            include: {
              banca: {
                select: { usuarioId: true }
              }
            }
          });

          // Debug log removed
          if (aposta) {
            // Debug log removed
            // Debug log removed
            // Debug log removed
            // Debug log removed
            // Debug log removed
          }

          if (!aposta || aposta.banca.usuarioId !== user.id) {
            // Error log removed
            log.warn({ betId, userId: user.id, apostaFound: !!aposta }, 'Aposta não encontrada ou sem permissão para alterar status');
            await answerCallbackQuery(callbackQuery.id, 'Aposta não encontrada ou você não tem permissão para alterar o status.', true);
            return;
          }
          
          // Debug log removed

          if (!chatId || !messageId) {
            // Error log removed
            await answerCallbackQuery(callbackQuery.id, 'Não foi possível mostrar as opções de status. Reenvie o bilhete e tente novamente.', true);
            return;
          }

          const statusKeyboard = createStatusInlineKeyboard(betId);
          await editMessageReplyMarkup(chatId, messageId, statusKeyboard);
          await answerCallbackQuery(callbackQuery.id, 'Selecione o novo status para este bilhete.');
          log.info({ betId, userId: user.id }, 'Exibindo teclado de status no Telegram');
          return;
        } catch (error) {
          log.error({ error, betId: callbackData.replace('alterar_status_', '') }, 'Erro ao processar alteração de status');
          await answerCallbackQuery(callbackQuery.id, 'Erro ao processar alteração de status. Tente novamente.', true);
          return;
        }
      }

      if (callbackData.startsWith('status:')) {
        try {
          const parts = callbackData.split(':');
          const action = parts[1];
          const betId = parts[2];

          if (!action || !betId) {
            // Error log removed
            await answerCallbackQuery(callbackQuery.id, 'Não foi possível identificar o status selecionado.', true);
            return;
          }

          if (!chatId || !messageId) {
            // Error log removed
            await answerCallbackQuery(callbackQuery.id, 'Não foi possível atualizar este bilhete agora.', true);
            return;
          }

          if (action === 'BACK') {
            const keyboard = createBetInlineKeyboard(betId, messageId, chatId);
            await editMessageReplyMarkup(chatId, messageId, keyboard);
            await answerCallbackQuery(callbackQuery.id, 'Voltando para o bilhete.');
            return;
          }

          const statusConfig = STATUS_ACTIONS[action as StatusActionKey];
          if (!statusConfig) {
            log.warn({ action }, 'Status selecionado não reconhecido');
            await answerCallbackQuery(callbackQuery.id, 'Status não reconhecido.', true);
            return;
          }

          const aposta = await prisma.bet.findFirst({
            where: { id: betId },
            include: {
              banca: true
            }
          });

          if (!aposta || aposta.banca.usuarioId !== user.id) {
            // Error log removed
            log.warn({ betId, userId: user.id }, 'Tentativa inválida de atualizar status via Telegram');
            await answerCallbackQuery(callbackQuery.id, 'Aposta não encontrada ou sem permissão.', true);
            return;
          }

          const retornoObtido = calculateRetornoObtidoFromStatus(aposta, statusConfig.value);
          const updatedBet = await prisma.bet.update({
            where: { id: aposta.id },
            data: {
              status: statusConfig.value,
              retornoObtido
            },
            include: {
              banca: true
            }
          });

          emitBetEvent({
            userId: user.id,
            type: 'updated',
            payload: { betId: updatedBet.id }
          });

          let mensagemAtualizada = formatBetMessage(updatedBet, updatedBet.banca);
          if (mensagemAtualizada.length > 4096) {
            log.warn({ betId: updatedBet.id, messageLength: mensagemAtualizada.length }, 'Mensagem muito longa ao atualizar status via Telegram, truncando');
            mensagemAtualizada = `${mensagemAtualizada.substring(0, 4000)}\n\n... (mensagem truncada)`;
          }

          const keyboard = createBetInlineKeyboard(updatedBet.id, messageId, chatId);
          await editMessageText(chatId, messageId, mensagemAtualizada, keyboard);
          await answerCallbackQuery(callbackQuery.id, `Status atualizado para ${statusConfig.value}!`);
          log.info({ betId: updatedBet.id, status: statusConfig.value, userId: user.id }, 'Status atualizado via Telegram');
          return;
        } catch (error) {
          log.error({ error, callbackData }, 'Erro ao processar atualização de status via teclado inline');
          await answerCallbackQuery(callbackQuery.id, 'Erro ao atualizar o status. Tente novamente.', true);
          return;
        }
      }

      // Manter compatibilidade com o formato antigo (delete_bet_)
      if (callbackData.startsWith('delete_bet_')) {
        try {
          const betId = callbackData.replace('delete_bet_', '');
          log.info({ betId, userId: user.id }, 'Processando exclusão de aposta (formato antigo)');

          // Verificar se a aposta pertence ao usuário
          const aposta = await prisma.bet.findFirst({
            where: { id: betId },
            include: {
              banca: {
                select: { usuarioId: true }
              }
            }
          });

          if (!aposta || aposta.banca.usuarioId !== user.id) {
            await answerCallbackQuery(callbackQuery.id, 'Aposta não encontrada ou você não tem permissão para excluí-la.', true);
            return;
          }

          // Excluir a aposta
          await prisma.bet.delete({
            where: { id: betId }
          });

          emitBetEvent({
            userId: user.id,
            type: 'deleted',
            payload: { betId }
          });

          // Atualizar a mensagem para indicar que foi excluída
          if (chatId && messageId) {
            const mensagemAtualizada = `✅ Bilhete excluído com sucesso.\n\n🆔 ID: ${betId}\n\nEsta aposta foi removida do sistema.`;
            await editMessageText(chatId, messageId, mensagemAtualizada, { inline_keyboard: [] });
          }

          await answerCallbackQuery(callbackQuery.id, 'Aposta excluída com sucesso!');
          return;
        } catch (error) {
          log.error({ error, betId: callbackData.replace('delete_bet_', '') }, 'Erro ao processar exclusão (formato antigo)');
          await answerCallbackQuery(callbackQuery.id, 'Erro ao excluir aposta. Tente novamente.', true);
          return;
        }
      }

      // Se nenhum handler corresponder, apenas responder ao callback
      log.warn({ callbackData }, 'Callback não reconhecido');
      await answerCallbackQuery(callbackQuery.id);
        } catch (error) {
          log.error({ error, callbackData }, 'Erro geral ao processar callback query');
          try {
            await answerCallbackQuery(callbackQuery.id, 'Erro ao processar ação. Tente novamente.', true);
          } catch (answerError) {
            log.error({ answerError }, 'Erro ao responder callback query');
          }
        }
      })();
      
      // Responder ao webhook imediatamente
      return res.json({ ok: true });
    }

    const message = update?.message || update?.channel_post;
    if (!message) {
      return res.json({ ok: true });
    }

    const telegramUserId = message.from?.id ? String(message.from.id) : null;
    if (!telegramUserId) {
      return res.json({ ok: true });
    }

    // Processar comando /start para vinculação automática
    if (message.text && message.text.startsWith('/start')) {
      const rawParam = extractCommandParam(message.text);

      // Verificar se é uma chamada de suporte
      if (rawParam && rawParam.startsWith('support_')) {
        const accountId = normalizeAccountId(rawParam.replace('support_', ''));

        if (!accountId) {
          await sendTelegramMessage(
            message.chat.id,
            '❌ ID inválido. Copie novamente o ID exibido no perfil e tente outra vez.'
          );
          return res.json({ ok: true });
        }
        
        // Verificar se a conta existe
        const account = await prisma.user.findUnique({
          where: { id: accountId }
        });

        if (!account) {
          await sendTelegramMessage(message.chat.id, '❌ Conta não encontrada. Verifique se o ID está correto.');
          return res.json({ ok: true });
        }

        // Extrair primeiro nome (apelido)
        const firstName = account.nomeCompleto.split(' ')[0] || account.nomeCompleto;

        // Verificar se o Telegram do usuário está vinculado à conta
        const user = await prisma.user.findFirst({
          where: {
            telegramId: telegramUserId,
            id: accountId
          }
        });

        if (user) {
          // Usuário vinculado - enviar mensagem de boas-vindas personalizada
          await sendTelegramMessage(message.chat.id, `Olá, ${firstName}! 👋\n\nBem-vindo ao suporte!\nComo posso ajudar?`);
        } else {
          // Usuário não vinculado - pedir para vincular
          await sendTelegramMessage(message.chat.id, `Olá, ${firstName}! 👋\n\nBem-vindo ao suporte!\nComo posso ajudar?\n\n⚠️ Para um atendimento mais personalizado, vincule sua conta do Telegram no perfil do sistema.`);
        }
        
        return res.json({ ok: true });
      }

      // Processamento normal do /start para vinculação
      const accountId = normalizeAccountId(rawParam);

      if (accountId) {
        // Verificar se a conta existe
        const account = await prisma.user.findUnique({
          where: { id: accountId }
        });

        if (!account) {
          await sendTelegramMessage(message.chat.id, '❌ Conta não encontrada. Verifique se o ID está correto.');
          return res.json({ ok: true });
        }

        // Verificar se o telegramId já está vinculado a outra conta
        const existingUser = await prisma.user.findFirst({
          where: {
            telegramId: telegramUserId,
            NOT: { id: accountId }
          }
        });

        if (existingUser) {
          await sendTelegramMessage(message.chat.id, '❌ Este Telegram já está vinculado a outra conta. Desvincule primeiro no perfil do sistema.');
          return res.json({ ok: true });
        }

        // Verificar se a conta já tem outro Telegram vinculado
        if (account.telegramId && account.telegramId !== telegramUserId) {
          await sendTelegramMessage(message.chat.id, '❌ Esta conta já está vinculada a outro Telegram. Desvincule primeiro no perfil do sistema.');
          return res.json({ ok: true });
        }

        // Fazer a vinculação
        const telegramUsername = message.from?.username || null;
        await prisma.user.update({
          where: { id: accountId },
          data: { 
            telegramId: telegramUserId,
            telegramUsername: telegramUsername
          }
        });

        await sendTelegramMessage(message.chat.id, `✅ Conta vinculada com sucesso!\n\nBem-vindo, ${account.nomeCompleto}!\n\nAgora você pode enviar bilhetes de apostas para este bot e eles serão registrados automaticamente no sistema.`);
        return res.json({ ok: true });
      } else {
        // Se não tem ID, verificar se já está vinculado
        const user = await prisma.user.findFirst({
          where: { telegramId: telegramUserId }
        });

        if (user) {
          await sendTelegramMessage(message.chat.id, `Olá, ${user.nomeCompleto}!\n\nSua conta já está vinculada. Você pode enviar bilhetes de apostas para este bot.`);
        } else {
          await sendTelegramMessage(message.chat.id, 'Olá! Para vincular sua conta, acesse o perfil no sistema e clique em "Conectar com Telegram".');
        }
        return res.json({ ok: true });
      }
    }

    // Processar comando /id para vinculação manual
    if (message.text && message.text.startsWith('/id')) {
      const rawAccountId = extractCommandParam(message.text);
      const accountId = normalizeAccountId(rawAccountId);

      if (!accountId) {
        await sendTelegramMessage(
          message.chat.id,
          '❌ Uso: /id <ID_DA_CONTA>\n\nExemplo: /id 268b85d8-dbe4-47d9-98cd-846cc17ab7dc'
        );
        return res.json({ ok: true });
      }

      // Verificar se a conta existe
      const account = await prisma.user.findUnique({
        where: { id: accountId }
      });

      if (!account) {
        await sendTelegramMessage(message.chat.id, '❌ Conta não encontrada. Verifique se o ID está correto.');
        return res.json({ ok: true });
      }

      // Verificar se o telegramId já está vinculado a outra conta
      const existingUser = await prisma.user.findFirst({
        where: {
          telegramId: telegramUserId,
          NOT: { id: accountId }
        }
      });

      if (existingUser) {
        await sendTelegramMessage(message.chat.id, '❌ Este Telegram já está vinculado a outra conta. Desvincule primeiro usando /desvincular ou no perfil do sistema.');
        return res.json({ ok: true });
      }

      // Verificar se a conta já tem outro Telegram vinculado
      if (account.telegramId && account.telegramId !== telegramUserId) {
        await sendTelegramMessage(message.chat.id, '❌ Esta conta já está vinculada a outro Telegram. Desvincule primeiro no perfil do sistema.');
        return res.json({ ok: true });
      }

      // Fazer a vinculação
      const telegramUsername = message.from?.username || null;
      await prisma.user.update({
        where: { id: accountId },
        data: { 
          telegramId: telegramUserId,
          telegramUsername: telegramUsername
        }
      });

      await sendTelegramMessage(message.chat.id, `✅ Conta vinculada com sucesso!\n\nBem-vindo, ${account.nomeCompleto}!\n\nAgora você pode enviar bilhetes de apostas para este bot e eles serão registrados automaticamente no sistema.`);
      return res.json({ ok: true });
    }

    // Processar comando /desvincular
    if (message.text && message.text.startsWith('/desvincular')) {
      // Verificar se o usuário está vinculado
      const user = await prisma.user.findFirst({
        where: { telegramId: telegramUserId }
      });

      if (!user) {
        await sendTelegramMessage(message.chat.id, '❌ Nenhuma conta está vinculada a este Telegram.');
        return res.json({ ok: true });
      }

      // Desvincular
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          telegramId: null,
          telegramUsername: null
        }
      });

      await sendTelegramMessage(message.chat.id, `✅ Conta desvinculada com sucesso!\n\nSua conta ${user.nomeCompleto} foi desvinculada deste Telegram.\n\nPara vincular novamente, use o comando /id <ID_DA_CONTA> ou acesse o perfil no sistema.`);
      return res.json({ ok: true });
    }

    // Verificar se o usuário está vinculado (para processar imagens/documentos)
    const user = await prisma.user.findFirst({
      where: { telegramId: telegramUserId },
      include: { bancas: true }
    });

    if (!user) {
      await sendTelegramMessage(message.chat.id, 'Não encontrei um usuário vinculado a este Telegram. Associe seu Telegram no perfil do sistema ou use o comando /start com seu ID da conta.');
      return res.json({ ok: true });
    }

    const bancaPadrao = user.bancas.find((b: Bankroll) => b.ePadrao) || user.bancas[0];
    if (!bancaPadrao) {
      await sendTelegramMessage(message.chat.id, 'Nenhuma banca ativa foi encontrada para sua conta.');
      return res.json({ ok: true });
    }

    let fileId: string | null = null;
    let mimeType = 'image/jpeg';

    if (message.photo?.length) {
      const photo = message.photo[message.photo.length - 1];
      fileId = photo.file_id;
    } else if (message.document && message.document.mime_type?.startsWith('image/')) {
      fileId = message.document.file_id;
      mimeType = message.document.mime_type;
    } else {
      return res.json({ ok: true });
    }

    if (!fileId) {
      return res.json({ ok: true });
    }

    const processTicketInBackground = async () => {
      try {
        const processingMessage = await sendTelegramMessage(
          message.chat.id,
          '⏳ Processando bilhete...',
          undefined,
          message.message_id
        );

        let processingMessageId: number | null = null;
        if (processingMessage && processingMessage.result) {
          processingMessageId = processingMessage.result.message_id;
        }

        const { base64, filePath } = await downloadTelegramFile(fileId);
        if (!mimeType && filePath) {
          if (filePath.endsWith('.png')) mimeType = 'image/png';
          else if (filePath.endsWith('.webp')) mimeType = 'image/webp';
        }

        let casaDeApostaFromCaption = '';
        let tipsterFromCaption = '';
        let bancaSelecionadaNome = '';
        if (message.caption) {
          const lines = message.caption
            .trim()
            .split('\n')
            .map((line: string) => line.trim())
            .filter((line: string) => line);
          if (lines.length >= 3) {
            casaDeApostaFromCaption = lines[0];
            tipsterFromCaption = lines[1];
            bancaSelecionadaNome = lines[2];
          } else if (lines.length === 2) {
            casaDeApostaFromCaption = lines[0];
            tipsterFromCaption = lines[1];
          } else if (lines.length === 1) {
            casaDeApostaFromCaption = lines[0];
          }
        }

        let normalizedData: NormalizedTicketData;
        try {
          if (!filePath) {
            throw new Error('Caminho de arquivo do Telegram não encontrado');
          }

          normalizedData = await processTicketViaBilheteTracker(base64, mimeType, filePath);
        } catch (serviceError) {
          log.error({ error: serviceError }, 'Falha ao processar bilhete via serviço externo');

          if (processingMessageId) {
            try {
              await deleteMessage(message.chat.id, processingMessageId);
            } catch (deleteProcessingError) {
              log.error({ deleteProcessingError }, 'Erro ao remover mensagem de processamento após falha no OCR');
            }
          }

          await sendTelegramMessage(
            message.chat.id,
            '❌ Não conseguimos processar este bilhete via BilheteTracker. Tente novamente em alguns minutos.',
            undefined,
            message.message_id
          );

          return;
        }

        const casaDeAposta = casaDeApostaFromCaption || normalizedData.casaDeAposta || 'N/D';

        // Tipster:
        // 1) Se o usuário informar na legenda do Telegram (segunda linha), usar esse valor.
        // 2) Caso contrário, usar o tipster vindo do BilheteTracker (se existir).
        // 3) Se ainda assim estiver vazio, preencher com o apelido do usuário no site:
        //    - Primeiro tentar o apelido de cadastro (nomeCompleto).
        //    - Se não houver, usar o telegramUsername salvo na conta.
        let tipster = (tipsterFromCaption || normalizedData.tipster || '').trim();
        if (!tipster) {
          const fullName = (user.nomeCompleto || '').trim();
          if (fullName) {
            tipster = fullName.split(' ')[0] || fullName;
          } else {
            const userTelegramUsername = (user.telegramUsername || '').trim();
            if (userTelegramUsername) {
              tipster = userTelegramUsername;
            }
          }
        }

        const esporte = normalizedData.esporte || 'Outros';
        const mercadoNormalizado = normalizeTextSegments(normalizedData.mercado);
        const apostaNormalizada = normalizeTextSegments(normalizedData.aposta);

        const jogoBase = normalizedData.jogo || message.caption || 'Aposta importada pelo Telegram';

        const jogoDerivado = deriveEventName({
          normalizedGame: normalizedData.jogo,
          apostaText: apostaNormalizada,
          mercadoText: mercadoNormalizado,
          caption: message.caption
        });

        const jogo = !normalizedData.jogo || !isLikelyEventName(normalizedData.jogo)
          ? (jogoDerivado || jogoBase)
          : normalizedData.jogo;
        const dataJogo = normalizedData.dataJogo ? new Date(normalizedData.dataJogo) : new Date();

        // A partir de agora, NUNCA derivamos mercado do texto de aposta.
        // O valor salvo em mercadoParaSalvar é exatamente o que veio do
        // bilhete-tracker (ou "N/D" se estiver vazio).
        const mercadoParaSalvar = mercadoNormalizado || 'N/D';

        // Se o usuário informou na legenda (terceira linha), buscar a banca pelo nome
        let bancaParaUsar = bancaPadrao;
        if (bancaSelecionadaNome) {
          const bancaSelecionada = user.bancas.find(
            (b: Bankroll) => b.nome.toLowerCase() === bancaSelecionadaNome.toLowerCase()
          );
          if (bancaSelecionada) {
            bancaParaUsar = bancaSelecionada;
          }
        }

        const novaAposta = await prisma.bet.create({
          data: {
            bancaId: bancaParaUsar.id,
            esporte,
            jogo,
            torneio: normalizedData.torneio || null,
            pais: normalizedData.pais || null,
            mercado: mercadoParaSalvar,
            tipoAposta: normalizedData.tipoAposta || 'Simples',
            valorApostado: normalizedData.valorApostado || 0,
            odd: normalizedData.odd || 1,
            bonus: 0,
            dataJogo,
            tipster: tipster || null,
            status: normalizedData.status || 'Pendente',
            casaDeAposta,
            aposta: apostaNormalizada,
            retornoObtido:
              normalizedData.status === 'Ganha'
                ? (normalizedData.valorApostado || 0) * (normalizedData.odd || 1)
                : null
          }
        });

        emitBetEvent({
          userId: user.id,
          type: 'created',
          payload: { betId: novaAposta.id, source: 'telegram' }
        });

        const apostaCompleta = await prisma.bet.findUnique({
          where: { id: novaAposta.id }
        });

        log.info(
          {
            betId: novaAposta.id,
            apostaCompletaFound: !!apostaCompleta,
            processingMessageId
          },
          'Aposta criada, preparando para enviar mensagem de resposta'
        );

        let mensagemEnviadaComSucesso = false;
        let reaproveitouMensagemDeProcessamento = false;
        try {
          if (apostaCompleta) {
            let keyboard: any;
            try {
              keyboard = createBetInlineKeyboard(apostaCompleta.id);
            } catch (keyboardError) {
              log.error({ error: keyboardError, betId: apostaCompleta.id }, 'Erro ao criar keyboard');
              keyboard = {
                inline_keyboard: [
                  [
                    { text: '✏️ Editar', callback_data: `editar_${apostaCompleta.id}` },
                    { text: '🗑️ Excluir', callback_data: `excluir_${apostaCompleta.id}` }
                  ],
                  [{ text: '📚 Alterar Status', callback_data: `alterar_status_${apostaCompleta.id}` }]
                ]
              };
            }

            if (
              !keyboard ||
              !keyboard.inline_keyboard ||
              !Array.isArray(keyboard.inline_keyboard) ||
              keyboard.inline_keyboard.length === 0
            ) {
              log.error({ betId: apostaCompleta.id, keyboard }, 'Keyboard vazio ou inválido ao criar botões');
              keyboard = {
                inline_keyboard: [
                  [
                    { text: '✏️ Editar', callback_data: `editar_${apostaCompleta.id}` },
                    { text: '🗑️ Excluir', callback_data: `excluir_${apostaCompleta.id}` }
                  ],
                  [{ text: '📚 Alterar Status', callback_data: `alterar_status_${apostaCompleta.id}` }]
                ]
              };
            }

            let mensagemFormatada: string;
            try {
              mensagemFormatada = formatBetMessage(apostaCompleta, bancaParaUsar);
            } catch (formatError) {
              log.error(formatError, 'Erro ao formatar mensagem, usando fallback');
              const esporteFallback =
                normalizarEsporteParaOpcao(apostaCompleta.esporte || '') || apostaCompleta.esporte || 'N/D';
              mensagemFormatada = `✅ Bilhete processado com sucesso!

🆔 ID: ${apostaCompleta.id}
💰 Banca: ${bancaParaUsar.nome}
${apostaCompleta.status === 'Ganha' ? '✅' : apostaCompleta.status === 'Perdida' ? '❌' : '⏳'} Status: ${
                apostaCompleta.status || 'Pendente'
              }
💎 ${
                apostaCompleta.status === 'Ganha' && apostaCompleta.retornoObtido
                  ? `Lucro: R$ ${(apostaCompleta.retornoObtido - (apostaCompleta.valorApostado || 0))
                      .toFixed(2)
                      .replace('.', ',')}`
                  : apostaCompleta.status === 'Perdida'
                    ? `Prejuízo: R$ ${(apostaCompleta.valorApostado || 0).toFixed(2).replace('.', ',')}`
                    : 'Sem lucro ou prejuízo.'
              }
🏀 Esporte: ${esporteFallback}
🏆 Torneio: ${apostaCompleta.torneio || 'N/D'}
⚔️ Evento: ${apostaCompleta.jogo || 'N/D'}
🎰 Aposta: ${apostaCompleta.jogo || 'N/D'}${
                apostaCompleta.mercado && apostaCompleta.mercado !== 'N/D'
                  ? ` - ${apostaCompleta.mercado}`
                  : ''
              }
💰 Valor Apostado: R$ ${(apostaCompleta.valorApostado || 0).toFixed(2).replace('.', ',')}
🎲 Odd: ${apostaCompleta.odd || 1}
💵 Retorno Potencial: R$ ${
                ((apostaCompleta.valorApostado || 0) * (apostaCompleta.odd || 1)).toFixed(2).replace('.', ',')
              }
📄 Tipo: ${apostaCompleta.tipoAposta || 'Simples'}
📅 Data: ${apostaCompleta.dataJogo ? new Date(apostaCompleta.dataJogo).toLocaleDateString('pt-BR') : 'N/D'}
🎁 Bônus: ${(apostaCompleta.bonus || 0) > 0 ? `R$ ${apostaCompleta.bonus.toFixed(2).replace('.', ',')}` : 'Não'}
🏠 Casa: ${apostaCompleta.casaDeAposta || 'N/D'}
👤 Tipster: ${apostaCompleta.tipster || 'N/D'}`;
            }

            if (mensagemFormatada.length > 4096) {
              log.warn({ messageLength: mensagemFormatada.length, betId: apostaCompleta.id }, 'Mensagem longa, truncando');
              mensagemFormatada = mensagemFormatada.substring(0, 4000) + '\n\n... (mensagem truncada)';
            }

            let result = await sendTelegramMessage(message.chat.id, mensagemFormatada, keyboard, message.message_id);

            if (!result || !result.ok) {
              log.error({ betId: apostaCompleta.id, result }, 'Falha ao enviar mensagem com botões, tentando novamente');
              await new Promise((resolve) => setTimeout(resolve, 1000));
              result = await sendTelegramMessage(message.chat.id, mensagemFormatada, keyboard, message.message_id);

              if (!result || !result.ok) {
                const resultWithoutButtons = await sendTelegramMessage(
                  message.chat.id,
                  mensagemFormatada,
                  undefined,
                  message.message_id
                );
                if (resultWithoutButtons?.ok) {
                  mensagemEnviadaComSucesso = true;
                }
              } else {
                mensagemEnviadaComSucesso = true;
                if (result.result?.message_id) {
                  try {
                    const updatedKeyboard = createBetInlineKeyboard(
                      apostaCompleta.id,
                      result.result.message_id,
                      message.chat.id
                    );
                    await editMessageText(
                      message.chat.id,
                      result.result.message_id,
                      mensagemFormatada,
                      updatedKeyboard
                    );
                  } catch (error) {
                    log.warn({ error, betId: apostaCompleta.id }, 'Erro ao atualizar teclado após resend');
                  }
                }
              }
            } else {
              mensagemEnviadaComSucesso = true;
              if (result.result?.message_id) {
                try {
                  const updatedKeyboard = createBetInlineKeyboard(
                    apostaCompleta.id,
                    result.result.message_id,
                    message.chat.id
                  );
                  await editMessageText(
                    message.chat.id,
                    result.result.message_id,
                    mensagemFormatada,
                    updatedKeyboard
                  );
                } catch (error) {
                  log.warn({ error, betId: apostaCompleta.id }, 'Erro ao atualizar teclado após envio');
                }
              }
            }
          } else {
            log.warn({ betId: novaAposta.id }, 'Aposta completa não encontrada após criação');
            const result = await sendTelegramMessage(
              message.chat.id,
              '✅ Aposta registrada com sucesso no sistema.',
              undefined,
              message.message_id
            );
            if (result && result.ok) {
              mensagemEnviadaComSucesso = true;
            }
          }
        } catch (messageError) {
          log.error(messageError, 'Erro ao enviar mensagem de resposta no Telegram');
          try {
            const result = await sendTelegramMessage(
              message.chat.id,
              `✅ Bilhete processado e registrado no sistema com sucesso!\n\n🆔 ID: ${novaAposta.id}`,
              undefined,
              message.message_id
            );
            if (result && result.ok) {
              mensagemEnviadaComSucesso = true;
            }
          } catch (fallbackError) {
            log.error(fallbackError, 'Falha ao enviar mensagem de fallback');
          }
        }

        const fallbackSimpleMessage = `✅ Bilhete registrado com sucesso!\n\n🆔 ID: ${novaAposta.id}\n💰 Banca: ${bancaParaUsar.nome}\nConsulte o painel para ver os detalhes completos.`;

        if (!mensagemEnviadaComSucesso) {
          const fallbackResult = await sendTelegramMessage(message.chat.id, fallbackSimpleMessage);
          if (fallbackResult?.ok) {
            mensagemEnviadaComSucesso = true;
          }
        }

        if (!mensagemEnviadaComSucesso && processingMessageId) {
          try {
            let keyboardParaProcessamento: any | undefined;
            try {
              keyboardParaProcessamento = createBetInlineKeyboard(novaAposta.id, processingMessageId, message.chat.id);
            } catch (keyboardError) {
              log.warn({ keyboardError, betId: novaAposta.id }, 'Erro ao criar keyboard ao reutilizar mensagem de processamento');
              keyboardParaProcessamento = undefined;
            }

            await editMessageText(
              message.chat.id,
              processingMessageId,
              fallbackSimpleMessage,
              keyboardParaProcessamento
            );
            mensagemEnviadaComSucesso = true;
            reaproveitouMensagemDeProcessamento = true;
          } catch (editError) {
            log.warn({ editError, processingMessageId, betId: novaAposta.id }, 'Falha ao editar mensagem de processamento com fallback');
            try {
              await editMessageText(message.chat.id, processingMessageId, fallbackSimpleMessage);
              mensagemEnviadaComSucesso = true;
              reaproveitouMensagemDeProcessamento = true;
            } catch (secondEditError) {
              log.error({ secondEditError, processingMessageId, betId: novaAposta.id }, 'Falha final ao atualizar mensagem de processamento');
            }
          }
        }

        if (processingMessageId && mensagemEnviadaComSucesso) {
          if (reaproveitouMensagemDeProcessamento) {
            log.info(
              { processingMessageId },
              'Mantendo mensagem de processamento como resposta final após reaproveitamento'
            );
          } else {
            log.info({ processingMessageId }, 'Deletando mensagem de processando após envio bem-sucedido');
            try {
              await deleteMessage(message.chat.id, processingMessageId);
            } catch (deleteError) {
              log.error(deleteError, 'Erro ao deletar mensagem de processando');
            }
          }
        } else if (processingMessageId) {
          try {
            await editMessageText(
              message.chat.id,
              processingMessageId,
              '⚠️ Bilhete registrado, mas não consegui enviar o resumo completo. Verifique no painel para todos os detalhes.'
            );
          } catch (editarAvisoErro) {
            log.warn(
              { editarAvisoErro, processingMessageId },
              'Falha ao atualizar mensagem de processamento com aviso de erro'
            );
          }
          log.warn(
            {
              processingMessageId,
              mensagemEnviadaComSucesso
            },
            'Mantendo mensagem de processando pois a mensagem final não foi enviada'
          );
        }
      } catch (backgroundError) {
        log.error(backgroundError, 'Erro inesperado ao processar bilhete em background');
      }
    };

    processTicketInBackground().catch((error) => {
      log.error({ error }, 'Promise rejeitada ao processar bilhete em background');
    });

    return res.json({ ok: true });
  } catch (error) {
    log.error(error, 'Erro no webhook do Telegram');
    res.status(500).json({ ok: false });
  }
});

// POST /api/telegram/update-bet-message/:betId - Atualizar mensagem do Telegram quando uma aposta é editada
router.post('/update-bet-message/:betId', betUpdateRateLimiter, async (req, res) => {
  try {
    const { betId } = req.params;
    const { messageId, chatId } = req.body;
    
    // Buscar a aposta com todos os dados necessários
    const aposta = await prisma.bet.findUnique({
      where: { id: betId },
      include: {
        banca: {
          include: {
            usuario: {
              select: {
                telegramId: true
              }
            }
          }
        }
      }
    });

    if (!aposta) {
      return res.status(404).json({ error: 'Aposta não encontrada' });
    }

    const telegramId = aposta.banca.usuario.telegramId;
    if (!telegramId) {
      return res.status(200).json({ message: 'Usuário não tem Telegram vinculado' });
    }

    // Formatar a mensagem atualizada
    const mensagemAtualizada = formatBetMessage(aposta, aposta.banca);
    
    // Incluir messageId e chatId no keyboard se disponíveis
    let keyboard;
    if (messageId && chatId) {
      const chatIdNum = typeof chatId === 'string' ? Number.parseInt(chatId) : chatId;
      const messageIdNum = typeof messageId === 'string' ? Number.parseInt(messageId) : messageId;
      keyboard = createBetInlineKeyboard(aposta.id, messageIdNum, chatIdNum);
    } else {
      keyboard = createBetInlineKeyboard(aposta.id);
    }

    // Verificar se a mensagem não excede o limite do Telegram (4096 caracteres)
    let mensagemFinal = mensagemAtualizada;
    if (mensagemAtualizada.length > 4096) {
      log.warn({ 
        messageLength: mensagemAtualizada.length,
        betId: aposta.id 
      }, 'Mensagem muito longa para o Telegram, truncando...');
      mensagemFinal = mensagemAtualizada.substring(0, 4000) + '\n\n... (mensagem truncada)';
    }

    // Se messageId e chatId foram fornecidos, atualizar a mensagem
    if (messageId && chatId) {
      const chatIdNum = typeof chatId === 'string' ? Number.parseInt(chatId) : chatId;
      const messageIdNum = typeof messageId === 'string' ? Number.parseInt(messageId) : messageId;
      
      await editMessageText(chatIdNum, messageIdNum, mensagemFinal, keyboard);
      
      log.info({ 
        betId: aposta.id,
        chatId: chatIdNum,
        messageId: messageIdNum
      }, 'Mensagem do Telegram atualizada com sucesso');

      return res.json({ 
        success: true,
        message: 'Mensagem do Telegram atualizada com sucesso'
      });
    }

    // Se não tiver messageId e chatId, apenas retornar a mensagem formatada
    res.json({ 
      message: 'Mensagem formatada, mas messageId e chatId não foram fornecidos',
      formattedMessage: mensagemFinal.substring(0, 200) + '...',
      note: 'Para atualizar a mensagem no Telegram, forneça messageId e chatId no body da requisição'
    });
  } catch (error) {
    log.error(error, 'Erro ao atualizar mensagem do Telegram');
    res.status(500).json({ error: 'Erro ao atualizar mensagem' });
  }
});

// Webhook separado para o bot de suporte
router.post('/webhook-support', async (req, res) => {
  try {
    // Verificar secret token se configurado
    if (process.env.TELEGRAM_SUPPORT_WEBHOOK_SECRET) {
      const secret = req.headers['x-telegram-bot-api-secret-token'] || 
                     req.headers['X-Telegram-Bot-Api-Secret-Token'];
      
      if (!secret || (typeof secret !== 'string' || secret !== process.env.TELEGRAM_SUPPORT_WEBHOOK_SECRET)) {
        log.warn({ hasSecret: !!secret }, 'Webhook de suporte chamado com secret token inválido');
        return res.status(403).json({ error: 'Secret token inválido' });
      }
    }

    const update = req.body;
    
    log.debug({
      hasCallbackQuery: !!update.callback_query,
      hasMessage: !!update.message,
      updateType: update.callback_query ? 'callback_query' : update.message ? 'message' : 'unknown'
    }, 'Webhook de suporte recebido');

    // Responder imediatamente ao Telegram
    res.json({ ok: true });

    // Processar mensagens
    if (update.message) {
      const message = update.message;
      const telegramUserId = String(message.from?.id);
      
      if (!telegramUserId) {
        log.warn({ message: 'Sem telegramUserId' }, 'Mensagem de suporte sem userId');
        return;
      }

      // Processar comando /start para suporte
      if (message.text && message.text.startsWith('/start')) {
        const parts = message.text.split(' ');
        const param = parts.length > 1 ? parts[1] : null;

        // Verificar se é uma chamada de suporte
        if (param && param.startsWith('support_')) {
          const accountId = param.replace('support_', '');
          
          // Verificar se a conta existe
          const account = await prisma.user.findUnique({
            where: { id: accountId }
          });

          if (!account) {
            await sendTelegramMessage(message.chat.id, '❌ Conta não encontrada.', true);
            return;
          }

          // Extrair primeiro nome (apelido)
          const firstName = account.nomeCompleto.split(' ')[0] || account.nomeCompleto;

          // Verificar se o Telegram do usuário está vinculado à conta
          const user = await prisma.user.findFirst({
            where: {
              telegramId: telegramUserId,
              id: accountId
            }
          });

          if (user) {
            // Usuário vinculado - enviar mensagem de boas-vindas personalizada
            await sendTelegramMessage(message.chat.id, `Olá, ${firstName}! 👋\n\nBem-vindo ao suporte!\nComo posso ajudar?`, undefined, undefined, true);
          } else {
            // Usuário não vinculado - pedir para vincular
            await sendTelegramMessage(message.chat.id, `Olá, ${firstName}! 👋\n\nBem-vindo ao suporte!\nComo posso ajudar?\n\n⚠️ Para um atendimento mais personalizado, vincule sua conta do Telegram no perfil do sistema.`, undefined, undefined, true);
          }
          
          return;
        }
      }

      // Se não for comando /start support_, apenas enviar mensagem genérica
      if (message.text && message.text.startsWith('/start')) {
        await sendTelegramMessage(message.chat.id, 'Olá! 👋\n\nBem-vindo ao suporte!\nComo posso ajudar?', undefined, undefined, true);
        return;
      }

      // Para outras mensagens, apenas logar (pode ser expandido para processar mensagens de suporte)
      log.info({ 
        chatId: message.chat.id, 
        text: message.text?.substring(0, 100) 
      }, 'Mensagem recebida no bot de suporte');
    }
  } catch (error) {
    log.error(error, 'Erro no webhook de suporte do Telegram');
    // Já respondemos ao Telegram, então apenas logar o erro
  }
});

export default router;

