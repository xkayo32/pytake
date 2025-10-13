# 🎨 Chatbot Builder - Mockups de Interface

## 📋 Visão Geral

Este documento apresenta mockups textuais das interfaces do novo builder, mostrando como os componentes seriam organizados visualmente.

---

## 1. Painel Lateral Esquerdo - Categorias de Componentes

```
┌─────────────────────────────────────┐
│  🔍 Buscar componentes...           │
├─────────────────────────────────────┤
│                                     │
│ ▼ 🎬 Controle de Fluxo              │
│   ┌───────────────────────────────┐ │
│   │ ▶ Início                      │ │
│   │ Ponto de entrada do fluxo     │ │
│   └───────────────────────────────┘ │
│   ┌───────────────────────────────┐ │
│   │ ⏸ Esperar                     │ │
│   │ Pausa o fluxo por período     │ │
│   └───────────────────────────────┘ │
│   ┌───────────────────────────────┐ │
│   │ 🔀 Condição                   │ │
│   │ Decisão baseada em regras     │ │
│   └───────────────────────────────┘ │
│   + 3 mais componentes...           │
│                                     │
│ ▼ 💬 Mensagens                      │
│   ┌───────────────────────────────┐ │
│   │ 💬 Mensagem                   │ │
│   │ Envia mensagem de texto       │ │
│   └───────────────────────────────┘ │
│   ┌───────────────────────────────┐ │
│   │ ❓ Pergunta                   │ │
│   │ Captura resposta do usuário   │ │
│   └───────────────────────────────┘ │
│   ┌───────────────────────────────┐ │
│   │ 🖼 Mídia                      │ │
│   │ Envia imagem/vídeo/áudio      │ │
│   └───────────────────────────────┘ │
│   + 2 mais componentes...           │
│                                     │
│ ▼ 🤖 Inteligência Artificial        │
│   ┌───────────────────────────────┐ │
│   │ 🧠 Agente LLM         ⭐NEW  │ │
│   │ GPT-4, Claude, Gemini         │ │
│   └───────────────────────────────┘ │
│   ┌───────────────────────────────┐ │
│   │ 😊 Análise Sentimento  ⭐NEW  │ │
│   │ Detecta emoção do usuário     │ │
│   └───────────────────────────────┘ │
│   + 2 mais componentes...           │
│                                     │
│ ▶ 🗄️ Dados e Integrações           │
│ ▶ ⚙️ Ações e Automação              │
│ ▶ 👥 Atendimento Humano             │
│ ▶ 📊 Analytics                      │
│                                     │
└─────────────────────────────────────┘
```

---

## 2. Painel Direito - Propriedades do Nó LLM Agent

```
┌──────────────────────────────────────────┐
│  Propriedades do Nó                      │
├──────────────────────────────────────────┤
│                                          │
│  Tipo: 🧠 Agente LLM                     │
│  ID: node-7                              │
│                                          │
├──────────────────────────────────────────┤
│  📝 Configuração                         │
├──────────────────────────────────────────┤
│                                          │
│  Provider de IA *                        │
│  ┌────────────────────────────────────┐  │
│  │ OpenAI                      ▼     │  │
│  └────────────────────────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │ • OpenAI                          │  │
│  │ • Anthropic (Claude)              │  │
│  │ • Google (Gemini)                 │  │
│  │ • Groq                            │  │
│  │ • Azure OpenAI                    │  │
│  │ • Custom                          │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Modelo *                                │
│  ┌────────────────────────────────────┐  │
│  │ gpt-4-turbo                 ▼     │  │
│  └────────────────────────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │ • gpt-4-turbo                     │  │
│  │ • gpt-4                           │  │
│  │ • gpt-3.5-turbo                   │  │
│  │ • Custom model...                 │  │
│  └────────────────────────────────────┘  │
│                                          │
│  API Key *                               │
│  ┌──────────────────────────────┬────┐  │
│  │ OpenAI Production Key    ▼  │ +  │  │
│  └──────────────────────────────┴────┘  │
│  ├─ OpenAI Production Key              │
│  ├─ OpenAI Test Key                    │
│  ├─ Claude API Key                     │
│  └─ + Adicionar nova chave...          │
│                                          │
├──────────────────────────────────────────┤
│  💭 Prompt do Sistema                    │
├──────────────────────────────────────────┤
│                                          │
│  Templates rápidos:                      │
│  [Atendimento] [Vendas] [Suporte]       │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ Você é um assistente de atendi-  │  │
│  │ mento da {{company_name}}.       │  │
│  │                                  │  │
│  │ Informações do cliente:          │  │
│  │ Nome: {{contact.name}}           │  │
│  │ Email: {{contact.email}}         │  │
│  │                                  │  │
│  │ Seja sempre educado e prestativo.│  │
│  │                                  │  │
│  └────────────────────────────────────┘  │
│  [📝 Inserir variável] [🔍 Validar]      │
│                                          │
├──────────────────────────────────────────┤
│  🎛 Parâmetros Avançados (Opcional)      │
├──────────────────────────────────────────┤
│                                          │
│  ☑ Incluir histórico de conversa        │
│    └─ Últimas mensagens: [10      ]     │
│                                          │
│  Temperature: ━━━●━━━━━ 0.7              │
│  (0 = preciso, 2 = criativo)             │
│                                          │
│  Max Tokens: [1000          ]            │
│                                          │
│  ▼ Ver mais parâmetros...                │
│    • Top P: 1.0                          │
│    • Frequency Penalty: 0.0              │
│    • Presence Penalty: 0.0               │
│                                          │
├──────────────────────────────────────────┤
│  💾 Resultado                            │
├──────────────────────────────────────────┤
│                                          │
│  Salvar resposta em:                     │
│  ┌────────────────────────────────────┐  │
│  │ ai_response                       │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Mensagem de fallback (se falhar):       │
│  ┌────────────────────────────────────┐  │
│  │ Desculpe, estou com dificuldades │  │
│  │ no momento. Vou transferir para  │  │
│  │ um atendente humano.             │  │
│  └────────────────────────────────────┘  │
│                                          │
│  [💾 Salvar] [🧪 Testar] [❌ Cancelar]   │
│                                          │
└──────────────────────────────────────────┘
```

