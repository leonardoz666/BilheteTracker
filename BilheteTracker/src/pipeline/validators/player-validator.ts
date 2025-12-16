/**
 * Validators - Funções de validação de apostas
 * 
 * Valida se dados extraídos são válidos e consistentes.
 */

import { normalizeEstatistica } from "../normalizers/stat-normalizer";

/**
 * Blacklist de palavras de UI que NUNCA podem ser consideradas jogador
 */
export const UI_BLACKLIST = [
  "Minhas Apostas",
  "Seleções",
  "Aposta",
  "Reutilizar",
  "Ao-Vivo",
  "Ao Vivo",
  "Em Aberto",
  "Mega Cota",
  "Mega Cotações",
  "Cota",
  "Cotações",
  "Criar Aposta",
  "Boost",
  "Assistências",
  "Rebotes",
  "Cestas",
  "Pontos",
  "Chutes",
  "Passes",
  "Defesas",
  "Handicap",
  "Handicap Asiático",
  "Dupla Chance",
  "Empate Anula",
  "Ambas Marcam",
  "Jogador", // Placeholder genérico inválido
];

/**
 * Valida se nome extraído é válido (não está na blacklist)
 */
export function isValidPlayerName(name: string): boolean {
  if (!name || name.length < 3) return false;

  // Verifica blacklist (case-insensitive, palavra completa)
  const nameLower = name.toLowerCase().trim();
  for (const blocked of UI_BLACKLIST) {
    const blockedLower = blocked.toLowerCase();
    // Verifica se é a palavra completa (não substring)
    // Ex: "Gols" bloqueia "Gols" mas não "Total Gols"
    if (nameLower === blockedLower || 
        nameLower.startsWith(blockedLower + ' ') ||
        nameLower.endsWith(' ' + blockedLower) ||
        nameLower.includes(' ' + blockedLower + ' ')) {
      return false;
    }
  }

  return true;
}

/**
 * Valida se a string contém uma estatística válida (usa forma canônica)
 */
export function isValidEstatistica(text: string): boolean {
  if (!text || text.length < 3) return false;

  // ❌ Não pode ter número ou condição explícita
  if (/\d/.test(text)) return false;
  if (/(mais|menos|\+)/i.test(text)) return false;

  const PROPER_NAME_REGEX = /\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})*/;
  
  // ❌ Não pode conter apenas nome de jogador
  const onlyPlayerName = PROPER_NAME_REGEX.exec(text);
  if (onlyPlayerName && onlyPlayerName[0].trim().length === text.trim().length) {
    return false;
  }

  // ✅ Reconhece apenas estatísticas canônicas
  return normalizeEstatistica(text) !== null;
}

/**
 * Extrai nome de jogador de uma linha (se válido e não blacklisted)
 */
export function extractPlayerName(line: string): string | null {
  const PLAYER_NAME_REGEX = /\b[A-Z][a-z]+\s[A-Z][a-z]+\b/;
  const match = line.match(PLAYER_NAME_REGEX);
  if (!match) return null;
  const name = match[0];
  return isValidPlayerName(name) ? name : null;
}
