/**
 * Period Parser - Detecção e normalização de períodos de apostas
 * 
 * Extrai lógica de períodos para módulo independente e testável.
 * Suporta: Futebol (1º/2º Tempo, HT, FT), Basquete (Quartos), NFL, etc.
 */

import { PeriodoAposta } from "../../schema/bilhete.schema";

/**
 * Detecta período em uma linha de texto
 * Retorna null se não encontrar período
 */
export function detectPeriodo(line: string): PeriodoAposta {
  const t = line.toLowerCase();

  if (/1[º°]\s*quarto/.test(t)) return "1º Quarto";
  if (/2[º°]\s*quarto/.test(t)) return "2º Quarto";
  if (/1[º°]\s*tempo|1st\s*half/.test(t)) return "1º Tempo";
  if (/2[º°]\s*tempo|2nd\s*half/.test(t)) return "2º Tempo";
  if (/intervalo|half\s*time|\bht\b/.test(t)) return "1º Tempo";
  if (/jogo|ft|full\s*time/.test(t)) return "Jogo";

  return null;
}

/**
 * Detecta período a partir do contexto (linha atual e vizinhas)
 */
export function detectPeriodoFromContext(lines: string[], index: number): PeriodoAposta {
  return (
    detectPeriodo(lines[index] ?? "") ||
    detectPeriodo(lines[index - 1] ?? "") ||
    detectPeriodo(lines[index + 1] ?? "") ||
    null
  );
}

/**
 * Busca período global no conjunto de linhas
 */
export function getGlobalPeriodo(lines: string[]): PeriodoAposta {
  for (let i = 0; i < lines.length; i++) {
    const p = detectPeriodo(lines[i] ?? "");
    if (p) return p;
  }
  return null;
}

/**
 * Detecta se linha contém APENAS um período (sem aposta)
 * Útil para identificar períodos órfãos que devem ser mesclados
 */
export function isOrphanPeriod(line: string): boolean {
  const trimmed = line.trim();
  
  // Padrões de período completo
  if (/^(1º|2º|3º|4º)\s*(Quarto|Tempo|Período)$/i.test(trimmed)) return true;
  if (/^(HT|FT|Q[1-4]|1T|2T)$/i.test(trimmed)) return true;
  if (/^Intervalo$/i.test(trimmed)) return true;
  if (/^Jogo$/i.test(trimmed)) return true;
  
  return false;
}

/**
 * Mescla linhas de período órfãs com a próxima linha de aposta
 * Exemplo: ["HT", "Nikola Jokic - Rebotes 1+"] → ["HT - Nikola Jokic - Rebotes 1+"]
 */
export function mergeOrphanPeriods(lines: string[]): string[] {
  const result: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const current = lines[i].trim();
    const next = i + 1 < lines.length ? lines[i + 1].trim() : null;
    
    // Se linha atual é período órfão E existe próxima linha
    if (isOrphanPeriod(current) && next) {
      // Mescla: "HT" + "Jokic - Rebotes 1+" → "HT - Jokic - Rebotes 1+"
      result.push(`${current} - ${next}`);
      i++; // Pula próxima linha (já foi mesclada)
    } else {
      result.push(current);
    }
  }
  
  return result;
}

/**
 * Mapa de normalização de períodos
 * Converte abreviações para formato canônico
 */
export const PERIODO_NORMALIZATION_MAP: Record<string, string> = {
  'ht': '1º Tempo',
  '1t': '1º Tempo',
  'ft': 'Jogo',
  'q1': '1º Quarto',
  'q2': '2º Quarto',
  'q3': '3º Quarto',
  'q4': '4º Quarto',
  'jogo': 'Jogo',
  'intervalo': '1º Tempo',
};

/**
 * Normaliza período bruto para formato canônico
 */
export function normalizePeriodo(periodoRaw: string | null): PeriodoAposta {
  if (!periodoRaw) return null;
  
  const lower = periodoRaw.toLowerCase().trim();
  return (PERIODO_NORMALIZATION_MAP[lower] as PeriodoAposta) || (periodoRaw as PeriodoAposta);
}
