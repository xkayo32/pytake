# 🍓 GraphQL Playground - Guia Visual

## Passo 1: Abrir o Playground
```
URL: http://localhost:8002/graphql
```
Você verá a interface GraphiQL com:
- **Esquerda:** Editor de queries
- **Direita:** Resultados
- **Topo direito:** Docs / Explorer

---

## Passo 2: Fazer Login (Mutation)

**Cole no editor da esquerda:**

```graphql
mutation Login {
  login(input: {
    email: "admin@pytake.net"
    password: "nYVUJy9w5hYQGh52CSpM0g"
  }) {
    user {
      id
      email
      name
      role
    }
    token {
      accessToken
      refreshToken
      expiresIn
    }
  }
}
```

**Clique no botão ▶️ Play (ou Ctrl+Enter)**

**Resultado esperado (direita):**
```json
{
  "data": {
    "login": {
      "user": {
        "id": "bb6b17fc-c23f-4b03-a784-b8ef24979581",
        "email": "admin@pytake.net",
        "name": "Admin User",
        "role": "super_admin"
      },
      "token": {
        "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "expiresIn": 3600
      }
    }
  }
}
```

---

## Passo 3: Copiar o Token

1. **Procure por `"accessToken"`** na resposta
2. **Copie todo o valor** (sem as aspas duplas)
3. Exemplo: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NjU0...`

---

## Passo 4: Adicionar Token no Header

**No canto inferior esquerdo do GraphiQL, clique em "HTTP HEADERS"**

**Cole isto (e substitua YOUR_TOKEN):**

```json
{
  "Authorization": "Bearer YOUR_TOKEN"
}
```

**Exemplo completo:**
```json
{
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NjU0MTEzNDAsInN1YiI6ImJiNmIxN2ZjLWMyM2YtNGIwMy1hNzg0LWI4ZWYyNDk3OTU4MSIsInR5cGUiOiJhY2Nlc3MiLCJvcmdhbml6YXRpb25faWQiOiI1ODkyZTBlOC1iZjkyLTRlMDItOWJkYy0wZGFiYjNjOGZjNjYiLCJyb2xlIjoic3VwZXJfYWRtaW4ifQ.-0cEVLMDqE_RTJhSqlk8VEXXHsnWsvW0hcjex2Zicow"
}
```

---

## Passo 5: Testar Autenticação

**Agora execute esta query (no editor):**

```graphql
query {
  me {
    id
    email
    name
    role
  }
}
```

**Resultado esperado:**
```json
{
  "data": {
    "me": {
      "id": "bb6b17fc-c23f-4b03-a784-b8ef24979581",
      "email": "admin@pytake.net",
      "name": "Admin User",
      "role": "super_admin"
    }
  }
}
```

✅ **Se vir isso, você está logado no GraphQL!**

---

## 🎯 Próximas Queries para Testar

### Obter Usuários
```graphql
query GetUsers($orgId: ID!) {
  users(organizationId: $orgId) {
    id
    email
    name
    role
    isActive: is_active
  }
}
```

**Variables:**
```json
{
  "orgId": "5892e0e8-bf92-4e02-9bdc-0dabb3c8fc66"
}
```

### Explorar Schema
- Clique em **"Docs"** (topo direito) para ver todas as queries disponíveis
- Use **"Explorer"** para construir queries visualmente

---

## ⚠️ Problemas Comuns

| Erro | Solução |
|------|---------|
| `"Authentication required"` | Token não foi adicionado no HTTP Headers |
| `"Invalid authorization header"` | Formato errado. Deve ser: `Bearer TOKEN` |
| `"User not found"` | Email ou senha inválidos |
| `"Token expired"` | Obter novo token fazendo login novamente |

---

## 💡 Dica: Salvar Headers

GraphiQL lembra dos headers automaticamente. Uma vez que você adicionar o token, ele será usado em todas as próximas requisições até a página ser recarregada.

**Para usar um novo token:**
1. Faça logout/expire do token anterior
2. Execute a mutation `login` novamente
3. Copie o novo token
4. Atualize o header

---

**Status:** ✅ GraphQL 100% Funcional  
**Playground URL:** http://localhost:8002/graphql
