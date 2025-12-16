# Testes com Groq LLM Real

## Resumo do que foi feito

Você configurou a chave Groq e agora o sistema pode usar a **API real do Groq** para parsing de bilhetes.

### ✅ Funcionamento atual:

1. **Em testes automáticos (pnpm test)**:
   - Usa `MockLlmClient` para não consumir API quota
   - **90 testes passando** com parsing determinístico
   - Rápido e previsível

2. **Em ambiente de produção**:
   - Detecta `GROQ_API_KEY` no `.env`
   - **Usa GroqLlmClient real** para melhor qualidade de parsing
   - Fallback automático para Mock se a chave não estiver configurada

3. **Qualidade de Parsing (observado no test production-ocr.test.ts)**:
   - ✅ "Total Gols - Mais de 2.5" → `match_prop` (correto!)
   - ✅ "Francisco Conceição (JUV) - Chutar a Gol" → `player_prop` com team abbrev
   - ✅ "Vencedor 1º Tempo - Juventus" → `winner` com período
   - ✅ OCR encoding cleanup funcionando

---

## ⚠️ Rate Limit do Groq

**Limite: 3 requisições por minuto** (6000 tokens/minuto)

Se você tentar rodar muitos testes em paralelo, baterá no rate limit (erro 429).

---

## 🧪 Como rodar testes com Groq real

### Opção 1: Testes manuais (respeitando rate limit)

Arquivo: `src/tests/groq-integration.manual.ts`

**Para rodar manualmente:**
```bash
# Compila e executa manualmente
npx ts-node src/tests/groq-integration.manual.ts
```

⚠️ **Importante**: Espere **20+ segundos** entre requisições para respeitar rate limit.

---

### Opção 2: Script de teste com delay automático

Crie `test-groq.ts`:

```typescript
import { GroqLlmClient } from "./src/utils/groqLlmClient";
import { semanticTicketLLM } from "./src/pipeline/semanticTicketLLM";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function testGroq() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("GROQ_API_KEY não configurada!");
    process.exit(1);
  }

  const client = new GroqLlmClient({ apiKey });

  const testCases = [
    {
      name: "Juventus x Pafos",
      lines: [
        "Juventus x Pafos",
        "© Vencedor do 1° Tempo - Juventus",
        "• Total Gols - Mais de 2.5",
        "• Francisco Conceição (JUV) - Chutar a Gol",
      ],
    },
    {
      name: "Jokic - Múltiplos stats",
      lines: [
        "Nikola Jokic - 10+ Assistências",
        "Nikola Jokic - 15+ Pontos",
        "1º Quarto - Nikola Jokic - 5+ Rebotes",
      ],
    },
  ];

  for (const test of testCases) {
    console.log(`\n\n=== Teste: ${test.name} ===`);
    try {
      const result = await semanticTicketLLM({ lines: test.lines }, client);
      console.log("Apostas extraídas:");
      result.apostasDetalhadas.forEach((a, i) => {
        console.log(
          `  ${i + 1}. ${a.tipo}: ${a.jogador || a.time} - ${a.estatistica} ${a.condicao || ""}`
        );
      });
    } catch (error: any) {
      console.error("❌ Erro:", error.message);
    }

    // Esperar 21 segundos antes do próximo teste
    console.log("⏳ Aguardando 21s para respeitar rate limit...");
    await sleep(21000);
  }
}

testGroq();
```

Depois execute:
```bash
npx ts-node test-groq.ts
```

---

## 📊 Comportamento do Groq observado

### Output real do Groq (test production-ocr.test.ts passou):

```json
{
  "tipo": "winner",
  "time": "Juventus",
  "periodo": "1º Tempo",
  "confianca": "alta"
}
{
  "tipo": "match_prop",
  "jogador": null,
  "estatistica": "Gols",
  "condicao": "Mais de 2.5",
  "valor": 2.5,
  "time": null,
  "periodo": "Jogo",
  "confianca": "alta"
}
{
  "tipo": "player_prop",
  "jogador": "Francisco Conceição",
  "estatistica": "Chutar a Gol",
  "condicao": null,
  "periodo": "Jogo",
  "timeAbrev": "JUV",
  "confianca": "alta"
}
```

**Pontos-chave:**
- ✅ "Total Gols" é parseado como `match_prop` (não player_prop)
- ✅ Player props têm `timeAbrev` extraído
- ✅ Períodos são detectados corretamente
- ✅ Confiança baseada em clareza textual

---

## 🔧 Configuração

### `.env`
```env
# Seu arquivo .env local (NÃO faça commit!)
GROQ_API_KEY=seu_token_aqui
```

### `.env.example` (versionado no git)
```env
# Template - substitua com sua chave real
GROQ_API_KEY=
```

---

## 📝 Próximos passos para iteração

1. **Testar em produção**: Use `GroqLlmClient` real com seus dados
2. **Ajustar prompt**: Se qualidade não for ideal, modifique `systemPrompt` em `groqLlmClient.ts`
3. **Monitorar rate limit**: 3 req/min = cuidado com volume
4. **Fallback inteligente**: Se Groq falhar, usa `MockLlmClient` automaticamente

---

## 📝 Histórico de mudanças nesta sessão

- ✅ Adicionado carregamento de `.env` em `jest.config.js`
- ✅ Criado factory pattern em `defaultLlmClient` para seleção automática
- ✅ Desabilitados testes skipped que usavam Groq em `user-reported-bugs.test.ts`
- ✅ Aumentado timeout dos testes para 30s (para Groq real)
- ✅ Testado production-ocr com Groq real ✅ **PASSOU**
- ✅ Criado `groq-integration.manual.ts` para testes manuais

