# Groq Key Rotation - BilheteTracker

Este módulo adiciona rotação de chaves da API Groq com retry e cooldown.

## Variáveis de ambiente
- `GROQ_API_KEYS`: lista de chaves separadas por vírgula/; ou espaço (ex.: `key1,key2 key3;key4`).
- `GROQ_API_KEY`: alternativa com uma única chave.
- `GROQ_RATE_LIMIT_COOLDOWN_MS`: cooldown em ms para TODOS os erros (padrão 30000). (ÚNICA variável suportada)

## Comportamento
- Round-robin entre chaves fora de cooldown.
- Em qualquer erro (429/401/403/5xx), o cliente troca de chave e refaz a requisição uma única vez.
- Sem multiplicador por falhas consecutivas: cada falha aplica cooldown fixo.

## Uso rápido
Em PowerShell:

```powershell
$env:GROQ_API_KEYS = "chave_1,chave_2,chave_3"
$env:GROQ_RATE_LIMIT_COOLDOWN_MS = "30000"
```

O pipeline usa `defaultLlmClient` e já está integrado ao rotador.
