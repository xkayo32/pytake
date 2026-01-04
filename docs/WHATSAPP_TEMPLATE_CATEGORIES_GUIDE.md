# 📚 Guia de Categorias de Templates WhatsApp Business API

**Autor:** Kayo Carvalho Fernandes
**Data:** 28 de Dezembro de 2025
**Versão:** 1.0
**Última atualização:** 28/12/2025

---

## 🎯 Objetivo

Este documento fornece informações atualizadas sobre categorias de templates do WhatsApp Business API, incluindo mudanças importantes implementadas pela Meta em 2025.

---

## 📋 Categorias Disponíveis

A Meta WhatsApp Business API suporta **três categorias** de templates:

### 1. **MARKETING**
- **Uso:** Mensagens promocionais, ofertas, anúncios de produtos
- **Características:**
  - Requer opt-in explícito do usuário
  - Aprovação mais rigorosa
  - Custos mais altos por mensagem
  - Limitações de frequência mais restritivas
- **Exemplos:**
  - "Promoção de Natal: 50% de desconto em todos os produtos!"
  - "Novo produto lançado! Confira nossa coleção."
  - "Black Friday: ofertas exclusivas para você!"

### 2. **UTILITY**
- **Uso:** Mensagens transacionais, atualizações, lembretes, alertas
- **Características:**
  - Para comunicações não promocionais
  - Aprovação mais rápida
  - Custos intermediários
  - Pode incluir informações de conta, pedidos, entregas
- **Exemplos:**
  - "Seu pedido #12345 foi enviado. Rastreie em: [link]"
  - "Lembrete: consulta médica amanhã às 14h"
  - "Sua fatura de R$ 150,00 vence em 3 dias"

### 3. **AUTHENTICATION**
- **Uso:** Códigos de verificação OTP, senhas temporárias
- **Características:**
  - Aprovação mais rápida (minutos)
  - Custos mais baixos
  - Formato fixo de mensagem
  - Suporte a autofill e copy code
- **Exemplos:**
  - "Seu código de verificação é: 123456"
  - "Use o código 987654 para confirmar seu login"

---

## ⚠️ Mudanças Importantes - Abril 2025

### 🔄 Novo Comportamento da Meta

A partir de **9 de Abril de 2025**, a Meta mudou significativamente o processo de aprovação e categorização de templates:

#### ❌ O Que NÃO EXISTE MAIS

1. **Sugestão de Categoria**: A Meta **não sugere** mais categorias alternativas durante a criação do template
2. **Campo `allow_category_change`**: Removido da API (não é mais suportado)
3. **Campo `suggested_category` na resposta**: Não é mais retornado pela API

#### ✅ Novo Processo

1. **Aprovação/Rejeição Direta**:
   - Meta aprova OU rejeita templates diretamente
   - Não há mais processo intermediário de "sugestão"
   - Templates podem ser aprovados mesmo com categoria "incorreta"

2. **Reclassificação Automática Mensal**:
   - **Todo dia 1º do mês**: Meta escaneia templates aprovados
   - Identifica templates mal categorizados
   - **Notifica usuários 30 dias antes** da mudança
   - Usuários podem solicitar revisão se discordarem

3. **Scanning Contínuo**:
   - WhatsApp escaneia regularmente templates aprovados
   - Pode reatribuir categorias para conformidade com políticas

### 📊 Impacto no Sistema PyTake

#### Campo `suggested_category` - DEPRECATED

**Status:** ✅ Implementado corretamente, mas **funcionalidade obsoleta**

- Campo existe no banco de dados (`whatsapp_templates.suggested_category`)
- Código captura e salva quando Meta retorna categoria diferente
- **MAS:** Meta não retorna mais esse campo desde Abril 2025
- Campo sempre será `NULL` para novos templates
- Mantido apenas para compatibilidade com dados históricos

**Localização do código:**
- Modelo: `backend/app/models/whatsapp_number.py:202`
- Schemas: `backend/app/schemas/template.py:91`, `backend/app/schemas/template_parameters.py:268`
- Service: `backend/app/services/template_service.py:379-393`

