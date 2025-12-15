"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeStatLabel = normalizeStatLabel;
exports.normalizeCondLabel = normalizeCondLabel;
exports.normalizeAposta = normalizeAposta;
exports.normalizeApostas = normalizeApostas;
function normalizeStatLabel(stat) {
    const s = (stat || "").trim();
    const map = {
        Winner: "Vencedor",
        Goals: "Gols",
        Corners: "Escanteios",
        Cards: "Cartões",
        Shots: "Finalizações",
        Possession: "Posse de Bola",
        Assists: "Assistências",
        Rebounds: "Rebotes",
        Points: "Pontos",
        Blocks: "Tocos",
        Steals: "Roubos",
    };
    return map[s] || s;
}
function normalizeCondLabel(cond) {
    const c = (cond || "").trim();
    if (/^over\b/i.test(c))
        return c.replace(/^over\b/i, "Mais de");
    if (/^under\b/i.test(c))
        return c.replace(/^under\b/i, "Menos de");
    return c;
}
function normalizeAposta(ap) {
    return {
        ...ap,
        estatistica: normalizeStatLabel(ap.estatistica),
        condicao: normalizeCondLabel(ap.condicao),
    };
}
function normalizeApostas(apostas = []) {
    return (apostas || []).map(normalizeAposta);
}
