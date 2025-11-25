# ⚡ Quick Start - Implementação Frontend PyTake

**Documento:** Guia de início rápido  
**Autor:** Kayo Carvalho Fernandes  
**Data:** 24 de Novembro de 2025

---

## 📋 O que você precisa saber em 5 minutos

### Status Atual
- ✅ Backend: 100% pronto (145+ endpoints)
- ⚠️ Frontend: 31% pronto (12 de 38 páginas)
- 🔴 **Faltando:** 12 páginas críticas

### O que falta (prioridade)

```
🔴 CRÍTICA (SEMANA 1-2)
├─ /campaigns (list, create, detail)
└─ /conversations (inbox, thread)

🟠 ALTA (SEMANA 3)
├─ /ai-assistant
├─ /templates/create
└─ /templates/[id]

🟡 MÉDIA (SEMANA 4)
├─ /reports
└─ /messages/send
```

---

## 🚀 Como Começar (Copy-Paste)

### 1. Conectar no servidor
```bash
ssh administrator@209.105.242.206
cd /home/administrator/pytake
```

### 2. Verificar ambiente
```bash
# Listar containers
podman ps

# Backend rodando?
curl -s http://localhost:8002/api/v1/docs | head -20

# Frontend rodando?
curl -s http://localhost:3001 | head -20
```

### 3. Abrir editor
```bash
code /home/administrator/pytake
```

### 4. Criar branch
```bash
git fetch origin develop
git checkout -b feature/implement-campaigns develop
```

### 5. Criar arquivo da página
```bash
# Exemplo: criar página de campanhas
touch frontend/src/pages/Campaigns.tsx
```

### 6. Copiar template
```typescript
// frontend/src/pages/Campaigns.tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { campaignsAPI } from '@/lib/api'
import { Campaign } from '@/types/campaign'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()
  
  useEffect(() => {
    loadCampaigns()
  }, [])
  
  const loadCampaigns = async () => {
    try {
      setIsLoading(true)
      const response = await campaignsAPI.list()
      setCampaigns(response.data.items || [])
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Campanhas</h1>
          <Button onClick={() => navigate('/campaigns/create')}>
            Nova Campanha
          </Button>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        {isLoading ? (
          <div>Carregando...</div>
        ) : campaigns.length === 0 ? (
          <div className="text-center text-gray-500">Nenhuma campanha encontrada</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map(campaign => (
              <Card key={campaign.id} className="p-6">
                <h3 className="font-semibold">{campaign.name}</h3>
                <p className="text-sm text-gray-500">{campaign.description}</p>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" 
                    onClick={() => navigate(`/campaigns/${campaign.id}`)}>
                    Ver
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
```

### 7. Adicionar rota em App.tsx
```typescript
// frontend/src/App.tsx
// Após importes

const Campaigns = lazy(() => import('@pages/Campaigns'))

// Dentro do Routes
<Route path="/campaigns" element={<Suspense fallback={<PageLoader />}><Campaigns /></Suspense>} />
```

### 8. Testar
```bash
# Ver no navegador
# http://localhost:3001/campaigns

# Ou testar no Swagger
# http://localhost:8002/api/v1/docs
# GET /campaigns
```

### 9. Commit
```bash
git add frontend/src/pages/Campaigns.tsx frontend/src/App.tsx
git commit -m "feat: add campaigns list page

- Implementar listagem de campanhas
- Integrar com API GET /campaigns
- Adicionar botão para criar nova campanha"
```

---

## 📂 Estrutura de Pastas

```
frontend/src/
├── pages/                    # ← Páginas principais aqui
│   ├── Home.tsx
│   ├── Dashboard.tsx
│   ├── Campaigns.tsx         # ← Nova (semana 1)
│   ├── campaigns/
│   │   ├── Create.tsx        # ← Nova (semana 1)
│   │   └── [id].tsx          # ← Nova (semana 1)
│   ├── Conversations.tsx     # ← Nova (semana 2)
│   └── conversations/
│       └── [id].tsx          # ← Nova (semana 2)
├── components/               # Componentes reutilizáveis
│   ├── ui/
│   ├── layout/
│   └── campaigns/            # Novos componentes para campanhas
├── lib/
│   ├── api.ts               # ← Já tem todos os clients
│   ├── auth/
│   └── utils.ts
├── types/                    # ← Já tem todos os tipos
└── App.tsx                   # ← Adicionar rotas aqui
```

---

## 🔗 APIs Principais

Todas as APIs já estão configuradas em `frontend/src/lib/api.ts`:

