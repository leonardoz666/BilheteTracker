// Novo passo: parser semântico completo do bilhete (metadados + apostas)
//
// A PARTIR DE AGORA este módulo é a ÚNICA fonte de verdade do
// bilhete final. Ele:
// - Recebe TODAS as linhas normalizadas do OCR (sem pré-filtrar
//   apenas apostas ou metadados).
// - Tenta primeiro usar o LLM de ticket completo (callTicketParser).
// - Se não houver esse recurso (ex.: MockLlmClient), cai em um
//   fallback local baseado em regex + parser semântico de apostas.

import { BilheteFinal, ResultadoSemanticoLLM, ApostaSemantica, PeriodoAposta } from "../schema/bilhete.schema";
import { TicketLlmClient, defaultLlmClient } from "../utils/llmClient";
import { extractMetadata } from "./extractMetadata";
import { extractRawBets } from "./extractRawBets";
import { semanticParserLLM } from "./semanticParserLLM";
import { formatBilhete } from "./formatterFinal";
import { enforceOnAll } from "../utils/enforcePlayerPropRule";
import { normalizeApostas as normalizeLabelsOnApostas } from "../utils/normalizeLabels";
import { normalizeNBATeam } from "../constants/nba-teams";
import { normalizeFootballClub } from "../constants/football-clubs";
import { normalizeNFLTeam } from "../constants/nfl-teams";

// Imports dos módulos refatorados
import { 
  detectPeriodo, 
  detectPeriodoFromContext, 
  getGlobalPeriodo, 
  isOrphanPeriod, 
  mergeOrphanPeriods,
  normalizePeriodo,
  PERIODO_NORMALIZATION_MAP
} from "./parsers/period-parser";
import {
  normalizeCondicao,
  normalizeEstatistica,
  cleanEstatistica,
  stripEstatistica
} from "./normalizers/stat-normalizer";
import {
  isValidPlayerName,
  isValidEstatistica,
  extractPlayerName,
  UI_BLACKLIST
} from "./validators/player-validator";

export interface SemanticTicketInput {
  // TODAS as linhas já normalizadas pelo normalizeOcr
  lines: string[];
}

export interface SemanticTicketLLMResponse extends BilheteFinal {}

const TEAM_SUFFIX_REGEX = /\([A-Z]{2,4}\)$/;

function mergeBrokenLines(lines: string[]): string[] {
  const merged: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (/^\([A-Z]{2,4}\)$/.test(line) && merged.length > 0) {
      merged[merged.length - 1] += " " + line;
    } else {
      merged.push(line);
    }
  }

  return merged;
}

// 🏆 Triggers explícitos para mercado de vitória (winner)
const WINNER_TRIGGERS = [
  "vencedor",
  "vitória",
  "vitoria",
  "resultado final",
  "ganhador",
  "moneyline",
  "ml",
  "1x2",
  "win",
  "winner",
  "match winner"
];

// 🚫 Valida aposta: player_prop SEMPRE precisa de jogador válido
function isValidAposta(aposta: ApostaSemantica, allApostas: ApostaSemantica[], normalizedLines: string[]): boolean {
  // Player props SEMPRE precisam de jogador (não pode ser null/vazio)
  if (aposta.tipo === "player_prop") {
    if (!aposta.jogador || aposta.jogador.trim().length === 0) {
      return false; // ❌ player_prop sem jogador é inválido (é label de UI)
    }
    // Rejeita placeholder/labels de UI como jogador
    if (/\bjogador\b/i.test(aposta.jogador)) {
      return false;
    }
    // Condição obrigatória para player_prop, exceto ações binárias (ex.: "Chutar a Gol")
    const isActionBinary = /chutar a gol|finaliza[çc][õo]es?|assist[eê]ncias?|passes?|defesas?|intercepta[çc][õo]es?|roubos?|bloqueios?|tocos?/i.test(aposta.estatistica || "");
    if (!aposta.condicao || aposta.condicao.trim().length === 0) {
      if (!isActionBinary) {
        return false;
      }
    }
  }
  
  // Winner PRECISA de evidência textual explícita (única proteção)
  if (aposta.tipo === "winner") {
    // Verifica se há trigger de winner no texto
    const hasTrigger = normalizedLines.some(line =>
      WINNER_TRIGGERS.some(trigger => line.toLowerCase().includes(trigger))
    );
    
    if (!hasTrigger) {
      return false; // ❌ Winner sem trigger explícito (provavelmente header de jogo)
    }
  }
  
  return true;
}

// 🚫 Regra de ouro anti-duplicação: não criar aposta nova se já existe player_prop equivalente
function shouldCreateFallbackAposta(candidate: ApostaSemantica, existentes: ApostaSemantica[]): boolean {
  return !existentes.some((a) =>
    a.tipo === "player_prop" &&
    (a.jogador && a.jogador.trim().length > 0) &&
    a.estatistica === candidate.estatistica &&
    a.condicao === candidate.condicao &&
    a.periodo === candidate.periodo
  );
}

const PLAYER_PROP_REGEX = /(Mais de|Menos de)\s+(\d+(?:[.,]\d+)?)/i;
const PROPER_NAME_REGEX = /\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})*/;
const PLAYER_NAME_REGEX = /\b[A-Z][a-z]+\s[A-Z][a-z]+\b/;
// Funções de período agora importadas de parsers/period-parser.ts

// Palavras-chave para cláusulas globais (escanteios, cartões etc.)
const CLAUSE_KEYWORDS = /(escanteios?|escanteio|cart[oã]es?|cartao|cantos?)/i;

// Padrões BTTS (Both Teams To Score / Ambas Marcam)
const BTTS_REGEX = /(?:Ambas\s+(?:equipes?\s+)?[Mm]arcam|Both\s+Teams?\s+(?:To\s+)?Score)\s*[:-]?\s*(Sim|Não|Yes|No)/i;
const BTTS_SPLIT_REGEX = /\s*&\s*/; // Separa múltiplas apostas na mesma linha

// Labels de mercado/UI que não devem virar apostas
const MARKET_LABELS = [
  "mega cota",
  "mega cotações",
  "criar aposta",
  "boost",
  "cotação",
  "cotações",
];

// Tipos imutáveis no fallback: não altera tipo nem enriquece
const IMMUTABLE_TYPES: ApostaSemantica["tipo"][] = ["winner", "match_prop", "team_prop"];

// Estatísticas globais que nunca implicam player_prop
const GLOBAL_STATS = [
  "Gols",
  "Total Gols",
  "Escanteios",
  "Cartões",
  "Finalizações",
  "Chutes",
  "Posse de Bola",
];

// UI_BLACKLIST agora importado de validators/player-validator.ts

// 🔎 Detector de escopo coletivo (ambas/cada time/dupla chance/btts)
function detectCollectiveScope(text: string): "cada time" | "dupla_chance" | "btts" | null {
  const t = text.toLowerCase();
  if (t.includes("ambas") || t.includes("both teams")) return "cada time";
  if (t.includes("cada time") || t.includes("cada equipe")) return "cada time";
  if (t.includes("dupla chance") || /(\b1x\b|\bx2\b|\b12\b)/i.test(t)) return "dupla_chance";
  if (t.includes("ambas marcam") || t.includes("btts")) return "btts";
  return null;
}

// 🔎 Cluster Resultado do Jogo (Dupla Chance > Empate Anula > Winner)
function detectResultadoCluster(text: string): { tipo: "dupla_chance" | "empate_anula" | "winner" } | null {
  const t = text.toLowerCase();
  if (/(\b1x\b|\bx2\b|\b12\b)/i.test(t) || t.includes("dupla chance")) return { tipo: "dupla_chance" };
  if (t.includes("empate anula") || t.includes("draw no bet")) return { tipo: "empate_anula" };
  if (t.includes("vencedor") || t.includes("resultado final")) return { tipo: "winner" };
  return null;
}

