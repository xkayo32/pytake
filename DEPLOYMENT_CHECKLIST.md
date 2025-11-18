# ✅ PYTAKE FLOW AUTOMATION - DEPLOYMENT CHECKLIST

## 📋 Pré-Deploy

### 1. Verificar Estado do Git
```bash
# Estar em branch de feature
git branch
# Output: * feature/TICKET-XXX-flow-automation-frontend

# Verificar status
git status
# Deve estar limpo (committed)

# Verificar commits
git log --oneline -5
```

**Status:** ⏳ Pendente  
**Verificado por:** ___________  
**Data:** ___________

---

### 2. Verificar Migrações do Banco
```bash
# Listar migrações pendentes
podman exec pytake-backend alembic current
podman exec pytake-backend alembic heads

# Verificar se migration de schedule existe
podman exec pytake-backend ls alembic/versions/ | grep -i schedule
```

**Output Esperado:**
- Migration `flow_automation_schedule_001.py` presente
- Status: `current (head)` após upgrade

**Status:** ⏳ Pendente  
**Verificado por:** ___________  
**Data:** ___________

---

### 3. Aplicar Migração
```bash
# Backup do banco (IMPORTANTE!)
podman exec pytake-postgres pg_dump pytake > /tmp/pytake_backup_$(date +%s).sql

# Aplicar migration
podman exec pytake-backend alembic upgrade head

# Verificar resultado
podman exec pytake-backend alembic current
```

**Status:** ⏳ Pendente  
**Verificado por:** ___________  
**Data:** ___________

---

## 🚀 Deploy Backend

### 4. Iniciar Worker Celery
```bash
# Terminal 1: Worker
podman exec pytake-backend celery -A app.tasks.celery_app worker -l info

# Terminal 2: Beat (scheduler automático - opcional)
podman exec pytake-backend celery -A app.tasks.celery_app beat -l info
```

**Esperado:**
```
[2025-01-15 10:00:00,000: INFO/MainProcess] celery@... ready.
```

**Status:** ⏳ Pendente  
**Verificado por:** ___________  
**Data:** ___________

---

### 5. Testar Endpoints Backend
```bash
# Swagger API
curl -s http://localhost:8000/api/v1/docs

# Criar automação
curl -X POST http://localhost:8000/api/v1/flow-automations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Automation",
    "description": "Test",
    "organization_id": "org_xxx",
    "chatbot_id": "chatbot_xxx",
    "flow_id": "flow_xxx",
    "whatsapp_number_id": "wa_xxx",
    "trigger_type": "scheduled",
    "audience_type": "all",
    "variable_mapping": {},
    "is_active": true
  }'
```

**Status Esperado:** 201 Created  
**Status:** ⏳ Pendente  
**Verificado por:** ___________  
**Data:** ___________

---

## 🎨 Deploy Frontend

### 6. Verificar Build Frontend
```bash
# Build production
podman exec pytake-frontend npm run build

# Verificar saída
# Esperado: "exported successfully"
```

**Status:** ⏳ Pendente  
**Verificado por:** ___________  
**Data:** ___________

---

### 7. Testar Frontend Localmente
```bash
# Abrir browser
curl http://localhost:3001/admin/flow-automations

# Esperado: Dashboard carrega sem erros
```

**Checklist Visual:**
- [ ] Dashboard carrega
- [ ] Tabela com automações exibe
- [ ] Filtros funcionam
- [ ] Botão "New Automation" presente
- [ ] Menu dropdown em cada linha funciona
- [ ] Dark mode toggle funciona

**Status:** ⏳ Pendente  
**Verificado por:** ___________  
**Data:** ___________

---

## 🧪 Testes Funcionais

### 8. Teste: Criar Automação
```
Passos:
1. Ir para /admin/flow-automations/new
2. Step 1: Preencher Name = "Test Auto"
3. Selecionar Chatbot, Flow, WhatsApp
4. Step 2: Selecionar Audience Type
5. Step 3: Adicionar variáveis (ou skip)
6. Step 4: Enable Schedule (ou skip)
7. Clicar "Create"

Resultado Esperado:
✅ Redirecionado para dashboard OU detail page
✅ Nova automação aparece na tabela
✅ Status = "draft"
```

**Status:** ⏳ Pendente  
**Verificado por:** ___________  
**Data:** ___________

---

