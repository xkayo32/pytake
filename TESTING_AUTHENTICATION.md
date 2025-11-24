# 🧪 Teste Interativo: Authentication Flow

**Data:** 24 de Novembro de 2025  
**Implementado por:** Kayo Carvalho Fernandes

## ⚡ Quick Start - Teste em 5 Minutos

### 1️⃣ Verificar se tudo está rodando

```bash
# Terminal 1: Verificar containers
podman compose ps

# Esperado: ✅ Todos os containers "Up"
# - pytake-backend-dev
# - pytake-frontend-dev
# - pytake-postgres-dev
# - pytake-redis-dev
```

### 2️⃣ Acessar frontend

```bash
# Abrir no navegador
http://localhost:3001
```

**O que esperar:**
- ✅ Página inicial carrega com logo PyTake
- ✅ Links para Login e Register funcionam
- ✅ Dark mode toggle funciona (canto superior direito)

### 3️⃣ Testar Registro Completo

**URL:** http://localhost:3001/register

**Preencher formulário com:**
```
Nome Completo:     João Silva
Organização:       Minha Empresa Ltda
Email:             joao.silva.2025@example.com
Senha:             SecurePass123
Confirmar Senha:   SecurePass123
☑ Aceitar Termos   (obrigatório)
```

**Esperado:**
- ✅ Botão "Criar Conta" fica verde com loading
- ✅ Mensagem de sucesso verde aparece
- ✅ Redirecionamento automático para `/dashboard`
- ✅ Na barra lateral do dashboard, mostra seu email
- ✅ No DevTools → Application → LocalStorage, aparecem:
  - `access_token` (JWT longo)
  - `refresh_token` (JWT longo)

**Se der erro:**
- ❌ Email já existe? Tente outro email
- ❌ Senha fraca? Use `SecurePass123` (tem maiúscula, minúscula, números)
- ❌ Organização vazia? Preencha obrigatoriamente

### 4️⃣ Testar Logout

**Na página Dashboard:**
```
1. Clicar menu de perfil (canto superior direito)
2. Selecionar "Logout"
```

**Esperado:**
- ✅ Redirecionamento para `/login`
- ✅ localStorage limpa (tokens removidos)
- ✅ Página de login carrega vazia

### 5️⃣ Testar Login

**URL:** http://localhost:3001/login

**Preencher com dados do registro anterior:**
```
Email:   joao.silva.2025@example.com
Senha:   SecurePass123
```

**Esperado:**
- ✅ Botão "Entrar" fica azul com loading
- ✅ Mensagem de sucesso verde aparece
- ✅ Redirecionamento para `/dashboard`
- ✅ Novos tokens gerados (veja em DevTools)

---

## 🔧 Teste Técnico - Backend API

### Teste 1: Health Check

```bash
curl -X GET http://localhost:8002/api/v1/health
```

**Esperado:**
```json
{
  "status": "ok",
  "version": "1.0.0"
}
```

### Teste 2: Registrar Novo Usuário

```bash
# Gerar email dinâmico para evitar duplicatas
EMAIL="user$(date +%s)@example.com"

curl -X POST http://localhost:8002/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"SecurePass123\",
    \"full_name\": \"Test User\",
    \"organization_name\": \"Test Company\"
  }"
```

**Esperado:**
```json
{
  "user": {
    "id": "...",
    "email": "user...@example.com",
    "full_name": "Test User",
    "role": "org_admin",
    "organization_id": "..."
  },
  "token": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "token_type": "bearer",
    "expires_in": 900
  },
  "message": "User registered successfully"
}
```

### Teste 3: Login com Usuário Criado

```bash
curl -X POST http://localhost:8002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"SecurePass123\"
  }"
```

**Esperado:**
```json
{
  "user": { ... },
  "token": { ... },
  "message": "Login successful"
}
```

### Teste 4: Validar Token

```bash
# Usar access_token da resposta anterior
TOKEN="eyJ..."

curl -X GET http://localhost:8002/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

**Esperado:**
```json
{
  "id": "...",
  "email": "...",
  "full_name": "...",
  "role": "org_admin"
}
```

### Teste 5: Tentar Login com Senha Errada

```bash
curl -X POST http://localhost:8002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"WrongPassword123\"
  }"
```

**Esperado:**
```json
{
  "error": {
    "code": 401,
    "message": "Invalid credentials",
    "type": "authentication_error"
  }
}
```

### Teste 6: Tentar Registrar com Senha Fraca

```bash
curl -X POST http://localhost:8002/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"weak$(date +%s)@example.com\",
    \"password\": \"weak123\",
    \"full_name\": \"Test\",
    \"organization_name\": \"Test\"
  }"
```

**Esperado (erro de validação):**
```json
{
  "error": {
    "code": 422,
    "message": "Password must contain uppercase, lowercase and digits",
    "type": "validation_error"
  }
}
```

---

## 📊 Teste de Integração: Frontend ↔ Backend

### Cenário 1: Fluxo Completo

```bash
# 1. Abrir DevTools no navegador
# Pressionar F12 → Console