// 🔎 Detectores de AH e Totais
function detectAsianHandicap(text: string): string | null {
  const t = text.toLowerCase();
  if (!t.includes("handicap")) return null;
  const m = text.match(/([+-]\d+(?:[.,]\d+)?)/);
  return m ? m[1].replace(",", ".") : null;
}

function detectTotalGoals(text: string): { operador: "Mais de" | "Menos de"; linha: string } | null {
  const t = text.toLowerCase();
  if (!(t.includes("gols") || t.includes("over") || t.includes("under"))) return null;
  const over = /(?:mais de|over)\s*(\d+(?:[.,]\d+)?)/i.exec(text);
  const under = /(?:menos de|under)\s*(\d+(?:[.,]\d+)?)/i.exec(text);
  if (over) return { operador: "Mais de", linha: over[1].replace(",", ".") };
  if (under) return { operador: "Menos de", linha: under[1].replace(",", ".") };
  return null;
}

// extractPlayerName agora importado de validators/player-validator.ts

// Regras robustas para detecção de player_prop (independente da ordem)

/**
 * 🏈 Reconcilia player_props NFL divididas pelo LLM
 * Mescla apostas com jogador (mas sem stat/cond) com apostas vizinhas (com stat/cond mas sem jogador)
 */
function reconcileNFLPlayerProps(apostas: ApostaSemantica[]): ApostaSemantica[] {
  console.log("[NFL RECONCILE] Iniciando reconciliação de", apostas.length, "apostas");
  console.log("[NFL RECONCILE] Apostas originais:", JSON.stringify(apostas.map(a => ({ 
    tipo: a.tipo, 
    jogador: a.jogador, 
    estatistica: a.estatistica, 
    condicao: a.condicao 
  })), null, 2));
  
  const result: ApostaSemantica[] = [];
  const merged = new Set<number>(); // Marca apostas que foram CONSUMIDAS no merge

  for (let i = 0; i < apostas.length; i++) {
    if (merged.has(i)) {
      console.log(`[NFL RECONCILE] Pulando idx=${i} (já foi mesclado)`);
      continue; // Pula apostas que já foram consumidas
    }

    const a = { ...apostas[i] }; // Clone para evitar mutações

    if (a.tipo === "player_prop" && a.jogador) {
      console.log(`[NFL RECONCILE] Player prop encontrado idx=${i}: jogador="${a.jogador}", stat="${a.estatistica}", cond="${a.condicao}"`);
      
      // Tenta olhar a aposta anterior
      const prev = apostas[i - 1];
      if (prev) {
        console.log(`[NFL RECONCILE] Verificando anterior idx=${i-1}: jogador="${prev.jogador}", stat="${prev.estatistica}", cond="${prev.condicao}"`);
      }
      
      // Verificações de condição para merge com anterior
      const prevExists = prev !== undefined;
      const prevNotMerged = prevExists && !merged.has(i - 1);
      const prevHasNoPlayer = prevExists && !prev.jogador;
      const prevHasData = prevExists && (prev.condicao || prev.estatistica);
      const canMergePrev = prevNotMerged && prevHasNoPlayer && prevHasData;
      
      console.log(`[NFL RECONCILE] Merge com anterior: prevExists=${prevExists}, prevNotMerged=${prevNotMerged}, prevHasNoPlayer=${prevHasNoPlayer}, prevHasData=${prevHasData}, canMerge=${canMergePrev}`);
      console.log(`[NFL RECONCILE] Atual: a.condicao="${a.condicao}", !a.condicao=${!a.condicao}`);
      
      if (canMergePrev) {
        console.log(`[NFL RECONCILE] ✅ Mesclando com anterior idx=${i-1}`);
        if (!a.condicao && prev.condicao) {
          a.condicao = prev.condicao;
          console.log(`[NFL RECONCILE] Condicao copiada: ${prev.condicao}`);
        }
        if (!a.estatistica && prev.estatistica) {
          a.estatistica = prev.estatistica;
          console.log(`[NFL RECONCILE] Estatística copiada: ${prev.estatistica}`);
        }
        merged.add(i - 1); // Marca anterior como consumido
      }

      // Tenta olhar a próxima
      const next = apostas[i + 1];
      if (next) {
        console.log(`[NFL RECONCILE] Verificando próxima idx=${i+1}: jogador="${next.jogador}", stat="${next.estatistica}", cond="${next.condicao}"`);
      }
      
      const nextExists = next !== undefined;
      const nextNotMerged = nextExists && !merged.has(i + 1);
      const nextHasNoPlayer = nextExists && !next.jogador;
      const nextHasData = nextExists && (next.condicao || next.estatistica);
      const canMergeNext = nextNotMerged && nextHasNoPlayer && nextHasData;
      
      if (canMergeNext) {
        console.log(`[NFL RECONCILE] ✅ Mesclando com próxima idx=${i+1}`);
        if (!a.condicao && next.condicao) {
          a.condicao = next.condicao;
          console.log(`[NFL RECONCILE] Condicao copiada: ${next.condicao}`);
        }
        if (!a.estatistica && next.estatistica) {
          a.estatistica = next.estatistica;
          console.log(`[NFL RECONCILE] Estatística copiada: ${next.estatistica}`);
        }
        merged.add(i + 1); // Marca próxima como consumida
      }
    }

    result.push(a);
  }

  console.log("[NFL RECONCILE] Resultado final:", JSON.stringify(result.map(a => ({ 
    tipo: a.tipo, 
    jogador: a.jogador, 
    estatistica: a.estatistica, 
    condicao: a.condicao 
  })), null, 2));
  
  return result;
}

// Regras robustas para detecção de player_prop (independente da ordem)
const HAS_CONDICAO_REGEX = /((Mais de|Menos de)\s+\d+(?:[.,]\d+)?|\b\d+(?:[.,]\d+)?\+)/i;
const PLUS_CONDICAO_REGEX = /\b(\d+(?:[.,]\d+)?)\+/;
const HAS_ESTATISTICA_REGEX = /(Cestas|Pontos|Rebotes|Assist[eê]ncias|Gols|Finaliza[çc][õo]es|Chutes?|Passes?|Defesas?|Intercepta[çc][õo]es|Roubos?|Bloqueios?|Tocos?|Triplo[- ]Duplo|Duplo[- ]Duplo|3PT|FG|FT|Recepções?|Touchdowns?|Yards?|Sacks?|Fumbles?)/i;

// 🔍 Detecta se a linha contém estatísticas de NFL
const HAS_NFL_STAT_REGEX = /(Recepções?|Touchdowns?|TD|Yards?|Sacks?|Fumbles?)/i;

// 🔍 Detecta times de NFL na linha (usa dicionário NFL)
import { NFL_CURRENT_TEAMS, NFL_ABBREVIATIONS } from "../constants/nfl-teams";
function isNFLSport(line: string, times: string[] = []): boolean {
  // Verifica se tem time da NFL
  const hasNFLTeam = times.some(team => 
    (NFL_CURRENT_TEAMS as readonly string[]).includes(team)
  );
  if (hasNFLTeam) return true;
  
  // Verifica se tem estatística exclusiva de NFL
  if (HAS_NFL_STAT_REGEX.test(line)) return true;
  
  // Verifica se tem siglas de times de NFL na linha
  const abbrevMap = NFL_ABBREVIATIONS as any;
  if (abbrevMap?.byCode) {
    for (const code of Object.keys(abbrevMap.byCode)) {
      if (new RegExp(`\\(${code}\\)`, 'i').test(line)) return true;
    }
  }
  
  return false;
}

// isOrphanPeriod e mergeOrphanPeriods agora importados de parsers/period-parser.ts

