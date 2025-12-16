# 🤝 Guia de Contribuição

**Autor:** Kayo Carvalho Fernandes  
**Data:** Dezembro de 2025  
**Versão:** 1.0  
**Projeto:** PyTake Meta Templates Enhancement

---

## 📋 Antes de Começar

### Pré-requisitos

- Git proficiency (pull, push, branches, rebase)
- Python 3.12+ experience
- FastAPI familiarity
- PostgreSQL/SQLAlchemy básico
- Docker/Docker Compose

### Setup Inicial

```bash
# 1. Fork do repositório
# (No GitHub)

# 2. Clone seu fork
git clone https://github.com/YOUR_USERNAME/pytake.git
cd pytake

# 3. Add upstream
git remote add upstream https://github.com/xkayo32/pytake.git

# 4. Setup local
cp .env.example .env
docker-compose up -d

# 5. Verificar setup
docker exec pytake-backend pytest tests/test_phase_1_1_named_parameters.py -v
# Esperado: ✅ PASS
```

---

## 🌳 Git Workflow

### Branch Strategy

```
main
├─ develop (default branch para PRs)
│  ├─ feature/[TICKET]-description
│  ├─ fix/[TICKET]-description
│  └─ refactor/[TICKET]-description
│
└─ hotfix/[TICKET]-description (apenas de main)
```

### Criar Branch

```bash
# 1. Sincronizar com upstream
git fetch upstream
git checkout develop
git pull upstream develop

# 2. Criar branch
git checkout -b feature/TICKET-123-awesome-feature

# Convenção de nome:
# - feature/: Nova funcionalidade
# - fix/: Bug fix
# - refactor/: Refatoração sem mudança de funcionalidade
# - docs/: Mudança de documentação
# - test/: Adicionar/melhorar testes
# - chore/: Manutenção, dependências, etc

# 3. Verificar branch
git branch --show-current
# Esperado: feature/TICKET-123-awesome-feature
```

### Commits

```bash
# Convenção de commit message
git commit -m "feat: Adicionar suporte a X | Author: Seu Nome"

# Exemplos:
git commit -m "feat: Implementar Phase 3.3 - Expense Tracking | Author: João Silva"
git commit -m "fix: Corrigir data leak em query de templates | Author: Maria Santos"
git commit -m "test: Adicionar 10 testes para ExpenseService | Author: Pedro Costa"
git commit -m "docs: Atualizar API docs | Author: Ana Oliveira"
git commit -m "chore: Atualizar dependências | Author: Carlos Mendes"

# Commits atômicos (uma mudança por commit)
# ✅ BOM: 3 commits pequenos
# ❌ RUIM: 1 commit gigante com 50 mudanças
```

### Push e Pull Request

```bash
# 1. Push para seu fork
git push origin feature/TICKET-123-awesome-feature

# 2. Criar PR no GitHub
# - Title: feat: Descrição | Author: Seu Nome
# - Description: Explicar mudanças, link para JIRA/issue
# - Base: develop (não main!)
# - Compare: sua branch

# 3. Descrever PR com:
```

**PR Template:**
```markdown
## Descrição
Breve descrição do que foi feito.

## Tipo de Mudança
- [ ] Bug fix (correção sem mudança de API)
- [ ] Nova funcionalidade (adição sem breaking change)
- [ ] Breaking change (mudança de API)
- [ ] Documentação

## Mudanças
- Mudança 1
- Mudança 2
- Mudança 3

## Testes
- [ ] Testes unitários adicionados/atualizados
- [ ] Testes de integração adicionados/atualizados
- [ ] Coverage >85%

## Checklist
- [ ] Código segue style guide
- [ ] Multi-tenancy verificado
- [ ] RBAC checks adicionados se necessário
- [ ] Sem hardcode de secrets
- [ ] Migrations testadas
- [ ] Documentação atualizada
- [ ] Sem breaking changes

## Link para Issue
Fixes #123
Relates to #456
```

---

## 💻 Desenvolvimento

### Estrutura de Código

Seguir padrão de 3-camadas:

```
Routes → Services → Repositories → Models
```