---

## 3. Painel Direito - Propriedades do Nó Database Query

```
┌──────────────────────────────────────────┐
│  Propriedades do Nó                      │
├──────────────────────────────────────────┤
│                                          │
│  Tipo: 🗄️ Consulta ao Banco             │
│  ID: node-12                             │
│                                          │
├──────────────────────────────────────────┤
│  🔌 Conexão                              │
├──────────────────────────────────────────┤
│                                          │
│  Banco de Dados *                        │
│  ┌──────────────────────────────┬────┐  │
│  │ CRM Production (PostgreSQL)▼│ ⚙ │  │
│  └──────────────────────────────┴────┘  │
│  ├─ CRM Production (PostgreSQL)        │
│  ├─ Analytics DB (MongoDB)             │
│  ├─ Orders DB (MySQL)                  │
│  └─ + Nova conexão...                  │
│                                          │
│  Status: ● Conectado                     │
│                                          │
├──────────────────────────────────────────┤
│  📝 Query SQL                            │
├──────────────────────────────────────────┤
│                                          │
│  [SELECT] [INSERT] [UPDATE] [DELETE]     │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ 1  SELECT                         │  │
│  │ 2    c.name,                      │  │
│  │ 3    c.email,                     │  │
│  │ 4    COUNT(o.id) as total_orders  │  │
│  │ 5  FROM customers c               │  │
│  │ 6  LEFT JOIN orders o             │  │
│  │ 7    ON c.id = o.customer_id      │  │
│  │ 8  WHERE c.phone = '{{phone}}'    │  │
│  │ 9  GROUP BY c.id                  │  │
│  │                                   │  │
│  └────────────────────────────────────┘  │
│  [📝 Variáveis] [✓ Validar] [🔍 Preview] │
│                                          │
│  Variáveis detectadas:                   │
│  • {{phone}} → Contato: contact.phone    │
│                                          │
├──────────────────────────────────────────┤
│  ⚙️ Configurações                        │
├──────────────────────────────────────────┤
│                                          │
│  Formato do resultado:                   │
│  ┌────────────────────────────────────┐  │
│  │ ◉ Primeira linha                  │  │
│  │ ○ Todas as linhas                 │  │
│  │ ○ Contagem apenas                 │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Limite de linhas: [1000          ]      │
│  Timeout (segundos): [30           ]     │
│                                          │
├──────────────────────────────────────────┤
│  💾 Resultado                            │
├──────────────────────────────────────────┤
│                                          │
│  Salvar resultado em:                    │
│  ┌────────────────────────────────────┐  │
│  │ customer_data                     │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Mapeamento de campos (opcional):        │
│  customer_data.name → {{customer_name}}  │
│  customer_data.email → {{customer_email}}│
│  customer_data.total_orders → {{orders}} │
│                                          │
│  [💾 Salvar] [🧪 Testar Query] [❌ Cancelar]│
│                                          │
└──────────────────────────────────────────┘
```

---