// 🎯 Parser determinístico para padrão: "[PERÍODO] - [JOGADOR] - [ESTATÍSTICA] [CONDIÇÃO]"
// Exemplo: "1º Quarto - Nikola Jokic - Rebotes 1+" 
function parseDeterministicPeriodPattern(line: string): ApostaSemantica | null {
  const trimmed = line.trim();
  
  // ======= PADRÃO 1: [PERÍODO] - [JOGADOR] - [ESTATÍSTICA] [CONDIÇÃO] =======
  // Exemplo: "1º Quarto - Nikola Jokic - Rebotes 1+" ou "HT - Francisco (JUV) - Gols 1+"
  const pattern1 = /^((?:1º|2º|3º|4º)\s*(?:Quarto|Tempo|Período)|HT|FT|Q[1-4]|1T|2T|Intervalo|Jogo)\s*-\s*([A-Z][a-zA-ZÀ-ú]+(?:\s+[A-Z][a-zA-ZÀ-ú]+)*(?:\s*\([A-Z]{2,4}\))?)\s*-\s*(.+)$/i;
  let match = trimmed.match(pattern1);
  
  if (match) {
    const [, periodoRaw, jogador, estatisticaCondicao] = match;
    return buildPlayerPropFromMatch(periodoRaw, jogador, estatisticaCondicao);
  }
  
  // ======= PADRÃO 2: [PERÍODO] [JOGADOR] - [ESTATÍSTICA] [CONDIÇÃO] =======
  // Exemplo: "FT Nikola Jokic - Assistências 2+" ou "HT Francisco (JUV) - Chutes 1+"
  const pattern2 = /^((?:1º|2º|3º|4º)\s*(?:Quarto|Tempo|Período)|HT|FT|Q[1-4]|1T|2T|Intervalo|Jogo)\s+([A-Z][a-zA-ZÀ-ú]+(?:\s+[A-Z][a-zA-ZÀ-ú]+)*(?:\s*\([A-Z]{2,4}\))?)\s+-\s+(.+)$/i;
  match = trimmed.match(pattern2);
  
  if (match) {
    const [, periodoRaw, jogador, estatisticaCondicao] = match;
    return buildPlayerPropFromMatch(periodoRaw, jogador, estatisticaCondicao);
  }
  
  // ======= PADRÃO 3: [JOGADOR] - [ESTATÍSTICA] [CONDIÇÃO] (sem período) =======
  // Exemplo: "Nikola Jokic - Assistências 10+" ou "Francisco Conceição (JUV) - Chutar a Gol"
  const pattern3 = /^([A-Z][a-zA-ZÀ-ú]+(?:\s+[A-Z][a-zA-ZÀ-ú]+)*(?:\s*\([A-Z]{2,4}\))?)\s+-\s+(.+)$/;
  match = trimmed.match(pattern3);
  
  if (match) {
    const [, potentialJogador, estatisticaCondicao] = match;
    
    // 🚫 Validação: não parsear se "jogador" é na verdade uma estatística global
    const invalidNames = [
      'total gols', 'total', 'gols', 'escanteios', 'cartões', 
      'vencedor', 'resultado', 'handicap', 'ambas marcam',
      'dupla chance', 'empate anula', 'cada time'
    ];
    
    if (invalidNames.some(invalid => potentialJogador.toLowerCase().includes(invalid))) {
      return null; // Não é jogador, deixa para o LLM/fallback
    }
    
    // Novo: suporta "ESTATÍSTICA Mais de/ Menos de N" de forma direta
    const statOpNum = estatisticaCondicao.match(/^([A-Za-zÀ-ú\s]+?)\s+(Mais de|Menos de|Over|Under)\s+(\d+(?:[.,]\d+)?)$/i);
    if (statOpNum) {
      const estatisticaRaw = statOpNum[1].trim();
      const operador = statOpNum[2].replace(/^(Over)$/i, 'Mais de').replace(/^(Under)$/i, 'Menos de');
      const numero = statOpNum[3];
      const valor = parseFloat(numero.replace(',', '.'));
      const estatisticaCanon = normalizeEstatistica(estatisticaRaw) ?? estatisticaRaw;

      return {
        tipo: 'player_prop',
        jogador: potentialJogador.trim(),
        estatistica: estatisticaCanon,
        condicao: `${operador} ${valor}`,
        valor: valor,
        time: null,
        timeAbrev: null,
        periodo: null,
        confianca: 'alta',
      };
    }

    return buildPlayerPropFromMatch(null, potentialJogador, estatisticaCondicao);
  }
  
  return null;
}

// 🔨 Helper: constrói player_prop a partir dos componentes parseados
function buildPlayerPropFromMatch(
  periodoRaw: string | null,
  jogador: string,
  estatisticaCondicao: string
): ApostaSemantica | null {
  // Normaliza período usando função importada
  const periodo = normalizePeriodo(periodoRaw);
  
  // Parse estatística + condição
  // Exemplos: "Rebotes 1+", "10+ Assistências", "2+ Pontos"
  // Padrão 1: "ESTATÍSTICA NÚMERO+"
  let estatMatch = estatisticaCondicao.match(/^([A-Za-zÀ-ú\s]+?)\s+(\d+(?:[.,]\d+)?)\+?$/i);
  if (estatMatch) {
    const estatistica = estatMatch[1].trim();
    const condicao = `${estatMatch[2]}+`;
    const valor = parseFloat(estatMatch[2].replace(',', '.'));
    
    return {
      tipo: 'player_prop',
      jogador: jogador.trim(),
      estatistica,
      condicao,
      valor,
      time: null,
      timeAbrev: null,
      periodo: periodo as ApostaSemantica['periodo'],
      confianca: 'alta',
    };
  }
  
  // Padrão 2: "NÚMERO+ ESTATÍSTICA" (ordem invertida)
  estatMatch = estatisticaCondicao.match(/^(\d+(?:[.,]\d+)?)\+?\s+([A-Za-zÀ-ú\s]+)$/i);
  if (estatMatch) {
    const condicao = `${estatMatch[1]}+`;
    const valor = parseFloat(estatMatch[1].replace(',', '.'));
    const estatistica = estatMatch[2].trim();
    
    return {
      tipo: 'player_prop',
      jogador: jogador.trim(),
      estatistica,
      condicao,
      valor,
      time: null,
      timeAbrev: null,
      periodo: periodo as ApostaSemantica['periodo'],
      confianca: 'alta',
    };
  }
  
  // Padrão 3: Estatística SEM condição numérica (ex: "Chutar a Gol", "Marcar", etc)
  // Para casos onde não há "1+", "2+", apenas a ação
  // ⚠️ IMPORTANTE: Só aceita se for uma ação/verbo reconhecível (não match_prop)
  if (/^[A-Za-zÀ-ú\s]+$/i.test(estatisticaCondicao.trim())) {
    const text = estatisticaCondicao.trim().toLowerCase();
    
    // 🚫 Rejeita se contém keywords de match_prop
    const matchPropKeywords = ['cada', 'ambas', 'total', 'handicap', 'vencedor', 'empate', 'bate', 'marcar', 'mais', 'menos'];
    if (matchPropKeywords.some(kw => text.includes(kw))) {
      return null; // Deixa para o LLM/fallback
    }
    
    // ✅ Aceita apenas se for uma ação específica (chut, finali, assist, etc)
    const validActions = ['chut', 'finali', 'gol', 'assist', 'pass', 'defe', 'inter', 'roub', 'bloq', 'toco'];
    if (!validActions.some(action => text.includes(action))) {
      return null; // Não é uma ação player_prop conhecida
    }
    
    return {
      tipo: 'player_prop',
      jogador: jogador.trim(),
      estatistica: estatisticaCondicao.trim(),
      condicao: 'Sim', // Condição genérica para apostas binárias
      valor: null,
      time: null,
      timeAbrev: null,
      periodo: periodo as ApostaSemantica['periodo'],
      confianca: 'alta',
    };
  }
  
  return null;
}

