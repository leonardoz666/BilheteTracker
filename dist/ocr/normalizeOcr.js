"use strict";
// Etapa 1: Normalização de OCR
//
// Responsabilidades:
// - Receber ParsedText (principal) ou Overlay.Lines (fallback)
// - Retornar um array de linhas limpas
// - Remover botões e textos institucionais evidentes
// - NÃO interpretar significado, NÃO criar apostas e NÃO remover
//   informações semânticas como odds, valores ou retornos.
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeOcr = normalizeOcr;
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
function isButtonLine(line) {
    const lower = line.toLowerCase();
    return BUTTON_KEYWORDS.some((kw) => lower.includes(kw));
}
function isInstitutionalLine(line) {
    return INSTITUTIONAL_PATTERNS.some((re) => re.test(line));
}
// 🚫 Detecta labels de UI isolados (estatística ou período sozinhos)
// Esses vêm do BackTrack como linhas separadas das apostas
// Ex: "Assistências", "Rebotes", "1º Quarto" aparecendo sozinhos
// Ou padrão "Período - Estatística" (sem jogador) como "1º Quarto - Rebotes"
function isUILabelLine(line) {
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
function baseCleanup(line) {
    // Remove espaços extras e caracteres de controle
    return line.replace(/[\r\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
}
/**
 * Remove prefixos de quebra de linha do OCR (bullet points, hífens, etc)
 * Exemplos: "o Julius Randle" → "Julius Randle", "• Gols" → "Gols"
 */
function removeOcrLinePrefix(line) {
    // Remove prefixos comuns: "o ", "• ", "- ", "* ", "○ ", "▪ ", etc
    return line.replace(/^[o•\-*○▪]\s+/i, "").trim();
}
/**
 * Normaliza apostas para deduplicação exata.
 * Remove prefixos, espaços extras, case-insensitive.
 */
function normalizeForDedup(line) {
    return removeOcrLinePrefix(line)
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}
/**
 * Detecta se uma linha está incompleta (termina com conector).
 * Exemplos: "Cada time bate 4+ escanteios e", "Mais de 9.5", "Ambas Marcam: Sim &", "Total de"
 */
function isIncompleteLine(line) {
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
    return false;
}
/**
 * Detecta se a próxima linha é continuação (complemento semântico).
 * Exemplos: "time recebe 1+ cartões", "Escanteios FT O/U", "Gols", "Rebotes", "Sim", "Empate"
 */
function isContinuationLine(line) {
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
        "Total de", "Recepções", "Touchdowns", "Yards" // NFL/Sports americanos
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
function mergeIncompleteLines(lines) {
    const merged = [];
    let i = 0;
    while (i < lines.length) {
        const current = lines[i];
        const next = lines[i + 1];
        // Se linha atual está incompleta E existe próxima linha E próxima é continuação
        if (current && next && isIncompleteLine(current) && isContinuationLine(next)) {
            // Mescla com espaço
            merged.push(`${current} ${next}`.replace(/\s{2,}/g, " ").trim());
            i += 2; // Pula ambas
        }
        else {
            merged.push(current);
            i += 1;
        }
    }
    return merged;
}
/**
 * Quebra apostas múltiplas conectadas por "&" em linhas separadas
 * Ex: "Ambas Marcam: Sim & Total Gols: Mais de 3.5" → 2 linhas
 */
function splitMultipleBets(lines) {
    const result = [];
    for (const line of lines) {
        // Se a linha contém "&" e parece ser uma aposta múltipla
        if (line.includes('&') && (line.includes(':') || line.includes('Mais') || line.includes('Menos'))) {
            // Quebra pelo "&" e adiciona cada parte
            const parts = line.split('&').map(p => p.trim()).filter(p => p.length > 0);
            result.push(...parts);
        }
        else {
            result.push(line);
        }
    }
    return result;
}
function fromParsedText(parsed) {
    if (!parsed)
        return [];
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
function fromOverlayLines(parsedResult) {
    const lines = parsedResult?.TextOverlay?.Lines ?? [];
    return lines
        .map((l) => baseCleanup(l.LineText || ""))
        .filter((l) => !!l)
        .filter((l) => !isButtonLine(l))
        .filter((l) => !isInstitutionalLine(l));
}
function normalizeOcr(input) {
    // Log propositalmente chamativo para confirmar que a nova versão
    // de normalizeOcr está em execução em produção.
    console.log("🔥🔥🔥 NOVO NORMALIZE OCR EM EXECUÇÃO 🔥🔥🔥");
    let lines = [];
    if (input.kind === "parsedText") {
        lines = fromParsedText(input.payload);
    }
    else if (input.kind === "overlayLines") {
        lines = input.payload
            .map(baseCleanup)
            .filter((l) => !!l)
            .filter((l) => !isButtonLine(l))
            .filter((l) => !isInstitutionalLine(l));
    }
    else if (input.kind === "ocrSpace") {
        const payload = input.payload;
        // Tratamento explícito de erros do OCR.space (ex.: OCRExitCode 99, E208)
        const isErrored = payload.IsErroredOnProcessing === true;
        const exitCode = typeof payload.OCRExitCode === "number" ? payload.OCRExitCode : undefined;
        if (isErrored || (exitCode !== undefined && exitCode !== 1)) {
            const rawError = payload.ErrorMessage;
            let errorText = null;
            if (Array.isArray(rawError)) {
                errorText = rawError.join(" | ");
            }
            else if (typeof rawError === "string") {
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
        }
        else {
            // 2) Fallback para Overlay.Lines[].LineText
            const overlayLines = fromOverlayLines(firstResult);
            lines = overlayLines;
        }
    }
    // Remove linhas duplicadas consecutivas que normalmente
    // representam odds repetidas ou ruído visual replicado.
    const deduped = [];
    for (const line of lines) {
        if (deduped[deduped.length - 1] === line)
            continue;
        deduped.push(line);
    }
    // 🔗 Mescla linhas quebradas (aumenta precisão do LLM)
    // Exemplo: "Cada time bate 4+ escanteios e" + "time recebe 1+ cartões"
    const merged = mergeIncompleteLines(deduped);
    // 🧹 Remove prefixos de OCR (bullet points, hífens iniciais, etc)
    const cleaned = merged.map(removeOcrLinePrefix);
    // 🔁 Deduplicação exata: remove apostas idênticas (case-insensitive)
    // Resolve: "Julius Randle - 10+ Pontos" duplicado
    const dedupedExact = [];
    const seen = new Set();
    for (const line of cleaned) {
        const normalized = normalizeForDedup(line);
        if (seen.has(normalized))
            continue;
        seen.add(normalized);
        dedupedExact.push(line);
    }
    // 🚫 Remove labels de UI isolados (estatística/período sozinhos no BackTrack)
    // Isso evita criar apostas inválidas como "player_prop com jogador=null"
    const filtered = dedupedExact.filter(line => !isUILabelLine(line));
    return { lines: filtered };
}