## 4. Modal de Criação de Secret

```
╔════════════════════════════════════════════╗
║         🔐 Adicionar API Key/Secret        ║
╠════════════════════════════════════════════╣
║                                            ║
║  Nome interno *                            ║
║  ┌──────────────────────────────────────┐  ║
║  │ openai_production_key               │  ║
║  └──────────────────────────────────────┘  ║
║  ℹ️ Use snake_case, sem espaços             ║
║                                            ║
║  Nome de exibição *                        ║
║  ┌──────────────────────────────────────┐  ║
║  │ OpenAI Production Key               │  ║
║  └──────────────────────────────────────┘  ║
║                                            ║
║  Descrição (opcional)                      ║
║  ┌──────────────────────────────────────┐  ║
║  │ Chave de produção da conta OpenAI   │  ║
║  │ da empresa. Limite de $100/mês      │  ║
║  └──────────────────────────────────────┘  ║
║                                            ║
║  Valor (API Key) *                         ║
║  ┌──────────────────────────────────────┐  ║
║  │ ●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●   │  ║
║  └──────────────────────────────────────┘  ║
║  [👁 Mostrar] [📋 Colar]                    ║
║                                            ║
║  Escopo                                    ║
║  ┌────────────────────────────────────┐    ║
║  │ ◉ Apenas este chatbot              │    ║
║  │ ○ Toda a organização               │    ║
║  └────────────────────────────────────┘    ║
║                                            ║
║  Tags (opcional)                           ║
║  ┌──────────────────────────────────────┐  ║
║  │ openai, llm, production             │  ║
║  └──────────────────────────────────────┘  ║
║                                            ║
║  ⚠️ Este valor será criptografado e       ║
║     armazenado com segurança. Você não    ║
║     poderá visualizá-lo novamente.        ║
║                                            ║
║            [💾 Salvar] [❌ Cancelar]        ║
║                                            ║
╚════════════════════════════════════════════╝
```

---

## 5. Canvas com Fluxo Completo (Exemplo)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Bot de Atendimento • Fluxo Principal                            [💾] [▶️]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│     ┌───────────────┐                                                       │
│     │   ▶️ Início   │                                                       │
│     └───────┬───────┘                                                       │
│             │                                                               │
│             ▼                                                               │
│     ┌───────────────────────────┐                                          │
│     │  💬 Mensagem              │                                          │
│     │  "Olá! Sou o assistente"  │                                          │
│     └─────────────┬─────────────┘                                          │
│                   │                                                         │
│                   ▼                                                         │
│     ┌───────────────────────────┐                                          │
│     │  ❓ Pergunta              │                                          │
│     │  "Como posso ajudar?"     │                                          │
│     └─────────────┬─────────────┘                                          │
│                   │                                                         │
│                   ▼                                                         │
│     ┌──────────────────────────────────────┐                               │
│     │  🧠 Agente LLM (GPT-4 Turbo)   ⭐   │                               │
│     │  Entende intenção do usuário        │                               │
│     └─────────────┬────────────────────────┘                               │
│                   │                                                         │
│                   ▼                                                         │
│     ┌─────────────────────────┐                                            │
│     │  🔀 Condição            │                                            │
│     │  Intenção detectada?    │                                            │
│     └─────┬──────────┬────────┘                                            │
│           │          │                                                      │
│    "vendas"│     "suporte"                                                 │
│           │          │                                                      │
│           ▼          ▼                                                      │
│  ┌─────────────┐  ┌──────────────────────────┐                            │
│  │ 🗄️ Query DB │  │  👥 Transferir Humano    │                            │
│  │ Buscar      │  │  Depto: Suporte          │                            │
│  │ produtos    │  └────────────┬─────────────┘                            │
│  └──────┬──────┘               │                                           │
│         │                      │                                           │
│         ▼                      ▼                                           │
│  ┌────────────┐         ┌───────────┐                                     │
│  │ 💬 Mostrar │         │ ⏹ Fim    │                                     │
│  │ produtos   │         └───────────┘                                     │
│  └──────┬─────┘                                                            │
│         │                                                                  │
│         ▼                                                                  │
│  ┌───────────┐                                                             │
│  │ ⏹ Fim    │                                                             │
│  └───────────┘                                                             │
│                                                                             │
│                                                                             │
│  💡 Dica: Clique em um nó para editar suas propriedades →                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Página de Gerenciamento de Secrets

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Configurações > 🔐 API Keys e Secrets                          [+ Adicionar]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [🔍 Buscar...                     ] [🏷 Todas] [▼ Escopo] [▼ Provider]    │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 🔑 OpenAI Production Key                                  🏢 Org     │  │
│  │    Chave de produção da conta OpenAI                                │  │
│  │    Usado em: 3 chatbots • Último uso: há 2 horas • 1.2k chamadas   │  │
│  │    [✏️ Editar] [🔄 Rotacionar] [🗑️ Deletar]                        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 🔑 Claude API Key                                         🤖 Bot     │  │
│  │    API key para o Claude 3.5 Sonnet                                 │  │
│  │    Usado em: Bot de Vendas • Último uso: há 1 dia • 450 chamadas   │  │
│  │    [✏️ Editar] [🔄 Rotacionar] [🗑️ Deletar]                        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 🔑 Database CRM Password                                  🏢 Org     │  │
│  │    Senha do banco PostgreSQL de produção                            │  │
│  │    Usado em: 5 chatbots • Último uso: há 10 min • 5.8k queries     │  │
│  │    [✏️ Editar] [🔄 Rotacionar] [🗑️ Deletar]                        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 🔑 SendGrid API Key                                       🤖 Bot     │  │
│  │    Chave para envio de emails via SendGrid                          │  │
│  │    Usado em: Bot de Cadastro • Nunca usado                          │  │
│  │    [✏️ Editar] [🔄 Rotacionar] [🗑️ Deletar]                        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ⚠️ Boas Práticas:                                                          │
│  • Rotacione suas chaves regularmente (recomendado: a cada 90 dias)        │
│  • Use chaves diferentes para produção e testes                            │
│  • Nunca compartilhe chaves fora do sistema                                │
│  • Monitore o uso de cada chave no dashboard de analytics                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Teste de Componente (Modal)