// 🔄 Pré-processa linhas com parser determinístico, retorna apostas + linhas restantes
function preprocessWithDeterministicParser(lines: string[]): {
  parsedBets: ApostaSemantica[];
  remainingLines: string[];
} {
  const parsedBets: ApostaSemantica[] = [];
  const remainingLines: string[] = [];
  
  for (const line of lines) {
    const bet = parseDeterministicPeriodPattern(line);
    if (bet) {
      parsedBets.push(bet);
    } else {
      remainingLines.push(line);
    }
  }
  
  // 🎯 Dedupe: Remove apostas duplicadas (mesmo jogador + estatística + condição)
  // Prioriza apostas COM período sobre apostas SEM período
  const deduped: ApostaSemantica[] = [];
  const seen = new Map<string, ApostaSemantica>();
  
  for (const bet of parsedBets) {
    const key = `${bet.jogador}|${bet.estatistica}|${bet.condicao}`;
    const existing = seen.get(key);
    
    if (!existing) {
      seen.set(key, bet);
    } else {
      // Se aposta atual TEM período e a existente NÃO tem → substitui
      // Se aposta atual NÃO tem período e a existente TEM → mantém existente
      if (bet.periodo && !existing.periodo) {
        seen.set(key, bet);
      }
      // Caso contrário, mantém a primeira (existente)
    }
  }
  
  deduped.push(...seen.values());
  
  return { parsedBets: deduped, remainingLines };
}

// Funções de validação e normalização agora importadas de:
// - validators/player-validator.ts: isValidPlayerName, isValidEstatistica
// - normalizers/stat-normalizer.ts: cleanEstatistica, normalizeCondicao, normalizeEstatistica, stripEstatistica

function buildDeterministicPlayerProp(line: string): ApostaSemantica | null {
  // 🔒 Regra 1: verificar presença simultânea de condição e estatística
  if (!HAS_CONDICAO_REGEX.test(line) || !HAS_ESTATISTICA_REGEX.test(line)) {
    return null;
  }

  // 🔒 Regra 2: extrair condição sem alterar a linha original
  const original = line;
  let condMatch = original.match(PLAYER_PROP_REGEX);
  let matchedText: string;
  let operador: string | null = null;
  let numeroBruto: string;

  if (!condMatch) {
    const plusMatch = original.match(PLUS_CONDICAO_REGEX);
    if (!plusMatch) {
      return null;
    }
    matchedText = plusMatch[0];
    numeroBruto = plusMatch[1];
  } else {
    matchedText = condMatch[0];
    operador = condMatch[1];
    numeroBruto = condMatch[2];
  }
  const valor = parseFloat(numeroBruto.replace(",", "."));
  
  // 🔒 Regra 3: extrair estatística do prefixo OU sufixo (ainda da original)
  const parts = original.split(matchedText);
  const before = parts[0] || "";
  const after = parts[1] || "";
  
  // 🔒 Regra 4: limpar estatística antes de validar
  const cleanBefore = cleanEstatistica(before);
  const cleanAfter = cleanEstatistica(after);
  
  // 🔒 Regra 5: escolher a estatística válida na forma canônica
  const estatisticaBefore = cleanBefore;
  const estatisticaAfter = cleanAfter;
  const canonicalAfter = normalizeEstatistica(estatisticaAfter);
  const canonicalBefore = normalizeEstatistica(estatisticaBefore);

  const estatistica = canonicalAfter ?? canonicalBefore ?? "";
  
  if (!estatistica) {
    const hasCondicao = HAS_CONDICAO_REGEX.test(original);
    const hasEstatistica = HAS_ESTATISTICA_REGEX.test(original);
    console.log("🧨 FALLBACK DEBUG", {
      line: original,
      hasCondicao,
      hasEstatistica,
      estatisticaBefore,
      estatisticaAfter,
      isValidBefore: isValidEstatistica(estatisticaBefore),
      isValidAfter: isValidEstatistica(estatisticaAfter),
    });
    return null;
  }
  
  // 🎯 ORDEM OBRIGATÓRIA: 1️⃣ PROCURAR JOGADOR PRIMEIRO
  let jogadorNome: string | null = null;
  let timeAbrevDetectado: string | null = null;

  // Tenta extrair jogador/time quando a linha segue o padrão
  // <ESTATISTICA> <NOME> (<TIME>) - <CONDICAO>
  const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const estatisticaPrefix = new RegExp(`^\\s*${escapeRegex(estatistica)}\\s+`, "i");

  if (estatisticaPrefix.test(original)) {
    const resto = original.replace(estatisticaPrefix, "").trim();
    const condSplit = resto.split("-");
    const antesDoHifen = condSplit[0]?.trim() ?? ""; // ex.: "Stephen Curry (GSW)"

    const timeInlineMatch = /\(([A-Z]{2,4})\)/.exec(antesDoHifen);
    if (timeInlineMatch) {
      timeAbrevDetectado = timeInlineMatch[1];
    }

    const nomePossivel = timeInlineMatch
      ? antesDoHifen.slice(0, timeInlineMatch.index).trim()
      : antesDoHifen.trim();

    if (PLAYER_NAME_REGEX.test(nomePossivel) && isValidPlayerName(nomePossivel)) {
      jogadorNome = nomePossivel;
    }
  }

  // Se não conseguiu pelo padrão, tenta extrair nome após remover estatística
  if (!jogadorNome) {
    const nameSource = stripEstatistica(original);

    const nameSourceClean = nameSource
      .replace(/\d+[ºª]\s+(?:Quarto|Tempo|Período|Metade)/gi, "")
      .replace(/\b(?:Jogo|Partida)\b/gi, "")
      .trim();

    const nomeMatch = nameSourceClean.match(PLAYER_NAME_REGEX);
    if (nomeMatch && isValidPlayerName(nomeMatch[0])) {
      jogadorNome = nomeMatch[0];
    }
  }
  
  // 🎯 ORDEM OBRIGATÓRIA: 2️⃣ DECIDIR TIPO BASEADO NO JOGADOR
  const tipo: "player_prop" | "match_prop" = jogadorNome ? "player_prop" : "match_prop";
  
  // 🎯 ORDEM OBRIGATÓRIA: 3️⃣ SÓ DEPOIS EXTRAIR PERÍODO
  const periodo = detectPeriodo(original);
  
  const timeAbrevMatch = TEAM_SUFFIX_REGEX.exec(original);

  // Reconstrói a condição com o valor parseado (corrige "25" → "2.5")
  let condicaoFormatada: string;
  if (operador) {
    condicaoFormatada = Number.isFinite(valor) ? `${operador} ${valor}` : `${operador} ${numeroBruto}`;
  } else {
    condicaoFormatada = Number.isFinite(valor) ? `${valor}+` : `${numeroBruto}+`;
  }

  // Normaliza time NBA ou futebol se detectado
  const timeAbrevFinal = timeAbrevDetectado ?? (timeAbrevMatch ? timeAbrevMatch[0].replace(/[()]/g, "") : null);
  const timeNormalizado = timeAbrevFinal 
    ? (normalizeNBATeam(timeAbrevFinal) || normalizeFootballClub(timeAbrevFinal) || null)
    : null;

  return {
    tipo: tipo,
    jogador: jogadorNome,
    estatistica: estatistica,
    condicao: condicaoFormatada.trim(),
    valor: Number.isFinite(valor) ? valor : null,
    time: timeNormalizado,
    timeAbrev: timeAbrevFinal,
    periodo: periodo,
    confianca: "media",
  };
}

// 🎯 Parser BTTS: extrai mercado "Ambas Marcam" (válido mesmo sem número)
function parseBTTS(line: string): ApostaSemantica | null {
  // Separa linha por & (caso tenha múltiplas apostas)
  const parts = line.split(BTTS_SPLIT_REGEX);
  const bttsLine = parts[0].trim();

  const match = bttsLine.match(BTTS_REGEX);
  if (!match) return null;

  const resposta = match[1]; // "Sim" ou "Não"
  const condicao = resposta.charAt(0).toUpperCase() + resposta.slice(1).toLowerCase(); // Normaliza

  return {
    tipo: "match_prop",
    jogador: null,
    estatistica: "Ambas Marcam",
    condicao: condicao, // "Sim" ou "Não"
    valor: null,
    time: null,
    timeAbrev: null,
    periodo: "Jogo",
    confianca: "alta",
  };
}

