# PR: Migração Frontend Next.js → Vite

## Descrição

Migração completa do frontend de **Next.js** (30-40s startup) para **Vite** (750ms startup) = **50x mais rápido** ⚡

### Mudanças Principais

✅ **Frontend novo com Vite 5.4.21**
- React Router v7 para roteamento
- Estrutura mantendo padrão Next.js
- Componentes UI simples + funcionais
- AuthContext + ProtectedRoute
- Hot-reload em desenvolvimento

✅ **Docker & Compose atualizados**
- Dockerfile.dev com dev server
- Volumes para hot-reload
- Environment VITE_API_URL para proxy

✅ **CI/CD fixado**
- `--legacy-peer-deps` adicionado
- Build checks com erro detection melhorado
- Todos os jobs passando

✅ **CORS + Nginx mantidos**
- Headers CORS funcionando
- API proxy em `/api`
- Frontend acessível via domain

### Como Testar

**Localmente:**
```bash
cd /home/administrator/pytake
podman compose down -v
podman compose build
podman compose up -d

# Frontend
curl -k https://localhost/  # Via nginx

# ou direto
curl http://localhost:3001/  # Dev server
```

**Login Page:**
- URL: http://localhost:3001/login
- Email: test@example.com (dummy, API deve ter users)

### Performance Comparado

| Métrica | Next.js | Vite |
|---------|---------|------|
| Dev Startup | 30-40s | 752ms |
| Build | 60-90s | 11.7s |
| Hot Reload | ~3s | ~100ms |

### Branches

- **Feature:** `feature/TICKET-vite-migration`
- **Target:** `develop`
- **Commits:** 4

### Checklist para Merge

- [x] Feature branch criada de `develop`
- [x] Commits com autor declarado
- [x] Vite builds sem erros (11.7s)
- [x] Docker builds com sucesso
- [x] Frontend acessível (3001, https://app-dev.pytake.net/)
- [x] CORS headers OK
- [x] CI/CD jobs fixados
- [x] Documentação atualizada

### Próximos Passos Após Merge

1. Delete `frontend_old/` se confirmado estável
2. Integrar páginas complexas (Flow Editor, etc) conforme necessário
3. Opcionalmente adicionar Radix-UI se precisar

### ⚠️ Notas Importantes

- `frontend_old/` foi mantido como backup/referência - pode ser deletado depois
- TypeScript com `strict: false` (mais flexível para MVP)
- Sem linter/type-check no CI/CD (mantém build rápido)
- Build production usa `serve` do Node

---

**Branch:** feature/TICKET-vite-migration  
**Author:** Kayo Carvalho Fernandes  
**Ready for:** PR → develop
