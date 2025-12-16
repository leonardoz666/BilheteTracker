"use strict";
// Etapa 2: Extração de Metadados (local)
//
// Responsável por extrair APENAS os campos de metadados do bilhete
// usando regex simples, sem envolver LLM:
//
// - Esporte
// - Torneio
// - Evento
// - Valor Apostado
// - Odd
// - Retorno Potencial
// - Tipo (Simples, Múltipla, Pré, Ao vivo)
// - Data
// - Bônus
//
// Esses dados NÃO são enviados para a IA. Além disso, esta etapa
// tenta remover das linhas de texto original qualquer linha que
// seja puramente institucional ou claramente de metadado para que
// o parser semântico trabalhe apenas com linhas de apostas.
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractMetadata = extractMetadata;
const nba_teams_1 = require("../constants/nba-teams");
const football_clubs_1 = require("../constants/football-clubs");
const nfl_teams_1 = require("../constants/nfl-teams");
const mlb_teams_1 = require("../constants/mlb-teams");
function parseNumber(text) {
    if (!text)
        return null;
    const normalized = text.replace(/[^0-9.,-]/g, "").replace(/,/g, ".");
    const value = parseFloat(normalized);
    return Number.isNaN(value) ? null : value;
}
// Utilitário genérico: dado um conjunto de labels e linhas, encontra a
// MELHOR linha candidata e extrai o maior valor numérico da linha.
// Isso é mais "orientado a entidades": primeiro identifica quem é o
// rótulo (ex: "valor apostado"), depois busca o número associado.
function extractLabeledAmount(lines, labels) {
    let bestIdx = null;
    let bestValue = null;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lower = line.toLowerCase();
        if (!labels.some((re) => re.test(lower)))
            continue;
        // Procura todos os tokens que parecem valores (R$ 10,00, 10.50, etc.)
        const candidates = line.match(/[0-9]+[.,][0-9]{2,}/g) || [];
        for (const raw of candidates) {
            const n = parseNumber(raw);
            if (n === null)
                continue;
            if (bestValue === null || n > bestValue) {
                bestValue = n;
                bestIdx = i;
            }
        }
    }
    return { value: bestValue, consumedIdx: bestIdx };
}
function extractValorApostado(lines) {
    const labels = [
        /valor\s+apostado/i,
        /valor\s+da\s+aposta/i,
        /aposta\s+total/i,
        /stake/i,
    ];
    return extractLabeledAmount(lines, labels);
}
// Keywords que indicam contexto de futebol
const FOOTBALL_KEYWORDS = [
    /\bgols?\b/i,
    /\bchutes?\b/i,
    /\bescanteios?\b/i,
    /\bcart[õo]es?\b/i,
    /\bdefesas?\b/i,
    /\bplacar\b/i,
    /\bpasses?\b/i,
    /\bfalta?s?\b/i,
    /\bimpedimentos?\b/i,
    /\bpenalt[yi]s?\b/i,
    /\bambas\s+marcam\b/i,
    /\bboth\s+teams\s+to\s+score\b/i,
    /\bbtts\b/i,
];
function hasFootballKeywords(lines) {
    const fullText = lines.join(' ').toLowerCase();
    return FOOTBALL_KEYWORDS.some(keyword => keyword.test(fullText));
}
/**
 * Detecta padrão de confronto (Time A x Time B ou Time A vs Time B)
 * mas APENAS se não houver times NBA/NFL/MLB reconhecidos
 */
function hasVersusPatternWithoutOtherSports(lines, nbaTeams, nflTeams, mlbTeams) {
    const versusPattern = /\b.+?\s+(x|vs|versus)\s+.+?\b/i;
    const hasVersusLine = lines.some(line => versusPattern.test(line));
    if (!hasVersusLine)
        return false;
    // Verifica se há times de outras ligas nas linhas
    const fullText = lines.join(' ').toLowerCase();
    // Se encontrar times NBA/NFL/MLB, não considera versus como evidência de futebol
    const hasNBATeam = nbaTeams.some(team => new RegExp(`\\b${team.toLowerCase()}\\b`, 'i').test(fullText));
    const hasNFLTeam = nflTeams.some(team => new RegExp(`\\b${team.toLowerCase()}\\b`, 'i').test(fullText));
    const hasMLBTeam = mlbTeams.some(team => new RegExp(`\\b${team.toLowerCase()}\\b`, 'i').test(fullText));
    // Versus só é evidência de futebol se NÃO houver times de outras ligas
    return !hasNBATeam && !hasNFLTeam && !hasMLBTeam;
}
/**
 * Busca por times de futebol nas linhas
 */
