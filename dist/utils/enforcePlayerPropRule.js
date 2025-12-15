"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforcePlayerPropRule = enforcePlayerPropRule;
exports.enforceOnAll = enforceOnAll;
function enforcePlayerPropRule(aposta) {
    const fixed = { ...aposta };
    if (fixed.jogador && fixed.jogador.trim() !== "") {
        fixed.tipo = "player_prop";
        fixed.time = null;
    }
    if (fixed.periodo && fixed.jogador && fixed.tipo !== "player_prop") {
        fixed.tipo = "player_prop";
    }
    if (fixed.estatistica === "Rebotes") {
        if (fixed.jogador) {
            fixed.tipo = "player_prop";
        }
    }
    return fixed;
}
function enforceOnAll(apostas = []) {
    return (apostas || []).map(enforcePlayerPropRule);
}
