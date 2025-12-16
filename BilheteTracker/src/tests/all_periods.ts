import { semanticTicketLLM } from "../pipeline/semanticTicketLLM";
import { defaultLlmClient } from "../utils/llmClient";

interface TestCase {
  name: string;
  line: string;
  expectedPeriodo: RegExp;
}

const testCases: TestCase[] = [
  { name: "1º Quarto", line: "1º Quarto - Nikola Jokic - Rebotes 1+", expectedPeriodo: /1º\s*Quarto/i },
  { name: "2º Quarto", line: "2º Quarto - Nikola Jokic - Rebotes 1+", expectedPeriodo: /2º\s*Quarto/i },
  { name: "HT → 1º Tempo", line: "HT - Nikola Jokic - Rebotes 1+", expectedPeriodo: /1º\s*Tempo/i },
  { name: "1º Tempo", line: "1º Tempo - Nikola Jokic - Rebotes 1+", expectedPeriodo: /1º\s*Tempo/i },
  { name: "2º Tempo", line: "2º Tempo - Nikola Jokic - Rebotes 1+", expectedPeriodo: /2º\s*Tempo/i },
  { name: "FT → Jogo", line: "FT - Nikola Jokic - Rebotes 1+", expectedPeriodo: /Jogo/i },
  { name: "Intervalo → 1º Tempo", line: "Intervalo - Nikola Jokic - Rebotes 1+", expectedPeriodo: /1º\s*Tempo/i },
];

async function runTest(testCase: TestCase): Promise<boolean> {
  try {
    const lines = [testCase.line];
    const res = await semanticTicketLLM({ lines }, defaultLlmClient as any);
    const aposta = res.apostasDetalhadas?.[0];

    if (!aposta) {
      console.error(`❌ ${testCase.name}: Nenhuma aposta gerada`);
      return false;
    }

    const checks = [
      aposta.tipo === "player_prop",
      /nikola jokic/i.test(aposta.jogador || ""),
      /rebotes/i.test(aposta.estatistica || ""),
      /1\+/.test(aposta.condicao || ""),
      aposta.valor === 1,
      testCase.expectedPeriodo.test(aposta.periodo || ""),
    ];

    if (!checks.every(Boolean)) {
      console.error(`❌ ${testCase.name}: Validação falhou`);
      console.error("   Aposta:", JSON.stringify(aposta, null, 2));
      return false;
    }

    console.log(`✅ ${testCase.name}: periodo="${aposta.periodo}"`);
    return true;
  } catch (error) {
    console.error(`❌ ${testCase.name}: Erro`, error);
    return false;
  }
}

async function runAll() {
  console.log("=== Testando Períodos com Player Props ===\n");
  
  const results = await Promise.all(testCases.map(runTest));
  const passed = results.filter(Boolean).length;
  const total = results.length;

  console.log(`\n=== Resultado: ${passed}/${total} testes passaram ===`);
  
  if (passed < total) {
    process.exit(1);
  }
}

if (require.main === module) {
  runAll().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
