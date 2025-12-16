// Teste com o OCR quebrado que você está recebendo
import { processBilhete } from "./src/pipeline";

async function testBrokenOCR() {
  console.log("\n🔴 TESTE: OCR quebrado (seu caso real)");
  console.log("═".repeat(60));
  
  // Exatamente o que você está recebendo do OCR
  const brokenOCRText = `Ambas equipes Marcam: Sim & Total de 2.75
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
    payload: brokenOCRText,
  });
  
  console.log("\n📊 Resultado:");
  console.log(`   Odd capturada: ${result.odd}`);
  console.log(`   Valor Apostado: ${result.valorApostado}`);
  console.log(`   Retorno Potencial: ${result.retornoPotencial}`);
  
  console.log("\n🎯 Validação:");
  if (result.odd === 2.75) {
    console.log("   ✅ SUCESSO! Capturou 2.75 (odd grudada)");
    console.log("   ⚠️ Mas essa é a odd ANTIGA (riscada)");
    console.log("   💡 O OCR deveria enviar a linha '2.75 3.45' separada");
  } else if (result.odd === 3.45) {
    console.log("   ✅ PERFEITO! Capturou 3.45 (odd nova)");
  } else {
    console.log(`   ❌ ERRO! Capturou ${result.odd}`);
  }
}

testBrokenOCR().catch(console.error);