// 🧩 Constrói apostas match_prop a partir de cláusulas globais (ex: "Cada time bate 4+ escanteios")
function buildClauseMatchProps(line: string): ApostaSemantica[] {
  const lower = line.toLowerCase();

  // ❌ Ignora se tem nome de jogador
  if (PLAYER_NAME_REGEX.test(line)) return [];

  // ❌ Ignora labels de mercado/UI
  if (MARKET_LABELS.some((lbl) => lower.includes(lbl))) return [];

  // Deve ter número com "+" e palavras-chave de estatística global
  const numericMatches = line.match(/\d+\+/g) ?? [];
  if (numericMatches.length < 2) return []; // precisa de múltiplas condições numéricas
  if (!CLAUSE_KEYWORDS.test(line)) return [];

  // Divide por " e " para capturar múltiplas cláusulas
  const clauses = line.split(/\s+e\s+/i).map((c) => c.trim()).filter(Boolean);

  const bets: ApostaSemantica[] = [];
  for (const clause of clauses) {
    if (!/\d+\+/.test(clause) || !CLAUSE_KEYWORDS.test(clause)) continue;

    bets.push({
      tipo: "match_prop",
      jogador: null,
      estatistica: clause,
      condicao: "",
      valor: null,
      time: null,
      timeAbrev: null,
      periodo: null,
      confianca: "media",
    });
  }

  return bets;
}

// 🔍 Detecta se existe linha OCR clara de player_prop (estatística + condição + nome)
function existsClearPlayerPropLine(lines: string[]): boolean {
  for (const line of lines) {
    const hasCondicao = HAS_CONDICAO_REGEX.test(line);
    const hasEstatistica = HAS_ESTATISTICA_REGEX.test(line);
    const hasPlayerName = PLAYER_NAME_REGEX.test(line);

    if (hasCondicao && hasEstatistica && hasPlayerName) {
      // Valida que o nome detectado não está na blacklist
      const nomeMatch = line.match(PLAYER_NAME_REGEX);
      if (nomeMatch && isValidPlayerName(nomeMatch[0])) {
        console.log("✅ Linha clara de player_prop detectada:", line);
        return true;
      }
    }
  }
  return false;
}

// 🔍 Detecta se uma aposta está incompleta (faltam campos críticos)
function isIncomplete(aposta: ApostaSemantica): boolean {
  if (aposta.tipo === "player_prop") {
    return !aposta.jogador || !aposta.estatistica;
  }

  if (aposta.tipo === "team_prop" || aposta.tipo === "match_prop") {
    return !aposta.estatistica;
  }

  return false;
}

// 🔒 Valida aposta final antes do build
function isApostaValida(aposta: ApostaSemantica): boolean {
  const hasEstatistica = Boolean(aposta.estatistica);
  const hasCondicao = Boolean(aposta.condicao && aposta.condicao.trim().length > 0);

  // Rejeita placeholder de UI como jogador
  if (aposta.jogador && /\bjogador\b/i.test(aposta.jogador)) {
    return false;
  }

  if (aposta.tipo === "winner") return true;
  if (aposta.tipo === "player_prop") return hasCondicao && hasEstatistica;
  if (aposta.tipo === "match_prop") {
    // Mercados especiais válidos sem condição numérica (BTTS, etc)
    const isBTTS = aposta.estatistica === "Ambas Marcam" && (aposta.condicao === "Sim" || aposta.condicao === "Não");
    if (isBTTS) return true;
    
    // Regra geral: match_prop precisa de condição
    return hasCondicao && hasEstatistica;
  }
  if (aposta.tipo === "team_prop") return hasEstatistica;

  return hasEstatistica;
}

// 🧬 Tenta enriquecer aposta usando APENAS linhas que contêm sua condição + estatística
function enrichFromLine(
  aposta: ApostaSemantica,
  line: string,
): ApostaSemantica | null {
  // Regra: só enriquece com linhas que contêm EXATAMENTE a condição + estatística da aposta
  const hasCondicao = aposta.condicao && line.includes(aposta.condicao);
  const hasEstatistica = aposta.estatistica && line.toLowerCase().includes(aposta.estatistica.toLowerCase());

  // Se não tem ambos, não é linha candidata
  if (!hasCondicao || !hasEstatistica) {
    return null;
  }

  const extracted = buildDeterministicPlayerProp(line);
  if (!extracted) return null;

  // 🔒 REGRA CRÍTICA: Só enriquece JOGADOR, NUNCA período
  // Período vem do LLM ou fica null (default = Jogo completo)
  // Se tentar enriquecer período do OCR, cria bug onde apostas sem período
  // herdam período de OUTRAS apostas com mesma estatística
  return {
    ...aposta,
    jogador: aposta.jogador ?? extracted.jogador,
    timeAbrev: aposta.timeAbrev ?? extracted.timeAbrev,
  };
}

// 🔒 Corrige tipo de aposta: JOGADOR decide tipo, sempre
function isDependentStatLine(line: string): boolean {
  return /rebotes|assist[eê]ncias|pontos/i.test(line) && !extractPlayerName(line);
}

function getContextualPlayerName(lines: string[], index: number): string | null {
  const current = lines[index] ?? "";
  const previous = lines[index - 1] ?? "";
  const next = lines[index + 1] ?? "";

  const candidates = [current, previous, next]
    .map((l) => extractPlayerName(l))
    .filter((name): name is string => Boolean(name));

  if (candidates.length > 0) {
    return candidates[0];
  }

  return null;
}

function enforcePlayerSafety(
  aposta: ApostaSemantica,
  lines: string[],
  index: number,
): ApostaSemantica {
  if (aposta.estatistica !== "Rebotes" || !aposta.periodo) {
    return aposta;
  }

  const player = getContextualPlayerName(lines, index);
  if (!player) return aposta;

  return {
    ...aposta,
    tipo: "player_prop",
    jogador: aposta.jogador ?? player,
  };
}

function correctApostaTipo(
  aposta: ApostaSemantica,
  lines: string[],
  index: number,
): ApostaSemantica {
  const currentLine = lines[index] ?? "";
  const previousLine = lines[index - 1] ?? "";

  // 🔒 Regra de dependência: linha de estatística herda jogador da linha anterior
  if (!aposta.jogador && isDependentStatLine(currentLine)) {
    const jogadorAnterior = extractPlayerName(previousLine);
    if (jogadorAnterior) {
      return {
        ...aposta,
        tipo: "player_prop",
        jogador: jogadorAnterior,
      };
    }
  }

  // 🎯 ORDEM OBRIGATÓRIA: 1️⃣ Detecta jogador PRIMEIRO (com contexto)
  const playerFromContext = getContextualPlayerName(lines, index);

  // 🎯 ORDEM OBRIGATÓRIA: 2️⃣ DECIDE TIPO baseado no jogador
  // 🛡️ MAS: estatísticas globais (Gols, Escanteios) NUNCA viram player_prop
  if (playerFromContext && !GLOBAL_STATS.includes(aposta.estatistica)) {
    return {
      ...aposta,
      tipo: "player_prop",
      jogador: aposta.jogador ?? playerFromContext,
    };
  }

  // 🔒 Regra de segurança para rebotes com período definido
  const reforcada = enforcePlayerSafety(aposta, lines, index);
  if (reforcada !== aposta) {
    return reforcada;
  }

  // Sem jogador explícito → mantém tipo atual (match_prop ou team_prop)
  return aposta;
}

