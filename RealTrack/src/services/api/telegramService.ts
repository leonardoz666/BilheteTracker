/**
 * Serviço de Telegram
 * 
 * Gerencia operações relacionadas ao Telegram WebApp
 */

import { apiClient } from './apiClient';

// ============================================
// Tipos
// ============================================

export interface TelegramUpdateResponse {
  success: boolean;
  error?: string;
}

// ============================================
// Funções
// ============================================

/**
 * Atualiza mensagem de aposta no Telegram
 */
const updateBetMessage = async (
  betId: string,
  messageId: string,
  chatId: string
): Promise<TelegramUpdateResponse> => {
  const response = await apiClient.post<TelegramUpdateResponse>(
    `/telegram/update-bet-message/${betId}`,
    { messageId, chatId }
  );
  return response.data;
};

// ============================================
// Exports
// ============================================

export const telegramService = {
  updateBetMessage,
};

export default telegramService;
