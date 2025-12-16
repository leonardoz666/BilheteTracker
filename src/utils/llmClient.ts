// Cliente LLM (mock) para o parser semântico de apostas.
//
// Este arquivo abstrai a chamada ao modelo LLM real (Groq
// llama-3.1-8b-instant). Aqui implementamos uma versão MOCK
// determinística, baseada em regras simples, para que o
// projeto rode offline com `npm start`.
//
// Para integrar com o backend real no futuro (ex: BackTrack),
// basta substituir a implementação de `callSemanticParser` por
// uma chamada HTTP para o serviço que encapsula o LLM.

import {
  ApostaSemantica,
  NivelConfianca,
  PeriodoAposta,
  ResultadoSemanticoLLM,
  TipoApostaSemantica,
  BilheteFinal,
  BilheteMetadata,
} from "../schema/bilhete.schema";

export interface LlmClient {
  callSemanticParser(lines: string[]): Promise<ResultadoSemanticoLLM>;
}

// Cliente mais rico opcional, capaz de devolver o bilhete
// completo (metadados + apostas) diretamente via LLM.
// Implementações que não suportam esse método podem ignorá-lo.
export interface TicketLlmClient extends LlmClient {
  callTicketParser?(
    lines: string[],
    metadataHint?: BilheteMetadata,
  ): Promise<BilheteFinal>;
}

// Heurísticas simples para simular a saída do LLM a partir de linhas
// que representam apostas. NÃO depende de layout visual, coordenadas
// ou nomes comerciais.

function inferTipo(line: string): TipoApostaSemantica {
  const lower = line.toLowerCase();
  if (/^(vencedor\s*-|winner\s*-|moneyline\s*-)/.test(lower)) {
    return "winner";
  }
  if (lower.includes("jogador")) return "player_prop";
  if (lower.includes("cantos") || lower.includes("escanteios")) return "team_prop";
  return "match_prop";
}

function inferPeriodo(line: string): PeriodoAposta {
  const lower = line.toLowerCase();
  if (/(1º\s*quarto|1q)/.test(lower)) return "1º Quarto";
  if (/(2º\s*quarto|2q)/.test(lower)) return "2º Quarto";
  if (/(1º\s*tempo)/.test(lower)) return "1º Tempo";
  if (/(2º\s*tempo)/.test(lower)) return "2º Tempo";
  if (/(jogo todo|jogo inteiro|partida inteira)/.test(lower)) return "Jogo";
  return null;
}

function inferConfianca(line: string): NivelConfianca {
  // Mock simples: linhas mais longas tendem a ter interpretação
  // mais clara (apenas uma heurística para fins de exemplo).
  if (line.length > 60) return "alta";
  if (line.length > 30) return "media";
  return "baixa";
}

function extractPlayerAndCondition(raw: string): {
  jogador: string | null;
  condicao: string;
  valor: number | null;
} {
  // Handicap: captura linha assinada diretamente (evita split pelo hífen)
  const handicapDirect = raw.match(/([+-]\d+(?:[.,]\d+)?)/);
  if (handicapDirect) {
    const cond = handicapDirect[1];
    return {
      jogador: null,
      condicao: cond,
      valor: parseFloat(cond.replace(",", ".")) || null,
    };
  }

  // Exemplo de linha:
  // "Jogador ressaltos → Flagg, Cooper 7+ (DAL)"
  const arrowSplit = raw.split(/[-→:>]/);
  const rightSide = arrowSplit.length > 1 ? arrowSplit[1] : raw;

  // Remove time/cidade entre parênteses para focar no jogador + condição
  const cleanedRight = rightSide.replace(/\([^)]*\)/g, "").trim();

  // Captura nome do jogador até antes do primeiro número
  const match = cleanedRight.match(/^(?<jogador>[^0-9]+?)\s+(?<condicao>[0-9]+(?:[.,][0-9]+)?\+?)/);
  if (match && match.groups) {
    const jogador = match.groups["jogador"].trim().replace(/\s{2,}/g, " ");
    const condicao = match.groups["condicao"].trim();
    const numeric = parseFloat(condicao.replace(/\+/g, ""));

    const jogadorLower = jogador.toLowerCase();
    const isOperador = ["mais de", "menos de", "over", "under"].includes(jogadorLower);
    const condFormatada = isOperador ? `${jogador} ${condicao}` : condicao;

    return {
      jogador: isOperador ? null : jogador || null,
      condicao: condFormatada,
      valor: isNaN(numeric) ? null : numeric,
    };
  }

  return {
    jogador: null,
    condicao: "",
    valor: null,
  };
}

