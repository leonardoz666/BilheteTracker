// Debug: Teste com o texto exato que veio do OCR
import { normalizeOcr } from "./src/ocr/normalizeOcr";
import { processBilhete } from "./src/pipeline";

async function debugOcrParsing() {
  console.log("\n🔍 DEBUG: Testando parsing do OCR da imagem");
  console.log("═".repeat(60));
  
  // Simulando o texto EXATO que deveria vir do OCR.space olhando a imagem
  const ocrTextFromImage = `Ambas equipes Marcam: Sim & Total de Gols Mais/Menos: Mais de 3.5
2.75 3.45
Super Odds Turbinadas
Inter de Milão - Liverpool
09/12/2025 17:00
Mais Detalhes V
Aposta R$5,50
Ganhos Potenciais R$18,98
MANTER FECHAR`;

  console.log("\n📄 Texto OCR original:");
  console.log(ocrTextFromImage);
  
  const result = await processBilhete({
    kind: "parsedText",
    payload: ocrTextFromImage,
  });
  
  console.log("\n✅ Resultado do processamento:");
  console.log(`   Odd capturada: ${result.odd}`);
  console.log(`   Valor Apostado: ${result.valorApostado}`);
  console.log(`   Retorno Potencial: ${result.retornoPotencial}`);
  console.log(`   Esporte: ${result.esporte}`);
  console.log(`   Evento: ${result.evento}`);
  console.log(`   Mercado: ${result.mercado}`);
  
  console.log("\n🎯 Validação:");
  console.log(`   Odd = 3.45? ${result.odd === 3.45 ? "✅" : "❌"}`);
  console.log(`   Valor = 5.50? ${result.valorApostado === 5.5 ? "✅" : "❌"}`);
  console.log(`   Retorno = 18.98? ${result.retornoPotencial === 18.98 ? "✅" : "❌"}`);
}

debugOcrParsing().catch(console.error);
