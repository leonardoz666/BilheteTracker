import { ApostaSemantica } from "../../schema/bilhete.schema";

/**
 * Formatter Default
 * Fallback seguro para esportes não conhecidos
 */
export function formatDefault(aposta: ApostaSemantica): string {
  if (aposta.tipo === "winner") {
    const alvo = aposta.time || aposta.jogador || "Time";
    return `Vencedor - ${alvo}`.trim();
  }

  if (aposta.tipo === "team_prop") {
    // Regra: se time === 'cada time', deve aparecer no texto final
    const isCadaTime = aposta.time === 'cada time' || (aposta.condicao && aposta.condicao.includes('cada time'));
    const condicaoLimpa = aposta.condicao ? aposta.condicao.replace('cada time', '').trim() : '';
    const prefix = isCadaTime && condicaoLimpa ? 'cada time ' : '';
    
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

  return (
    [aposta.estatistica, aposta.jogador, aposta.condicao]
      .filter(Boolean)
      .join(" - ")
      .trim() || "Aposta"
  );
}