// 🎯 Calcula prioridade semântica de uma aposta (menor = mais importante)
function getSemanticPriority(aposta: ApostaSemantica): number {
  if (aposta.tipo === "winner") return 1;
  
  // Mercados binários / estados da partida (Ambas Marcam, Dupla Chance, etc)
  if (aposta.tipo === "match_prop") {
    const isBinaryMarket = 
      aposta.estatistica === "Ambas Marcam" ||
      aposta.estatistica?.toLowerCase().includes("dupla chance") ||
      (aposta.condicao === "Sim" || aposta.condicao === "Não");
    
    if (isBinaryMarket) return 2;
    return 3; // match_prop genérico (Total Gols, Escanteios)
  }
  
  if (aposta.tipo === "team_prop") return 4;
  if (aposta.tipo === "player_prop") return 5;
  
  return 99; // fallback
}

// � FALLBACK SIMPLIFICADO: Apenas preenche nulls, NUNCA sobrescreve ou infere
// Contrato: se LLM decidiu algo, respeitamos. Se não decidiu, deixamos null ou "Jogo".
function applyDeterministicFallback(
  lines: string[],
  apostas: ApostaSemantica[],
): ApostaSemantica[] {
  console.log("🏗️ FALLBACK: Preenchendo campos null (sem inferência)...");

  if (!apostas.length) {
    return apostas;
  }

  // ✅ PERMITIDO: Preencher período null com default "Jogo"
  // ✅ PERMITIDO: Preencher condicao null para player_prop com ações binárias
  const apostasComPeriodoDefault = apostas.map((aposta) => {
    const periodo = aposta.periodo ?? "Jogo";
    
    // Para player_prop com estatística binária (sem valor numérico), adiciona "Sim"
    if (aposta.tipo === "player_prop" && !aposta.condicao) {
      const isBinaryAction = /chutar|chute|finaliza[çc]|marcar|assist|pass|defe|intercept|roub|bloq|toco/i.test(
        aposta.estatistica || ""
      );
      if (isBinaryAction) {
        return { ...aposta, periodo, condicao: "Sim" };
      }
    }
    
    return { ...aposta, periodo };
  });

  // ✅ PERMITIDO: Adicionar apostas BTTS se o LLM não detectou
  const bttsExtras: ApostaSemantica[] = [];
  for (const line of lines) {
    const btts = parseBTTS(line);
    if (btts) {
      const jaExiste = apostasComPeriodoDefault.some(
        (a) => a.tipo === "match_prop" && a.estatistica === "Ambas Marcam"
      );
      if (!jaExiste) {
        console.log("🎯 BTTS detectado no OCR (LLM não detectou):", line);
        bttsExtras.push(btts);
      }
    }
  }

  const withBTTS = bttsExtras.length > 0
    ? [...apostasComPeriodoDefault, ...bttsExtras]
    : apostasComPeriodoDefault;
  
  console.log(`✅ Fallback concluído: ${withBTTS.length} apostas (${bttsExtras.length} BTTS adicionados)`);
  
  // ❌ PROIBIDO: Não tentamos mais inferir jogador, período, ou criar apostas do zero
  // O LLM melhorado com exemplos deve fazer isso corretamente
  
  return withBTTS;
}

// 🔧 Normaliza apostas (aplica normalizeCondicao em todas)
function normalizeApostas(apostas: ApostaSemantica[]): ApostaSemantica[] {
  return apostas.map((aposta) => {
    let estatistica = aposta.estatistica;
    const estatLower = (estatistica ?? "").toLowerCase();
    
    // Normaliza "Gols"/"Total de Gols"/"Gols Mais/Menos" para forma canônica
    if (aposta.tipo === "match_prop" && 
        (/mais de|menos de|over|under/i.test(aposta.condicao ?? "")) &&
        (estatLower === "gols" || estatLower === "total gols" || estatLower === "total de gols")) {
      estatistica = "Total Gols";
    }
    
    return {
      ...aposta,
      estatistica,
      condicao: normalizeCondicao(aposta.condicao) ?? aposta.condicao,
    };
  });
}
// 🚧 Guard rails obrigatórios (regra de ouro)
const PLAYER_STATS = [
  "Rebotes",
  "Assistências",
  "Pontos",
  "Cestas de 3 Pontos",
];

function forcePlayerPropIfPlayerPresent(bet: ApostaSemantica): ApostaSemantica {
  if (bet.jogador && bet.tipo !== "player_prop") {
    return { ...bet, tipo: "player_prop" };
  }
  return bet;
}

function normalizePeriodoOnly(bet: ApostaSemantica): ApostaSemantica {
  if (bet.periodo && bet.tipo === "player_prop") {
    // período é decorador — não muda tipo
    return bet;
  }
  return bet;
}

function preventIllegalMatchProp(bet: ApostaSemantica): ApostaSemantica {
  if (bet.tipo === "match_prop" && PLAYER_STATS.includes(bet.estatistica) && !bet.time) {
    return { ...bet, tipo: "player_prop" };
  }
  return bet;
}

// 🔧 Correção determinística por linha: se a linha base contém jogador, força player_prop
function coercePlayerPropByRawLines(apostas: ApostaSemantica[], lines: string[]): ApostaSemantica[] {
  // ⚠️ DESABILITADO: Não convertemos match_prop → player_prop mais
  // O LLM melhorado com prompt rico deve fazer essa distinção corretamente
  // Se o LLM decidiu que é match_prop (ex: "Total Gols"), respeitamos sua decisão
  return apostas;
}

type OverUnder = "OVER" | "UNDER";

// 🔒 Mantém apenas uma linha de total de gols por período, normalizando operador/período e removendo conflitos OVER/UNDER
function enforceSingleTotalGols(apostas: ApostaSemantica[]): ApostaSemantica[] {
  const others: ApostaSemantica[] = [];
  const byPeriodo = new Map<string, { over?: ApostaSemantica; under?: ApostaSemantica }>();

  for (const a of apostas) {
    const estatLower = (a.estatistica ?? "").toLowerCase();
    const isGols = a.tipo === "match_prop" && 
                   (estatLower === "gols" || 
                    estatLower === "total de gols" || 
                    estatLower === "total gols" ||
                    estatLower === "gols mais/menos");
    const condMatch = (a.condicao ?? "").match(/\b(mais de|over|menos de|under)\s+(-?\d+(?:[.,]\d+)?)/i);

    if (!isGols || !condMatch) {
      others.push(a);
      continue;
    }

    const operadorRaw = condMatch[1].toLowerCase();
    const operador: OverUnder = operadorRaw.includes("mais") || operadorRaw.includes("over") ? "OVER" : "UNDER";
    const valor = parseFloat(condMatch[2].replace(",", "."));
    const periodoKey = normalizePeriodo(a.periodo ?? "Jogo") ?? "Jogo";

    const bucket = byPeriodo.get(periodoKey) ?? {};
    const existing = bucket[operador.toLowerCase() as keyof typeof bucket];

    if (!existing) {
      bucket[operador.toLowerCase() as keyof typeof bucket] = a;
      byPeriodo.set(periodoKey, bucket);
      continue;
    }

    const existingMatch = (existing.condicao ?? "").match(/\b(mais de|over|menos de|under)\s+(-?\d+(?:[.,]\d+)?)/i);
    const existingValor = existingMatch ? parseFloat(existingMatch[2].replace(",", ".")) : null;

    if (existingValor === null || Number.isNaN(existingValor)) {
      bucket[operador.toLowerCase() as keyof typeof bucket] = a;
      byPeriodo.set(periodoKey, bucket);
      continue;
    }

    // Se os valores são DIFERENTES, são apostas distintas - adiciona aos "others"
    if (Math.abs(valor - existingValor) > 0.01) {
      others.push(a);
      continue;
    }

    // Se valores são IGUAIS, mantém apenas uma (a que tem mais informação)
    // Prioriza: 1) aposta com .valor definido, 2) confiança alta
    if (a.valor !== null && a.valor !== undefined && existing.valor === null) {
      bucket[operador.toLowerCase() as keyof typeof bucket] = a;
      byPeriodo.set(periodoKey, bucket);
    } else if (a.confianca === 'alta' && existing.confianca !== 'alta') {
      bucket[operador.toLowerCase() as keyof typeof bucket] = a;
      byPeriodo.set(periodoKey, bucket);
    }
    // Caso contrário, mantém a aposta existente (não faz nada - é uma duplicata)
  }

  const resolved: ApostaSemantica[] = [];

  for (const [periodoKey, bucket] of byPeriodo.entries()) {
    if (bucket.over && bucket.under) {
      console.warn("⚠️ Conflito OVER/UNDER para o mesmo período, descartando ambos:", periodoKey, bucket.over.condicao, bucket.under.condicao);
      continue;
    }
    if (bucket.over) resolved.push(bucket.over);
    if (bucket.under) resolved.push(bucket.under);
  }

  return [...others, ...resolved];
}

