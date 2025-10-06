# 📝 Como Coletar Logs do Reload

## 🎯 Objetivo
Capturar **TODOS** os logs do navegador para entender **exatamente** o que causa o reload da página.

## 🔧 Setup Implementado

### 1. **Debug Logger Global**
📁 `frontend/src/utils/debugLogger.ts`

**Monitora:**
- ✅ `beforeunload` event (antes do reload)
- ✅ `unload` event (durante o reload)
- ✅ `history.pushState` (navegação SPA)
- ✅ `history.replaceState` (navegação SPA)
- ✅ `window.location.href` changes (navegação hard)

### 2. **Logs Detalhados no Login**
📁 `frontend/src/app/login/page.tsx`

**Logs com prefixos:**
- 🔵 `[LOGIN]` - Ações da página de login
- 🟢 `[AUTH STORE]` - Ações do store
- 🟣 `[DEBUG]` - Sistema de debug
- 🔴 `[DEBUG]` - Eventos de reload
- ✅ Sucesso
- ❌ Erro
- 🟡 Warning

---

## 📋 Como Coletar os Logs

### Passo 1: Reiniciar Frontend
```bash
docker compose restart frontend
sleep 10
```

### Passo 2: Abrir DevTools
1. Acesse: http://localhost:3001/login
2. Pressione **F12** (DevTools)
3. Vá para a aba **Console**
4. Clique com botão direito no console
5. Marque **"Preserve log"** ✅
6. Limpe o console (clique no ícone 🚫)

### Passo 3: Reproduzir o Problema
1. Digite email: `teste@teste.com`
2. Digite senha: `123`
3. Clique em "Entrar" OU pressione Enter

### Passo 4: Salvar os Logs

#### Opção A: Copiar Manualmente
1. Clique com botão direito no console
2. "Save as..." → Salvar arquivo

#### Opção B: Usar Console
```javascript
// Cole isso no console ANTES de fazer login
const logs = [];
const originalLog = console.log;
const originalError = console.error;

console.log = function(...args) {
  logs.push({ type: 'log', time: new Date().toISOString(), args });
  originalLog.apply(console, args);
};

console.error = function(...args) {
  logs.push({ type: 'error', time: new Date().toISOString(), args });
  originalError.apply(console, args);
};

// Depois de fazer login e reload, cole isso:
copy(logs);
// Agora os logs estão no clipboard, cole em um arquivo
```

#### Opção C: Automatizado
```javascript
// Cole isso no console
window.allLogs = [];
['log', 'error', 'warn', 'info'].forEach(method => {
  const original = console[method];
  console[method] = function(...args) {
    window.allLogs.push({
      method,
      timestamp: new Date().toISOString(),
      message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
    });
    original.apply(console, args);
  };
});

// Depois de fazer login:
copy(JSON.stringify(window.allLogs, null, 2));
```

---

## 🔍 O Que Procurar nos Logs

### 1. **Sequência Normal (SEM reload)**
```
✅ [DEBUG] Debug logger initialized
🔵 [LOGIN] handleSubmit called
🔵 [LOGIN] Calling preventDefault
🔵 [LOGIN] Starting login process
🟢 [AUTH STORE] login() called
🟢 [AUTH STORE] Calling authAPI.login
❌ [AUTH STORE] Login failed: 401
❌ [LOGIN] Login error: 401
🔵 [LOGIN] Finalizing, setting isLoading to false
```

### 2. **Se Houver Reload (PROBLEMA)**
```
✅ [DEBUG] Debug logger initialized
🔵 [LOGIN] handleSubmit called
🔴 [DEBUG] beforeunload event triggered  ← AQUI!
🔴 [DEBUG] unload event triggered         ← AQUI!
```

### 3. **Se Houver Navegação Forçada**
```
🟣 [DEBUG] history.pushState called
OU
🔴 [DEBUG] window.location.href being changed  ← AQUI!
```

---

## 📊 Logs Esperados

### Evento: Clicar "Entrar"
```
🔵 [LOGIN] handleSubmit called { eventType: "click", isLoading: false }
🔵 [LOGIN] Calling preventDefault
🔵 [LOGIN] Starting login process
🟢 [AUTH STORE] login() called { email: "teste@teste.com", hasPassword: true }
🟢 [AUTH STORE] Calling authAPI.login
```

### Evento: Resposta da API
```
🟢 [AUTH STORE] authAPI.login response received { hasData: false }
❌ [AUTH STORE] Login failed: Error: ...
❌ [LOGIN] Login error: ...
```

### Evento: Finalização
```
🔵 [LOGIN] Finalizing, setting isLoading to false
```

---

## 🚨 Sinais de Reload

### 1. **beforeunload Event**
```javascript
🔴 [DEBUG] beforeunload event triggered
```
**Significa:** Página está prestes a recarregar
**Causa:** Algo está chamando `window.location.href` ou submit de form

### 2. **unload Event**
```javascript
🔴 [DEBUG] unload event triggered
```
**Significa:** Página está sendo destruída
**Causa:** Reload confirmado

### 3. **location.href Change**
```javascript
🔴 [DEBUG] window.location.href being changed!
{
  newValue: "...",
  stack: "Error\n  at ..."  ← VER O STACK TRACE
}
```
**Significa:** Código está mudando URL diretamente
**Causa:** Ver stack trace para identificar onde

---

## 📝 Template para Reportar

```markdown
## Log de Reload

### Timestamp
2025-10-04 15:30:00

### Ação do Usuário
- [ ] Clicou no botão "Entrar"
- [ ] Pressionou Enter no email
- [ ] Pressionou Enter na senha

### Logs Capturados
```
[Cole aqui os logs completos]
```

### Stack Trace (se houver)
```
[Cole aqui o stack trace]
```

### Observações
- Página recarregou? SIM / NÃO
- Mensagem de erro apareceu? SIM / NÃO
- Quando o reload aconteceu? ANTES / DURANTE / DEPOIS da requisição
```
---

## 🔧 Reiniciar Frontend (se necessário)
```bash
# Parar
docker compose stop frontend

# Limpar cache (opcional)
docker compose rm -f frontend

# Rebuild
docker compose build frontend --no-cache

# Iniciar
docker compose up -d frontend

# Ver logs
docker compose logs -f frontend
```

---

## 📌 Próximos Passos

1. ✅ Colete os logs usando um dos métodos acima
2. ✅ Identifique o momento exato do reload
3. ✅ Procure por eventos `beforeunload`, `unload` ou `location.href`
4. ✅ Analise o stack trace para identificar a origem
5. ✅ Cole os logs em um arquivo para análise

---

**Com esses logs, vou poder identificar EXATAMENTE o que está causando o reload!** 🔍
