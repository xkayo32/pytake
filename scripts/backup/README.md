# 🔄 PyTake Database Backup System

Sistema completo e automatizado de backup/restore para o banco de dados PostgreSQL do PyTake.

## 📋 Índice

- [Características](#características)
- [Instalação Rápida](#instalação-rápida)
- [Comandos Disponíveis](#comandos-disponíveis)
- [Backups Automáticos](#backups-automáticos)
- [Recuperação de Desastres](#recuperação-de-desastres)
- [FAQ](#faq)

## ✨ Características

✅ **Backup Completo** - Cria dump completo do PostgreSQL
✅ **Compressão** - Backups são compactados em `.tar.gz`
✅ **Restauração Fácil** - Restaura com um único comando
✅ **Automático** - Agenda backups via cron
✅ **Seguro** - Faz backup de segurança antes de restaurar
✅ **Limpeza Inteligente** - Remove backups antigos automaticamente
✅ **Suporte MongoDB** - Opcional, inclui MongoDB se desejar
✅ **Logs Completos** - Registra todas as operações

## 🚀 Instalação Rápida

### 1. Tornar scripts executáveis

```bash
cd /home/administrator/pytake/scripts/backup
chmod +x backup.sh restore.sh setup_cron.sh manage.sh
```

### 2. Fazer backup imediato

```bash
cd /home/administrator/pytake/scripts/backup
./backup.sh
```

**Resultado:**
```
✅ BACKUP CONCLUÍDO COM SUCESSO
📊 Resumo:
  • Nome do arquivo: pytake_db_20251226_030000.tar.gz
  • Tamanho compactado: 2.5MB
  • Localização: /home/administrator/pytake/backups/pytake_db_20251226_030000.tar.gz
```

### 3. Configurar backups automáticos

```bash
./setup_cron.sh

# Ou com frequência específica:
./setup_cron.sh --hourly   # A cada hora
./setup_cron.sh --daily    # Diariamente (padrão)
./setup_cron.sh --weekly   # Semanalmente
```

## 📚 Comandos Disponíveis

### `backup.sh` - Criar backup

```bash
# Backup simples
./backup.sh

# Manter cópia local descompactada
./backup.sh --keep-local

# Incluir MongoDB também
./backup.sh --with-mongo

# Combinar opções
./backup.sh --keep-local --with-mongo
```

**Opções:**
- `--keep-local` - Salva uma cópia local descompactada (útil para acesso rápido)
- `--with-mongo` - Inclui backup do MongoDB junto com PostgreSQL

### `restore.sh` - Restaurar backup

```bash
# Restaurar (será solicitada confirmação)
./restore.sh pytake_db_20251226_030000.tar.gz

# Com caminho completo
./restore.sh /home/administrator/pytake/backups/pytake_db_20251226_030000.tar.gz

# Incluir MongoDB
./restore.sh pytake_db_20251226_030000.tar.gz --with-mongo
```

⚠️ **CUIDADO**: Isso sobrescreve o banco de dados atual!

### `manage.sh` - Gerenciar backups

```bash
# Ver status dos backups
./manage.sh status

# Listar todos os backups
./manage.sh list

# Remover backups com >30 dias
./manage.sh cleanup

# Manter apenas últimos 3 backups
./manage.sh cleanup --force

# Restaurar um backup (interativo)
./manage.sh restore pytake_db_20251226_030000.tar.gz
```

### `setup_cron.sh` - Agendar backups automáticos

```bash
# Backups diários às 2:00 AM (padrão)
./setup_cron.sh

# Backups a cada hora
./setup_cron.sh --hourly

# Backups semanais (domingo, 2:00 AM)
./setup_cron.sh --weekly

# Desabilitar backups automáticos
./setup_cron.sh --disable

# Verificar cron jobs ativos
crontab -l | grep PYTAKE
```

## 🔄 Backups Automáticos

### Como funciona

1. **Cron agendado** - Script roda automaticamente no horário definido
2. **Executa backup** - Cria dump compactado do PostgreSQL
3. **Limpeza automática** - Remove backups com >7 dias automaticamente
4. **Logs** - Registra tudo em `backups/cron.log`

### Verificar logs

```bash
# Ver últimos 10 backups automáticos
tail -20 /home/administrator/pytake/backups/cron.log

# Monitorar em tempo real
tail -f /home/administrator/pytake/backups/cron.log
```

## 🆘 Recuperação de Desastres

### Cenário: Banco foi corrompido

```bash
# 1. Listar backups disponíveis
cd /home/administrator/pytake/scripts/backup
./manage.sh list

# 2. Restaurar o backup mais recente
./restore.sh pytake_db_20251226_030000.tar.gz

# 3. Confirmar restauração quando solicitado (s/N)

# 4. Aguardar conclusão (pode levar minutos)

# 5. Reiniciar backend
docker compose restart backend

# 6. Verificar saúde
curl http://localhost:8002/api/v1/health
```

### Cenário: Dados foram deletados acidentalmente

```bash
# Se o backup automático já rodou hoje:
./manage.sh list                           # Ver opções
./restore.sh pytake_db_20251226_030000.tar.gz

# Se não há backup recente:
# Use um backup anterior:
./restore.sh pytake_db_20251225_030000.tar.gz

# Você pode manter os dados parciais e fazer restore seletivo
# Entre em contato para opções avançadas de recuperação
```

## 📊 Estrutura de Backups

```
/home/administrator/pytake/backups/
├── pytake_db_20251226_030000.tar.gz      # Arquivo compactado
├── pytake_db_20251225_030000.tar.gz
├── pytake_db_20251224_030000.tar.gz
├── cron.log                               # Log de backups automáticos
└── run_backup.sh                          # Script wrapper do cron
```

### Tamanho esperado

- **Backup compactado**: ~2-5 MB (depende do volume de dados)
- **Espaço de armazenamento**: 50-100 MB com 7 dias de backups diários

## 🔐 Boas Práticas

### ✅ Fazer

- ✅ Fazer backup antes de atualizações importantes
- ✅ Testar restaurações periodicamente
- ✅ Manter backups em múltiplos locais (HD externo, cloud)
- ✅ Revisar logs de backup semanalmente
- ✅ Arquivar backups críticos em local seguro

### ❌ Evitar

- ❌ Não ignore erros de backup
- ❌ Não deixe backups por mais de 30 dias sem revisar
- ❌ Não execute backups durante picos de uso
- ❌ Não compartilhe arquivos de backup em locais públicos

## ❓ FAQ

### P: Com que frequência devo fazer backup?
**R:** Recomendamos:
- **Desenvolvimento**: Diariamente (automático via cron)
- **Produção**: A cada 6 horas (use `--hourly`)
- **Crítico**: A cada hora antes de grandes mudanças

### P: Quanto espaço os backups ocupam?
**R:** 
- Backup compactado: ~2-5 MB
- 7 dias de backups: ~14-35 MB
- 30 dias: ~60-150 MB

Os scripts removem automaticamente backups com >7 dias.

### P: Como faço backup de MongoDB também?
**R:**
```bash
./backup.sh --with-mongo
./restore.sh pytake_db_20251226_030000.tar.gz --with-mongo
```

### P: Posso fazer backup enquanto aplicação está rodando?
**R:** **SIM!** Os scripts são seguros para uso com aplicação ativa. O PostgreSQL pode ser lido durante backup sem problemas.

### P: Quanto tempo leva para restaurar?
**R:**
- Extração: 10-30 segundos
- Restauração PostgreSQL: 1-5 minutos
- MongoDB: 30 segundos - 2 minutos
- **Total**: 2-7 minutos dependendo do tamanho

### P: E se a restauração falhar?
**R:**
1. O script faz backup de segurança antes de restaurar
2. Se falhar, o banco anterior é preservado
3. Tente com um backup anterior
4. Ou entre em contato com suporte

### P: Posso editar os arquivos de backup?
**R:** **Não recomendado!** Mas se necessário:
```bash
# Extrair backup para inspeção
cd /tmp
tar -xzf /home/administrator/pytake/backups/pytake_db_20251226_030000.tar.gz

# Você verá um diretório pytake_backup/ com:
# - pytake_db.dump (formato PostgreSQL custom)
# - mongodb/ (se incluído)
```

## 📞 Suporte

Se algo der errado:

1. **Verificar logs:**
   ```bash
   tail -50 /home/administrator/pytake/backups/cron.log
   docker compose logs backend | grep -i error
   ```

2. **Tentar restauração:**
   ```bash
   ./manage.sh restore <backup_anterior>
   ```

3. **Contactar suporte:**
   - Envie logs: `cron.log` + `docker compose logs backend`
   - Descreva o problema
   - Indique qual backup estava em uso

---

**Última atualização**: 26/12/2025
**Autor**: Kayo Carvalho Fernandes
**Versão**: 1.0
