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

import { BilheteMetadata } from "../schema/bilhete.schema";
import { normalizeNBATeam, NBA_CURRENT_TEAMS, NBA_TEAM_ALIASES } from "../constants/nba-teams";
import { normalizeFootballClub, normalizeFootballEventTeams } from "../constants/football-clubs";
import { NFL_CURRENT_TEAMS, NFL_TEAM_ALIASES } from "../constants/nfl-teams";
import { MLB_CURRENT_TEAMS, MLB_TEAM_ALIASES } from "../constants/mlb-teams";

export type MetadataExtractionResult = {
  metadata: BilheteMetadata;
  remainingLines: string[];
};

function parseNumber(text: string | null | undefined): number | null {
  if (!text) return null;
  const normalized = text.replace(/[^0-9.,-]/g, "").replace(/,/g, ".");
  const value = parseFloat(normalized);
  return Number.isNaN(value) ? null : value;
}

// Utilitário genérico: dado um conjunto de labels e linhas, encontra a
// MELHOR linha candidata e extrai o maior valor numérico da linha.
// Isso é mais "orientado a entidades": primeiro identifica quem é o
// rótulo (ex: "valor apostado"), depois busca o número associado.
function extractLabeledAmount(
  lines: string[],
  labels: RegExp[],
): { value: number | null; consumedIdx: number | null } {
  let bestIdx: number | null = null;
  let bestValue: number | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    if (!labels.some((re) => re.test(lower))) continue;

    // Procura todos os tokens que parecem valores (R$ 10,00, 10.50, etc.)
    const candidates = line.match(/[0-9]+[.,][0-9]{2,}/g) || [];
    for (const raw of candidates) {
      const n = parseNumber(raw);
      if (n === null) continue;

      if (bestValue === null || n > bestValue) {
        bestValue = n;
        bestIdx = i;
      }
    }
  }

  return { value: bestValue, consumedIdx: bestIdx };
}

function extractValorApostado(lines: string[]): { value: number | null; consumedIdx: number | null } {
  const labels = [
    /valor\s+apostado/i,
    /valor\s+da\s+aposta/i,
    /aposta\s+total/i,
    /stake/i,
  ];
  return extractLabeledAmount(lines, labels);
}

function extractEsporte(lines: string[]): { esporte: string | null; consumedIdx: number | null } {
  // Scoring por liga: mais específico primeiro (NBA > NFL > MLB) e requer pelo menos um hit forte
  const nbaScore = computeLeagueScore(lines, NBA_CURRENT_TEAMS, NBA_TEAM_ALIASES as any, "Basquete");
  const nflScore = computeLeagueScore(lines, NFL_CURRENT_TEAMS, NFL_TEAM_ALIASES as any, "Futebol Americano");
  const mlbScore = computeLeagueScore(lines, MLB_CURRENT_TEAMS, MLB_TEAM_ALIASES as any, "Beisebol");

  const leagues = [
    { name: "Basquete" as const, data: nbaScore },
    { name: "Futebol Americano" as const, data: nflScore },
    { name: "Beisebol" as const, data: mlbScore },
  ];

  // Escolhe maior score; empate resolve pela ordem da lista (mais específica primeiro)
  let best = { name: null as string | null, score: 0, consumedIdx: null as number | null };
  for (const league of leagues) {
    if (league.data.score > best.score) {
      best = { name: league.name, score: league.data.score, consumedIdx: league.data.consumedIdx };
    }
  }

  if (best.score > 0 && best.name) {
    return { esporte: best.name, consumedIdx: best.consumedIdx };
  }

  // Fallback: times de futebol (dicionário) – menos específico
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const words = line.split(/\s+/);
    for (const word of words) {
      if (normalizeFootballClub(word)) {
        return { esporte: "Futebol", consumedIdx: i };
      }
    }
    if (normalizeFootballClub(line.trim())) {
      return { esporte: "Futebol", consumedIdx: i };
    }
  }
  
  return { esporte: null, consumedIdx: null };
}

function extractArrowStakeAndReturn(lines: string[]): {
  valorApostado: number | null;
  retornoPotencial: number | null;
  consumedIdx: number | null;
} {
  const arrowRegex = /(\d+[.,]\d{1,2}).*?->\s*(\d+[.,]\d{1,2})/;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(arrowRegex);
    if (!m) continue;
    const left = parseNumber(m[1]);
    const right = parseNumber(m[2]);

    if (left === null && right === null) continue;

    return {
      valorApostado: left,
      retornoPotencial: right,
      consumedIdx: i,
    };
  }

  return { valorApostado: null, retornoPotencial: null, consumedIdx: null };
}