### 9. Teste: Editar Schedule
```
Passos:
1. Abrir automação > aba "Schedule"
2. Clicar "Configure Schedule"
3. Selecionar recurrence type = "Weekly"
4. Selecionar dias: MON, WED, FRI
5. Configurar horário 09:00-18:00
6. Clicar "Save"
7. Observar preview atualizar

Resultado Esperado:
✅ Calendar preview mostra 10 próximas execuções
✅ Todas nas segundas, quartas, sextas
✅ Entre 09:00-18:00
```

**Status:** ⏳ Pendente  
**Verificado por:** ___________  
**Data:** ___________

---

### 10. Teste: Gerenciar Exceções
```
Passos:
1. Abrir automação > aba "Exceptions"
2. Clicar "Add Exception"
3. Tipo = "Skip"
4. Data range: próximas 2 semanas
5. Reason: "Holiday"
6. Clicar "Add"

Resultado Esperado:
✅ Exceção adicionada à lista
✅ Calendar preview atualiza (sem datas da range)
✅ Botão delete funciona
```

**Status:** ⏳ Pendente  
**Verificado por:** ___________  
**Data:** ___________

---

### 11. Teste: Execute Now
```
Passos:
1. Abrir automação
2. Clicar botão "Execute Now"
3. Observar confirmação

Resultado Esperado:
✅ Confirmação exibida
✅ Sucesso/erro retornado
✅ Timestamp "Last Execution" atualizado
```

**Status:** ⏳ Pendente  
**Verificado por:** ___________  
**Data:** ___________

---

## 🔍 Verificação de Compatibilidade

### 12. Verificar Logs
```bash
# Frontend logs
podman compose logs -f frontend | head -20

# Backend logs
podman compose logs -f backend | head -20

# Celery logs
# (verificar terminal onde está rodando)
```

**Esperado:**
- Nenhum erro de build
- Nenhum erro de conexão
- Worker rodando sem erros

**Status:** ⏳ Pendente  
**Verificado por:** ___________  
**Data:** ___________

---

### 13. Verificar TypeScript Errors
```bash
# No frontend
podman exec pytake-frontend npm run type-check

# Esperado: Sem erros
```

**Status:** ⏳ Pendente  
**Verificado por:** ___________  
**Data:** ___________

---

## 📋 Documentação

### 14. Verificar Documentação Criada
```bash
# Listar arquivos criados
ls -la /home/administrator/pytake/*.md
ls -la /home/administrator/pytake/frontend/src/components/admin/flow-automations/
ls -la /home/administrator/pytake/frontend/src/app/admin/flow-automations/
```

**Arquivos Esperados:**
- ✅ SYSTEM_STATUS.md
- ✅ PROJECT_COMPLETE.md
- ✅ FRONTEND_COMPLETE.md
- ✅ FLOW_AUTOMATION_COMPLETE.md
- ✅ IMPLEMENTATION_SUMMARY.md
- ✅ 4 componentes React
- ✅ 3 páginas Next.js
- ✅ API client + types

**Status:** ⏳ Pendente  
**Verificado por:** ___________  
**Data:** ___________

---

## 🎯 Aprovação Final

### 15. Aprovação de Deploy para Produção

| Item | Status | Aprovado |
|------|--------|----------|
| Todas as migrações aplicadas | ⏳ | ☐ |
| Backend respondendo 200 OK | ⏳ | ☐ |
| Frontend carregando sem erros | ⏳ | ☐ |
| Testes funcionais passando | ⏳ | ☐ |
| Logs sem erros | ⏳ | ☐ |
| TypeScript validado | ⏳ | ☐ |
| Documentação completa | ⏳ | ☐ |

**Aprovado por:** ___________  
**Data:** ___________  
**Hora:** ___________

---

## 📊 Resumo de Implantação

**Data de Início:** ___________  
**Data de Conclusão:** ___________  
**Tempo Total:** ___________

**Problemas Encontrados:**
```
[Descrever qualquer problema encontrado]
```

**Resolução:**
```
[Descrever como foi resolvido]
```

**Notas Adicionais:**
```
[Observações importantes]
```

---

## 🎉 Conclusão

**Status Final:** ⏳ Pendente  
**Pronto para Produção:** ☐ Sim / ☐ Não

**Assinado por:** ___________  
**Data:** ___________

---

## 📞 Contato em Caso de Problemas

**On-Call:** ___________  
**Backup:** ___________  
**Escalação:** ___________

**Rollback Plan:**
```bash
# Se necessário, restaurar backup
podman exec pytake-postgres psql pytake < /tmp/pytake_backup_TIMESTAMP.sql

# E fazer revert dos containers
podman compose restart
```

---

**Última Atualização:** 15 de Janeiro de 2025  
**Versão:** 1.0.0
