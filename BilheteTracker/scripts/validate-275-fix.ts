import { extractMetadata } from "../src/pipeline/extractMetadata";

/**
 * Teste: Validar que a correção não quebrou casos válidos
 */

function validateFix() {
  console.log("✅ Validando que casos válidos ainda funcionam\n");

  const testCases = [
    {
      name: "Válido: Aposta + R$ 5.50",
      lines: ["Aposta", "R$ 5.50", "Retorno", "R$ 18.98"],
      expectedValor: 5.5,
      expectedRetorno: 18.98,
    },
    {
      name: "Válido: Aposta + r$ 5.50 (minúsculo)",
      lines: ["Aposta", "r$ 5.50", "Retorno", "r$ 18.98"],
      expectedValor: 5.5,
      expectedRetorno: 18.98,
    },
    {
      name: "Válido: Aposta + $ 5.50",
      lines: ["Aposta", "$ 5.50", "Retorno", "$ 18.98"],
      expectedValor: 5.5,
      expectedRetorno: 18.98,
    },
    {
      name: "❌ QUEBRADO (esperado): Aposta + 5.50 (sem R$)",
      lines: ["Aposta", "5.50", "Retorno", "18.98"],
      expectedValor: null,  // Agora rejeita sem R$
      expectedRetorno: null,
    },
    {
      name: "❌ QUEBRADO (esperado): Aposta + 2.75 (linha de gols)",
      lines: ["Aposta", "2.75", "Retorno", "18.98"],
      expectedValor: null,  // Agora rejeita sem R$
      expectedRetorno: null,
    },
    {
      name: "Válido: Padrão com R$",
      lines: [
        "Gols Mais/Menos",
        "Mais de 3.5",
        "Ambas Marcam",
        "Sim",
        "Total Gols",
        "Mais de 2.75",
        "R$ 5.50",
        "Retorno Potencial",
        "R$ 18.98",
      ],
      expectedValor: 5.5,
      expectedRetorno: 18.98,
    },
  ];

  let allPassed = true;

  testCases.forEach(test => {
    const result = extractMetadata(test.lines);
    
    const valorOk = result.metadata.valorApostado === test.expectedValor;
    const retornoOk = result.metadata.retornoPotencial === test.expectedRetorno;
    const passed = valorOk && retornoOk;

    const status = passed ? "✅ PASSOU" : "❌ FALHOU";
    console.log(`${status} ${test.name}`);
    console.log(`     Esperado: valor=${test.expectedValor}, retorno=${test.expectedRetorno}`);
    console.log(`     Obtido:   valor=${result.metadata.valorApostado}, retorno=${result.metadata.retornoPotencial}`);
    console.log();

    if (!passed) allPassed = false;
  });

  console.log(allPassed ? "✅ TODOS OS TESTES PASSARAM!" : "❌ ALGUNS TESTES FALHARAM");
}

validateFix();