---

## 🚫 Motivos Comuns de Rejeição

Templates podem ser rejeitados por diversos motivos, **exceto categoria errada**:

### 1. **Formatação Inadequada**
- ❌ Quebras de linha excessivas
- ❌ Header muito curta (< 10 caracteres recomendado)
- ❌ Body muito simples ou genérico
- ❌ Problemas de estrutura

### 2. **Variáveis Inválidas**
- ❌ Mistura de formatos ({{1}} e {{nome}} no mesmo template)
- ❌ Variáveis fora de ordem
- ❌ Variáveis não declaradas

### 3. **Conteúdo Proibido**
- ❌ Violação de políticas do WhatsApp
- ❌ Conteúdo enganoso
- ❌ Spam ou conteúdo promocional disfarçado de UTILITY

### 4. **Duplicação**
- ❌ Template idêntico a outro já existente

### 5. **Nome Inválido**
- ❌ Nome não segue padrão (lowercase, underscores apenas)
- ❌ Nome muito curto ou muito longo

---

## 🔍 Como Descobrir Motivo Real de Rejeição

A API Cloud da Meta **NÃO fornece** razão detalhada de rejeição via campo `rejected_reason`.

### Passos para obter feedback detalhado:

1. **Acessar Meta Business Manager**
   - URL: https://business.facebook.com/
   - Login com credenciais da conta

2. **Navegar até WhatsApp Business**
   - Selecionar a conta/portfólio correto
   - Ir em **Message Templates**

3. **Visualizar Template Rejeitado**
   - Clicar no template rejeitado
   - Ver detalhes e feedback da Meta
   - Ler sugestões de melhoria

---

## 💡 Boas Práticas

### ✅ Para Aumentar Chances de Aprovação

1. **Header Descritiva**:
   - Mínimo 10 caracteres
   - Contexto claro do que é a mensagem
   - Evitar genéricos como "Oi", "Código"

2. **Body Completo**:
   - Contexto claro e completo
   - Explicar a ação/motivo da mensagem
   - Incluir informações úteis

3. **Footer Específica**:
   - Nome da empresa ou serviço
   - Evitar genéricos como "Obrigado"

4. **Escolher Categoria Correta**:
   - **MARKETING**: Se há qualquer elemento promocional
   - **UTILITY**: Se é transacional/informativo
   - **AUTHENTICATION**: Apenas para códigos OTP

5. **Seguir Guidelines da Meta**:
   - Ler documentação oficial
   - Ver exemplos aprovados
   - Evitar conteúdo ambíguo

### ❌ O Que Evitar

1. Não criar templates genéricos demais
2. Não usar categoria errada para reduzir custos
3. Não incluir URLs encurtadas suspeitas
4. Não copiar templates de outras empresas
5. Não usar conteúdo que possa ser interpretado como spam

---

## 📚 Referências

### Documentação Oficial da Meta

- [WhatsApp Business API - Message Templates](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates)
- [WhatsApp Cloud API - Send Templates](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates)
- [Meta Business Help - Create Templates](https://business.facebook.com/business/help/2055875911147364)

### Artigos sobre Mudanças 2025

- [Understanding Meta's Latest Updates - Wati.io](https://support.wati.io/en/articles/12320234-understanding-meta-s-latest-updates-on-template-approval)
- [WhatsApp API Template Category Update - YCloud](https://www.ycloud.com/blog/whatsapp-api-message-template-category-guidelines-update/)

---

## 📝 Histórico de Mudanças

| Data | Versão | Mudanças |
|------|--------|----------|
| 28/12/2025 | 1.0 | Criação do documento com informações atualizadas sobre categorias e mudanças de Abril 2025 |

---

## 👤 Autor

**Kayo Carvalho Fernandes**
Desenvolvedor Principal - PyTake Platform

---

## 📧 Contato

Para dúvidas ou sugestões sobre este documento, entre em contato através dos canais oficiais do projeto PyTake.
