/**
 * Teste direto: Isolar apenas extractOdd
 */

// Copiar a lógica de extractOdd para teste direto
function parseNumber(str: string): number | null {
  if (!str) return null;
  const s = String(str).trim().replace(/,/g, ".");
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function isValidOdd(val: number | null): boolean {
  if (val === null) return false;
  return val >= 1.01 && val <= 50.00;
}

function testExtractOddDirect() {
  console.log("🔍 Teste Direto: extractOdd\n");

  const testCases = [
    {
      name: "Caso 1: Apenas 'Mais de 3.5'",
      lines: ["Gols Mais/Menos: Mais de 3.5", "R$5,50", "R$ 18,98"],
    },
    {
      name: "Caso 2: Dois números isolados",
      lines: ["2.75 3.45", "R$5,50"],
    },
    {
      name: "Caso 3: Ambas + Total + números + Aposta",
      lines: [
        "Ambas equipes Marcam: Sim & Total de 2.75 3.45",
        "Gols Mais/Menos: Mais de 3.5",
      ],
    },
  ];

  testCases.forEach(test => {
    console.log(`\n${test.name}`);
    console.log("Linhas:");
    test.lines.forEach((line, i) => console.log(`  ${i}: "${line}"`));

    // Procura "Mais de X.XX"
    const betConditionPattern = /(Mais de|Menos de|Over|Under|Acima de|Abaixo de|>=|<=|>|<)\s+(\d{1,3}[.,]\d{1,2})/i;
    
    for (let i = 0; i < test.lines.length; i++) {
      const match = test.lines[i].match(betConditionPattern);
      if (match) {
        const val = parseNumber(match[2]);
        console.log(`✅ Encontrou "${match[0]}" na linha ${i}: valor=${val}`);
        if (isValidOdd(val)) {
          console.log(`   → Retorna ${val}`);
          return;
        }
      }
    }

    // Procura "X.XX Y.YY"
    const twoOddsPattern = /^(\d+[.,]\d+)\s+(\d+[.,]\d+)$/;
    for (let i = 0; i < test.lines.length; i++) {
      const line = test.lines[i].trim();
      const match = line.match(twoOddsPattern);
      if (match) {
        const val1 = parseNumber(match[1]);
        const val2 = parseNumber(match[2]);
        if (isValidOdd(val1) && isValidOdd(val2)) {
          console.log(`✅ Encontrou padrão "X.XX Y.YY" na linha ${i}: ${val1} ${val2}`);
          console.log(`   → Retorna ${val2}`);
          return;
        }
      }
    }

    console.log("❌ Nenhum padrão encontrado");
  });
}

testExtractOddDirect();
