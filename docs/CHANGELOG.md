# Changelog

## 2025-12-14 (v2)

### Fix: Prioridade de detecção NFL em extractMetadata
- **Problema**: `extractEsporte()` estava detectando "Futebol ⚽" em vez de "Futebol Americano 🏈" para jogos NFL
- **Causa**: Regex `/futebol|soccer/i` matchava ANTES de verificar times NFL (ex: "New England Patriots x Buffalo Bills")
- **Solução**: Reordenada prioridade de detecção em `src/pipeline/extractMetadata.ts`:
  - **PRIORIDADE 1**: Times NFL completos (ex: "New England Patriots") e aliases (ex: "Patriots", "Bills")
  - **PRIORIDADE 2**: Keywords genéricos (futebol, basquete, tênis, vôlei)
  - **PRIORIDADE 3**: Times NBA
  - **PRIORIDADE 4**: Times de futebol

### Testes
- ✅ Adicionado `src/tests/nfl-sport-detection.test.ts` com 3 casos de teste:
  - Detecção por nomes completos ("New England Patriots x Buffalo Bills")
  - Detecção por aliases ("Patriots x Bills")
  - Detecção parcial ("New England x Buffalo")
- ✅ Suíte completa: 146/148 passando (2 skipped), sem regressões

### Commits
- `222ff81` - fix(nfl): priorizar detecção de times NFL antes de keywords genéricos
- `235932d` - feat(nfl): detectar esporte 'Futebol Americano' em extractMetadata por times NFL e aliases

---

## 2025-12-14 (v1)

### Fix: NFL estatísticas e parser determinístico
- Adicionado parser determinístico para linhas no formato "Jogador - Estatística Mais/Menos de N" em `src/pipeline/semanticTicketLLM.ts`.
- `estatistica` normalizada sem incluir operadores (ex.: "Recepções", "Touchdowns"), preservando condição em `condicao`.
- `normalizeEstatistica()` prioriza estatísticas da NFL (Recepções, Touchdowns, Yards, Sacks, Fumbles, Interceptações).
- Validação de `player_prop` reforçada: rejeita placeholder de UI (`jogador="Jogador"`) e permite ações binárias sem condição (ex.: "Chutar a Gol").

### Testes
- Suíte completa: 143/145 passando (2 skipped), sem regressões.
- Corrigido `src/tests/nfl-stat-normalization.test.ts` (agora reconhece corretamente "Recepções" e "Touchdowns").
- `src/tests/production-ocr.test.ts` passa com ações binárias sem condição.

### Commit
- `fix(nfl): parser determinístico para 'Jogador - Estatística Mais/Menos de N'; normaliza estatística sem operador; validação player_prop rejeita placeholder 'Jogador' e permite ações binárias sem condição; testes atualizados e passando (143/145)`