function findFootballTeams(lines) {
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Verifica palavras individuais
        const words = line.split(/\s+/);
        for (const word of words) {
            if ((0, football_clubs_1.normalizeFootballClub)(word)) {
                return { found: true, lineIdx: i };
            }
        }
        // Verifica linha completa
        if ((0, football_clubs_1.normalizeFootballClub)(line.trim())) {
            return { found: true, lineIdx: i };
        }
    }
    return { found: false, lineIdx: null };
}
function extractEsporte(lines) {
    // PRIORIDADE 1: Futebol com evidência positiva (hard gate)
    // Regra: keywords + (clube OU padrão x/versus SEM times de outras ligas) → curto-circuito para FUTEBOL
    const hasFootballContext = hasFootballKeywords(lines);
    if (hasFootballContext) {
        const { found: hasClub, lineIdx: clubLineIdx } = findFootballTeams(lines);
        const hasVersus = hasVersusPatternWithoutOtherSports(lines, nba_teams_1.NBA_CURRENT_TEAMS, nfl_teams_1.NFL_CURRENT_TEAMS, mlb_teams_1.MLB_CURRENT_TEAMS);
        // ✅ Evidência positiva: clube reconhecido OU padrão de confronto (sem outras ligas)
        if (hasClub || hasVersus) {
            return { esporte: "Futebol", consumedIdx: clubLineIdx };
        }
        // ❌ Sem evidência positiva: não faz curto-circuito
        // Deixa o scorer decidir (pode ser NBA/NFL com keywords ambíguas)
    }
    // PRIORIDADE 2: Scoring por liga específica (NBA > NFL > MLB)
    const nbaScore = computeLeagueScore(lines, nba_teams_1.NBA_CURRENT_TEAMS, nba_teams_1.NBA_TEAM_ALIASES, "Basquete");
    const nflScore = computeLeagueScore(lines, nfl_teams_1.NFL_CURRENT_TEAMS, nfl_teams_1.NFL_TEAM_ALIASES, "Futebol Americano");
    const mlbScore = computeLeagueScore(lines, mlb_teams_1.MLB_CURRENT_TEAMS, mlb_teams_1.MLB_TEAM_ALIASES, "Beisebol");
    const leagues = [
        { name: "Basquete", data: nbaScore },
        { name: "Futebol Americano", data: nflScore },
        { name: "Beisebol", data: mlbScore },
    ];
    // Escolhe maior score; empate resolve pela ordem da lista (mais específica primeiro)
    let best = { name: null, score: 0, consumedIdx: null };
    for (const league of leagues) {
        if (league.data.score > best.score) {
            best = { name: league.name, score: league.data.score, consumedIdx: league.data.consumedIdx };
        }
    }
    if (best.score > 0 && best.name) {
        return { esporte: best.name, consumedIdx: best.consumedIdx };
    }
    // PRIORIDADE 3: Fallback - futebol sem keywords (menos confiável)
    let footballTeamFound = false;
    let footballLineIdx = null;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const words = line.split(/\s+/);
        for (const word of words) {
            if ((0, football_clubs_1.normalizeFootballClub)(word)) {
                footballTeamFound = true;
                if (footballLineIdx === null)
                    footballLineIdx = i;
                break;
            }
        }
        if (!footballTeamFound && (0, football_clubs_1.normalizeFootballClub)(line.trim())) {
            footballTeamFound = true;
            if (footballLineIdx === null)
                footballLineIdx = i;
        }
    }
    // Sem keywords, só retorna futebol se encontrar time
    if (footballTeamFound) {
        return { esporte: "Futebol", consumedIdx: footballLineIdx };
    }
    return { esporte: null, consumedIdx: null };
}
function extractArrowStakeAndReturn(lines) {
    const arrowRegex = /(\d+[.,]\d{1,2}).*?->\s*(\d+[.,]\d{1,2})/;
    for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(arrowRegex);
        if (!m)
            continue;
        const left = parseNumber(m[1]);
        const right = parseNumber(m[2]);
        if (left === null && right === null)
            continue;
        return {
            valorApostado: left,
            retornoPotencial: right,
            consumedIdx: i,
        };
    }
    return { valorApostado: null, retornoPotencial: null, consumedIdx: null };
}
function extractOdd(lines) {
    const labels = [/\bodd\b/i, /cota[cç][aã]o/i, /cota\b/i];
    const numberRe = /\d+[.,]\d+/g; // "g" para encontrar TODAS as odds
    // Primeiro tenta encontrar linha com label explícito
    for (let i = 0; i < lines.length; i++) {
        const lower = lines[i].toLowerCase();
        if (!labels.some((re) => re.test(lower)))
            continue;
        // Encontra todos os números da linha
        const matches = Array.from(lines[i].matchAll(numberRe));
        if (matches.length > 0) {
            // Se há múltiplas odds (ex: "2.75 3.45"), pega a ÚLTIMA (nova odd)
            const lastMatch = matches[matches.length - 1];
            return { value: parseNumber(lastMatch[0]), consumedIdx: i };
        }
    }
    // Fallback: procura linha com exatamente 2 números decimais (odd riscada + nova)
    // Padrão: "2.75 3.45" sem label explícito
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Detecta linha com formato "X.XX Y.YY" (2 decimais separados por espaço)
        const twoOddsPattern = /^(\d+[.,]\d+)\s+(\d+[.,]\d+)$/;
        const match = line.match(twoOddsPattern);
        if (match) {
            // Pega a ÚLTIMA (segunda odd = nova)
            return { value: parseNumber(match[2]), consumedIdx: i };
        }
    }
    return { value: null, consumedIdx: null };
}
function extractRetorno(lines) {
    const labels = [/retorno/i, /ganho/i];
    const numberRe = /\d+[.,]\d+/;
    for (let i = 0; i < lines.length; i++) {
        const lower = lines[i].toLowerCase();
        if (!labels.some((re) => re.test(lower)))
            continue;
        const m = lines[i].match(numberRe);
        if (m) {
            return { value: parseNumber(m[0]), consumedIdx: i };
        }
    }
    return { value: null, consumedIdx: null };
}
function extractTipo(lines) {
    for (let i = 0; i < lines.length; i++) {
        const lower = lines[i].toLowerCase();
        if (/(simples)/.test(lower))
            return { tipo: "Simples", consumedIdx: i };
        if (/(m[uú]ltipl[ao])/.test(lower))
            return { tipo: "Multipla", consumedIdx: i };
        if (/(pr[eé]-?jogo|pr[eé]-?match)/.test(lower))
            return { tipo: "Pré", consumedIdx: i };
        if (/(ao\s+vivo|live)/.test(lower))
            return { tipo: "Ao vivo", consumedIdx: i };
    }
    return { tipo: null, consumedIdx: null };
}
function extractData(lines) {
    const dateRegexes = [
        /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
        /(\d{4}-\d{2}-\d{2})/,
    ];
    for (let i = 0; i < lines.length; i++) {
        for (const re of dateRegexes) {
            const m = lines[i].match(re);
            if (m) {
                return { data: m[1], consumedIdx: i };
            }
        }
    }
    return { data: null, consumedIdx: null };
}
function extractBonus(lines) {
    const labels = [
        /b[oô]nus/i,
        /bonus/i,
        /promo[cç][aã]o/i,
    ];
    return extractLabeledAmount(lines, labels);
}
/**
 * 🚫 Lista de nomes genéricos/parciais que NÃO podem aparecer no evento
 * Evento só aceita nomes canônicos completos (ex: "Denver Nuggets", não "Nuggets")
 */
