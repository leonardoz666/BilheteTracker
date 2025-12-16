import { enforcePlayerPropRule } from "../utils/enforcePlayerPropRule";
import { ApostaSemantica } from "../schema/bilhete.schema";

function baseAposta(overrides: Partial<ApostaSemantica> = {}): ApostaSemantica {
  return {
    tipo: "match_prop",
    jogador: null,
    estatistica: "Rebotes",
    condicao: "1+",
    valor: null,
    time: null,
    timeAbrev: null,
    periodo: "Jogo",
    confianca: "media",
    ...overrides,
  };
}

// Caso pedido: Nunca permitir match_prop com estatística individual e jogador implícito
export function runSpec() {
  const aposta: ApostaSemantica = baseAposta({
    jogador: "Nikola Jokic",
    periodo: "1º Quarto",
    tipo: "match_prop",
  });

  const fixed = enforcePlayerPropRule(aposta);
  console.log("Tipo corrigido:", fixed.tipo);
  if (fixed.tipo !== "player_prop") {
    throw new Error("Esperado tipo 'player_prop' quando há jogador em estatística individual.");
  }
}

describe("Regra player_prop", () => {
  test("força player_prop quando há jogador", () => {
    expect(() => runSpec()).not.toThrow();
  });
});

if (require.main === module) {
  runSpec();
}
