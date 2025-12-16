# OCR.space Exit Codes

Documentação dos códigos de saída retornados pela API OCR.space

## OCRExitCode (Nível de Requisição - Global)

| Código | Status | Significado |
|--------|--------|-------------|
| **1** | ✅ SUCESSO | Parsed Successfully - Imagem/PDFs processados com sucesso |
| **2** | ⚠️ SUCESSO PARCIAL | Parsed Partially - Alguns erros, mas resultado útil |
| **3** | ❌ FALHA | All pages failed parsing - Processamento falhou em todas as páginas |
| **4** | ❌ ERRO FATAL | Error occurred when attempting to parse - Erro fatal durante processamento |

## FileParseExitCode (Nível de Página Individual)

Retornado dentro de `ParsedResults[].FileParseExitCode`

| Código | Significado |
|--------|-------------|
| **1** | Sucesso na página individual |
| **0** | Arquivo não encontrado |
| **-10** | OCR Engine Parse Error |
| **-20** | Timeout |
| **-30** | Validation Error |
| **-99** | Unknown Error |

## Por Que Nosso Sistema Recebeu OCRExitCode 1?

Segundo os logs do usuário:
```json
{
  "OCRExitCode": 1,
  "IsErroredOnProcessing": false,
  "ProcessingTimeInMilliseconds": "937"
}
```

**Isso significa: ✅ SUCESSO!**

Nosso sistema **estava interpretando incorretamente**. O código 1 NÃO é erro, é o melhor resultado possível!

## Problema Real

O OCRExitCode 1 significa que o OCR.space processou a imagem com sucesso, **mas:**

1. **Engine 2 pode ser inadequado** para bilhetes de aposta
   - Engine 2 é melhor para CAPTCHA e texto em fundo confuso
   - Bilhetes têm estrutura tabular muito específica
   
2. **Possível Solução**: Usar Engine 1 ou testar com `isTable=true`

## Nossa Implementação

Em [src/index.ts](../index.ts), tratamos assim:

```typescript
// Codes de sucesso
const isSuccess = ocrResponse?.OCRExitCode === 1 || ocrResponse?.OCRExitCode === 2;

// Codes de erro/falha
const isFatal = 
  ocrResponse?.OCRExitCode === 3 ||
  ocrResponse?.OCRExitCode === 4 ||
  errorMessages.some(msg => msg?.includes("timeout"));
```

## Recomendação

Se o OCR.space retorna exit code 1 mas dados fragmentados:

1. ✅ Sistema está funcionando (exit code correto)
2. ⚠️ OCR.space pode estar usando engine inadequado
3. 🔧 Próximas melhorias:
   - Adicionar retry com `OCREngine=1` (mais genérico)
   - Adicionar `isTable=true` para bilhetes
   - Monitorar taxas de sucesso por engine

## Referência

[OCR.space Official Documentation](https://ocr.space/ocrapi)
