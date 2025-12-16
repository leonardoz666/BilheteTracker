# CI/CD - GitHub Actions

Este projeto usa **GitHub Actions** para automatizar testes, builds e deploys.

## 📋 Workflows Configurados

### 1. CI/CD Pipeline (`ci-cd.yml`)

**Trigger**: Push ou PR para `main` ou `develop`

**Jobs**:
1. **test-backtrack** - Executa testes Jest do BackTrack
2. **build-backtrack** - Build TypeScript do BackTrack
3. **lint-realtrack** - ESLint no RealTrack
4. **build-realtrack** - Build Vite do RealTrack
5. **test-bilhete-tracker** - Testes do bilhete-tracker
6. **notify-success** - Notificação Telegram de sucesso
7. **notify-failure** - Notificação Telegram de falha

**Duração estimada**: 5-8 minutos

### 2. Deploy para Produção (`deploy-production.yml`)

**Trigger**: Push para `main` ou trigger manual

**Jobs**:
1. **deploy-backtrack** - Deploy no Render + health check
2. **deploy-realtrack** - Deploy na Vercel
3. **deploy-bilhete-tracker** - Deploy no Render + health check
4. **notify-deploy** - Notificação de deploy completo
5. **rollback** - Notificação em caso de falha

**Duração estimada**: 3-5 minutos

---

## 🔧 Configuração Necessária

### Secrets do GitHub

Configure em `Settings → Secrets and variables → Actions`:

#### Banco de Dados
```
DATABASE_URL=postgresql://user:pass@host:5432/db
```

#### API Keys
```
OCR_SPACE_API_KEY=your-ocr-key
GROQ_API_KEY=your-groq-key
```

#### JWT Secrets
```
JWT_SECRET=your-production-jwt-secret
JWT_REFRESH_SECRET=your-production-refresh-secret
```

#### Deploy Hooks
```
RENDER_DEPLOY_HOOK_BACKTRACK=https://api.render.com/deploy/srv-xxx
RENDER_DEPLOY_HOOK_BILHETE_TRACKER=https://api.render.com/deploy/srv-yyy
```

#### Vercel
```
VERCEL_TOKEN=your-vercel-token
```

#### Frontend Env
```
VITE_API_URL=https://backtrack-api.onrender.com
```

#### Notificações Telegram
```
TELEGRAM_BOT_TOKEN=123456:ABC-DEF
TELEGRAM_CHAT_ID=-1001234567890
```

---

## 🚀 Como Obter os Secrets

### 1. Render Deploy Hooks

1. Acesse https://dashboard.render.com
2. Vá em seu serviço → Settings
3. Role até "Deploy Hook"
4. Copie a URL (ex: `https://api.render.com/deploy/srv-xxx?key=yyy`)

### 2. Vercel Token

```bash
# Instalar Vercel CLI
npm i -g vercel

# Fazer login
vercel login

# Gerar token
vercel token add github-actions
```

### 3. Telegram Bot

1. Fale com @BotFather no Telegram
2. Comando: `/newbot`
3. Copie o token (ex: `123456:ABC-DEF`)
4. Adicione o bot ao grupo/canal
5. Descubra o CHAT_ID:
```bash
curl https://api.telegram.org/bot<TOKEN>/getUpdates
```

---

## 📊 Status dos Workflows

### Badges para README.md

```markdown
![CI/CD](https://github.com/seu-usuario/seu-repo/workflows/CI%2FCD%20Pipeline/badge.svg)
![Deploy](https://github.com/seu-usuario/seu-repo/workflows/Deploy%20para%20Produ%C3%A7%C3%A3o/badge.svg)
```

### Visualizar Execuções

- Acesse: `https://github.com/seu-usuario/seu-repo/actions`
- Veja logs de cada job
- Re-execute workflows falhados

---

## 🔄 Fluxo de Deploy

```mermaid
graph TD
    A[Push para main] --> B[CI: Testes]
    B --> C{Passou?}
    C -->|Sim| D[Build]
    C -->|Não| E[Notificar Falha]
    D --> F[Deploy Render]
    D --> G[Deploy Vercel]
    F --> H[Health Check]
    G --> H
    H --> I{Saudável?}
    I -->|Sim| J[Notificar Sucesso]
    I -->|Não| K[Notificar Falha + Rollback]
```

---

## 🧪 Testar Localmente

### Simular CI (sem deploy)

```bash
# BackTrack
cd BackTrack
npm ci
npm run build
npm test

# RealTrack
cd RealTrack
npm ci
npm run build

# bilhete-tracker
cd bilhete-tracker
npm ci
npm test
```

### Testar Deploy Hook

```bash
# Trigger deploy manual
curl -X POST https://api.render.com/deploy/srv-xxx?key=yyy
```

---

## 📈 Métricas

| Workflow | Execuções/mês | Minutos/mês | Custo |
|----------|---------------|-------------|-------|
| CI/CD | ~100 | ~600 | Grátis (2000 min inclusos) |
| Deploy | ~50 | ~200 | Grátis |
| **Total** | 150 | 800 | **$0** |

---

## 🐛 Troubleshooting

### Build falha com "Prisma Client not generated"

**Solução**: Adicione step de geração:
```yaml
- name: Gerar Prisma Client
  run: npx prisma generate
```

### Deploy no Render demora muito

**Solução**: Render free tier tem cold start (~30-60s). Use:
```yaml
- name: Aguardar deploy
  run: sleep 90  # Aumentar timeout
```

### Health check sempre falha

**Solução**: Verifique se endpoint `/health` existe:
```bash
curl https://backtrack-api.onrender.com/health
```

### Telegram não notifica

**Solução**: Verifique se bot está no grupo:
```bash
curl https://api.telegram.org/bot<TOKEN>/getUpdates
```

---

## 📝 Próximos Passos

- [ ] Adicionar testes E2E com Playwright
- [ ] Configurar Codecov para coverage reports
- [ ] Implementar blue-green deployment
- [ ] Adicionar staging environment
- [ ] Configurar automated rollback
- [ ] Integrar Sentry para error tracking

---

## 🔗 Links Úteis

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Render Deploy Hooks](https://render.com/docs/deploy-hooks)
- [Vercel CLI](https://vercel.com/docs/cli)
- [Telegram Bot API](https://core.telegram.org/bots/api)
