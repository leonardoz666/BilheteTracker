import { ApostaSemantica } from "../../schema/bilhete.schema";

/**
 * Formatter NBA
 * Regra de ouro: Player prop sempre tem valor
 * Nunca reconstrói condição
 */
export function formatNBA(aposta: ApostaSemantica): string {
  if (aposta.tipo === "player_prop") {
    // Ex: Flagg, Cooper - 7+ ressaltos
    // Ex: 1º Quarto - Nikola Jokic - 1+ Rebotes
    
    const jogador = aposta.jogador || "Jogador";
    const estatistica = aposta.estatistica || "";
    const condicao = aposta.condicao || "";
    
    // Só adiciona período se NÃO for "Jogo" (padrão)
    const periodoPrefixo =
      aposta.periodo && aposta.periodo.toLowerCase() !== "jogo"
        ? `${aposta.periodo} - `
        : "";
    
    // Se tem todas as informações principais
    if (estatistica && condicao) {
      return `${periodoPrefixo}${jogador} - ${condicao} ${estatistica}`.trim();
    }
    
    // Fallback: monta com o que tem
    return [periodoPrefixo, jogador, condicao, estatistica]
      .filter(Boolean)
      .join(" - ")
      .trim();
  }

  if (aposta.tipo === "winner") {
    const alvo = aposta.time || aposta.jogador || "Time";
    return `Vencedor - ${alvo}`.trim();
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
    
    if (aposta.estatistica && aposta.condicao) {
      return `${aposta.estatistica} - ${aposta.condicao}`.trim();
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