**Exemplo:**
```python
# ✅ CORRETO - 3-camadas
# routes/templates.py
@router.post("/templates")
async def create_template(
    schema: TemplateCreateSchema,
    current_user: User = Depends(get_current_user)
):
    service = TemplateService(db)
    return await service.create_template(schema, current_user.organization_id)

# services/template_service.py
class TemplateService:
    async def create_template(self, schema: TemplateCreateSchema, org_id: UUID):
        # Validação business logic
        if await self.template_repo.get_by_name(schema.name, org_id):
            raise DuplicateError(...)
        
        # Criar e salvar
        template = WhatsAppTemplate(**schema.dict(), organization_id=org_id)
        return await self.template_repo.create(template)

# repositories/template_repository.py
class TemplateRepository:
    async def create(self, template: WhatsAppTemplate):
        self.session.add(template)
        await self.session.flush()  # Insert
        return template

# ❌ ERRADO - Skipando camadas
# routes/templates.py
@router.post("/templates")
async def create_template(schema: TemplateCreateSchema):
    template = WhatsAppTemplate(**schema.dict())
    session.add(template)
    await session.flush()
    return template
```

### Multi-Tenancy

**CRÍTICO:** Sempre filtrar por `organization_id`

```python
# ✅ CORRETO
async def get_templates(self, organization_id: UUID):
    return await self.session.exec(
        select(WhatsAppTemplate)
        .where(WhatsAppTemplate.organization_id == organization_id)
    )

# ❌ ERRADO
async def get_templates(self):
    return await self.session.exec(select(WhatsAppTemplate))
```

### Code Style

Seguir PEP 8:

```python
# Imports
import asyncio
from typing import Optional, List
from uuid import UUID

from sqlalchemy import select
from fastapi import APIRouter, Depends

from app.models import WhatsAppTemplate
from app.services import TemplateService

# Type hints sempre
async def get_templates(
    skip: int = 0,
    limit: int = 50,
    organization_id: UUID = ...,
) -> List[TemplateSchema]:
    pass

# Docstrings
async def create_template(schema: TemplateCreateSchema) -> TemplateSchema:
    """
    Cria um novo template WhatsApp.
    
    Args:
        schema: Dados do template
        
    Returns:
        Template criado
        
    Raises:
        DuplicateError: Se nome já existe
        ValidationError: Se dados inválidos
    """
    pass
```

### Testing

Adicionar testes para mudanças:

```python
# ✅ Adicionar testes
class TestMyFeature:
    async def test_happy_path(self):
        """Testa caso de sucesso"""
        result = await my_function()
        assert result is not None
    
    async def test_error_case(self):
        """Testa caso de erro"""
        with pytest.raises(ValueError):
            await my_function(invalid_input)
    
    async def test_multi_tenancy(self):
        """Testa isolamento de tenants"""
        org1_result = await get_data(org_id_1)
        org2_result = await get_data(org_id_2)
        assert org1_result != org2_result

# ❌ Sem testes
def my_function():
    pass  # Untested!
```

---

## 🔍 Code Review Checklist

Antes de submeter PR, verificar:

### Funcionalidade
- [ ] Feature funciona conforme esperado
- [ ] Sem regressions em funcionalidades existentes
- [ ] Testes cobrem happy path e error cases
- [ ] Testes passam localmente

### Código
- [ ] Segue style guide (PEP 8)
- [ ] Sem hardcode de values
- [ ] Sem secrets em código
- [ ] Type hints completos
- [ ] Docstrings em funções públicas
- [ ] Sem código morto/comentado

### Segurança
- [ ] Multi-tenancy isolation verificado
- [ ] RBAC checks em endpoints sensíveis
- [ ] Input validation completa
- [ ] Sem SQL injection risks
- [ ] Sem exposed credentials

### Database
- [ ] Migrations criadas (se necessário)
- [ ] Migration testada e reversível
- [ ] Indexes adicionados (se necessário)
- [ ] Performance verificada (< 100ms para 1M rows)

### Documentation
- [ ] README atualizado (se necessário)
- [ ] API docs atualizado (docstrings no endpoint)
- [ ] CHANGELOG atualizado
- [ ] Migration documented

### Performance
- [ ] Sem N+1 queries
- [ ] Batch operations usadas (se aplicável)
- [ ] Caching estratégico (sem stale data)
- [ ] Query optimization realizada

---

## 🧪 Teste Localmente

Antes de fazer push:

```bash
# 1. Testes unitários
pytest tests/ -v --cov=app --cov-report=term-missing

# 2. Testes de integração
pytest tests/integration/ -v

# 3. Linting
flake8 app/ tests/

# 4. Type checking
mypy app/

# 5. Code formatting
black app/ tests/
isort app/ tests/

# 6. Docker build
docker compose build --no-cache backend

# 7. Docker tests
docker exec pytake-backend pytest tests/ -v
```

