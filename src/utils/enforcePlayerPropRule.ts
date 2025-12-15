import { ApostaSemantica } from "../schema/bilhete.schema";

export function enforcePlayerPropRule(aposta: ApostaSemantica): ApostaSemantica {
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

export function enforceOnAll(apostas: ApostaSemantica[] = []): ApostaSemantica[] {
  return (apostas || []).map(enforcePlayerPropRule);
}
