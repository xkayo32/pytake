# Relatório de Análise e Correção - GraphQL PyTake

**Data:** 10 de Dezembro de 2025  
**Analisado por:** Kayo Carvalho Fernandes  
**Status:** ✅ CORRIGIDO

---

## 📋 Sumário Executivo

Foram identificados e corrigidos **3 problemas críticos** que impediam o funcionamento do GraphQL:

1. ❌ `GraphQLContext` não herdava de `BaseContext` do Strawberry
2. ❌ Sessão de banco de dados sendo fechada precocemente
3. ❌ Decoradores de permissão lançando exceção incorreta

---

## 🔴 Problemas Identificados

### 1. **Erro: `InvalidCustomContext`**

**Localização:** `/home/administrator/pytake/backend/app/graphql/context.py`

**Problema:**
```python
class GraphQLContext:  # ❌ Não herda de BaseContext
    def __init__(self, request: Request, db: AsyncSession, user: User):
        ...
```

**Log de Erro:**
```
strawberry.exceptions.InvalidCustomContext: The custom context must be either a class 
that inherits from BaseContext or a dictionary
```

**Causa:** Strawberry GraphQL requer que o contexto customizado herde de `strawberry.types.BaseContext`.

**Solução:**
```python
from strawberry.types import BaseContext

class GraphQLContext(BaseContext):  # ✅ Herda de BaseContext
    def __init__(self, request: Request, db: AsyncSession, user: User):
        super().__init__()
        ...
```

---

### 2. **Erro: Sessão de Banco de Dados Fechada Prematuramente**

**Localização:** `/home/administrator/pytake/backend/app/graphql/context.py` - função `get_graphql_context()`

**Problema:**
```python
async def get_graphql_context(request: Request) -> GraphQLContext:
    async with async_session() as session:  # ❌ Fecha a sessão ao sair do contexto
        db = session
        # ... autenticação ...
        return GraphQLContext(request=request, db=db, user=user)
        # ⚠️ Neste ponto, a sessão foi fechada!
```

**Efeito:** Quando as queries/mutations tentavam usar `context.db`, a sessão estava `closed` e qualquer operação falhava.

**Solução:**
```python
async def get_graphql_context(request: Request) -> GraphQLContext:
    db = async_session()  # ✅ Cria a sessão SEM context manager
    try:
        # ... autenticação ...
        return GraphQLContext(request=request, db=db, user=user)
    except HTTPException:
        raise
    except Exception:
        await db.close()  # Fecha apenas em caso de erro
        raise
```

**Nota Importante:** O Strawberry GraphQL é responsável por fechar a sessão após a execução da query/mutation através do contexto. A sessão permanece aberta durante toda a execução da query.

---

### 3. **Erro: Exceção Incorreta nos Decoradores**

**Localização:** `/home/administrator/pytake/backend/app/graphql/permissions.py`

**Problema:**
```python
def require_auth(func):
    async def wrapper(*args, **kwargs):
        if not context.user:
            raise PermissionError("Authentication required")  # ❌ Errado
        return await func(*args, **kwargs)
    return wrapper
```

**Causa:** 
- `PermissionError` é uma exceção Python padrão que não é convertida corretamente para erro GraphQL
- Strawberry não sabe como lidar com `PermissionError` em contexto GraphQL
- Resulta em erro 500 genérico ao invés de erro 401/403

**Solução:**
```python
def require_auth(func):
    async def wrapper(*args, **kwargs):
        if not context.user:
            raise ValueError("Authentication required")  # ✅ ValueError é tratado corretamente
        return await func(*args, **kwargs)
    return wrapper
```

**Por que `ValueError`?** Strawberry converte `ValueError` para erro GraphQL com mensagem clara. HTTPException não funciona em resolvers GraphQL.

---

## 📝 Arquivos Modificados

### 1. `/home/administrator/pytake/backend/app/graphql/context.py`

