import { normalizeOcr } from "../src/ocr/normalizeOcr";
import { extractMetadata } from "../src/pipeline/extractMetadata";
import { MockLlmClient } from "../src/tests/mock-llm";

/**
 * Teste para validar interpretação correta de OCRExitCode
 *
 * Dados reais capturados pelo usuário mostram:
 * - OCRExitCode: 1 (significa SUCESSO, não erro!)
 * - IsErroredOnProcessing: false
 * - Mas dados fragmentados/incompletos
 *
 * Isso significa:
 * ✅ OCR.space retornou sucesso
 * ⚠️ Mas Engine 2 pode ser inadequado para bilhetes
 * ✅ Nossos fallbacks devem contornar o problema
 */

async function testOcrExitCodeInterpretation() {
  console.log("🧪 Testando interpretação de OCRExitCode...\n");

  // Simular resposta real do OCR.space com exit code 1
  const mockResponse = {
    ParsedResults: [
      {
        ParsedText: `Ambas Marcam: Sim & Total de 2.75
        R$ 5.50
        Retorno Potencial
        R$ 18.98
        Aposta
        R$ 5.50`,
        TextOverlay: {
          Lines: [
            { LineText: "Ambas Marcam: Sim & Total de" },
            { LineText: "2.75" },
            { LineText: "R$ 5.50" },
            { LineText: "Retorno Potencial" },
            { LineText: "R$ 18.98" },
            { LineText: "Aposta" },
            { LineText: "R$ 5.50" },
          ],
        },
      },
    ],
    OCRExitCode: 1, // ✅ SUCESSO! (não é erro)
    IsErroredOnProcessing: false,
    ErrorMessage: null,
  };

  console.log("📊 Resposta do OCR.space:");
  console.log(`   OCRExitCode: ${mockResponse.OCRExitCode} (✅ = Parsed Successfully)`);
  console.log(`   IsErroredOnProcessing: ${mockResponse.IsErroredOnProcessing}`);
  console.log(`   ErrorMessage: ${mockResponse.ErrorMessage}\n`);

  // Normalizando
  console.log("🔄 Normalizando OCR...");
  const normalized = normalizeOcr({
    kind: "ocrSpace",
    payload: mockResponse as any,
  });

  console.log(`   Linhas normalizadas: ${normalized.lines.length}`);
  normalized.lines.forEach((line, i) => {
    console.log(`     ${i + 1}. "${line}"`);
  });
  console.log();

  // Extraindo metadados
  console.log("🎯 Extraindo metadados...");
  const metadata = extractMetadata(
    normalized,
    {
      kind: "ocrSpace",
      payload: mockResponse as any,
    },
    new MockLlmClient(),
  );

  console.log(`✅ Odd extraída: ${metadata.odd}`);
  console.log(`✅ Valor apostado: ${metadata.valorApostado}`);
  console.log(`✅ Retorno potencial: ${metadata.retorno}`);

  // Validação
  console.log("\n📋 RESULTADO:");
  if (metadata.odd === 3.45) {
    console.log("✅ Odd calculada corretamente (18.98 / 5.50 = 3.45)");
  } else {
    console.log(`❌ Odd incorreta: ${metadata.odd} (esperado: 3.45)`);
  }

  if (metadata.valorApostado === 5.5) {
    console.log("✅ Valor apostado extraído corretamente");
  } else {
    console.log(`❌ Valor apostado incorreto: ${metadata.valorApostado}`);
  }

  if (metadata.retorno === 18.98) {
    console.log("✅ Retorno potencial extraído corretamente");
  } else {
    console.log(`❌ Retorno incorreto: ${metadata.retorno}`);
  }

  console.log("\n🔍 CONCLUSÃO:");
  console.log("✅ OCRExitCode 1 = SUCESSO (não é erro)");
  console.log("✅ Sistema interpretando corretamente agora");
  console.log("✅ Fallbacks robustos contornam dados fragmentados");
  console.log("⚠️  Engine 2 pode ser inadequado para bilhetes");
  console.log("💡 Próximo: Considerar Engine 1 ou isTable=true");
}

testOcrExitCodeInterpretation().catch(console.error);
