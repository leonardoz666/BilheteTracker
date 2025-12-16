/**
 * Normalizers - Funções de normalização de dados de apostas
 * 
 * Converte dados brutos para formato canônico padronizado.
 */

const condicaoCache = new Map<string, string | null>();

/**
 * Normaliza valor decimal em condições (ex: "Mais de 25" → "Mais de 2.5")
 * Aplica regra: inteiros de 2 dígitos (10-99) sem decimal são divididos por 10
 */
export function normalizeCondicao(condicao: string | null): string | null {
  if (!condicao) return null;

  if (condicaoCache.has(condicao)) {
    return condicaoCache.get(condicao) ?? null;
  }
  
  const match = condicao.match(/(Mais de|Menos de)\s+(\d+(?:[.,]\d+)?)/i);
  if (!match) {
    condicaoCache.set(condicao, condicao);
    return condicao;
  }
  
  const [, operador, numeroBruto] = match;
  let valor = parseFloat(numeroBruto.replace(",", "."));
  
  // Se já tem decimal, mantém como está
  if (numeroBruto.includes(",") || numeroBruto.includes(".")) {
    const result = Number.isFinite(valor) ? `${operador} ${valor}` : condicao;
    condicaoCache.set(condicao, result);
    return result;
  }
  
  // Se é inteiro de 2 dígitos (10-99) sem decimal, adiciona .5
  // Exemplos comuns: 15 → 1.5, 25 → 2.5, 35 → 3.5, 45 → 4.5
  if (Number.isInteger(valor) && valor >= 10 && valor <= 99) {
    valor = valor / 10;
  }
  
  const result = Number.isFinite(valor) ? `${operador} ${valor}` : condicao;
  condicaoCache.set(condicao, result);
  return result;
}

/**
 * Normaliza estatística para forma canônica
 * Retorna null se não reconhecer
 */
const estatisticaCache = new Map<string, string | null>();

type EstatisticaMatcher = { regex: RegExp; value: string };

const ESTATISTICA_MATCHERS: EstatisticaMatcher[] = [
  // 🏀 Basketball / NBA
  { regex: /3\s*pontos|3pt/i, value: "Cestas de 3 Pontos" },
  { regex: /cestas/i, value: "Cestas" },
  { regex: /rebotes/i, value: "Rebotes" },
  { regex: /assist/i, value: "Assistências" },
  { regex: /finaliza/i, value: "Finalizações" },
  { regex: /bloqueios?|tocos?/i, value: "Bloqueios" },

  // 🏈 NFL (Football Americano)
  { regex: /recepções?|recepçã|reception/i, value: "Recepções" },
  { regex: /touchdowns?|TD/i, value: "Touchdowns" },
  { regex: /yards?/i, value: "Yards" },
  { regex: /sacks?/i, value: "Sacks" },
  { regex: /intercepções?|intercept/i, value: "Interceptações" },
  { regex: /fumbles?/i, value: "Fumbles" },

  // ⚽ Football / Soccer
  { regex: /gols?/i, value: "Gols" },
  { regex: /chutes?/i, value: "Chutes" },
  { regex: /passes?/i, value: "Passes" },
  { regex: /defesas?/i, value: "Defesas" },
  { regex: /intercepta[çc][õo]es?/i, value: "Interceptações" },
  { regex: /roubos?/i, value: "Roubos de Bola" },
];

export function normalizeEstatistica(text: string): string | null {
  if (estatisticaCache.has(text)) {
    return estatisticaCache.get(text) ?? null;
  }

  const matched = ESTATISTICA_MATCHERS.find(({ regex }) => regex.test(text));
  if (matched) {
    estatisticaCache.set(text, matched.value);
    return matched.value;
  }

  estatisticaCache.set(text, null);
  return null;
}

/**
 * Limpa estatística removendo: time, hífens, operadores de condição, espaços duplicados
 */
export function cleanEstatistica(text: string): string {
  return text
    .replace(/\([A-Z]{2,4}\)/g, "")                      // remove (GSW)
    .replace(/\s+(Mais de|Menos de)\s*/gi, "")          // remove " Mais de" ou " Menos de" (espaço ANTES é obrigatório)
    .replace(/\b\d+(?:[.,]\d+)?\+/g, "")                // remove "10+", "3.5+"
    .replace(/[-–—]/g, " ")                             // remove hífens/traços
    .replace(/\s+/g, " ")                               // remove espaços duplicados
    .trim();
}

/**
 * Remove estatística completa da linha para isolar o nome do jogador
 */
export function stripEstatistica(line: string): string {
  const HAS_CONDICAO_REGEX = /((Mais de|Menos de)\s+\d+(?:[.,]\d+)?|\b\d+(?:[.,]\d+)?\+)/i;
  const HAS_ESTATISTICA_REGEX = /(Cestas|Pontos|Rebotes|Assist[eê]ncias|Gols|Finaliza[çc][õo]es|Chutes?|Passes?|Defesas?|Intercepta[çc][õo]es|Roubos?|Bloqueios?|Tocos?|Triplo[- ]Duplo|Duplo[- ]Duplo|3PT|FG|FT|Recepções?|Touchdowns?|Yards?|Sacks?|Fumbles?)/i;
  
  // Remove condição (ex: "Mais de 1")
  let cleaned = line.replace(HAS_CONDICAO_REGEX, "").trim();
  
  // Remove estatística (ex: "Rebotes", "Cestas de 3 Pontos")
  cleaned = cleaned.replace(HAS_ESTATISTICA_REGEX, "").trim();
  
  // Remove números que NÃO fazem parte de período (ex: "1 Rebotes" → remove, "1º Quarto" → preserva)
  cleaned = cleaned.replace(/\b\d+(?![ºª])\b/g, "").trim();
  
  // Remove abreviações de times (ex: (GSW))
  cleaned = cleaned.replace(/\([A-Z]{2,4}\)/g, "").trim();
  
  // Remove palavras de período que não são parte do nome (Intervalo, HT, FT, Jogo, Quarto, Tempo)
  cleaned = cleaned.replace(/\b(?:Intervalo|HT|FT|Jogo|Partida|Quarto|Tempo|Período|Metade|Half|Time|Full)\b/gi, "").trim();
  
  // Remove hífens extras e múltiplos espaços
  cleaned = cleaned.replace(/\s*-\s*/g, " ").replace(/\s+/g, " ").trim();
  
  return cleaned;
}
