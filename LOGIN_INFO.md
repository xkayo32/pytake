# 🔐 PyChat - Informações de Login

## Credenciais de Teste

### Admin (Administrador)
- **Email:** admin@pytake.com
- **Senha:** admin123
- **Acesso:** Dashboard administrativo completo

### Como fazer login:

1. Acesse: http://localhost:3000
2. Digite o email e senha acima
3. Clique em "Entrar"

## Status do Sistema

### ✅ O que está funcionando:
- Interface de login responsiva
- Novo logo PyChat
- Dashboards específicos por role
- Sistema de permissões

### ⚠️ Em andamento:
- Build do backend está em progresso
- Após completar, reinicie com: `docker-compose restart backend`

## Comandos úteis:

```bash
# Verificar status dos containers
docker ps

# Ver logs do backend
docker logs pytake-backend --tail 50

# Reiniciar backend (após build)
docker-compose restart backend

# Testar API diretamente
curl http://localhost:8080/
```

## Próximos passos:

1. Aguardar build do backend completar
2. Reiniciar o container backend
3. Fazer login com as credenciais acima
4. Explorar o dashboard administrativo

---
**PyChat** - Intelligent Business Messaging