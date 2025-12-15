export function normalizeStatLabel(stat: string): string {
  const s = (stat || "").trim();
  const map: Record<string, string> = {
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

export function normalizeCondLabel(cond: string): string {
  const c = (cond || "").trim();
  if (/^over\b/i.test(c)) return c.replace(/^over\b/i, "Mais de");
  if (/^under\b/i.test(c)) return c.replace(/^under\b/i, "Menos de");
  return c;
}

import { ApostaSemantica } from "../schema/bilhete.schema";
export function normalizeAposta(ap: ApostaSemantica): ApostaSemantica {
  return {
    ...ap,
    estatistica: normalizeStatLabel(ap.estatistica),
    condicao: normalizeCondLabel(ap.condicao),
  };
}

export function normalizeApostas(apostas: ApostaSemantica[] = []): ApostaSemantica[] {
  return (apostas || []).map(normalizeAposta);
}