const GENERIC_TEAM_WORDS = [
    // NBA - apelidos/nomes parciais
    "Nuggets",
    "Rockets",
    "Lakers",
    "Heat",
    "Bulls",
    "Warriors",
    "Celtics",
    "Suns",
    "Spurs",
    "Knicks",
    "Hawks",
    "Nets",
    "Hornets",
    "Cavaliers",
    "Cavs",
    "Pistons",
    "Pacers",
    "Mavericks",
    "Mavs",
    "Clippers",
    "Grizzlies",
    "Timberwolves",
    "T-Wolves",
    "Pelicans",
    "Thunder",
    "Blazers",
    "Kings",
    "Jazz",
    "Bucks",
    "Magic",
    "Raptors",
    "Wizards",
    "76ers",
    "Sixers",
    // Futebol - apelidos/nomes parciais
    "FLA",
    "PAL",
    "COR",
    "SPFC",
    "CAM",
    "INT",
    "BFC",
    "FLU",
    "VGD",
    "GRE",
    "City",
    "United",
    "Villa",
    "Palace",
];
/**
 * 🔒 Canonicaliza nome de time para evento (REGRA ABSOLUTA)
 * Retorna APENAS nome canônico completo ou null
 * Aceita aliases/genéricos como input, mas retorna apenas nome canônico
 */
