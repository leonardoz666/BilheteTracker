// Teste manual para validar a correção da captura de odds
import { semanticTicketLLM } from "./src/pipeline/semanticTicketLLM";
import { MockLlmClient } from "./src/utils/llmClient";

async function testarCapturaOdds() {
  const llmClient = new MockLlmClient();

  console.log("\n🧪 TESTE 1: Odd alterada (riscada)");
  console.log("═".repeat(50));
  const teste1 = await semanticTicketLLM(
    {
      lines: [
        "Ambas equipes Marcam: Sim & Total de Gols Mais/Menos: Mais de 3.5",
        "Inter de Milão - Liverpool",
        "09/12/2025 17:00",
        "Odd 2.75 3.45", // Odd antiga riscada + nova
        "Valor apostado R$ 5,50",
        "Ganho Potencial R$ 18,98",
      ],
    },
    llmClient as any
  );
  console.log(`✅ Odd capturada: ${teste1.odd}`);
  console.log(`   Esperado: 3.45 (última odd)`);
  console.log(`   Resultado: ${teste1.odd === 3.45 ? "✅ PASSOU" : "❌ FALHOU"}`);

  console.log("\n🧪 TESTE 2: Odd única normal");
  console.log("═".repeat(50));
  const teste2 = await semanticTicketLLM(
    {
      lines: [
        "Julius Randle - 10+ Pontos",
        "Odd 2.50",
        "Valor apostado R$ 10,00",
      ],
    },
    llmClient as any
  );
  console.log(`✅ Odd capturada: ${teste2.odd}`);
  console.log(`   Esperado: 2.50`);
  console.log(`   Resultado: ${teste2.odd === 2.5 ? "✅ PASSOU" : "❌ FALHOU"}`);

  console.log("\n🧪 TESTE 3: Cotação com 2 valores");
  console.log("═".repeat(50));
  const teste3 = await semanticTicketLLM(
    {
      lines: [
        "Luka Doncic - 20+ Pontos",
        "Cotação: 1.95 2.10", // Odd mudou de 1.95 para 2.10
        "Aposta R$ 20,00",
      ],
    },
    llmClient as any
  );
  console.log(`✅ Odd capturada: ${teste3.odd}`);
  console.log(`   Esperado: 2.10 (última odd)`);
  console.log(`   Resultado: ${teste3.odd === 2.1 ? "✅ PASSOU" : "❌ FALHOU"}`);

  console.log("\n🧪 TESTE 4: Linha sem label (fallback)");
  console.log("═".repeat(50));
  const teste4 = await semanticTicketLLM(
    {
      lines: [
        "Giannis - 25+ Pontos",
        "1.85 2.25", // Duas odds sem label
        "Aposta R$ 5,00",
      ],
    },
    llmClient as any
  );
  console.log(`✅ Odd capturada: ${teste4.odd}`);
  console.log(`   Esperado: 2.25 (última odd, fallback)`);
  console.log(`   Resultado: ${teste4.odd === 2.25 ? "✅ PASSOU" : "❌ FALHOU"}`);

  console.log("\n" + "═".repeat(50));
  console.log("📊 RESUMO:");
  const resultados = [
    teste1.odd === 3.45,
    teste2.odd === 2.5,
    teste3.odd === 2.1,
    teste4.odd === 2.25,
  ];
  const passou = resultados.filter(Boolean).length;
  console.log(`   ${passou}/4 testes passaram`);
  console.log(
    passou === 4 
      ? "   🎉 TODOS OS TESTES PASSARAM!" 
      : `   ⚠️ ${4 - passou} teste(s) falharam`
  );
}

testarCapturaOdds().catch(console.error);