### Auto-format

```bash
# Instalar dev dependencies
pip install -r backend/requirements-dev.txt

# Format automático
black app/ tests/
isort app/ tests/

# Verificar
flake8 app/ tests/
```

---

## 📊 Performance

### Benchmark

Se mudança afeta performance, incluir benchmark:

```python
import time

async def benchmark_get_templates():
    start = time.time()
    
    for _ in range(1000):
        await service.get_organization_templates(org_id)
    
    elapsed = time.time() - start
    per_query = elapsed / 1000
    
    print(f"Average: {per_query*1000:.2f}ms")
    # Esperado: <50ms
```

### Memory

Verificar se há memory leaks:

```bash
# Monitorar uso de memória
docker stats pytake-backend

# Se crescendo, investigar
docker exec pytake-backend python -m objgraph
```

---

## 🚀 Deploy da Feature

Após PR ser approved e merged:

```bash
# 1. Feature branch merged em develop
# (Automático via GitHub)

# 2. Deploy em staging
# - Automático (CD pipeline)
# - Aguardar ~5 minutos

# 3. Smoke tests em staging
pytest tests/smoke_tests.py -v --staging

# 4. Se OK, fazer release
# - Tag commit
# - Deploy em produção

# 5. Monitoring
# - Datadog dashboard
# - Sentry errors
# - CloudWatch logs
```

---

## 📚 Boas Práticas

### Logs

```python
# ✅ BOM
import logging

logger = logging.getLogger(__name__)

async def create_template(schema: TemplateCreateSchema):
    logger.info(f"Creating template: {schema.name}")
    template = await service.create_template(schema)
    logger.info(f"Template created: {template.id}")
    return template

# ❌ RUIM
print(f"Creating template: {schema.name}")  # Print, não log
```

### Error Handling

```python
# ✅ BOM
async def get_template(template_id: UUID, org_id: UUID):
    template = await repo.get_by_id(template_id, org_id)
    if not template:
        logger.warning(f"Template not found: {template_id}")
        raise HTTPException(status_code=404, detail="Template not found")
    return template

# ❌ RUIM
async def get_template(template_id: UUID):
    template = await repo.get_by_id(template_id)  # Sem org_id!
    return template
```

### Async/Await

```python
# ✅ CORRETO
async def get_data():
    result = await db.execute(...)  # await em async function
    return result

# ❌ ERRADO
async def get_data():
    result = db.execute(...)  # Falta await!
    return result
```

---

## 🎓 Recursos

- **[FastAPI Docs](https://fastapi.tiangolo.com/)** - Framework principal
- **[SQLAlchemy Async](https://docs.sqlalchemy.org/en/14/orm/extensions/asyncio.html)** - ORM
- **[Pydantic](https://pydantic-settings.readthedocs.io/)** - Validation
- **[Pytest](https://docs.pytest.org/)** - Testing
- **[Git Docs](https://git-scm.com/doc)** - Version control

---

## 🆘 Problemas?

1. **Verificar [TROUBLESHOOTING_FAQ.md](./TROUBLESHOOTING_FAQ.md)**
2. **Perguntar em #pytake-dev no Slack**
3. **Abrir issue no GitHub**
4. **Contactar maintainers**

---

## ✅ Merging Requirements

PR só será merged se:

- [ ] ✅ Todos os testes passam
- [ ] ✅ Coverage não diminui (<85%)
- [ ] ✅ Code review aprovado (2 reviewers)
- [ ] ✅ Sem merge conflicts
- [ ] ✅ CI/CD pipeline verde
- [ ] ✅ Smoke tests em staging passam
- [ ] ✅ Documentação atualizada
- [ ] ✅ Commits bem estruturados

---

## 🎉 Seus Primeiros Passos

1. **Escolher issue:** [GitHub Issues](https://github.com/xkayo32/pytake/issues)
2. **Abrir draft PR:** Com descrição clara
3. **Pedir feedback:** Em #pytake-dev
4. **Iterar:** Baseado em code review
5. **Merge:** Após aprovações!

**Bem-vindo ao time! 🚀**

---

**Última atualização:** 16 Dezembro 2025  
**Versão:** 1.0  
**Maintainers:** Kayo Carvalho Fernandes  
**Slack:** #pytake-backend  
**Email:** backend-team@pytake.com
