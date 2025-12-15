"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatBilhete = formatBilhete;
const formatter_1 = require("./formatter");
const normalizeLabels_1 = require("../utils/normalizeLabels");
function buildApostaTexto(apostas, esporte) {
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
            if (ap.condicao && englishConds.some((re) => re.test(ap.condicao))) {
                condWarns++;
            }
        }
        // normalize labels before formatting
        ap.estatistica = (0, normalizeLabels_1.normalizeStatLabel)(ap.estatistica);
        ap.condicao = (0, normalizeLabels_1.normalizeCondLabel)(ap.condicao);
        return (0, formatter_1.formatAposta)(ap, esporte);
    })
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
    if (!textos.length) {
        return "N / D";
    }
    if (isDev && (statWarns || condWarns)) {
        console.warn(`Resumo labels inglês → estatistica: ${statWarns}, condicao: ${condWarns}`);
    }
    return textos.join(" / ");
}
function buildMercadoIndividual(aposta) {
    let label = (0, normalizeLabels_1.normalizeStatLabel)(aposta.estatistica || "Mercado");
    if (aposta.periodo) {
        label = `${label} (${aposta.periodo})`;
    }
    return label;
}
function buildMercado(apostas) {
    if (!apostas.length)
        return "N / D";
    const mercados = new Set();
    for (const a of apostas) {
        switch (a.tipo) {
            case "winner":
                mercados.add("Resultado Final");
                break;
            case "player_prop":
            case "team_prop":
            case "match_prop":
                if (a.estatistica) {
                    mercados.add((0, normalizeLabels_1.normalizeStatLabel)(a.estatistica));
                }
                break;
        }
    }
    if (!mercados.size) {
        return "N / D";
    }
    return Array.from(mercados).join(" / ");
}
function deduplicateApostas(apostas) {
    const seen = new Map();
    for (const aposta of apostas) {
        // Chave: tipo + estatística + condição (ignora jogador/time/periodo para match_prop)
        const key = aposta.tipo === "match_prop"
            ? `match|${aposta.estatistica}|${aposta.condicao}`
            : `${aposta.tipo}|${aposta.jogador}|${aposta.estatistica}|${aposta.condicao}`;
        const existing = seen.get(key);
        if (!existing) {
            seen.set(key, aposta);
        }
        else {
            // Mantém a aposta com mais informação (valor definido, confiança alta)
            if ((aposta.valor !== null && aposta.valor !== undefined && existing.valor === null) ||
                (aposta.confianca === 'alta' && existing.confianca !== 'alta')) {
                seen.set(key, aposta);
            }
        }
    }
    return Array.from(seen.values());
}
function formatBilhete(metadata, resultadoSemantico) {
    let apostas = resultadoSemantico.apostas ?? [];
    // Deduplica apostas antes de formatar
    apostas = deduplicateApostas(apostas);
    const apostaTexto = buildApostaTexto(apostas, metadata.esporte || undefined);
    console.log("Apostas antes do buildMercado:", apostas);
    const mercado = buildMercado(apostas);
    return {
        esporte: metadata.esporte,
        torneio: metadata.torneio,
        evento: metadata.evento,
        aposta: apostaTexto,
        mercado,
        valorApostado: metadata.valorApostado,
        odd: metadata.odd,
        retornoPotencial: metadata.retornoPotencial,
        tipo: metadata.tipo,
        data: metadata.data,
        bonus: metadata.bonus,
        apostasDetalhadas: apostas,
    };
}