function extractStat(line: string): string {
  const lower = line.toLowerCase();

  // Heurísticas rápidas para mercados globais sem prefixo explícito
  if (/handicap/.test(lower)) return "Handicap Asiático";
  if (/(over|under|mais de|menos de)/.test(lower)) return "Gols";

  // Para padrões como "Jogador ressaltos → ..." ou
  // "Jogador assistências - ..." inferimos a última palavra
  // significativa antes do separador.
  const arrowSplit = line.split(/[-→:>]/);
  const left = arrowSplit[0] ?? line;
  const tokens = left
    .replace(/jogador/gi, "")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => !!t);

  if (!tokens.length) return "";

  const last = tokens[tokens.length - 1];
  const normalized =
    last.length > 1 ? last[0].toUpperCase() + last.slice(1).toLowerCase() : last;
  return normalized;
}

export class MockLlmClient implements TicketLlmClient {
  async callSemanticParser(lines: string[]): Promise<ResultadoSemanticoLLM> {
    const apostas: ApostaSemantica[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const tipo = inferTipo(line);
      const periodo = inferPeriodo(line);
      const confianca = inferConfianca(line);
      const estatistica = extractStat(line) || "";
      const { jogador, condicao, valor } = extractPlayerAndCondition(line);

      if (!estatistica) {
        // Se não conseguimos nem uma estatística, ignoramos a linha
        // em vez de inventar uma aposta.
        continue;
      }

      apostas.push({
        tipo,
        jogador,
        estatistica,
        condicao,
        valor,
        time: null,
        timeAbrev: null,
        periodo,
        confianca,
      });
    }

    return { apostas };
  }

  // Mock do callTicketParser: parseia linhas conhecidas, deixa o rest pra fallback
  async callTicketParser(lines: string[]): Promise<any> {
    const apostas: any[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Padrão: "JOGADOR - ESTATÍSTICA CONDIÇÃO" (ex: "Josh Allen - Recepções Mais de 3.5")
      // Precisa vir ANTES dos outros padrões
      const playerStatMatch = trimmed.match(/^([A-Z][a-zA-ZÀ-ú\s]+?)\s*-\s*(Recepções?|Touchdowns?|Yards?|Sacks?|Fumbles?|Pontos|Rebotes|Assistências|Cestas|Finaliza[çc][õo]es|Chutes?|Passes?|Gols?)(?:\s+(Mais de|Menos de|Over|Under)\s+(\d+(?:[.,]\d+)?))?/i);
      if (playerStatMatch) {
        const [, jogador, estatistica, operador, numero] = playerStatMatch;
        const condicao = numero ? `${operador} ${numero}` : null;
        apostas.push({
          tipo: 'player_prop',
          jogador: jogador.trim(),
          estatistica: estatistica.trim(),
          condicao: condicao,
          valor: numero ? parseFloat(numero.replace(',', '.')) : null,
          time: null,
          timeAbrev: null,
          periodo: 'Jogo',
          confianca: 'alta',
        });
        continue;
      }
      
      // Padrão: "PERÍODO - Cada time bate X+ escanteios"
      const cadaTimeMatch = trimmed.match(/^(?:(1º|2º|3º|4º)\s*(Quarto|Tempo)|HT|FT)?\s*-?\s*Cada\s+time\s+bate\s+(\d+)\+?\s*(\w+)/i);
      if (cadaTimeMatch) {
        const [, numero, periodoTipo, valor, estatistica] = cadaTimeMatch;
        let periodo = 'Jogo';
        
        if (numero && periodoTipo) {
          periodo = `${numero} ${periodoTipo}`;
        } else if (trimmed.toLowerCase().startsWith('ht')) {
          periodo = '1º Tempo';
        } else if (trimmed.toLowerCase().startsWith('ft')) {
          periodo = 'Jogo';
        }
        
        apostas.push({
          tipo: 'match_prop',
          jogador: null,
          estatistica: estatistica.charAt(0).toUpperCase() + estatistica.slice(1),
          condicao: `${valor}+`,
          valor: parseFloat(valor),
          time: 'cada time',
          timeAbrev: null,
          periodo,
          confianca: 'media',
        });
        continue;
      }
      
      // Padrão: "JOGADOR (TIME) - AÇÃO" (ex: "Francisco Conceição (JUV) - Chutar a Gol")
      const playerActionMatch = trimmed.match(/^([A-Z][a-zA-ZÀ-ú\s]+)\s*\(([A-Z]{2,4})\)\s*-\s*([A-Za-zÀ-ú\s]+)$/);
      if (playerActionMatch) {
        const [, jogador, timeAbrev, acao] = playerActionMatch;
        apostas.push({
          tipo: 'player_prop',
          jogador: jogador.trim(),
          estatistica: acao.trim(),
          condicao: null,
          valor: null,
          time: null,
          timeAbrev: timeAbrev.toUpperCase(),
          periodo: 'Jogo',
          confianca: 'alta',
        });
        continue;
      }
      
      // Padrão: "Total de Gols Mais/Menos: Mais de 3.5" (formato com dois pontos)
      const totalGolsMaisMenosMatch = trimmed.match(/^Total\s+de\s+Gols?\s+Mais\/Menos:\s*(Mais de|Menos de|Over|Under)\s+([\d.,]+)/i);
      if (totalGolsMaisMenosMatch) {
        const [, operador, valor] = totalGolsMaisMenosMatch;
        apostas.push({
          tipo: 'match_prop',
          jogador: null,
          estatistica: 'Gols Mais/Menos',
          condicao: `${operador} ${valor}`,
          valor: parseFloat(valor.replace(',', '.')),
          time: null,
          timeAbrev: null,
          periodo: 'Jogo',
          confianca: 'alta',
        });
        continue;
      }
      
      // Padrão: "Total (de) Gols - Mais de X" (match_prop, não player_prop!)
      const totalGolsMatch = trimmed.match(/^Total\s+(?:de\s+)?Gols?\s*-\s*(Mais de|Menos de|Over|Under)\s+([\d.,]+)/i);
      if (totalGolsMatch) {
        const [, operador, valor] = totalGolsMatch;
        apostas.push({
          tipo: 'match_prop',
          jogador: null,
          estatistica: 'Total de Gols',
          condicao: `${operador} ${valor}`,
          valor: parseFloat(valor.replace(',', '.')),
          time: null,
          timeAbrev: null,
          periodo: 'Jogo',
          confianca: 'alta',
        });
        continue;
      }
      
      // Padrão: "Vencedor ... Tempo - TIME"
      const vencedorMatch = trimmed.match(/^Vencedor\s+(?:do\s+)?([^-]+)\s*-\s*(.+)$/i);
      if (vencedorMatch) {
        const [, periodo_text, time] = vencedorMatch;
        let periodo = 'Jogo';
        if (periodo_text.toLowerCase().includes('1') || periodo_text.toLowerCase().includes('primeiro')) {
          periodo = '1º Tempo';
        }
        apostas.push({
          tipo: 'winner',
          time: time.trim(),
          periodo,
          confianca: 'media',
        });
        continue;
      }
    }
    
    // Retorna apostas parseadas
    return {
      esporte: null,
      torneio: null,
      times: null,
      apostasDetalhadas: apostas,
    };
  }
}