function extractOdd(lines: string[]): { value: number | null; consumedIdx: number | null } {
  const labels = [/\bodd\b/i, /cota[cç][aã]o/i, /cota\b/i];
  const numberRe = /\d+[.,]\d+/g; // "g" para encontrar TODAS as odds
  
  // Primeiro tenta encontrar linha com label explícito
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    if (!labels.some((re) => re.test(lower))) continue;
    
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

function extractRetorno(lines: string[]): { value: number | null; consumedIdx: number | null } {
  const labels = [/retorno/i, /ganho/i];
  const numberRe = /\d+[.,]\d+/;
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    if (!labels.some((re) => re.test(lower))) continue;
    const m = lines[i].match(numberRe);
    if (m) {
      return { value: parseNumber(m[0]), consumedIdx: i };
    }
  }
  return { value: null, consumedIdx: null };
}


function extractTipo(lines: string[]): { tipo: BilheteMetadata["tipo"]; consumedIdx: number | null } {
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    if (/(simples)/.test(lower)) return { tipo: "Simples", consumedIdx: i };
    if (/(m[uú]ltipl[ao])/.test(lower)) return { tipo: "Multipla", consumedIdx: i };
    if (/(pr[eé]-?jogo|pr[eé]-?match)/.test(lower)) return { tipo: "Pré", consumedIdx: i };
    if (/(ao\s+vivo|live)/.test(lower)) return { tipo: "Ao vivo", consumedIdx: i };
  }
  return { tipo: null, consumedIdx: null };
}