function canonicalizeTeamForEvent(raw) {
    if (!raw)
        return null;
    const trimmed = raw.trim();
    // Tenta normalizar para nome canônico
    const canonical = normalizeNBATeamFlexible(trimmed) ??
        normalizeFootballClubFlexible(trimmed);
    // ✅ Retorna nome canônico completo (ex: "Denver Nuggets", "Los Angeles Lakers")
    // A normalização já garante que é nome completo
    return canonical;
}
function extractEvento(lines) {
    // 🔒 REGRA DE OURO ABSOLUTA: Evento = Time x Time (NUNCA jogador)
    // Jogador só existe dentro de aposta, nunca no evento
    // 1️⃣ Primeiro tenta linhas com " x " ou " vs " no padrão "Time1 x Time2"
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/( x | vs )/i.test(line)) {
            // Valida se linha NÃO é player prop (tem estatísticas ou traços)
            if (looksLikePlayerProp(line)) {
                continue; // Pula linhas de apostas
            }
            // Tenta normalizar times NBA no evento
            const normalizedNBA = normalizeNBAEventTeams(line.trim());
            if (normalizedNBA !== null) {
                return { evento: normalizedNBA, consumedIdx: i };
            }
            // Tenta normalizar times de futebol no evento
            const normalizedFootball = (0, football_clubs_1.normalizeFootballEventTeams)(line.trim());
            if (normalizedFootball !== null) {
                return { evento: normalizedFootball, consumedIdx: i };
            }
            // ❌ REJEITA: Se não for time válido do dicionário, NÃO aceita como evento
            // Não aceita fallback genérico que pode conter jogador
        }
    }
    // 2️⃣ Se não encontrou evento em uma única linha, tenta combinar linhas separadas
    // Procura por padrão: linha com time1 + linha com time2
    for (let i = 0; i < lines.length - 1; i++) {
        const line1 = lines[i].trim();
        const line2 = lines[i + 1].trim();
        // Rejeita linhas que parecem ser apostas (player props)
        if (looksLikePlayerProp(line1) || looksLikePlayerProp(line2)) {
            continue;
        }
        // Limpa linhas removendo números e espaços extras na frente
        // Ex: "2 DEN Nuggets" → "DEN Nuggets"
        const cleaned1 = line1.replace(/^\d+\s+/, '').trim();
        const cleaned2 = line2.replace(/^\d+\s+/, '').trim();
        // 🔒 CANONICALIZAÇÃO OBRIGATÓRIA: só aceita nomes canônicos completos
        const canonical1 = canonicalizeTeamForEvent(cleaned1);
        const canonical2 = canonicalizeTeamForEvent(cleaned2);
        // ✅ SÓ ACEITA SE AMBOS FOREM TIMES CANÔNICOS VÁLIDOS
        if (canonical1 && canonical2) {
            // 🚫 Valida se ambos são do MESMO esporte (não misturar NBA + Futebol)
            const isNBA1 = (0, nba_teams_1.normalizeNBATeam)(canonical1) !== null;
            const isNBA2 = (0, nba_teams_1.normalizeNBATeam)(canonical2) !== null;
            const isFoot1 = (0, football_clubs_1.normalizeFootballClub)(canonical1) !== null;
            const isFoot2 = (0, football_clubs_1.normalizeFootballClub)(canonical2) !== null;
            const bothNBA = isNBA1 && isNBA2;
            const bothFootball = isFoot1 && isFoot2;
            // Só aceita se ambos são do mesmo esporte
            if (bothNBA || bothFootball) {
                return { evento: `${canonical1} x ${canonical2}`, consumedIdx: i };
            }
        }
        // ❌ Se algum lado não for canônico ou se misturar esportes, rejeita completamente
        // Não aceita "Nuggets", "Rockets", "City", etc. (nomes genéricos)
    }
    return { evento: null, consumedIdx: null };
}
/**
 * Detecta se linha parece ser uma aposta (player prop ou match prop)
 * Indicadores: estatísticas, traços, condições
 */