```
╔════════════════════════════════════════════════════════════════╗
║              🧪 Testar Componente - Agente LLM                 ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  Configuração:                                                 ║
║  Provider: OpenAI • Model: gpt-4-turbo                        ║
║  Temperature: 0.7 • Max tokens: 1000                          ║
║                                                                ║
║  ──────────────────────────────────────────────────────────    ║
║                                                                ║
║  Mensagem de teste:                                            ║
║  ┌────────────────────────────────────────────────────────┐    ║
║  │ Olá! Preciso de ajuda para rastrear meu pedido        │    ║
║  └────────────────────────────────────────────────────────┘    ║
║                                                                ║
║  Variáveis de contexto (opcional):                             ║
║  ┌────────────────────────────────────────────────────────┐    ║
║  │ {                                                      │    ║
║  │   "contact.name": "João Silva",                       │    ║
║  │   "contact.email": "joao@email.com",                  │    ║
║  │   "company_name": "TechStore"                         │    ║
║  │ }                                                      │    ║
║  └────────────────────────────────────────────────────────┘    ║
║                                                                ║
║  [▶️ Executar Teste]                                           ║
║                                                                ║
║  ──────────────────────────────────────────────────────────    ║
║                                                                ║
║  📊 Resultado:                                                 ║
║                                                                ║
║  ✅ Status: Sucesso                                            ║
║  ⏱ Tempo: 1.2s                                                ║
║  🎫 Tokens: 245 (prompt) + 120 (resposta) = 365 total        ║
║  💰 Custo estimado: $0.0073                                    ║
║                                                                ║
║  Resposta gerada:                                              ║
║  ┌────────────────────────────────────────────────────────┐    ║
║  │ Olá João! Fico feliz em ajudar com o rastreamento    │    ║
║  │ do seu pedido na TechStore.                           │    ║
║  │                                                        │    ║
║  │ Para que eu possa localizar seu pedido, você poderia  │    ║
║  │ me fornecer:                                           │    ║
║  │ 1. O número do pedido, ou                             │    ║
║  │ 2. O email usado na compra, ou                        │    ║
║  │ 3. O CPF cadastrado                                    │    ║
║  │                                                        │    ║
║  │ Com essas informações, vou consultar o sistema e      │    ║
║  │ te passar todas as informações sobre seu pedido! 📦   │    ║
║  └────────────────────────────────────────────────────────┘    ║
║                                                                ║
║  [📋 Copiar] [🔄 Testar Novamente] [✅ Salvar Config]          ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

---

## 8. Validação Visual de Erros no Canvas

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Bot de Vendas • Fluxo Principal                   ⚠️ 2 erros • 1 aviso    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│     ┌───────────────┐                                                       │
│     │   ▶️ Início   │  ✅                                                   │
│     └───────┬───────┘                                                       │
│             │                                                               │
│             ▼                                                               │
│     ┌───────────────────────────┐                                          │
│     │  💬 Mensagem              │  ✅                                       │
│     │  "Bem-vindo!"             │                                          │
│     └─────────────┬─────────────┘                                          │
│                   │                                                         │
│                   ▼                                                         │
│     ┌──────────────────────────────────────┐                               │
│     │  🧠 Agente LLM                  ⚠️  │  ← Clique para ver detalhes   │
│     │  ⚠️ API Key não configurada         │                               │
│     └─────────────┬────────────────────────┘                               │
│                   │                                                         │
│                   ▼                                                         │
│     ┌──────────────────────────────────────┐                               │
│     │  🗄️ Database Query           ❌     │  ← Erro crítico               │
│     │  ❌ Query inválida                   │                               │
│     │  ❌ Conexão não encontrada           │                               │
│     └─────────────┬────────────────────────┘                               │
│                   │                                                         │
│                   ▼                                                         │
│     ┌───────────────┐                                                       │
│     │   ⏹ Fim      │  ⚠️ Nó não conectado                                 │
│     └───────────────┘                                                       │
│                                                                             │
│  Erros e Avisos:                                                            │
│  ❌ node-12: Query SQL contém comando não permitido (DROP)                 │
│  ❌ node-12: Conexão de banco "crm_prod" não encontrada                    │
│  ⚠️ node-7: Recomenda-se configurar uma API key para testes               │
│  ⚠️ node-15: Nó "Fim" não está conectado ao fluxo principal               │
│                                                                             │
│  [🔧 Corrigir Automaticamente] [📋 Ver Lista Completa]                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Painel de Variáveis (Bottom Panel)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [📊 Variáveis] [📝 Logs] [🧪 Testes] [📖 Documentação]                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  💾 Variáveis do Fluxo                                    [+ Nova Variável] │
│                                                                             │
│  ┌─ Built-in (Sistema) ────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  {{contact.name}}          Nome do contato                          │   │
│  │  {{contact.phone}}         Telefone do contato                      │   │
│  │  {{contact.email}}         Email do contato                         │   │
│  │  {{conversation.id}}       ID da conversa                           │   │
│  │  {{system.date}}           Data atual (YYYY-MM-DD)                  │   │
│  │  {{system.time}}           Hora atual (HH:MM:SS)                    │   │
│  │  ... + 12 variáveis                                [▼ Ver todas]    │   │
│  │                                                                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─ Customizadas ───────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  {{ai_response}}           String    Definida em: node-7 (LLM)     │   │
│  │  {{customer_data}}         Object    Definida em: node-12 (DB)     │   │
│  │  {{order_status}}          String    Definida em: node-15          │   │
│  │  {{total_products}}        Number    Definida em: node-18          │   │
│  │                                                                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  📝 Uso de variáveis:                                                       │
│  • Para usar em mensagens: Olá {{contact.name}}!                           │
│  • Para usar em condições: {{customer_data.orders}} > 5                    │
│  • Para usar em queries: WHERE email = '{{contact.email}}'                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 💡 Observações de Design

### Cores e Ícones

- **Verde** (#10b981): Sucesso, início, mensagens simples
- **Azul** (#3b82f6): Informação, mensagens, dados
- **Roxo** (#8b5cf6): Interação, perguntas
- **Rosa** (#ec4899): IA, machine learning
- **Laranja** (#f97316): Condições, decisões
- **Amarelo** (#eab308): Avisos, templates
- **Vermelho** (#ef4444): Erros, fim, ações críticas
- **Verde-água** (#14b8a6): Atendimento humano, handoff
- **Índigo** (#6366f1): APIs, integrações externas

### Princípios UX

1. **Clareza**: Cada componente deve ter propósito claro
2. **Feedback**: Validação em tempo real
3. **Eficiência**: Atalhos de teclado e templates rápidos
4. **Segurança**: Secrets nunca expostos, confirmações para ações críticas
5. **Aprendizado**: Tooltips, documentação inline, exemplos
6. **Acessibilidade**: Contraste adequado, suporte a teclado

### Interações

- **Drag & Drop**: Arrastar componentes do painel para o canvas
- **Click**: Selecionar nó para editar propriedades
- **Hover**: Preview de informações do nó
- **Right-Click**: Menu contextual (duplicar, deletar, copiar ID)
- **Ctrl+Z**: Undo
- **Ctrl+Y**: Redo
- **Ctrl+C/V**: Copiar/Colar nós
- **Delete**: Deletar nó selecionado
- **Ctrl+F**: Buscar componente

---

**Status**: 📝 Mockups - Pronto para implementação UI/UX

**Próxima etapa**: Começar implementação do sistema de Secrets + Backend LLM Agent