# 2. Verificar se API está acessível
fetch('http://localhost:8002/api/v1/health')
  .then(r => r.json())
  .then(d => console.log('Backend OK:', d))
  .catch(e => console.error('Backend ERROR:', e))

# Esperado: "Backend OK: {status: ok, version: 1.0.0}"
```

### Cenário 2: Teste Interativo de Registro

1. **Abrir DevTools → Console**
2. **Colar e executar:**

```javascript
// Testar registrar via API
const email = `test${Date.now()}@example.com`
fetch('http://localhost:8002/api/v1/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email,
    password: 'SecurePass123',
    full_name: 'Console Test',
    organization_name: 'Test Org'
  })
})
.then(r => r.json())
.then(d => {
  console.log('✅ Registro OK:', d.user.email)
  console.log('✅ Token recebido:', d.token.access_token.substring(0, 30) + '...')
  localStorage.setItem('test_token', d.token.access_token)
})
.catch(e => console.error('❌ Erro:', e))
```

**Esperado:** Verde no console sem erros

### Cenário 3: Verificar Storage

```javascript
// Testar localStorage
console.log({
  access_token: localStorage.getItem('access_token'),
  refresh_token: localStorage.getItem('refresh_token'),
  test_token: localStorage.getItem('test_token')
})
```

**Esperado:** 3 JWTs presentes

---

## 🚨 Troubleshooting

### Problema: "Network error" ao registrar

**Causa:** Backend não está acessível

**Solução:**
```bash
# Verificar se backend está rodando
podman compose ps | grep backend

# Se não estiver "Up", reiniciar
podman compose restart pytake-backend-dev

# Verificar logs
podman compose logs backend
```

### Problema: "Email already registered"

**Causa:** Esse email já existe

**Solução:**
```bash
# Usar novo email (adicione timestamp)
EMAIL="user$(date +%s)@example.com"
echo $EMAIL
# Copiar e colar ao registrar
```

### Problema: Tokens não aparecem no localStorage

**Causa:** Erro na chamada de registro

**Solução:**
```bash
# 1. Verificar erro no DevTools → Network
# 2. Verificar Console para mensagens de erro
# 3. Se 422: password fraca (deve ter maiúscula, minúscula, números)
# 4. Se 409: email já existe (tente outro)
```

### Problema: Página de dashboard em branco

**Causa:** Token expirou ou não foi armazenado

**Solução:**
```bash
# Verificar tokens em DevTools → Application → LocalStorage
# Se vazio, fazer login novamente
# Se presentes, atualizar página (F5)
```

### Problema: Dark mode não funciona

**Causa:** Tailwind não carregou corretamente

**Solução:**
```bash
# Verificar Vite em logs
podman compose logs frontend | grep -i "ready\|error"

# Se erros, reiniciar
podman compose restart pytake-frontend-dev
```

---

## 📈 Checklist de Validação

Marque cada item conforme testar:

### Frontend
- [ ] Página Home carrega
- [ ] Link para Register funciona
- [ ] Link para Login funciona
- [ ] Dark mode toggle funciona
- [ ] Formulário Register renderiza corretamente
- [ ] Formulário Login renderiza corretamente

### Registro
- [ ] Preencher todos os campos
- [ ] Aceitar termos obrigatório
- [ ] Enviar formulário
- [ ] Mensagem de sucesso aparece
- [ ] Redireciona para Dashboard
- [ ] Email aparecer no perfil
- [ ] localStorage contém tokens

### Login
- [ ] Acessar página de login
- [ ] Preencher email e senha
- [ ] Enviar formulário
- [ ] Mensagem de sucesso aparece
- [ ] Redireciona para Dashboard
- [ ] localStorage contém novos tokens

### Logout
- [ ] Menu perfil acessível
- [ ] Logout funciona
- [ ] Redireciona para Login
- [ ] localStorage limpo

### Erros
- [ ] Erro com email duplicado
- [ ] Erro com senha fraca
- [ ] Erro com credenciais erradas
- [ ] Mensagens de erro exibidas corretamente

### Backend API
- [ ] Health check responde
- [ ] Register cria usuário
- [ ] Login funciona
- [ ] Token validation funciona
- [ ] Rate limiting funciona (teste 6+ requisições)

### Integração
- [ ] Frontend consegue chamar backend
- [ ] CORS funcionando
- [ ] Tokens armazenados corretamente
- [ ] Sessão persiste ao recarregar página

---

## 🎯 Resultado Esperado

Se todos os testes passarem:

✅ **Autenticação totalmente funcional!**

```
Frontend (Vite + React) ←→ Backend (FastAPI)
         ↓
    [Register/Login]
         ↓
    JWT Tokens ✅
         ↓
    Protected Routes ✅
```

Próximo passo: Implementar **Token Refresh** e **Dashboard com dados reais**.

---

**Tempo estimado para testes:** 15-20 minutos  
**Dúvidas?** Verifique os logs:

```bash
# Frontend
podman compose logs -f frontend

# Backend
podman compose logs -f backend
```

