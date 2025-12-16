# 🚩 Feature Flags - Sistema Gratuito

Sistema de feature flags **100% gratuito** usando PostgreSQL próprio.

## 📋 Conceito

**Feature Flags** permitem ligar/desligar funcionalidades sem fazer deploy:

```typescript
// Código sempre deployado, mas controlado por flag
if (featureEnabled('new-chart')) {
  return <NewChart />;    // Versão nova
} else {
  return <OldChart />;    // Versão antiga
}
```

---

## 🎯 Casos de Uso

### 1. **Teste com Usuários Reais**
```
Deploy 100% usuários → Liga flag para 5% → Monitora → Se OK, aumenta para 100%
```

### 2. **Lançamento Gradual**
```
Dia 1: 10% veem a nova feature
Dia 2: 25%
Dia 3: 50%
Dia 4: 100%
```

### 3. **Kill Switch de Emergência**
```
Bug crítico? → Desliga flag → Todos voltam para versão antiga → Sem rollback
```

### 4. **A/B Testing**
```
Versão A: 50% dos usuários
Versão B: 50% dos usuários
→ Mede qual converte mais
```

---

## 🏗️ Arquitetura

### Backend (BackTrack)

**Banco de Dados**:
```sql
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY,
  key TEXT UNIQUE,           -- Ex: "new-chart-design"
  name TEXT,                 -- Ex: "Novo Design de Gráficos"
  enabled BOOLEAN,           -- Liga/desliga globalmente
  rollout INTEGER,           -- Percentual (0-100)
  user_ids TEXT[]            -- Whitelist de usuários
);
```

**API**:
- `GET /api/feature-flags/user` - Todas as flags do usuário logado
- `GET /api/feature-flags/check/:key` - Verifica flag específica
- `POST /api/feature-flags` - Criar flag (admin)
- `PATCH /api/feature-flags/:key` - Atualizar flag (admin)
- `POST /api/feature-flags/:key/enable` - Ligar flag 100% (admin)
- `POST /api/feature-flags/:key/disable` - Desligar flag (admin)
- `POST /api/feature-flags/:key/rollout` - Definir percentual (admin)

### Frontend (RealTrack)

**Hook React**:
```tsx
import { useFeatureFlag } from './hooks/useFeatureFlag';

function MyComponent() {
  const { isEnabled } = useFeatureFlag();
  
  return isEnabled('new-feature') ? <NewFeature /> : <OldFeature />;
}
```

---

## 🚀 Como Usar

### 1. **Setup Inicial** (já feito)

```bash
# Migration já aplicada
cd BackTrack
npx prisma migrate dev --name add_feature_flags

# Criar flags padrão
npm run dev
# Ou criar manualmente via API
```

### 2. **Backend - Adicionar no App.tsx do RealTrack**

```tsx
import { FeatureFlagProvider } from './hooks/useFeatureFlag';

function App() {
  return (
    <FeatureFlagProvider>
      <Routes>
        {/* ... rotas ... */}
      </Routes>
    </FeatureFlagProvider>
  );
}
```

### 3. **Usar em Componentes**

#### Opção 1: Hook
```tsx
function Dashboard() {
  const { isEnabled } = useFeatureFlag();
  
  if (isEnabled('new-chart-design')) {
    return <NewChartComponent />;
  }
  
  return <OldChartComponent />;
}
```

#### Opção 2: Componente
```tsx
import { FeatureFlag } from './hooks/useFeatureFlag';

function Dashboard() {
  return (
    <>
      <FeatureFlag flag="new-chart-design">
        <NewChartComponent />
      </FeatureFlag>
      
      <FeatureFlag 
        flag="advanced-filters" 
        fallback={<BasicFilters />}
      >
        <AdvancedFilters />
      </FeatureFlag>
    </>
  );
}
```

#### Opção 3: Hook Simples
```tsx
import { useFlag } from './hooks/useFeatureFlag';

function MyComponent() {
  const showNewFeature = useFlag('new-feature');
  
  return (
    <div>
      {showNewFeature && <NewFeature />}
    </div>
  );
}
```

---

## 🎛️ Gerenciar Flags (Admin)

### Via API (Postman/cURL)

#### Criar Nova Flag
```bash
curl -X POST http://localhost:4000/api/feature-flags \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "dark-mode",
    "name": "Modo Escuro",
    "description": "Tema escuro para a interface",
    "enabled": false,
    "rollout": 0
  }'
```

#### Ligar Flag para 100%
```bash
curl -X POST http://localhost:4000/api/feature-flags/dark-mode/enable \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Rollout Gradual (ex: 25%)
```bash
curl -X POST http://localhost:4000/api/feature-flags/dark-mode/rollout \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"percentage": 25}'
```

#### Desligar Flag
```bash
curl -X POST http://localhost:4000/api/feature-flags/dark-mode/disable \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Via Swagger UI
1. Acesse `http://localhost:4000/api-docs`
2. Vá para seção "Feature Flags"
3. Use interface gráfica para gerenciar flags

---

## 🧪 Exemplos Práticos

### Exemplo 1: Novo Design de Gráficos

**Backend** (criar flag):
```bash
curl -X POST http://localhost:4000/api/feature-flags \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "key": "new-chart-design",
    "name": "Novo Design de Gráficos",
    "enabled": false,
    "rollout": 0
  }'
```

**Frontend** (usar flag):
```tsx
// src/pages/Analise.tsx
import { FeatureFlag } from '../hooks/useFeatureFlag';
import NewChart from '../components/NewChart';
import OldChart from '../components/OldChart';

function Analise() {
  return (
    <div>
      <h1>Análise de Apostas</h1>
      
      <FeatureFlag 
        flag="new-chart-design"
        fallback={<OldChart />}
      >
        <NewChart />
      </FeatureFlag>
    </div>
  );
}
```

