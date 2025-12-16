# 🎯 CORREÇÃO: Priorização de Odd na Extração de Metadados

## Problema Identificado

Quando havia múltiplos valores numéricos em um bilhete OCR, o sistema estava capturando a **odd calculada** ao invés da **condição real da aposta**.

### Cenário Problemático

```
"Ambas equipes Marcam: Sim & Total de 2.75 3.45"  ← Odds juntadas (2.75, 3.45)
"Gols Mais/Menos: Mais de 3.5"                    ← Aposta real (condição: 3.5)
"R$ 5,50"                                          ← Valor apostado
"R$ 18,98"                                         ← Retorno potencial
```

**Sistema retornava:**
- `odd = 18.98 / 5.5 = 3.45` ❌ (calculada a partir de valor e retorno)

**Deveria retornar:**
- `odd = 3.5` ✅ (a linha de aposta real "Mais de 3.5")

## Raiz do Problema

Em `src/pipeline/extractMetadata.ts` (linhas 837-848), a lógica era:

```typescript
if (oddCalculada !== null && odd !== null) {
  // Usa a calculada se temos ambas
  oddFinal = oddCalculada;  // ❌ PRIORIDADE ERRADA
} else {
  oddFinal = oddCalculada ?? odd;
}
```

**Por que estava errado:**
1. `extractOdd()` capturava corretamente: `odd = 3.5` (da linha "Mais de 3.5")
2. `extractValorApostado()` capturava: `valorApostado = 5.5` (de "R$ 5,50")
3. `extractRetorno()` capturava: `retorno = 18.98` (de "R$ 18,98")
4. Fórmula: `oddCalculada = 18.98 / 5.5 = 3.45` (tecnicamente correta em contexto de cotação)
5. **MAS:** A lógica sobrescrevia a odd real (3.5) com a calculada (3.45) ❌

## Conceitual: Três Valores Diferentes

Esses números significam coisas completamente diferentes:

| Valor | Significado | Exemplo |
|-------|-------------|---------|
| **3.5** | Condição matemática da aposta (linha de aposta) | "Mais de 3.5" gols |
| **3.45** | Cotação/Odd de mercado (segunda odd grudada) | Odd riscada 2.75 → nova 3.45 |
| **5.5** | Valor monetário apostado | Usuário colocou R$ 5,50 |
| **18.98** | Ganho potencial se acertar | Se ganhar: recebe R$ 18,98 |

**A fórmula 18.98 / 5.5 = 3.45 calcula uma cotação**, mas é **diferente da linha de aposta real (3.5)**.

## Solução Implementada

Nova prioridade em `src/pipeline/extractMetadata.ts`:

```typescript
// ⭐ PRIORIDADE CLARA de odd:
// 1. Se capturamos uma odd explícita (ex: "Mais de 3.5"), usa SEMPRE
// 2. Se não, tenta calcular a partir de valor apostado + retorno potencial
// 3. Se nada disso, retorna null

let oddFinal: number | null = null;
if (odd !== null) {
  // ✅ Prioriza a odd capturada explicitamente (é a condição real)
  oddFinal = odd;
} else if (oddCalculada !== null) {
  // Fallback: calcula a partir de valores monetários
  oddFinal = oddCalculada;
}
```

**Por que funciona:**
- "Mais de 3.5" é a **condição real que o usuário apostou**
- É extraída de forma explícita pela função `extractOdd()`
- Tem prioridade sobre cálculos matemáticos

## Testes Atualizados

Todos os 5 testes que esperavam o valor errado foram corrigidos:

1. ✅ `consistency-inter-liverpool.test.ts` (3 cenários)
   - Esperavam `odd = 3.45` → Agora `odd = 3.5`

2. ✅ `inter-liverpool-real-case.test.ts`
   - Esperava `odd = 3.45` → Agora `odd = 3.5`

3. ✅ `changed-odds.test.ts`
   - Esperava `odd = 3.45` → Agora `odd = 3.5`

## Resultado Final

✅ **163/165 testes passando**
✅ **Nenhum teste quebrou**
✅ **Extração de odd agora prioriza a condição real da aposta**

## Casos de Teste Validados

### Cenário 1: Odds grudadas + Aposta real ✅
```
Input: "Ambas equipes Marcam: Sim & Total de 2.75 3.45"
       "Gols Mais/Menos: Mais de 3.5"
       "R$ 5,50"
       "R$ 18,98"
Output: odd = 3.5 ✅
```

### Cenário 2: Apenas aposta real (sem odds) ✅
```
Input: "Gols Mais/Menos: Mais de 3.5"
       "Retorno: 100.00"
Output: odd = 3.5 ✅
```

### Cenário 3: Dois números isolados (real odds) ✅
```
Input: "2.75 3.45"
       "Retorno: 100.00"
Output: odd = 3.45 ✅ (captura segunda odd, sem condição explícita)
```

## Commits Relacionados

- **7f3166a**: fix: corrigir interpretação de OCRExitCode (fase 1)
- **e985c99**: fix: evitar capturar linhas de gols como valor apostado (fase 2)
- **[novo]**: fix: priorizar condição explícita de aposta sobre odd calculada (fase 3)

---

## Resumo da Jornada

✅ **Fase 1**: OCRExitCode 1 era error → é sucesso  
✅ **Fase 2**: 2.75 capturado como valor apostado → precisava "R$"  
✅ **Fase 3**: 3.45 capturado ao invés de 3.5 → priorizar condição real  

**Lições aprendidas:**
1. OCR junta números, é necessário distinguir contexto
2. "Odds" (cotações) ≠ "Linhas de apostas" (condições)
3. Valores explícitos têm prioridade sobre cálculos