function looksLikePlayerProp(line) {
    // Detecta padrões típicos de apostas
    const propPatterns = [
        /\b\d+\+/, // "10+", "1+" (condições)
        /[><=]\s*\d/, // ">2.5", "< 3" (condições)
        /-\s*\d/, // "- 10+" (traço antes de condição)
        /\b(Assistências|Rebotes|Pontos|Cestas|Triplo)\b/i, // estatísticas
        /\b(Over|Under|Acima|Abaixo)\b/i, // mercados
        /\d+[ºª]\s+(Quarto|Tempo)/i, // períodos
    ];
    return propPatterns.some(pattern => pattern.test(line));
}
/**
 * Tenta normalizar um time NBA de forma flexível:
 * - "DEN Nuggets" → "Denver Nuggets"
 * - "DEN" → "Denver Nuggets"
 * - "Denver Nuggets" → "Denver Nuggets"
 */
function normalizeNBATeamFlexible(text) {
    if (!text)
        return null;
    // Tenta normalização direta
    const direct = (0, nba_teams_1.normalizeNBATeam)(text);
    if (direct)
        return direct;
    // Se não funcionou, tenta cada palavra individualmente
    // Útil para casos como "DEN Nuggets" onde pode estar separado
    const words = text.split(/\s+/);
    for (const word of words) {
        const normalized = (0, nba_teams_1.normalizeNBATeam)(word);
        if (normalized)
            return normalized;
    }
    return null;
}
/**
 * Tenta normalizar um time de futebol de forma flexível
 * Similar a normalizeNBATeamFlexible
 */
function normalizeFootballClubFlexible(text) {
    if (!text)
        return null;
    // Tenta normalização direta
    const direct = (0, football_clubs_1.normalizeFootballClub)(text);
    if (direct)
        return direct;
    // Se não funcionou, tenta cada palavra individualmente
    const words = text.split(/\s+/);
    for (const word of words) {
        const normalized = (0, football_clubs_1.normalizeFootballClub)(word);
        if (normalized)
            return normalized;
    }
    return null;
}
/**
 * Detecta se uma string parece ser nome de jogador (Nome Sobrenome)
 * Aceita nomes com capitalização interna como LeBron, DeAndre
 */
function looksLikePlayerName(text) {
    // Padrão: Nome(s) Sobrenome (ex: "Nikola Jokic", "LeBron James", "DeAndre Jordan")
    // Aceita palavras que começam com maiúscula e têm pelo menos uma letra minúscula
    return /\b[A-Z][a-zA-Z]+\s+[A-Z][a-zA-Z]+\b/.test(text);
}
/**
 * Detecta se uma string parece ser abreviação de time (2-4 letras maiúsculas)
 */
function looksLikeTeamAbbrev(text) {
    return /^[A-Z]{2,4}$/.test(text.trim());
}
/**
 * Normaliza nomes de times NBA em um evento (ex: "Lakers x Warriors")
 * Retorna evento normalizado se ambos forem times NBA válidos, null caso contrário
 */
