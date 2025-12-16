import { processBilhete } from "../src/pipeline";
import { NormalizationInput } from "../src/schema/bilhete.schema";

const input: NormalizationInput = {
  kind: "parsedText",
  payload: `Ambas equipes Marcam: Sim & Total de Gols Mais/Menos: Mais de 3.5
Super Odds Turbinadas
Inter de Milão - Liverpool
09/12/2025 17:00
Mais Detalhes
Aposta
Ganho Potencial R$18,98
MANTER FECHAR
Odd 2.75 3.45
Valor Apostado R$ 5,50`,
};

(async () => {
  const result = await processBilhete(input);
  
  console.log("=== RESULTADO ===");
  console.log("Odd:", result.odd);
  console.log("Valor Apostado:", result.valorApostado);
  console.log("Retorno Potencial:", result.retornoPotencial);
  
  if (result.odd === 3.45) {
    console.log("\n✅ CORRETO: odd = 3.45 (18.98 / 5.5)");
  } else {
    console.log(`\n❌ ERRO: odd = ${result.odd} (esperado 3.45)`);
  }
})();
