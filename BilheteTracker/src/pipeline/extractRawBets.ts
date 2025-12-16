// Etapa 2.5: Extração de linhas de apostas brutas
//
// Responsável por filtrar, a partir das linhas já normalizadas e
// sem metadados explícitos, APENAS as linhas que representam
// efetivamente apostas esportivas. Nenhum dado numérico financeiro
// (odds, valores, retornos) é retornado aqui.

// Reaproveitamos a mesma definição de "linha que é somente odd" que
// antes estava em normalizeOcr. Aqui é o lugar certo para aplicar
// esse filtro, pois estamos especificamente escolhendo apenas
// descrições de aposta, não limpando o texto bruto do OCR.
const ODDS_ONLY_REGEX = /^[@\s]*\d{1,2}[,.]\d{1,2}\s*$/;
const NOISE_REGEX = /^(aposta|cotação total|ganho potencial)/i;

export function isLikelyBetLine(line: string): boolean {
  const l = line.toLowerCase();

  // Linhas muito curtas raramente são apostas completas.
  if (l.length < 8) return false;

  // Linhas que são apenas odds isoladas (ex.: "1.85", "@ 2.05")
  // não carregam, sozinhas, informação semântica de mercado.
  if (ODDS_ONLY_REGEX.test(line.trim())) return false;

  // Remove ruído OCR comum
  if (NOISE_REGEX.test(line.trim())) return false;

  // Evita linhas cheias de símbolos monetários.
  if (/r\$|usd|eur/.test(l)) return false;

  // Palavras-chave típicas de mercados de apostas.
  const KEYWORDS = [
    "jogador",
    "gols",
    "gol",
    "escanteios",
    "cantos",
    "cartões",
    "cartoes",
    "resultado",
    "handicap",
    "ambas marcam",
    "mais de",
    "menos de",
    "over",
    "under",
    "linha",
  ];

  if (KEYWORDS.some((k) => l.includes(k))) return true;

  // Setas, flechas ou separadores costumam indicar estrutura de aposta
  // do tipo "Jogador ressaltos → Nome 7+". O hífen é colocado na
  // extremidade do character class para não formar range inválido.
  if (/[-→>]/.test(line)) return true;

  return false;
}

export function extractRawBets(lines: string[]): string[] {
  return lines.filter((line) => isLikelyBetLine(line));
}
