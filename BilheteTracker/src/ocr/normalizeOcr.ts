// Etapa 1: Normalização de OCR
//
// Responsabilidades:
// - Receber ParsedText (principal) ou Overlay.Lines (fallback)
// - Retornar um array de linhas limpas
// - Remover botões e textos institucionais evidentes
// - NÃO interpretar significado, NÃO criar apostas e NÃO remover
//   informações semânticas como odds, valores ou retornos.

import {
  NormalizationInput,
  NormalizedOcr,
  OcrSpaceParsedResult,
} from "../schema/bilhete.schema";

const BUTTON_KEYWORDS = [
  "compartilhar",
  "encerrar",
  "cash out",
  "saque",
  "voltar",
  "imprimir",
  "fechar",
];

const INSTITUTIONAL_PATTERNS = [
  /jogue com responsabilidade/i,
  /proibido para menores/i,
  /termos e condiç/i,
  /central de atendimento/i,
  /copyright/i,
  /direitos reservados/i,
  /atendimento ao cliente/i,
];

function isButtonLine(line: string): boolean {
  const lower = line.toLowerCase();
  return BUTTON_KEYWORDS.some((kw) => lower.includes(kw));
}

function isInstitutionalLine(line: string): boolean {
  return INSTITUTIONAL_PATTERNS.some((re) => re.test(line));
}

// 🚫 Detecta labels de UI isolados (estatística ou período sozinhos)
// Esses vêm do BackTrack como linhas separadas das apostas
// Ex: "Assistências", "Rebotes", "1º Quarto" aparecendo sozinhos
// Ou padrão "Período - Estatística" (sem jogador) como "1º Quarto - Rebotes"
function isUILabelLine(line: string): boolean {
  const uiLabels = [
    // Estatísticas (labels de UI)
    "Assistências",
    "Rebotes",
    "Pontos",
    "Gols",
    "Chutes",
    "Cartões",
    "Escanteios",
    "Passes",
    "Defesas",
    "Cestas",
    "Tentativas",
    "Dribles",
    "Roubadas",
    "Lance Livre",
    "Duplo-Duplo",
    "Triplo-Duplo",
    
    // Períodos (labels de UI)
    "1º Tempo",
    "2º Tempo",
    "1º Quarto",
    "2º Quarto",
    "3º Quarto",
    "4º Quarto",
    "1° Tempo",
    "2° Tempo",
    "1° Quarto",
    "2° Quarto",
    "3° Quarto",
    "4° Quarto",
    
    // Outros labels comuns do BackTrack
    "Resolvida",
    "Acompanhar",
    "Ganhos",
    "Aposta",
    "Retornos",
  ];
  
  const trimmed = line.trim();
  
  // 1. Label isolado exato (ex: "Rebotes", "Assistências")
  if (uiLabels.includes(trimmed)) {
    return true;
  }
  
  // 2. Padrão "Período - Estatística" sem jogador (ex: "1º Quarto - Rebotes")
  // Detecta se começa com período e termina com estatística
  const periodoEstatisticaPattern = /^(1º|2º|3º|4º|1°|2°|3°|4°)\s*(Tempo|Quarto)\s*-\s*(Assistências|Rebotes|Pontos|Gols|Chutes|Cartões|Escanteios|Passes|Defesas|Cestas)$/i;
  if (periodoEstatisticaPattern.test(trimmed)) {
    return true;
  }
  
  return false;
}

