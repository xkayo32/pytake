# Configuração DNS para Acesso Real

## Status Atual

✅ Certificado Let's Encrypt: **api-dev.pytake.net**
✅ IP do Servidor: **209.105.242.206**
❌ DNS: Ainda apontando para localhost (127.0.0.1)

## O Que Fazer

### Passo 1: Configurar DNS no Registrador

Você precisa adicionar um registro **A** no seu registrador de domínios (GoDaddy, Namecheap, etc):

```
Tipo: A
Nome: api-dev.pytake.net
Valor: 209.105.242.206
TTL: 3600 (1 hora)
```

E também:
```
Tipo: A
Nome: app-dev.pytake.net
Valor: 209.105.242.206
TTL: 3600
```

### Passo 2: Verificar Propagação DNS

Após adicionar os registros, aguarde a propagação (até 24h, geralmente minutos):

```bash
# Verificar se DNS foi atualizado
nslookup api-dev.pytake.net
dig api-dev.pytake.net

# Deve retornar: 209.105.242.206
```

### Passo 3: Testar HTTPS

Após DNS propagado:

```bash
curl https://api-dev.pytake.net/api/v1/health
# Deve retornar: {"status":"ok"} com certificado válido
```

No browser:
```
https://api-dev.pytake.net
# Deve mostrar cadeado verde ✅
```

## Roteiro Completo

| Passo | Ação | Status |
|-------|------|--------|
| 1 | Certificado Let's Encrypt gerado | ✅ |
| 2 | Nginx configurado | ✅ |
| 3 | **Configurar DNS no registrador** | ⏳ **PRÓXIMO** |
| 4 | Aguardar propagação DNS | ⏳ |
| 5 | Testar acesso via HTTPS | ⏳ |

## Comando para Testar

Após configurar DNS:

```bash
# Testar resolução
nslookup api-dev.pytake.net

# Testar HTTPS
curl -v https://api-dev.pytake.net/api/v1/health

# Testar no browser
https://api-dev.pytake.net
```

## Suporte

Se o certificado ainda mostrar "não seguro":

1. Limpe cache do browser (Ctrl+Shift+Del)
2. Espere DNS propagar completamente (até 24h)
3. Verifique se firewall permite porta 443
4. Verifique se Nginx está rodando: `podman ps`

---

**Implementado por:** Kayo Carvalho Fernandes  
**Data:** 19 de novembro de 2025  
**Status:** Aguardando configuração DNS
