// Etapa 4: Formatter Final do Bilhete (local)
//
// Responsável por reconstruir TODO o texto de saída do zero,
// usando apenas:
// - Metadados locais (sem LLM)
// - Apostas semânticas retornadas pela IA
//
// Regras importantes:
// - Nunca reutilizar texto bruto do OCR
// - "Aposta": concatenação padronizada das apostas
// - "Mercado": derivado apenas de estatistica + periodo
// - Remover duplicatas
// - Output sempre previsível

import {
  ApostaSemantica,
  BilheteFinal,
  BilheteMetadata,
  ResultadoSemanticoLLM,
} from "../schema/bilhete.schema";
import { formatAposta } from "./formatter";
import { normalizeStatLabel, normalizeCondLabel } from "../utils/normalizeLabels";

function buildApostaTexto(
  apostas: ApostaSemantica[],
  esporte?: string
): string {
  const isDev = (process.env.NODE_ENV || "development") === "development";
  const englishStats = [
    "Winner",
    "Goals",
    "Corners",
    "Cards",
    "Shots",
    "Possession",
    "Assists",
    "Rebounds",
    "Points",
    "Blocks",
    "Steals",
  ];
  const englishConds = [/^over\b/i, /^under\b/i];
  let statWarns = 0;
  let condWarns = 0;

  const textos = apostas
    .map((ap) => {
      if (isDev) {
        if (ap.estatistica && englishStats.includes(ap.estatistica)) {
          statWarns++;
        }
        if (ap.condicao && englishConds.some((re) => re.test(ap.condicao!))) {
          condWarns++;
        }
      }

      // normalize labels before formatting
      ap.estatistica = normalizeStatLabel(ap.estatistica);
      ap.condicao = normalizeCondLabel(ap.condicao);
      return formatAposta(ap, esporte);
    })
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  if (!textos.length) {
    return "N / D";
  }

  if (isDev && (statWarns || condWarns)) {
    console.warn(
      `Resumo labels inglês → estatistica: ${statWarns}, condicao: ${condWarns}`,
    );
  }

  return textos.join(" / ");
}

function buildMercadoIndividual(aposta: ApostaSemantica): string {
  let label = normalizeStatLabel(aposta.estatistica || "Mercado");

  if (aposta.periodo) {
    label = `${label} (${aposta.periodo})`;
  }

  return label;
}

function buildMercado(apostas: ApostaSemantica[]): string {
  if (!apostas.length) return "N / D";

  const mercados = new Set<string>();

  for (const a of apostas) {
    switch (a.tipo) {
      case "winner":
        mercados.add("Resultado Final");
        break;

      case "player_prop":
      case "team_prop":
      case "match_prop":
        if (a.estatistica) {
          mercados.add(normalizeStatLabel(a.estatistica));
        }
        break;
    }
  }

  if (!mercados.size) {
    return "N / D";
  }

  return Array.from(mercados).join(" / ");
}

function deduplicateApostas(apostas: ApostaSemantica[]): ApostaSemantica[] {
  const seen = new Map<string, ApostaSemantica>();
  
  for (const aposta of apostas) {
    // Chave: tipo + estatística + condição (ignora jogador/time/periodo para match_prop)
    const key = aposta.tipo === "match_prop"
      ? `match|${aposta.estatistica}|${aposta.condicao}`
      : `${aposta.tipo}|${aposta.jogador}|${aposta.estatistica}|${aposta.condicao}`;
    
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, aposta);
    } else {
      // Mantém a aposta com mais informação (valor definido, confiança alta)
      if ((aposta.valor !== null && aposta.valor !== undefined && existing.valor === null) ||
          (aposta.confianca === 'alta' && existing.confianca !== 'alta')) {
        seen.set(key, aposta);
      }
    }
  }
  
  return Array.from(seen.values());
}

export function formatBilhete(
  metadata: BilheteMetadata,
  resultadoSemantico: ResultadoSemanticoLLM,
): BilheteFinal {
  let apostas = resultadoSemantico.apostas ?? [];
  
  // Deduplica apostas antes de formatar
  apostas = deduplicateApostas(apostas);

  const apostaTexto = buildApostaTexto(apostas, metadata.esporte || undefined);
  console.log("Apostas antes do buildMercado:", apostas);
  const mercado = buildMercado(apostas);
  // Calcula odd a partir de retorno/valor quando não fornecida
  let computedOdd = metadata.odd;
  if ((computedOdd === null || computedOdd === undefined) &&
      typeof metadata.valorApostado === 'number' && metadata.valorApostado > 0 &&
      typeof metadata.retornoPotencial === 'number' && metadata.retornoPotencial > 0) {
    const raw = metadata.retornoPotencial / metadata.valorApostado;
    // Arredonda a 2 casas de forma estável
    computedOdd = Math.round(raw * 100) / 100;
  }

  return {
    esporte: metadata.esporte,
    torneio: metadata.torneio,
    evento: metadata.evento,
    aposta: apostaTexto,
    mercado,
    valorApostado: metadata.valorApostado,
    odd: computedOdd,
    retornoPotencial: metadata.retornoPotencial,
    tipo: metadata.tipo,
    data: metadata.data,
    bonus: metadata.bonus,
    apostasDetalhadas: apostas,
  };
}
