import { ApostaSemantica } from "../../schema/bilhete.schema";

/**
 * Formatter NFL
 * Formatação específica para Futebol Americano
 */
export function formatNFL(aposta: ApostaSemantica): string {
  if (aposta.tipo === "winner") {
    const alvo = aposta.time || aposta.jogador || "Time";
    return `Vencedor - ${alvo}`.trim();
  }

  if (aposta.tipo === "player_prop" && aposta.jogador) {
    // Player prop: sempre incluir jogador
    const parts = [aposta.jogador, aposta.estatistica, aposta.condicao].filter(Boolean);
    return parts.join(" - ").trim();
  }

  if (aposta.tipo === "team_prop") {
    if (aposta.estatistica && aposta.condicao) {
      return `${aposta.estatistica} - ${aposta.condicao}`.trim();
    }
    if (aposta.estatistica) {
      return aposta.estatistica;
    }
  }

  if (aposta.estatistica && aposta.condicao) {
    return `${aposta.estatistica} - ${aposta.condicao}`.trim();
  }

  return (
    [aposta.estatistica, aposta.jogador, aposta.condicao]
      .filter(Boolean)
      .join(" - ")
      .trim() || "Aposta"
  );
}
