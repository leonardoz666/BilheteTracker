import { ApostaSemantica } from "../../schema/bilhete.schema";

/**
 * Formatter Futebol
 * Regra de ouro:
 * - match_prop: estatística + condição (ex: Total Gols - Mais de 2.5)
 * - player_prop: estatística + jogador (ex: Chutar a Gol Francisco Conceição)
 * - Nunca duplica "Mais de"
 */
export function formatFutebol(aposta: ApostaSemantica): string {
  if (aposta.tipo === "winner") {
    const periodo = aposta.periodo ? ` (${aposta.periodo})` : "";
    const alvo = aposta.time || aposta.jogador || "Time";
    return `Vencedor${periodo} - ${alvo}`.trim();
  }

  if (aposta.tipo === "match_prop" || aposta.tipo === "team_prop") {
    // Regra especial para team_prop com "cada time"
    if (aposta.tipo === "team_prop") {
      const isCadaTime = aposta.time === 'cada time' || (aposta.condicao && aposta.condicao.includes('cada time'));
      const condicaoLimpa = aposta.condicao ? aposta.condicao.replace('cada time', '').trim() : '';
      const prefix = isCadaTime && condicaoLimpa ? 'cada time ' : '';
      
      if (aposta.estatistica && condicaoLimpa) {
        return `${aposta.estatistica} - ${prefix}${condicaoLimpa}`.trim();
      }
    }
    
    // Ex: Total Gols - Mais de 2.5
    if (aposta.estatistica && aposta.condicao) {
      return `${aposta.estatistica} - ${aposta.condicao}`.trim();
    }
    return aposta.estatistica || "Aposta";
  }

  if (aposta.tipo === "player_prop") {
    // Ex: Francisco Conceição (JUV) - Chutar a Gol - Sim
    if (aposta.jogador) {
      const timeInfo = aposta.timeAbrev ? ` (${aposta.timeAbrev})` : "";
      const parts = [
        `${aposta.jogador}${timeInfo}`,
        aposta.estatistica,
        aposta.condicao
      ].filter(Boolean);
      return parts.join(" - ").trim();
    }
  }

  return formatFallback(aposta);
}

function formatFallback(aposta: ApostaSemantica): string {
  return (
    [aposta.estatistica, aposta.jogador, aposta.condicao]
      .filter(Boolean)
      .join(" - ")
      .trim() || "Aposta"
  );
}