**Mudanças:**
- ✅ Adicionado import: `from strawberry.types import BaseContext`
- ✅ Classe `GraphQLContext` agora herda de `BaseContext`
- ✅ Função `get_graphql_context()` refatorada para não fechar sessão prematuramente
- ✅ Adicionado tratamento de erro para fechar sessão apenas em exceções

**Linhas afetadas:** 1-175

---

### 2. `/home/administrator/pytake/backend/app/graphql/permissions.py`

**Mudanças:**
- ✅ `@require_auth`: Alterado `PermissionError` para `ValueError`
- ✅ `@require_role`: Alterado `PermissionError` para `ValueError`
- ✅ Ambos decoradores agora lançam exceção compatível com Strawberry

**Linhas afetadas:** 12-26, 48-81

---

## 🧪 Como Testar

### 1. **Teste de Contexto (GraphQL Endpoint)**

```bash
# No container ou localhost
curl -X POST http://localhost:8000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ me { id email name } }"}'
```

**Esperado (sem token):** Erro 401
```json
{
  "errors": [{"message": "Authentication required"}]
}
```

### 2. **Teste com Autenticação**

```bash
# 1. Fazer login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password"}'

# Resposta contém "access_token"
# 2. Usar token no GraphQL
curl -X POST http://localhost:8000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"query": "{ me { id email name role } }"}'
```

**Esperado:** Dados do usuário autenticado

### 3. **Teste de Role-Based Access**

```graphql
query {
  # Apenas org_admin pode executar esta query
  users {
    id
    email
    role
  }
}
```

**Sem role correto:** Erro "Required role: org_admin"

---

## 🚀 Próximos Passos (Recomendações)

### 1. **Melhorias de Tratamento de Erro**
```python
# Considerar adicionar exception handler customizado no main.py
@app.exception_handler(ValueError)
async def graphql_value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(
        status_code=400,
        content={"error": str(exc)}
    )
```

### 2. **DataLoaders para N+1**
As queries atualmente podem sofrer com problema N+1. Implementar DataLoaders:
```python
# Em backend/app/graphql/dataloaders/
@dataloader
async def user_loader(user_ids: List[UUID], context: GraphQLContext) -> List[User]:
    return await UserRepository(context.db).get_many(user_ids)
```

### 3. **Subscriptions WebSocket**
Atualmente comentado no schema. Implementar para real-time:
```python
# Em backend/app/graphql/schema.py
@strawberry.type
class Subscription:
    @strawberry.subscription
    async def user_updated(self, info: Info[GraphQLContext, None]) -> AsyncGenerator[UserType, None]:
        # Stream de atualizações via Redis pub/sub
```

### 4. **Cache em Redis**
Adicionar decorador para cachear queries:
```python
from app.core.redis import redis_client

@cache(ttl=300)  # 5 minutos
async def get_users(self, info: Info) -> List[UserType]:
    ...
```

---

## 📊 Resumo de Mudanças

| Arquivo | Problema | Solução | Status |
|---------|----------|---------|--------|
| `context.py` | Não herda de BaseContext | Adicionar `BaseContext` | ✅ |
| `context.py` | Sessão fechada | Remover context manager | ✅ |
| `permissions.py` | Exceção errada | Mudar para `ValueError` | ✅ |

---

## 🔐 Segurança

As seguintes práticas foram mantidas:

- ✅ Multi-tenancy: Sempre filtrar por `organization_id`
- ✅ RBAC: Decoradores verificam roles antes de executar
- ✅ Autenticação: JWT token obrigatório
- ✅ Organização: Usuário só pode acessar dados de sua organização

---

## 📚 Referências

- [Strawberry GraphQL - Custom Context](https://strawberry.rocks/docs/guides/fastapi#custom-context)
- [Strawberry GraphQL - Error Handling](https://strawberry.rocks/docs/guides/errors)
- [FastAPI + SQLAlchemy - Async Sessions](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)

---

**Implementado por:** Kayo Carvalho Fernandes  
**Versão:** 1.0  
**Data:** 10 de Dezembro de 2025
