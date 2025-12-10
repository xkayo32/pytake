# 🍓 GraphQL - Guia de Uso

## ✅ Status Atual

O GraphQL do PyTake está **100% funcional** e pronto para uso!

- ✅ **Endpoint:** `http://localhost:8002/graphql`
- ✅ **GraphiQL IDE:** Disponível em desenvolvimento
- ✅ **Autenticação:** JWT Token obrigatório
- ✅ **Multi-tenancy:** Implementado
- ✅ **RBAC:** Role-based access control funcionando

---

## 🎮 Acessar o Playground (GraphiQL)

1. Abra no navegador: **http://localhost:8002/graphql**
2. Você verá a interface GraphiQL com:
   - Editor de queries (esquerda)
   - Resultados (direita)
   - Documentação (Docs, direita superior)
   - Explorer (ferramenta visual para construir queries)

### Exemplo de Query no Playground

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

> **Nota:** Adicione o token no header:
> ```
> Authorization: Bearer seu_jwt_token_aqui
> ```

---

## 💻 Usar GraphQL no Frontend

### 1. Cliente GraphQL Simples

```typescript
import { executeGraphQL } from '@/lib/graphql-client'

// Executar query
const response = await executeGraphQL(
  `query { me { id email name } }`
)

if (response.errors) {
  console.error('GraphQL error:', response.errors[0].message)
} else {
  console.log('User:', response.data)
}
```

### 2. Com React Hook

```typescript
import { useGraphQL } from '@/hooks/useGraphQL'

export function UserProfile() {
  const { data, loading, error } = useGraphQL(
    `query { me { id email name role } }`
  )

  if (loading) return <div>Carregando...</div>
  if (error) return <div>Erro: {error.message}</div>

  return (
    <div>
      <h1>{data?.me?.name}</h1>
      <p>{data?.me?.email}</p>
    </div>
  )
}
```

### 3. Mutation com React Hook

```typescript
import { useMutation } from '@/hooks/useGraphQL'

export function LoginForm() {
  const [login, { loading, error }] = useMutation(
    `mutation Login($email: String!, $password: String!) {
      login(input: { email: $email, password: $password }) {
        user { id email name }
        token { accessToken refreshToken }
      }
    }`
  )

  const handleLogin = async (email: string, password: string) => {
    try {
      const result = await login({ email, password })
      console.log('Logged in:', result)
    } catch (err) {
      console.error('Login failed:', err)
    }
  }

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      const formData = new FormData(e.currentTarget)
      handleLogin(
        formData.get('email') as string,
        formData.get('password') as string
      )
    }}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <button type="submit" disabled={loading}>
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
      {error && <p style={{ color: 'red' }}>{error.message}</p>}
    </form>
  )
}
```

---

## 📚 Queries Disponíveis

### Auth
```graphql
query {
  me {
    id
    email
    name
    role
    organizationId
  }
}
```

### Users
```graphql
query GetUsers($orgId: ID!) {
  users(organizationId: $orgId) {
    id
    email
    name
    role
    isActive
  }
}
```

### Organizations
```graphql
query {
  organization(id: "org-id") {
    id
    name
    users { id email }
  }
}
```

---

## 🔐 Autenticação

Todos os endpoints GraphQL requerem autenticação JWT.

### Obter Token
```bash
curl -X POST http://localhost:8002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@pytake.net",
    "password": "nYVUJy9w5hYQGh52CSpM0g"
  }'
```

### Usar Token em Requisições
```bash
curl -X POST http://localhost:8002/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query": "{ me { id email name } }"
  }'
```

---

## 🛠️ Resolução de Problemas

### Erro: "Authentication required"
- Sem token no header `Authorization: Bearer`
- Token inválido ou expirado
- **Solução:** Obter novo token via `/api/v1/auth/login`

### Erro: "Required role: org_admin"
- Usuário não tem permissão para essa operação
- **Solução:** Usar usuário com role apropriada

### Erro: "User has no organization"
- Usuário não está associado a organização
- **Solução:** Contatar administrador

---

## 📖 Documentação Completa

Ver `GRAPHQL_ANALYSIS_REPORT.md` para detalhes técnicos sobre:
- Arquitetura do GraphQL
- Tipos disponíveis
- Resolvers implementados
- DataLoaders
- Error handling

---

## 🚀 Próximas Melhorias

1. **Apollo Client** - Integrar Apollo Client para caching automático
2. **Subscriptions** - Implementar WebSocket subscriptions para real-time
3. **Code Generation** - Gerar tipos TypeScript automaticamente do schema
4. **Persisted Queries** - Cache de queries no servidor

---

**Última atualização:** 10 de Dezembro de 2025  
**Status:** ✅ Totalmente Funcional