**Teste Gradual**:
```bash
# Dia 1: 10% dos usuários
curl -X POST http://localhost:4000/api/feature-flags/new-chart-design/rollout \
  -d '{"percentage": 10}'

# Dia 2: 25%
curl -X POST http://localhost:4000/api/feature-flags/new-chart-design/rollout \
  -d '{"percentage": 25}'

# Dia 3: Se tudo OK, 100%
curl -X POST http://localhost:4000/api/feature-flags/new-chart-design/enable
```

### Exemplo 2: Filtros Avançados

```tsx
// src/pages/Apostas.tsx
import { useFlag } from '../hooks/useFeatureFlag';

function Apostas() {
  const hasAdvancedFilters = useFlag('advanced-filters');
  
  return (
    <div>
      <h1>Minhas Apostas</h1>
      
      {/* Filtros básicos (sempre visíveis) */}
      <BasicFilters />
      
      {/* Filtros avançados (apenas se flag ativa) */}
      {hasAdvancedFilters && (
        <AdvancedFilters 
          onFilterByOdds={...}
          onFilterByTipster={...}
        />
      )}
      
      <ApostasTable />
    </div>
  );
}
```

### Exemplo 3: Notificações Telegram

```tsx
// src/pages/Perfil.tsx
import { useFeatureFlag } from '../hooks/useFeatureFlag';

function Perfil() {
  const { isEnabled } = useFeatureFlag();
  
  return (
    <div>
      <h1>Perfil</h1>
      
      {/* Configurações gerais sempre visíveis */}
      <GeneralSettings />
      
      {/* Telegram apenas se flag ativa */}
      {isEnabled('telegram-notifications') && (
        <section>
          <h2>Notificações Telegram</h2>
          <TelegramSettings />
        </section>
      )}
    </div>
  );
}
```

---

## 📊 Algoritmo de Rollout

O sistema usa **hashing consistente** do userId para distribuição:

```typescript
// Sempre retorna o mesmo resultado para o mesmo userId
isUserInRollout('user-123', 25) // true ou false (consistente)

// 25% rollout = ~25% dos usuários veem a feature
// Mesmo usuário sempre terá o mesmo resultado
```

**Vantagens**:
- Usuário não fica alternando entre versões
- Distribuição estatística uniforme
- Sem necessidade de banco adicional

---

## 🔒 Segurança

### Controle de Acesso (TODO)

Por enquanto, qualquer usuário autenticado pode gerenciar flags. Para produção, adicione:

```typescript
// BackTrack/src/middleware/requireAdmin.ts
export const requireAdmin = async (req: AuthRequest, res, next) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId }
  });
  
  if (!user?.isAdmin) {
    return res.status(403).json({ error: 'Requer permissão de admin' });
  }
  
  next();
};
```

```prisma
// prisma/schema.prisma
model User {
  // ... campos existentes
  isAdmin Boolean @default(false)
}
```

---

## 💡 Boas Práticas

### ✅ DO
- Use nomes descritivos (`new-chart-design`, não `feature-1`)
- Documente o propósito da flag
- Remova flags antigas após deploy 100%
- Teste localmente antes de criar em produção
- Use rollout gradual para features arriscadas

### ❌ DON'T
- Não crie flags para tudo (apenas para features grandes)
- Não deixe flags inativas por muito tempo (tech debt)
- Não use flags para configurações (use env vars)
- Não faça rollout sem monitorar erros

---

## 🚨 Troubleshooting

### Flag não aparece no frontend

**Causa**: Cache desatualizado

**Solução**:
```tsx
const { refresh } = useFeatureFlag();

// Forçar atualização
await refresh();

// Ou limpar cache
localStorage.removeItem('feature-flags');
```

### Usuário não vê feature mesmo com rollout 100%

**Causa**: Flag desabilitada globalmente

**Solução**:
```bash
# Verificar status da flag
curl http://localhost:4000/api/feature-flags

# Ligar flag
curl -X POST http://localhost:4000/api/feature-flags/MY_FLAG/enable
```

### Como testar flag localmente?

**Opção 1: Whitelist**
```bash
# Adicionar seu userId à whitelist (sempre habilitada)
curl -X PATCH http://localhost:4000/api/feature-flags/MY_FLAG \
  -d '{"userIds": ["seu-user-id-aqui"]}'
```

**Opção 2: Forçar no código** (apenas dev)
```tsx
// Sobrescrever temporariamente
const { isEnabled } = useFeatureFlag();
const forceEnabled = true; // REMOVER ANTES DE COMMITAR

if (forceEnabled || isEnabled('my-flag')) {
  return <NewFeature />;
}
```

---

## 📈 Roadmap

Melhorias futuras:

- [ ] Painel admin visual (UI para gerenciar flags)
- [ ] Logs de alterações (audit trail)
- [ ] Metrics integradas (quantos usuários viram cada versão)
- [ ] Scheduled rollouts (aumentar automaticamente)
- [ ] Segmentação por plano (Pro vê antes que Free)

---

## 🎉 Resumo

**Custo**: $0 (usa seu PostgreSQL)
**Setup**: 5 minutos
**Manutenção**: Mínima

**Você agora pode**:
- ✅ Testar features com usuários reais sem medo
- ✅ Fazer rollout gradual (10% → 50% → 100%)
- ✅ Desligar features com 1 clique (sem rollback)
- ✅ Fazer A/B testing simples
- ✅ Whitelist específica de usuários beta

**Next step**: Criar sua primeira flag e testar!
