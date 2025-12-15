"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatAposta = formatAposta;
const formatterNBA_1 = require("./formatterNBA");
const formatterFutebol_1 = require("./formatterFutebol");
const formatterNFL_1 = require("./formatterNFL");
const formatterDefault_1 = require("./formatterDefault");
/**
 * Router de formatação por esporte
 * Distribui apostas para o formatter correto
 */
function formatAposta(aposta, esporte) {
    const esporteNormalizado = (esporte || "").toLowerCase().trim();
    switch (esporteNormalizado) {
        case "nba":
        case "basquete":
        case "basketball":
            return (0, formatterNBA_1.formatNBA)(aposta);
        case "futebol":
        case "soccer":
        case "football":
            return (0, formatterFutebol_1.formatFutebol)(aposta);
        case "futebol americano":
        case "nfl":
        case "american football":
            return (0, formatterNFL_1.formatNFL)(aposta);
        default:
            return (0, formatterDefault_1.formatDefault)(aposta);
    }
}