function normalizeNBAEventTeams(evento) {
    // Detecta padrões "Time1 x Time2" ou "Time1 vs Time2"
    const separators = [' x ', ' vs ', ' X ', ' VS ', ' - '];
    for (const sep of separators) {
        if (evento.includes(sep)) {
            const parts = evento.split(sep).map(p => p.trim());
            if (parts.length === 2) {
                const normalized1 = (0, nba_teams_1.normalizeNBATeam)(parts[0]);
                const normalized2 = (0, nba_teams_1.normalizeNBATeam)(parts[1]);
                // AMBOS precisam ser times NBA válidos
                if (normalized1 && normalized2) {
                    return `${normalized1} x ${normalized2}`;
                }
                // Se um dos lados não é time NBA válido, retorna null
                // (para evitar "Nikola Jokic x HOU Rockets")
                return null;
            }
            break;
        }
    }
    return null;
}
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const computeLeagueScore = (lines, teams, aliases, sportLabel) => {
    let score = 0;
    let consumedIdx = null;
    let hasStrong = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Pontos por time completo (forte)
        for (const team of teams) {
            const teamRegex = new RegExp(`\\b${escapeRegExp(team)}\\b`, "i");
            if (teamRegex.test(line)) {
                score += 3;
                hasStrong = true;
                if (consumedIdx === null)
                    consumedIdx = i;
            }
        }
        // Pontos por aliases
        for (const alias of Object.keys(aliases)) {
            const canonical = aliases[alias];
            const aliasRegex = new RegExp(`\\b${escapeRegExp(alias)}\\b`, "i");
            if (!aliasRegex.test(line))
                continue;
            const cityToken = canonical.split(" ")[0]?.toLowerCase();
            const isWeak = alias.toLowerCase() === cityToken; // cidade sozinha = fraco
            const weight = isWeak ? 1 : 2;
            score += weight;
            if (!isWeak)
                hasStrong = true;
            if (consumedIdx === null && !isWeak)
                consumedIdx = i;
        }
    }
    // Alias fraco não decide sozinho
    if (!hasStrong) {
        return { score: 0, consumedIdx: null, hasStrong: false };
    }
    return { score, consumedIdx, hasStrong };
};
function extractTorneio(lines) {
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/(liga|champions|copa|league)/i.test(line)) {
            return { torneio: line.trim(), consumedIdx: i };
        }
    }
    return { torneio: null, consumedIdx: null };
}
function extractMetadata(lines) {
    const consumed = new Set();
    // 1) Primeiro tentamos capturar um padrão "valor -> retorno" em uma
    // única linha (muito comum em casas como BETesporte).
    const arrow = extractArrowStakeAndReturn(lines);
    if (arrow.consumedIdx !== null)
        consumed.add(arrow.consumedIdx);
    // 2) Depois complementamos com os extratores baseados em labels,
    // apenas quando ainda não temos algum dos valores.
    const { value: valorApostadoFromLabels, consumedIdx: idxValor } = extractValorApostado(lines);
    if (idxValor !== null)
        consumed.add(idxValor);
    const { value: odd, consumedIdx: idxOdd } = extractOdd(lines);
    if (idxOdd !== null)
        consumed.add(idxOdd);
    const { value: retornoFromLabels, consumedIdx: idxRetorno } = extractRetorno(lines);
    if (idxRetorno !== null)
        consumed.add(idxRetorno);
    const { tipo, consumedIdx: idxTipo } = extractTipo(lines);
    if (idxTipo !== null)
        consumed.add(idxTipo);
    const { data, consumedIdx: idxData } = extractData(lines);
    if (idxData !== null)
        consumed.add(idxData);
    const { value: bonus, consumedIdx: idxBonus } = extractBonus(lines);
    if (idxBonus !== null)
        consumed.add(idxBonus);
    const { evento, consumedIdx: idxEvento } = extractEvento(lines);
    if (idxEvento !== null)
        consumed.add(idxEvento);
    const { esporte, consumedIdx: idxEsporte } = extractEsporte(lines);
    if (idxEsporte !== null)
        consumed.add(idxEsporte);
    // Removido: fallback por evento. Se não está no dicionário, mantém sem informação.
    const esporteFinal = esporte;
    const { torneio, consumedIdx: idxTorneio } = extractTorneio(lines);
    if (idxTorneio !== null)
        consumed.add(idxTorneio);
    const metadata = {
        esporte: esporteFinal,
        torneio,
        evento,
        // Preferimos os valores encontrados no padrão com seta; caso
        // não existam, caímos para os extraídos via labels.
        valorApostado: arrow.valorApostado ?? valorApostadoFromLabels,
        odd,
        retornoPotencial: arrow.retornoPotencial ?? retornoFromLabels,
        tipo,
        data,
        bonus,
    };
    const remainingLines = lines.filter((_, idx) => !consumed.has(idx));
    return { metadata, remainingLines };
}