// Import do cliente real
import { GroqLlmClient } from "./groqLlmClient";
import { KeyRotator, readKeysFromEnv } from "./keyRotator";

function maskKey(key: string): string {
  if (!key) return "";
  const tail = key.slice(-6);
  return `***${tail}`;
}

// Instância default usada pelo pipeline.
// Em testes (NODE_ENV=test), sempre usa MockLlmClient para evitar rate limit.
// Em produção, usa GroqClient se GROQ_API_KEY disponível, senão fallback para MockLlmClient.
export const defaultLlmClient: TicketLlmClient = (() => {
  const isTestEnvironment = process.env.NODE_ENV === "test" || process.env.JEST_WORKER_ID !== undefined;
  
  if (isTestEnvironment) {
    console.log("⚠️ Ambiente de teste detectado. Usando MockLlmClient");
    return new MockLlmClient();
  }
  
  const keys = readKeysFromEnv(process.env);
  if (keys.length > 0) {
    const rateLimitMs = Number(process.env.GROQ_RATE_LIMIT_COOLDOWN_MS || "") || undefined;
    const rotator = new KeyRotator({ keys, rateLimitCooldownMs: rateLimitMs });
    console.log(
      `✅ Usando GroqLlmClient real com ${keys.length} chave(s) Groq: ${keys
        .map(maskKey)
        .join(", ")}`,
    );
    return new GroqLlmClient({
      getApiKey: () => rotator.nextKey(),
      onKeyFailure: (key, status) => rotator.recordFailure(key, status),
    });
  }

  console.log("⚠️ GROQ_API_KEYS/GROQ_API_KEY não encontrados. Usando MockLlmClient (fallback)");
  return new MockLlmClient();
})();