function extractData(lines: string[]): { data: string | null; consumedIdx: number | null } {
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

function extractBonus(lines: string[]): { value: number | null; consumedIdx: number | null } {
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
] as const;

/**
 * 🔒 Canonicaliza nome de time para evento (REGRA ABSOLUTA)
 * Retorna APENAS nome canônico completo ou null
 * Aceita aliases/genéricos como input, mas retorna apenas nome canônico
 */
function canonicalizeTeamForEvent(raw: string): string | null {
  if (!raw) return null;
  
  const trimmed = raw.trim();
  
  // Tenta normalizar para nome canônico
  const canonical = 
    normalizeNBATeamFlexible(trimmed) ??
    normalizeFootballClubFlexible(trimmed);
  
  // ✅ Retorna nome canônico completo (ex: "Denver Nuggets", "Los Angeles Lakers")
  // A normalização já garante que é nome completo
  return canonical;
}

function extractEvento(lines: string[]): { evento: string | null; consumedIdx: number | null } {
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
      const normalizedFootball = normalizeFootballEventTeams(line.trim());
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
      const isNBA1 = normalizeNBATeam(canonical1) !== null;
      const isNBA2 = normalizeNBATeam(canonical2) !== null;
      const isFoot1 = normalizeFootballClub(canonical1) !== null;
      const isFoot2 = normalizeFootballClub(canonical2) !== null;
      
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
function looksLikePlayerProp(line: string): boolean {
  // Detecta padrões típicos de apostas
  const propPatterns = [
    /\b\d+\+/,                    // "10+", "1+" (condições)
    /[><=]\s*\d/,                  // ">2.5", "< 3" (condições)
    /-\s*\d/,                      // "- 10+" (traço antes de condição)
    /\b(Assistências|Rebotes|Pontos|Cestas|Triplo)\b/i,  // estatísticas
    /\b(Over|Under|Acima|Abaixo)\b/i,                    // mercados
    /\d+[ºª]\s+(Quarto|Tempo)/i,  // períodos
  ];
  
  return propPatterns.some(pattern => pattern.test(line));
}

/**
 * Tenta normalizar um time NBA de forma flexível:
 * - "DEN Nuggets" → "Denver Nuggets"
 * - "DEN" → "Denver Nuggets"
 * - "Denver Nuggets" → "Denver Nuggets"
 */
function normalizeNBATeamFlexible(text: string): string | null {
  if (!text) return null;
  
  // Tenta normalização direta
  const direct = normalizeNBATeam(text);
  if (direct) return direct;
  
  // Se não funcionou, tenta cada palavra individualmente
  // Útil para casos como "DEN Nuggets" onde pode estar separado
  const words = text.split(/\s+/);
  for (const word of words) {
    const normalized = normalizeNBATeam(word);
    if (normalized) return normalized;
  }
  
  return null;
}

/**
 * Tenta normalizar um time de futebol de forma flexível
 * Similar a normalizeNBATeamFlexible
 */
function normalizeFootballClubFlexible(text: string): string | null {
  if (!text) return null;
  
  // Tenta normalização direta
  const direct = normalizeFootballClub(text);
  if (direct) return direct;
  
  // Se não funcionou, tenta cada palavra individualmente
  const words = text.split(/\s+/);
  for (const word of words) {
    const normalized = normalizeFootballClub(word);
    if (normalized) return normalized;
  }
  
  return null;
}

/**
 * Detecta se uma string parece ser nome de jogador (Nome Sobrenome)
 * Aceita nomes com capitalização interna como LeBron, DeAndre
 */
function looksLikePlayerName(text: string): boolean {
  // Padrão: Nome(s) Sobrenome (ex: "Nikola Jokic", "LeBron James", "DeAndre Jordan")
  // Aceita palavras que começam com maiúscula e têm pelo menos uma letra minúscula
  return /\b[A-Z][a-zA-Z]+\s+[A-Z][a-zA-Z]+\b/.test(text);
}

/**
 * Detecta se uma string parece ser abreviação de time (2-4 letras maiúsculas)
 */
function looksLikeTeamAbbrev(text: string): boolean {
  return /^[A-Z]{2,4}$/.test(text.trim());
}

/**
 * Normaliza nomes de times NBA em um evento (ex: "Lakers x Warriors")
 * Retorna evento normalizado se ambos forem times NBA válidos, null caso contrário
 */
function normalizeNBAEventTeams(evento: string): string | null {
  // Detecta padrões "Time1 x Time2" ou "Time1 vs Time2"
  const separators = [' x ', ' vs ', ' X ', ' VS ', ' - '];
  
  for (const sep of separators) {
    if (evento.includes(sep)) {
      const parts = evento.split(sep).map(p => p.trim());
      if (parts.length === 2) {
        const normalized1 = normalizeNBATeam(parts[0]);
        const normalized2 = normalizeNBATeam(parts[1]);
        
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

type LeagueScore = { score: number; consumedIdx: number | null; hasStrong: boolean };

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const computeLeagueScore = (
  lines: string[],
  teams: readonly string[],
  aliases: Record<string, string>,
  sportLabel: "Basquete" | "Futebol Americano" | "Beisebol",
): LeagueScore => {
  let score = 0;
  let consumedIdx: number | null = null;
  let hasStrong = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Pontos por time completo (forte)
    for (const team of teams) {
      const teamRegex = new RegExp(`\\b${escapeRegExp(team)}\\b`, "i");
      if (teamRegex.test(line)) {
        score += 3;
        hasStrong = true;
        if (consumedIdx === null) consumedIdx = i;
      }
    }

    // Pontos por aliases
    for (const alias of Object.keys(aliases)) {
      const canonical = aliases[alias];
      const aliasRegex = new RegExp(`\\b${escapeRegExp(alias)}\\b`, "i");
      if (!aliasRegex.test(line)) continue;

      const cityToken = canonical.split(" ")[0]?.toLowerCase();
      const isWeak = alias.toLowerCase() === cityToken; // cidade sozinha = fraco
      const weight = isWeak ? 1 : 2;

      score += weight;
      if (!isWeak) hasStrong = true;
      if (consumedIdx === null && !isWeak) consumedIdx = i;
    }
  }

  // Alias fraco não decide sozinho
  if (!hasStrong) {
    return { score: 0, consumedIdx: null, hasStrong: false };
  }

  return { score, consumedIdx, hasStrong };
};

function extractTorneio(lines: string[]): { torneio: string | null; consumedIdx: number | null } {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(liga|champions|copa|league)/i.test(line)) {
      return { torneio: line.trim(), consumedIdx: i };
    }
  }
  return { torneio: null, consumedIdx: null };
}

export function extractMetadata(lines: string[]): MetadataExtractionResult {
  const consumed = new Set<number>();

  // 1) Primeiro tentamos capturar um padrão "valor -> retorno" em uma
  // única linha (muito comum em casas como BETesporte).
  const arrow = extractArrowStakeAndReturn(lines);
  if (arrow.consumedIdx !== null) consumed.add(arrow.consumedIdx);

  // 2) Depois complementamos com os extratores baseados em labels,
  // apenas quando ainda não temos algum dos valores.
  const { value: valorApostadoFromLabels, consumedIdx: idxValor } = extractValorApostado(lines);
  if (idxValor !== null) consumed.add(idxValor);

  const { value: odd, consumedIdx: idxOdd } = extractOdd(lines);
  if (idxOdd !== null) consumed.add(idxOdd);

  const { value: retornoFromLabels, consumedIdx: idxRetorno } = extractRetorno(lines);
  if (idxRetorno !== null) consumed.add(idxRetorno);

  const { tipo, consumedIdx: idxTipo } = extractTipo(lines);
  if (idxTipo !== null) consumed.add(idxTipo);

  const { data, consumedIdx: idxData } = extractData(lines);
  if (idxData !== null) consumed.add(idxData);

  const { value: bonus, consumedIdx: idxBonus } = extractBonus(lines);
  if (idxBonus !== null) consumed.add(idxBonus);

  const { evento, consumedIdx: idxEvento } = extractEvento(lines);
  if (idxEvento !== null) consumed.add(idxEvento);

  const { esporte, consumedIdx: idxEsporte } = extractEsporte(lines);
  if (idxEsporte !== null) consumed.add(idxEsporte);

  // Removido: fallback por evento. Se não está no dicionário, mantém sem informação.
  const esporteFinal = esporte;

  const { torneio, consumedIdx: idxTorneio } = extractTorneio(lines);
  if (idxTorneio !== null) consumed.add(idxTorneio);

  const metadata: BilheteMetadata = {
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