// 🔒 Normaliza semantics de "cada time"/"ambas equipes" baseado na linha fonte
function normalizeCadaTime(aposta: ApostaSemantica, sourceLine?: string): ApostaSemantica {
  const src = sourceLine?.toLowerCase() ?? "";
  const isCadaTime = src.includes("cada time") || src.includes("ambas equipes");

  if (!isCadaTime) return aposta;

  return {
    ...aposta,
    time: "cada time",
  };
}

export async function semanticTicketLLM(
  input: SemanticTicketInput,
  client: TicketLlmClient = defaultLlmClient as TicketLlmClient,
): Promise<SemanticTicketLLMResponse> {
  console.log("USANDO TICKET LLM:", Boolean((client as any).callTicketParser));

  // 🔧 1. Mescla linhas quebradas (OCR)
  const mergedLines = mergeBrokenLines(input.lines);
  
  // 🔧 2. Mescla períodos órfãos com próxima linha (ex: "HT" + "Jokic - 1+ REB" → "HT - Jokic - 1+ REB")
  const withMergedPeriods = mergeOrphanPeriods(mergedLines);
  
  // 🔧 3. Parser determinístico para padrões óbvios ANTES do LLM
  const { parsedBets: deterministicBets, remainingLines: linesToLLM } = preprocessWithDeterministicParser(withMergedPeriods);
  
  // 🔧 4. Limpa linhas vazias (apenas as que vão para o LLM)
  const cleaned = linesToLLM
    .map((l) => l.trim())
    .filter((l) => !!l)
    .map(line => {
      // 🔧 Limpa caracteres problemáticos de OCR/encoding
      let clean = line
        // Remove APENAS bullet points no início, deixa ° intacto
        .replace(/^[©®™•·¡ⁿ\u2022\s]+/, '')
        // Normaliza acentos problemáticos de encoding
        .replace(/├[º]/g, 'ç')
        .replace(/├║/g, 'ú')
        .replace(/├í/g, 'í')
        .replace(/├á/g, 'á')
        .replace(/├ó/g, 'ó')
        .replace(/├Â/g, 'ã')
        .replace(/┬®/g, '©')
        .replace(/┬ø/g, '°')
        .replace(/ÔÇó/g, '•')
        .replace(/Ô£à/g, '√')
        // Remove  outros caracteres não ASCII, MANTÉM acentos úteis E °
        .split('')
        .filter(c => {
          const code = c.charCodeAt(0);
          // Mantém ASCII (32-126) + acentos latinos (192-377) + ° e outros caracteres úteis
          return (code >= 32 && code <= 126) || (code >= 192 && code <= 377) || '°º'.includes(c);
        })
        .join('')
        .trim();
      
      return clean;
    })
    .filter((l) => !!l);

  // Caminho principal: LLM de ticket completo (LLM-first).
  // Não usamos mais metadados pré-extraídos aqui: o modelo recebe
  // TODAS as linhas e deve inferir esporte, torneio, valores etc.
  if (typeof client.callTicketParser === "function") {
    const full = await client.callTicketParser(cleaned);

    console.log(
      "Apostas Extraídas do LLM:",
      JSON.stringify(full.apostasDetalhadas ?? [], null, 2),
    );

    const hasMissingTeamAbbrev = (full.apostasDetalhadas ?? []).some(
      (aposta: any) => aposta && !aposta.timeAbrev,
    );

    if (hasMissingTeamAbbrev) {
      for (const originalLine of cleaned) {
        if (TEAM_SUFFIX_REGEX.test(originalLine)) {
          console.warn("Possível time não capturado:", originalLine);
        }
      }
    }

    // Extraímos metadados locais em paralelo, mas agora apenas para
    // SERVIR DE ÂNCORA para campos sensíveis como valores numéricos.
    const { metadata: localMetadata } = extractMetadata(cleaned);

    // Esporte: usar apenas o dicionário (metadados locais). Se não houver, fica sem informação.
    const esporte = localMetadata.esporte ?? null;

    const torneio = full.torneio ?? localMetadata.torneio ?? null;
    const evento = full.evento ?? localMetadata.evento ?? null;
    // Para números financeiros, preferimos o parser local quando
    // conseguir extrair algo das linhas; caso contrário usamos o LLM.
    const valorApostado =
      localMetadata.valorApostado ?? full.valorApostado ?? null;
    const odd = localMetadata.odd ?? full.odd ?? null;
    const retornoPotencial =
      localMetadata.retornoPotencial ?? full.retornoPotencial ?? null;
    const tipo = full.tipo ?? localMetadata.tipo ?? null;
    const data = full.data ?? localMetadata.data ?? null;
    const bonus = localMetadata.bonus ?? full.bonus ?? null;

    // 🎯 MESCLA: apostas determinísticas (parser regex) + apostas do LLM
    let apostasBase = [
      ...deterministicBets, // ✅ Parser determinístico (100% confiável)
      ...normalizeLabelsOnApostas(enforceOnAll(full.apostasDetalhadas ?? [])) // LLM
    ];
    
    // 🔄 PIPELINE FINAL (ordem correta) — antes do fallback
    apostasBase = coercePlayerPropByRawLines(apostasBase, cleaned)
      .map(forcePlayerPropIfPlayerPresent)
      .map(preventIllegalMatchProp)
      .map(normalizePeriodoOnly);
    // Aplica período global como decorador quando ausente
    const globalPeriodo = getGlobalPeriodo(cleaned);
    if (globalPeriodo) {
      // 🛡️ Só aplica período global para mercados de partida/time.
      // Player props não herdam período global (se LLM deixou null = Jogo completo).
      apostasBase = apostasBase.map((a) => {
        if (a.periodo) return a;
        if (a.tipo === "match_prop" || a.tipo === "team_prop") {
          return { ...a, periodo: globalPeriodo };
        }
        return a; // player_prop mantém null = Jogo inteiro
      });
    }

    // 🏈 Regra NFL: reconciliar ANTES de filtrar e preencher
    if (esporte === "Futebol Americano") {
      console.log("[NFL] Iniciando pipeline NFL com", apostasBase.length, "apostas");
      
      // 🎯 PASSO 1: Reconciliar player_props divididas ANTES de tudo
      apostasBase = reconcileNFLPlayerProps(apostasBase);
      console.log("[NFL] Após reconciliação:", apostasBase.length, "apostas");
      
      // PASSO 2: Remover match_prop de Gols e preferir player_props
      const hasPlayerProp = apostasBase.some((a) => a.tipo === "player_prop");
      apostasBase = apostasBase.filter((a) => {
        if (a.tipo === "match_prop") {
          const estat = (a.estatistica || "").toLowerCase();
          const isGols = estat === "gols" || estat.includes("gol");
          if (isGols) return false; // NFL não usa mercado de gols
          if (hasPlayerProp) return false; // Preferimos os player_props para NFL
        }
        return true;
      });
      console.log("[NFL] Após filtro de gols:", apostasBase.length, "apostas");

      // PASSO 3: Completa player_prop quando LLM não trouxe condicao/periodo
      const linhaMaisDe = cleaned.find((l) => /\bmais de\s+\d+(?:[.,]\d+)?/i.test(l));
      const condLinha = linhaMaisDe?.match(/\bmais de\s+(\d+(?:[.,]\d+)?)/i);
      const condValor = condLinha ? parseFloat(condLinha[1].replace(",", ".")) : null;

      apostasBase = apostasBase.map((a) => {
        if (a.tipo !== "player_prop") return a;
        // player_prop de NFL precisa ter condicao (string obrigatório)
        if (!a.condicao && condValor !== null) {
          console.log(`[NFL] Preenchendo condição faltante: ${condValor}`);
          return {
            ...a,
            condicao: `Mais de ${condValor}`,
            valor: a.valor !== null ? a.valor : condValor,
            periodo: a.periodo ?? "Jogo",
          };
        }
        return a;
      });
    }
    // 🎯 Pré-blindagem: detectar mercados coletivos/cluster resultado/AH/Totais e adicionar se faltantes
    const preblindExtras: ApostaSemantica[] = [];
    for (let idx = 0; idx < cleaned.length; idx++) {
      const line = cleaned[idx];
      const periodoDetected = detectPeriodoFromContext(cleaned, idx);

      // Mercados globais nunca aceitam jogador explícito
      if (extractPlayerName(line)) {
        continue;
      }
      // BTTS (já suportado por parseBTTS) — garante inclusão
      const btts = parseBTTS(line);
        if (btts && !(apostasBase || []).some((a) => a.tipo === "match_prop" && a.estatistica === "Ambas Marcam")) {
        preblindExtras.push(btts);
      }

      // 🚫 DUPLA CHANCE AUTOMÁTICA REMOVIDA (bug silencioso, viola contrato do fallback)
      // Se o LLM não detectou, não adicione automaticamente. Isso criava apostas fantasmas.
      
      // Empate Anula / Winner — ordem de prioridade
      const resultado = detectResultadoCluster(line);
      if (resultado) {
        // ⚠️ Dupla Chance removida (caso 1: cria apostas não solicitadas)
        
        if (resultado.tipo === "empate_anula") {
          const team = (line.replace(/.*(empate anula|draw no bet)\s*[:-]?\s*/i, "").trim()) || null;
          if (!(apostasBase || []).some((a) => a.estatistica === "Empate Anula")) {
            preblindExtras.push({
              tipo: "match_prop",
              estatistica: "Empate Anula",
              condicao: team || "",
              jogador: null,
              valor: null,
              time: team || null,
              timeAbrev: null,
              periodo: periodoDetected ?? "Jogo",
              confianca: "media",
            } as ApostaSemantica);
          }
        } else if (resultado.tipo === "winner") {
          const team = (line.replace(/.*(vencedor|resultado final)\s*[:-]?\s*/i, "").trim()) || null;
          if (team && !(apostasBase || []).some((a) => a.tipo === "winner")) {
            preblindExtras.push({
              tipo: "winner",
              estatistica: "Vencedor",
              condicao: team ?? "",
              jogador: null,
              valor: null,
              time: team,
              timeAbrev: null,
              periodo: periodoDetected ?? "Jogo",
              confianca: "alta",
            } as ApostaSemantica);
          }
        }
      }

      // AH
      const ah = detectAsianHandicap(line);
      if (ah && !(apostasBase || []).some((a) => a.estatistica === "Handicap Asiático")) {
        const team = (line.replace(/.*handicap\s*(asiático)?\s*[:-]?\s*/i, "").match(/[A-Z][a-zA-Z]+/g)?.[0]) || null;
        preblindExtras.push({
          tipo: "match_prop",
          estatistica: "Handicap Asiático",
          condicao: ah,
          jogador: null,
          valor: null,
          time: team || null,
          timeAbrev: null,
          periodo: periodoDetected ?? "Jogo",
          confianca: "media",
        } as ApostaSemantica);
      }

      // Totais de Gols (Over/Under)
      const tg = detectTotalGoals(line);
      if (tg && !(apostasBase || []).some((a) => a.estatistica === "Gols")) {
        preblindExtras.push({
          tipo: "match_prop",
          estatistica: "Gols",
          condicao: `${tg.operador} ${tg.linha}`,
          jogador: null,
          valor: null,
          time: null,
          timeAbrev: null,
          periodo: periodoDetected ?? "Jogo",
          confianca: "media",
        } as ApostaSemantica);
      }
    }

    const baseBlindada = [...apostasBase, ...preblindExtras];
    
    console.log("[PIPELINE] Apostas finais antes do fallback:", baseBlindada.length);
    
    let apostas = enforceSingleTotalGols(
      normalizeApostas(
        applyDeterministicFallback(cleaned, normalizeLabelsOnApostas(enforceOnAll(baseBlindada))),
      ),
    );
    // Decorate missing período after fallback-generated bets
    if (globalPeriodo) {
      apostas = apostas.map((a) => {
        if (a.periodo) return a;
        if (a.tipo === "match_prop" || a.tipo === "team_prop") {
          return { ...a, periodo: globalPeriodo };
        }
        return a; // player_prop mantém null = Jogo
      });
    }

    // 🚫 FILTRO FINAL: rejeita apostas inválidas (ex: player_prop sem jogador, winner sem trigger)
    apostas = apostas.filter((aposta) => isValidAposta(aposta, apostas, cleaned));

    return formatBilhete(
      {
        esporte,
        torneio,
        evento,
        valorApostado,
        odd,
        retornoPotencial,
        tipo,
        data,
        bonus,
      },
      { apostas },
    );
  }

  // Fallback totalmente local (sem ticket parser completo):
  // 1) Extraímos metadados via regex.
  // 2) Filtramos apenas linhas de aposta.
  // 3) Rodamos o parser semântico de apostas (LLM simples / mock).
  // 4) Reconstruímos o BilheteFinal via formatterFinal.
  const { metadata, remainingLines: metadataRemainingLines } = extractMetadata(cleaned);
  const globalPeriodoAll = getGlobalPeriodo(cleaned);
  const betLines = extractRawBets(metadataRemainingLines);

  const semantic: ResultadoSemanticoLLM = await semanticParserLLM(betLines, client);
  
  // 🎯 MESCLA: apostas determinísticas + apostas do LLM fallback
  let baseLocal = [
    ...deterministicBets, // ✅ Parser determinístico (100% confiável)
    ...normalizeLabelsOnApostas(enforceOnAll(semantic.apostas ?? []))
  ];
  // 🔄 PIPELINE FINAL (ordem correta) — antes do fallback
  baseLocal = coercePlayerPropByRawLines(baseLocal, betLines)
    .map(forcePlayerPropIfPlayerPresent)
    .map(preventIllegalMatchProp)
    .map(normalizePeriodoOnly);
  if (globalPeriodoAll) {
    baseLocal = baseLocal.map((a) => (a.periodo ? a : { ...a, periodo: globalPeriodoAll }));
  }

  let apostas = enforceSingleTotalGols(
    normalizeApostas(
      applyDeterministicFallback(
        betLines,
        baseLocal,
      ),
    ),
  );
  if (globalPeriodoAll) {
    apostas = apostas.map((a) => {
      if (a.periodo) return a;
      if (a.tipo === "match_prop" || a.tipo === "team_prop") {
        return { ...a, periodo: globalPeriodoAll };
      }
      return a; // player_prop mantém null = Jogo
    });
  }

  // 🔥 Assert obrigatório: não pode existir match_prop duplicando player_prop equivalente
  const contratoViolado = apostas.some((a) =>
    a.tipo === "match_prop" &&
    apostas.some((b) =>
      b.tipo === "player_prop" &&
      (b.jogador && b.jogador.trim().length > 0) &&
      b.estatistica === a.estatistica &&
      b.condicao === a.condicao &&
      b.periodo === a.periodo,
    )
  );
  if (contratoViolado) {
    throw new Error("Contrato violado: match_prop duplicando player_prop");
  }

  const finalTicket = formatBilhete(metadata, { apostas });

  return finalTicket;
}