```typescript
// Campanhas
campaignsAPI.list()              // GET /campaigns
campaignsAPI.get(id)             // GET /campaigns/{id}
campaignsAPI.create(data)        // POST /campaigns
campaignsAPI.update(id, data)    // PUT /campaigns/{id}
campaignsAPI.delete(id)          // DELETE /campaigns/{id}
campaignsAPI.start(id)           // POST /campaigns/{id}/start
campaignsAPI.pause(id)           // POST /campaigns/{id}/pause
campaignsAPI.stats(id)           // GET /campaigns/{id}/stats

// Conversas
conversationsAPI.list()          // GET /conversations
conversationsAPI.get(id)         // GET /conversations/{id}
conversationsAPI.getMessages(id) // GET /conversations/{id}/messages
conversationsAPI.sendMessage()   // POST /conversations/{id}/messages
conversationsAPI.assign()        // POST /conversations/{id}/assign
conversationsAPI.close()         // POST /conversations/{id}/close

// Templates
whatsappAPI.getTemplates(numberId) // GET /whatsapp/{id}/templates
whatsappAPI.createTemplate()       // POST /whatsapp/{id}/templates
whatsappAPI.updateTemplate()       // PUT /whatsapp/{id}/templates/{id}
whatsappAPI.deleteTemplate()       // DELETE /whatsapp/{id}/templates/{id}
```

---

## ✅ Checklist por Página

### Campanhas (List)
```
□ Criar arquivo: src/pages/Campaigns.tsx
□ Import tipos: Campaign, CampaignStatus
□ Import API: campaignsAPI
□ UseState para campaigns, isLoading
□ UseEffect para carregar dados
□ Render: header, tabela/cards com campanhas
□ Botão "Nova Campanha"
□ Filtros (status, data range)
□ Paginação
□ Adicionar rota em App.tsx
□ Testar: http://localhost:3001/campaigns
□ Commit com mensagem clara
```

### Campanhas (Create)
```
□ Criar arquivo: src/pages/campaigns/Create.tsx
□ Implementar Wizard com 5 steps
□ Step 1: Informações básicas
□ Step 2: Seleção de contatos
□ Step 3: Seleção de template
□ Step 4: Agendamento
□ Step 5: Revisão
□ Integrar API: campaignsAPI.create()
□ Validações
□ Redirecionar para detail após criar
□ Adicionar rota em App.tsx
□ Testar fluxo completo
□ Commit
```

### Campanhas (Detail)
```
□ Criar arquivo: src/pages/campaigns/[id].tsx
□ Header com informações da campanha
□ Tabs: Overview, Métricas, Contatos
□ Overview: progresso, gráficos, métricas
□ Botões de ação: Start, Pause, Resume, Delete
□ Carregar dados com API
□ Auto-refresh (a cada 30s)
□ Gráficos (usar recharts)
□ Integrar APIs: get, start, pause, resume, delete
□ Adicionar rota dinâmica em App.tsx
□ Testar: clicar em campanha
□ Commit
```

---

## 🔍 Debugging

### Verificar logs
```bash
# Backend
podman logs -f pytake-backend-dev | grep -i "campaign"

# Frontend
# Abrir DevTools (F12) no navegador
# Verificar Console tab
```

### Testar API manualmente
```bash
# Listar campanhas
curl -X GET http://localhost:8002/api/v1/campaigns \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Ou usar Swagger
# http://localhost:8002/api/v1/docs
```

### Problemas comuns

| Erro | Solução |
|------|---------|
| `404 Not Found` | Verificar rota em `App.tsx` |
| `API error` | Verificar token JWT, check backend logs |
| `TypeError: undefined` | Verificar imports, types, API response |
| `Component not rendering` | Verificar return JSX, check console |

---

## 📊 Estimativa

| Tarefa | Tempo | Complexidade |
|--------|-------|--------------|
| Campanhas (List) | 6-8h | ⭐ Fácil |
| Campanhas (Create - Wizard) | 10-12h | ⭐⭐ Médio |
| Campanhas (Detail) | 12-14h | ⭐⭐ Médio |
| Conversas (Inbox) | 12-14h | ⭐⭐ Médio + WebSocket |
| Conversas (Thread) | 14-16h | ⭐⭐⭐ Complexo + WebSocket |
| AI Assistant | 8-10h | ⭐⭐ Médio |
| Templates (Create) | 6-8h | ⭐ Fácil |
| Templates (Detail) | 6-8h | ⭐ Fácil |
| Reports | 8-10h | ⭐⭐ Médio |

**Total: 82-100 horas = 20-25 dias = 4-5 semanas com 1 dev**

---

## 🎯 Próximo Passo

1. Abrir VSCode: `code /home/administrator/pytake`
2. Criar branch: `git checkout -b feature/implement-campaigns develop`
3. Criar arquivo: `frontend/src/pages/Campaigns.tsx`
4. Copiar template acima
5. Testar em http://localhost:3001/campaigns
6. Adicionar rota em `App.tsx`
7. Commit: `git commit -m "feat: add campaigns list page"`

---

## 📞 Contato & Suporte

**Documentação disponível:**
- `ANALISE_ESTRUTURA_FRONTEND.md` - Análise detalhada
- `ROADMAP_IMPLEMENTACAO_FRONTEND.md` - Plano completo
- `ANALISE_RESUMO.json` - JSON para referência rápida

**Dúvidas?**
- Verificar `.github/copilot-instructions.md` para padrões do projeto
- Verificar backend em `backend/app/api/v1/endpoints/`
- Verificar tipos em `frontend/src/types/`

---

**Implementado por:** Kayo Carvalho Fernandes  
**Data:** 24 de Novembro de 2025