function baseCleanup(line: string): string {
  // Remove espaços extras e caracteres de controle
  return line.replace(/[\r\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
}

/**
 * Remove prefixos de quebra de linha do OCR (bullet points, hífens, etc)
 * Exemplos: "o Julius Randle" → "Julius Randle", "• Gols" → "Gols"
 */
function removeOcrLinePrefix(line: string): string {
  // Remove prefixos comuns: "o ", "• ", "- ", "* ", "○ ", "▪ ", etc
  return line.replace(/^[o•\-*○▪]\s+/i, "").trim();
}

/**
 * Normaliza apostas para deduplicação exata.
 * Remove prefixos, espaços extras, case-insensitive.
 */
function normalizeForDedup(line: string): string {
  return removeOcrLinePrefix(line)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Detecta se uma linha está incompleta (termina com conector).
 * Exemplos: "Cada time bate 4+ escanteios e", "Mais de 9.5", "Ambas Marcam: Sim &", "Total de"
 */
function isIncompleteLine(line: string): boolean {
  const trimmed = line.trim();
  
  // 1. Termina com conectores lógicos: "e", "ou", "&"
  if (/\b(e|ou)\s*$/i.test(trimmed) || /&\s*$/.test(trimmed)) {
    return true;
  }
  
  // 2. Termina com dois pontos (início de especificação)
  if (/:\s*$/.test(trimmed)) {
    return true;
  }
  
  // 3. Padrão "Mais/Menos de X.X" sem estatística
  // Exemplo: "Mais de 9.5" (falta "Escanteios" ou "Gols")
  if (/^(Mais|Menos)\s+(de|que)\s+\d+([.,]\d+)?$/i.test(trimmed)) {
    return true;
  }
  
  // 4. Padrão "Jogador - Condição" sem estatística
  // Exemplo: "Julius Randle - 10+" (falta "Rebotes")
  if (/^[A-Z][a-zA-Z\s]+-\s*\d+\+?\s*$/.test(trimmed)) {
    return true;
  }
  
  // 5. Termina com "ou", "e cada" (casos compostos)
  if (/\b(e\s+cada|ou\s+cada)\s*$/i.test(trimmed)) {
    return true;
  }
  
  // 6. É exatamente "Total de" sem complemento (quebrado pelo OCR)
  if (/^Total\s+de$/i.test(trimmed)) {
    return true;
  }

  // 7. Termina com "Total de" dentro de uma linha maior (ex: "Ambas Marcam ... & Total de")
  if (/Total\s+de\s*$/i.test(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Detecta se a próxima linha é continuação (complemento semântico).
 * Exemplos: "time recebe 1+ cartões", "Escanteios FT O/U", "Gols", "Rebotes", "Sim", "Empate"
 */
function isContinuationLine(line: string): boolean {
  const trimmed = line.trim();
  
  // 1. Começa com palavra minúscula (meio de frase)
  if (/^[a-z]/.test(trimmed)) {
    return true;
  }
  
  // 2. Começa com [Jogador] - padrão de estatística formatado
  // Exemplo: "[Stefon Diggs] Total de recepções"
  if (/^\[.+\]/.test(trimmed)) {
    return true;
  }
  
  // 3. É uma estatística conhecida (complemento de condição)
  const stats = [
    "Gols", "Escanteios", "Cartões", "Assistências", "Rebotes", "Pontos",
    "Chutes", "Defesas", "Passes", "Faltas", "Impedimentos", "Cestas",
    "Total de", "Recepções", "Touchdowns", "Yards"  // NFL/Sports americanos
  ];
  if (stats.some((s) => trimmed.startsWith(s))) {
    return true;
  }
  
  // 4. Contém "FT", "O/U", "H/A" (sufixos de mercado)
  if (/\b(FT|O\/U|H\/A|HT|1H|2H)\b/i.test(trimmed)) {
    return true;
  }
  
  // 4. É uma resposta binária simples (Sim, Não, Empate)
  if (/^(Sim|Não|Empate)$/i.test(trimmed)) {
    return true;
  }
  
  // 5. É um time sozinho (complemento de "ou")
  // Exemplo: "Juventus ou" + "Empate"
  if (/^[A-Z][a-zA-Z\s]*$/.test(trimmed) && trimmed.length < 30) {
    return true;
  }
  
  return false;
}

/**
 * Mescla linhas quebradas do OCR.
 * Exemplos:
 * - "Cada time bate 4+ escanteios e" + "time recebe 1+ cartões"
 * - "Mais de 9.5" + "Escanteios FT O/U"
 * - "Julius Randle - 10+" + "Rebotes"
 */
function mergeIncompleteLines(lines: string[]): string[] {
  const merged: string[] = [];
  let i = 0;
  
  while (i < lines.length) {
    const current = lines[i];
    const next = lines[i + 1];
    
    // Se linha atual está incompleta E existe próxima linha E próxima é continuação
    if (current && next && isIncompleteLine(current) && isContinuationLine(next)) {
      // Mescla com espaço
      merged.push(`${current} ${next}`.replace(/\s{2,}/g, " ").trim());
      i += 2; // Pula ambas
    } else {
      merged.push(current);
      i += 1;
    }
  }
  
  return merged;
}

/**
 * Remove odds órfãs do texto das apostas.
 * Quando há "X.X X.X" consecutivos, remove apenas odds extras (NÃO condições).
 * Ex: "Total de Gols: Mais de 3.5 2.75" → "Total de Gols: Mais de 3.5"
 * Ex: "Odd 2.75 3.45" → Mantém (linha de metadados)
 */
function cleanOrphanOdds(line: string): string {
  const lower = line.toLowerCase();
  
  // 🔒 NÃO limpa linhas de metadados (odds, retorno, valor apostado)
  const isMetadataLine = /\b(odd|cota[çc][aã]o|cota|retorno|ganho|valor\s+apostado|aposta\s*r?\$)/i.test(line);
  if (isMetadataLine) {
    return line; // Mantém intacto
  }
  
  // 🔒 NÃO limpa linhas muito curtas (provavelmente já são metadados)
  if (line.trim().length < 15) {
    return line;
  }
  
  // 🔒 NÃO limpa se termina com condição válida (ex: "Mais de 3.5", "Over 2.5")
  if (/(Mais de|Menos de|Over|Under)\s+\d{1,3}[.,]\d{1,2}$/i.test(line)) {
    // Mas AINDA remove odd órfã se houver 2 números consecutivos
    // Ex: "Mais de 3.5 2.75" → "Mais de 3.5"
    const orphanAfterCondition = /(Mais de|Menos de|Over|Under)\s+(\d{1,3}[.,]\d{1,2})\s+(\d{1,3}[.,]\d{1,2})/gi;
    return line.replace(orphanAfterCondition, (match, operador, condicao, oddOrfa) => {
      return `${operador} ${condicao}`;
    });
  }
  
  // 🆘 PRESERVA odd no final SE parece ser odd real grudada (OCR mal feito)
  // Ex: "Ambas Marcam: Sim & Total de 2.75" → MANTÉM (é odd grudada, não lixo)
  // Indicador: número entre 1.01 e 50.00 (range de odds válidas)
  const lastNumber = line.match(/(\d{1,3}[.,]\d{1,2})$/);
  if (lastNumber) {
    const val = parseFloat(lastNumber[1].replace(',', '.'));
    if (val >= 1.01 && val <= 50.00) {
      // É uma odd válida grudada - PRESERVA
      return line;
    }
  }
  
  // Remove odd isolada no final da linha apenas se não for odd válida
  const isolatedOddAtEnd = /\s+\d{1,3}[.,]\d{1,2}$/;
  return line.replace(isolatedOddAtEnd, '').trim();
}

/**
 * Quebra apostas múltiplas conectadas por "&" em linhas separadas
 * Ex: "Ambas Marcam: Sim & Total Gols: Mais de 3.5" → 2 linhas
 */
function splitMultipleBets(lines: string[]): string[] {
  const result: string[] = [];
  
  for (const line of lines) {
    // Primeiro limpa odds órfãs
    const cleaned = cleanOrphanOdds(line);
    
    // Se a linha contém "&", avalia se deve quebrar em múltiplas apostas
    if (cleaned.includes('&')) {
      const ampIndex = cleaned.indexOf('&');
      const beforeAmp = cleaned.substring(0, ampIndex);
      const colonCount = (beforeAmp.match(/:/g) || []).length;

      if (colonCount >= 1) {
        const parts = cleaned
          .split('&')
          .map(p => p.trim())
          .filter(p => p.length > 0);
        result.push(...parts);
      } else {
        result.push(cleaned);
      }
    } else {
      result.push(cleaned);
    }
  }
  
  // ✅ NOVO: Remove linhas que parecem ser fragmentos de odds órfãs
  // Ex: "Total de 2.75 3.45" (sem contexto de aposta, só números)
  // Critério: linha que começa com label de aposta mas tem APENAS números no final
  // sem padrão "Mais de/Menos de/Over/Under"
  const filtered = result.filter(line => {
    const trimmed = line.trim();
    const lower = trimmed.toLowerCase();
    const hasContextualKeywords = /mais de|menos de|over|under/.test(lower);
    const hasColon = trimmed.includes(':');
    const numbersMatches = trimmed.match(/\d+[.,]\d+/g) || [];
    
    // Se a linha é MUITO curta e é só números/odds, rejeita
    if (trimmed.length < 20) {
      // Padrão: "X.XX Y.YY" ou "Coisa X.XX Y.YY" sem contexto de aposta
      if (/^[\d.,\s]+$/.test(trimmed) || /^[^:]*\s+\d+[.,]\d+\s+\d+[.,]\d+$/.test(trimmed)) {
        // É um fragmento de odds, rejeita
        return false;
      }
    }

    // Novo: remover linhas tipo "Total de 2.75" quando não há contexto
    // Critérios: começa com "Total" (ou "Total de"), não possui ':',
    // não possui palavras de contexto e possui exatamente uma odd numérica
    if (/^total(\s+de)?\b/i.test(trimmed) && !hasColon && !hasContextualKeywords && numbersMatches.length === 1) {
      return false;
    }

    // Exceção: preservar props de jogador com uma única odd no fim
    // Heurística: contém um nome próprio (capitalização), termos de props e padrões de valor (ex.: 10+, +10)
    const hasPlayerPropKeywords = /(pontos|rebotes|assist[êe]ncias|pra|threes|blocks|steals|mais de|menos de)/i.test(lower);
    const hasValuePattern = /(\b\d+\+|\+\d+|\b\d+\b)/.test(trimmed);
    const hasProperCaseWord = /\b[A-Z][a-z]+\b/.test(trimmed);
    const endsWithSingleOdd = /\d+[.,]\d+$/.test(trimmed) && numbersMatches.length === 1;
    if (!hasColon && hasPlayerPropKeywords && hasValuePattern && hasProperCaseWord && endsWithSingleOdd) {
      return true;
    }
    
    return true;
  });
  
  return filtered;
}

function fromParsedText(parsed: string | null | undefined): string[] {
  if (!parsed) return [];
  const rawLines = parsed.split(/\r?\n/);
  const cleaned = rawLines
    .map(baseCleanup)
    .filter((l) => !!l)
    .filter((l) => !isButtonLine(l))
    .filter((l) => !isInstitutionalLine(l));
  
  // Primeiro mescla linhas quebradas (ex: "Total de" + "Gols Mais/Menos")
  const merged = mergeIncompleteLines(cleaned);
  
  // Depois quebra apostas múltiplas conectadas por "&"
  return splitMultipleBets(merged);
}

function fromOverlayLines(parsedResult: OcrSpaceParsedResult | null | undefined): string[] {
  const lines = parsedResult?.TextOverlay?.Lines ?? [];

  return lines
    .map((l) => baseCleanup(l.LineText || ""))
    .filter((l) => !!l)
    .filter((l) => !isButtonLine(l))
    .filter((l) => !isInstitutionalLine(l));
}

export function normalizeOcr(input: NormalizationInput): NormalizedOcr {
  // Log propositalmente chamativo para confirmar que a nova versão
  // de normalizeOcr está em execução em produção.
  console.log("🔥🔥🔥 NOVO NORMALIZE OCR EM EXECUÇÃO 🔥🔥🔥");

  let lines: string[] = [];

  if (input.kind === "parsedText") {
    lines = fromParsedText(input.payload);
  } else if (input.kind === "overlayLines") {
    lines = input.payload
      .map(baseCleanup)
      .filter((l) => !!l)
      .filter((l) => !isButtonLine(l))
      .filter((l) => !isInstitutionalLine(l));
  } else if (input.kind === "ocrSpace") {
    const payload = input.payload;

    // Tratamento explícito de erros do OCR.space (ex.: OCRExitCode 99, E208)
    const isErrored = payload.IsErroredOnProcessing === true;
    const exitCode = typeof payload.OCRExitCode === "number" ? payload.OCRExitCode : undefined;

    if (isErrored || (exitCode !== undefined && exitCode !== 1)) {
      const rawError = payload.ErrorMessage;
      let errorText: string | null = null;

      if (Array.isArray(rawError)) {
        errorText = rawError.join(" | ");
      } else if (typeof rawError === "string") {
        errorText = rawError;
      }

      const safeMessage = errorText && errorText.trim().length > 0
        ? errorText.trim()
        : "Serviço de OCR retornou um erro interno. Tente novamente em alguns minutos.";

      const codeSuffix = exitCode !== undefined ? ` (OCRExitCode ${exitCode})` : "";

      throw new Error(`Falha ao processar imagem no OCR.space${codeSuffix}: ${safeMessage}`);
    }

    const firstResult = payload.ParsedResults?.[0] ?? null;

    // 1) Tenta usar ParsedText como fonte principal
    const parsedLines = fromParsedText(firstResult?.ParsedText ?? "");

    if (parsedLines.length > 0) {
      lines = parsedLines;
    } else {
      // 2) Fallback para Overlay.Lines[].LineText
      const overlayLines = fromOverlayLines(firstResult);
      lines = overlayLines;
    }
  }

  // Remove linhas duplicadas consecutivas que normalmente
  // representam odds repetidas ou ruído visual replicado.
  const deduped: string[] = [];
  for (const line of lines) {
    if (deduped[deduped.length - 1] === line) continue;
    deduped.push(line);
  }

  // 🔗 Mescla linhas quebradas (aumenta precisão do LLM)
  // Exemplo: "Cada time bate 4+ escanteios e" + "time recebe 1+ cartões"
  const merged = mergeIncompleteLines(deduped);

  // 🧹 Remove prefixos de OCR (bullet points, hífens iniciais, etc)
  const cleaned = merged.map(removeOcrLinePrefix);

  // 🔁 Deduplicação exata: remove apostas idênticas (case-insensitive)
  // Resolve: "Julius Randle - 10+ Pontos" duplicado
  const dedupedExact: string[] = [];
  const seen = new Set<string>();
  
  for (const line of cleaned) {
    const normalized = normalizeForDedup(line);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    dedupedExact.push(line);
  }

  // 🚫 Remove labels de UI isolados (estatística/período sozinhos no BackTrack)
  // Isso evita criar apostas inválidas como "player_prop com jogador=null"
  const filtered = dedupedExact.filter(line => !isUILabelLine(line));

  return { lines: filtered };
}
