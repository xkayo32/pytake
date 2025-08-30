# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), e este projeto adere ao [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Sistema completo de conversas em tempo real com WebSocket
- Interface de lista de conversas com filtros e busca
- Interface de chat individual para mensagens em tempo real
- Hook `useConversations` para gerenciamento centralizado de estado
- Hook `useWebSocket` com autenticação e auto-reconexão
- API service layer para conversas e mensagens
- Indicadores visuais de status de conexão e entrega
- Contadores de mensagens não lidas em tempo real
- Auto-scroll para novas mensagens
- Tratamento de erros com retry automático
- Sincronização entre REST API e WebSocket
- Estados de mensagem (pending/sent/delivered/read)
- Fallback para modo offline quando WebSocket desconectado

### Changed
- Atualizada documentação principal no README.md
- Adicionada seção específica sobre conversas em tempo real

### Technical Details
- Implementado WebSocket server com broadcast de eventos
- Criado sistema de autenticação automática via WebSocket
- Desenvolvido arquitetura híbrida REST + WebSocket
- Implementado auto-reconexão com backoff exponencial
- Adicionado suporte a múltiplos tipos de eventos em tempo real

---

## Versões Anteriores

### Sistema de Filas de Atendimento
- Implementado sistema completo de filas
- Dashboard de monitoramento em tempo real
- Gerenciamento de agentes e distribuição automática
- Componente Transfer to Queue para flows

### Editor de Flows Visuais
- Interface drag-and-drop com React Flow
- Sistema de nós personalizados
- Fluxos universais com priorização
- Verificação de janela 24h do WhatsApp
- Integração com WhatsApp Business API

### Funcionalidades Base
- Autenticação e autorização JWT
- Multi-tenant com isolamento de dados
- Integração completa com WhatsApp Business API
- Sistema de templates e mensagens
- Analytics e relatórios
- Containerização com Docker