// Debug: Simular o OCR quebrado exato que você está recebendo
import { processBilhete } from "./src/pipeline";

async function debugRealOCR() {
  console.log("\n🔴 DEBUG: OCR real que está falhando");
  console.log("═".repeat(60));
  
  // Simular exatamente o que você mostrou
  const ocrBroken = `Ambas equipes Marcam: Sim & Total de 2.75
Gols Mais/Menos: Mais de 3.5
Super Odds Turbinadas
Inter de Milão - Liverpool
09/12/2025 17:00
Mais Detalhes V
Ganhos Potenciais
MANTER
R$5,50
R$ 18,98`;

  const result = await processBilhete({
    kind: "parsedText",
    payload: ocrBroken,
  });
  
  console.log("\n📊 Resultado:");
  console.log(`   Valor Apostado: ${result.valorApostado}`);
  console.log(`   Retorno Potencial: ${result.retornoPotencial}`);
  console.log(`   Odd capturada: ${result.odd}`);
  
  console.log("\n🧮 Cálculo esperado:");
  if (result.valorApostado && result.retornoPotencial) {
    const oddCalculada = result.retornoPotencial / result.valorApostado;
    console.log(`   ${result.retornoPotencial} / ${result.valorApostado} = ${oddCalculada.toFixed(2)}`);
  }
  
  console.log("\n🎯 Análise:");
  console.log(`   Odd grudada capturada? ${result.odd === 2.75 ? "✅ Sim (2.75)" : "❌ Não"}`);
  console.log(`   Retorno correto? ${result.retornoPotencial === 18.98 ? "✅ Sim (18.98)" : "❌ Não"}`);
  console.log(`   Valor correto? ${result.valorApostado === 5.5 ? "✅ Sim (5.50)" : "❌ Não"}`);
}

debugRealOCR().catch(console.error);
