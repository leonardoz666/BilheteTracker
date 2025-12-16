// Teste para verificar captura de odd 2.20
import { processBilhete } from "./src/pipeline";

async function testOdd220() {
  console.log("\n🔍 TESTE: Captura de odd 2.20");
  console.log("═".repeat(60));
  
  // Teste 1: Odd 2.20 com label
  console.log("\n📋 Teste 1: Odd 2.20 com label explícito");
  const test1 = await processBilhete({
    kind: "parsedText",
    payload: `Luka Doncic - 20+ Pontos
Odd 2.20
Aposta R$ 10,00`,
  });
  console.log(`   Resultado: ${test1.odd}`);
  console.log(`   Status: ${test1.odd === 2.20 ? "✅ PASSOU" : "❌ FALHOU"}`);
  
  // Teste 2: Odd 2.20 grudada
  console.log("\n📋 Teste 2: Odd 2.20 grudada na linha de aposta");
  const test2 = await processBilhete({
    kind: "parsedText",
    payload: `Ambas equipes Marcam: Sim & Total de 2.20
Gols Mais/Menos: Mais de 3.5
Inter de Milão - Liverpool
09/12/2025 17:00
Aposta R$ 5,50`,
  });
  console.log(`   Resultado: ${test2.odd}`);
  console.log(`   Status: ${test2.odd === 2.20 ? "✅ PASSOU" : "❌ FALHOU"}`);
  
  // Teste 3: Duas odds (1.95 e 2.20)
  console.log("\n📋 Teste 3: Duas odds - deve capturar 2.20 (última)");
  const test3 = await processBilhete({
    kind: "parsedText",
    payload: `Julius Randle - 10+ Pontos
Odd 1.95 2.20
Aposta R$ 10,00`,
  });
  console.log(`   Resultado: ${test3.odd}`);
  console.log(`   Status: ${test3.odd === 2.20 ? "✅ PASSOU" : "❌ FALHOU"}`);
  
  // Teste 4: Cotação 2.20
  console.log("\n📋 Teste 4: Cotação 2.20");
  const test4 = await processBilhete({
    kind: "parsedText",
    payload: `Giannis - 25+ Pontos
Cotação: 2.20
Aposta R$ 5,00`,
  });
  console.log(`   Resultado: ${test4.odd}`);
  console.log(`   Status: ${test4.odd === 2.20 ? "✅ PASSOU" : "❌ FALHOU"}`);
  
  // Teste 5: Apenas linha "2.20"
  console.log("\n📋 Teste 5: Apenas linha '2.20' (fallback)");
  const test5 = await processBilhete({
    kind: "parsedText",
    payload: `LeBron James - 15+ Pontos
2.20
Aposta R$ 20,00`,
  });
  console.log(`   Resultado: ${test5.odd}`);
  console.log(`   Status: ${test5.odd === 2.20 ? "✅ PASSOU" : "❌ FALHOU"}`);
  
  console.log("\n" + "═".repeat(60));
  const results = [
    test1.odd === 2.20,
    test2.odd === 2.20,
    test3.odd === 2.20,
    test4.odd === 2.20,
    test5.odd === 2.20,
  ];
  const passed = results.filter(Boolean).length;
  console.log(`📊 RESUMO: ${passed}/5 testes passaram`);
  console.log(passed === 5 ? "🎉 TODOS PASSARAM!" : `⚠️ ${5 - passed} teste(s) falharam`);
}

testOdd220().catch(console.error);
