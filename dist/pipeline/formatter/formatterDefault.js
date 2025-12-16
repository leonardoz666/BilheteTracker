"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDefault = formatDefault;
/**
 * Formatter Default
 * Fallback seguro para esportes não conhecidos
 */
function formatDefault(aposta) {
    if (aposta.tipo === "winner") {
        // Se já tem time definido, usa ele. Se não, fallback para jogador ou "Time"
        const alvo = aposta.time || aposta.jogador || "Time";
        // Se o target for o proprio time (ex: Moneyline), não repete "Vencedor - Chelsea" se o alvo ja diz tudo?
        // Mas o padrão pede "Vencedor - Time". Mantemos.
        return `Vencedor - ${alvo}`.trim();
    }
    if (aposta.tipo === "team_prop") {
        // Regra: se time === 'cada time', deve aparecer no texto final
        const isCadaTime = aposta.time === 'cada time' || (aposta.condicao && aposta.condicao.includes('cada time'));
        const condicaoLimpa = aposta.condicao ? aposta.condicao.replace('cada time', '').trim() : '';
        const prefix = isCadaTime && condicaoLimpa ? 'cada time ' : '';
        // Se tem time específico (ex: Chelsea), ele vem primeiro
        if (aposta.time && !isCadaTime) {
            if (aposta.estatistica && aposta.condicao) {
                return `${aposta.time} - ${aposta.estatistica} - ${aposta.condicao}`.trim();
            }
            if (aposta.estatistica) {
                return `${aposta.time} - ${aposta.estatistica}`.trim();
            }
        }
        if (aposta.estatistica && condicaoLimpa) {
            return `${aposta.estatistica} - ${prefix}${condicaoLimpa}`.trim();
        }
        if (aposta.estatistica) {
            return aposta.estatistica;
        }
    }
    // Player prop: prioriza jogador + estatística + condição
    if (aposta.tipo === "player_prop" && aposta.jogador) {
        const timeInfo = aposta.timeAbrev ? ` (${aposta.timeAbrev})` : "";
        const parts = [
            `${aposta.jogador}${timeInfo}`,
            aposta.estatistica,
            aposta.condicao
        ].filter(Boolean);
        return parts.join(" - ").trim();
    }
    if (aposta.estatistica && aposta.condicao) {
        return `${aposta.estatistica} - ${aposta.condicao}`.trim();
    }
    if (aposta.estatistica && aposta.jogador) {
        return `${aposta.estatistica} ${aposta.jogador}`.trim();
    }
    return ([aposta.estatistica, aposta.jogador, aposta.condicao]
        .filter(Boolean)
        .join(" - ")
        .trim() || "Aposta");
}
