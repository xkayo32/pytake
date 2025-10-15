# Chatbot Builder - Documentação Completa

**Data de Conclusão**: Janeiro 2025
**Status**: ✅ COMPLETO com Script Node e PropertyModal

---

## Visão Geral

O Chatbot Builder do PyTake é um editor visual drag-and-drop baseado em React Flow que permite criar fluxos de automação complexos para WhatsApp Business sem escrever código.

## Arquitetura

### Stack Tecnológico

**Frontend:**
- React Flow (@xyflow/react) - Canvas visual
- React 19 + TypeScript 5
- Tailwind CSS 4 - Estilização
- Pyodide 0.24.1 - Execução de Python no browser

**Backend:**
- PostgreSQL (JSONB) - Armazenamento de fluxos
- Python/FastAPI - Execução de chatbots
- Celery - Processamento assíncrono

### Estrutura de Arquivos

```
frontend/src/components/admin/builder/
├── CustomNode.tsx              # Visual dos nós no canvas
├── PropertyTabs.tsx            # Tabs para propriedades
├── PropertyModal.tsx           # Modal fullscreen genérico
├── FlowSimulator.tsx           # Simulador de fluxo
├── AvailableVariables.tsx      # Lista de variáveis disponíveis
│
├── ScriptProperties.tsx        # Propriedades do nó Script
├── MessageProperties.tsx       # Propriedades do nó Message
├── QuestionProperties.tsx      # Propriedades do nó Question
├── ConditionProperties.tsx     # Propriedades do nó Condition
├── APICallProperties.tsx       # Propriedades do nó API Call
├── DatabaseQueryProperties.tsx # Propriedades do nó Database Query
├── AIPromptProperties.tsx      # Propriedades do nó AI Prompt
└── ...                         # Outros nós

frontend/src/app/builder/[id]/
└── page.tsx                    # Página principal do builder
```

## Tipos de Nós

### 1. Core Nodes (Básicos)

#### Start
- Ponto de entrada do fluxo
- Sempre necessário (apenas 1 por fluxo)
- Sem configurações

#### Message
- Envia mensagens de texto ao usuário
- Suporta variáveis: `{{nome_cliente}}`
- Delay configurável
- Auto-advance opcional

#### Question
- Faz pergunta e aguarda resposta do usuário
- Salva resposta em variável
- Validação de tipo (texto, número, email, telefone)
- Timeout configurável

#### Condition
- Ramifica fluxo baseado em condições
- Operadores: `==`, `!=`, `contains`, `is_empty`, `is_not_empty`
- Múltiplas condições (OR)
- Rota padrão (fallback)

#### End
- Finaliza o fluxo
- Tipos: simples, com despedida, transferir para humano

### 2. Advanced Nodes (Avançados)

#### Script ⭐ NOVO
Executa código JavaScript ou Python para transformação de dados.

**JavaScript:**
```javascript
// Todas as variáveis disponíveis diretamente
return database_result.map(item =>
  `${item.name}: R$ ${item.preco}`
).join('\n');
```

**Python com Bibliotecas:**
```python
import pandas as pd
import numpy as np

# Análise de dados
df = pd.DataFrame(database_result)
total = df['preco'].sum()
media = df['preco'].mean()

f"Total: R$ {total:.2f} | Média: R$ {media:.2f}"
```

**Bibliotecas Python Disponíveis:**
- pandas (~15MB) - Análise de dados
- numpy (~8MB) - Computação numérica
- scipy (~30MB) - Computação científica
- scikit-learn (~35MB) - Machine Learning
- matplotlib (~20MB) - Visualização
- regex (~1MB) - Expressões regulares
- pytz (~500KB) - Fusos horários

**Recursos:**
- ✅ Editor fullscreen (modal 95vw x 95vh)
- ✅ Teste de execução inline
- ✅ Seleção de bibliotecas Python via UI
- ✅ Feedback de carregamento detalhado
- ✅ Timeout configurável (padrão 5s)
- ✅ Continua fluxo em caso de erro

#### API Call
- Faz requisições HTTP (GET, POST, PUT, DELETE)
- Headers e Body customizáveis (JSON)
- Authentication (Bearer, Basic, API Key)
- Timeout configurável
- Salva resposta em variável

#### Database Query
- Conecta em bancos de dados
- Suporta: PostgreSQL, MySQL, MongoDB, SQLite
- Editor SQL com syntax highlighting
- Connection pooling
- Salva resultado em variável

#### AI Prompt
- Integra com modelos AI (GPT, Claude, etc.)
- Context window configurável
- Temperature e max tokens
- System prompt + user prompt
- Salva resposta em variável

#### Action
- Executam ações do sistema
- Tipos: save_contact, send_email, webhook, update_crm
- Configuração por tipo
- Async execution

#### Jump
- Navega entre nós ou fluxos
- Tipos: jump_to_node, jump_to_flow
- Útil para reutilização de fluxos

#### Handoff
- Transfere conversa para humano
- Tipos: queue, department, agent
- Priority configurável
- Message opcional

#### Delay
- Adiciona delay no fluxo
- Unidades: seconds, minutes, hours
- Útil para timing de mensagens

### 3. WhatsApp-Specific Nodes

#### WhatsApp Template
- Envia templates oficiais aprovados pelo Meta
- Suporta variáveis dinâmicas
- Requer aprovação prévia no Meta Business

#### Interactive Buttons
- Envia mensagens com botões de ação
- Até 3 botões por mensagem
- Cada botão gera uma ramificação

#### Interactive List
- Envia listas de seleção
- Até 10 itens por lista
- Organizado em seções

## PropertyModal - Modal Fullscreen Genérico

### Visão Geral

Componente reutilizável para abrir qualquer editor de propriedades em fullscreen.

### Características

- 📐 Tamanho: 95vw x 95vh (ocupa quase toda tela)
- 🎨 Header com gradiente indigo/purple
- 🌙 Dark mode completo
- 💫 Backdrop com blur e escurecimento
- ⚡ z-index 9999 (sempre no topo)
- 🔄 Conteúdo scrollável

### Como Usar

```tsx
import PropertyModal, { PropertyModalTrigger } from './PropertyModal';

export default function YourProperties() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Editor reutilizável (inline e fullscreen)
  const YourEditor = ({ isFullscreen = false }) => (
    <div className="space-y-4">
      <textarea
        rows={isFullscreen ? 25 : 12}  // Mais linhas no fullscreen
        // ... outros props
      />
    </div>
  );

  return (
    <>
      {/* Editor inline */}
      <YourEditor />

      {/* Botão para abrir modal */}
      <PropertyModalTrigger onClick={() => setIsModalOpen(true)} />

      {/* Modal fullscreen */}
      <PropertyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Seu Editor"
        subtitle="Descrição opcional"
      >
        <YourEditor isFullscreen />
      </PropertyModal>
    </>
  );
}
```

### Componentes Recomendados para Migrar

1. ✅ **ScriptProperties** - Implementado
2. 🔄 **APICallProperties** - Headers e Body JSON longos
3. 🔄 **DatabaseQueryProperties** - SQL queries complexas
4. 🔄 **WhatsAppTemplateProperties** - Mensagens longas
5. 🔄 **AIPromptProperties** - Prompts complexos
6. 🔄 **ConditionProperties** - Muitas condições

## Sistema de Variáveis

### Sintaxe

```
{{nome_variavel}}
```

### Variáveis de Sistema

Sempre disponíveis:
```
{{contact.name}}          # Nome do contato
{{contact.phone}}         # Telefone do contato
{{contact.email}}         # Email do contato
{{conversation.id}}       # ID da conversa
{{current_time}}          # Hora atual
{{current_date}}          # Data atual
```

### Variáveis Personalizadas

Criadas por nós:
- **Question** → `{{outputVariable}}`
- **API Call** → `{{outputVariable}}`
- **Database Query** → `{{outputVariable}}`
- **AI Prompt** → `{{outputVariable}}`
- **Script** → `{{outputVariable}}`
- **Set Variable** → `{{variableName}}`

### Regras de Nomenclatura

```regex
^[a-z][a-z0-9_]*$
```

- ✅ `nome_cliente`
- ✅ `preco_total`
- ✅ `resultado_api`
- ❌ `NomeCliente` (maiúscula)
- ❌ `123_var` (começa com número)
- ❌ `nome-cliente` (hífen)

### Uso em Nós

Todos os nós que aceitam texto suportam variáveis:

```
Olá {{contact.name}}!

Seu pedido #{{pedido_id}} foi confirmado.
Total: R$ {{preco_total}}

Previsão de entrega: {{data_entrega}}
```

## Flow Simulator

### Recursos

- ✅ Execução em tempo real no browser
- ✅ Panel de debug com variáveis
- ✅ Histórico de execução
- ✅ Highlight do nó atual
- ✅ Suporte a JavaScript e Python
- ✅ Carregamento automático de bibliotecas Python
- ✅ Feedback visual detalhado

### Como Usar

1. Clique no botão "▶ Testar Fluxo" no builder
2. Simulador abre em modal fullscreen
3. Bot executa automaticamente a partir do nó Start
4. Quando Question node, digite resposta e pressione Enter
5. Acompanhe variáveis no painel direito
6. Clique "↻ Reiniciar" para testar novamente

### Mensagens do Simulator

```
⚙️ Executando script...                  # Script node
🐍 Carregando Python...                   # Python loading
📦 Carregando bibliotecas: pandas...      # Library loading
✅ Script executado: {"result": 42}       # Success
❌ Erro no script: SyntaxError            # Error
⏳ Processando...                         # API/Database
🏁 Conversa finalizada                    # End node
```

## Casos de Uso Práticos

### 1. Análise de Vendas com Pandas

```python
import pandas as pd
import numpy as np

# database_result = [{id, produto, quantidade, preco}, ...]
df = pd.DataFrame(database_result)

# Análise
total_vendas = df['preco'].sum()
ticket_medio = df['preco'].mean()
mais_vendido = df.groupby('produto')['quantidade'].sum().idxmax()

f"""📊 Resumo de Vendas

💰 Total: R$ {total_vendas:,.2f}
📈 Ticket Médio: R$ {ticket_medio:,.2f}
🏆 Mais Vendido: {mais_vendido}

Total de produtos: {len(df)}"""
```

### 2. Recomendação com Scikit-Learn

```python
from sklearn.neighbors import NearestNeighbors
import numpy as np

# Treinar modelo de recomendação
X = np.array([[float(item['preco']), float(item['rating'])]
              for item in produtos])

model = NearestNeighbors(n_neighbors=3)
model.fit(X)

# Recomendar produtos similares
similar = model.kneighbors([[preco_alvo, rating_alvo]], return_distance=False)
recomendacoes = [produtos[i]['nome'] for i in similar[0]]

', '.join(recomendacoes)
```

### 3. Processamento de API Response

```javascript
// api_response = { data: { users: [...], metadata: {...} } }

// Extrair e formatar
const users = api_response.data.users;
const total = api_response.data.metadata.total;

const formatted = users.map((user, i) =>
  `${i+1}. ${user.name} (${user.email})`
).join('\n');

return `📋 ${total} usuários encontrados:\n\n${formatted}`;
```

### 4. Formatação de Dados para WhatsApp

```javascript
// database_result = [{nome, telefone, status}, ...]

return database_result.map(contact => {
  const icon = contact.status === 'active' ? '✅' : '❌';
  return `${icon} ${contact.nome} - ${contact.telefone}`;
}).join('\n');
```

## Performance e Otimizações

### Carregamento de Python

**First Load:**
- Pyodide base: ~10MB (~2s)
- pandas: ~15MB (~3s)
- numpy: ~8MB (~1.5s)
- scikit-learn: ~35MB (~7s)

**Cache:**
- Bibliotecas são cacheadas após primeiro download
- Recarregar página = cache mantido
- Instância Pyodide reutilizada durante sessão

### JavaScript vs Python

| Aspecto | JavaScript | Python |
|---------|-----------|--------|
| Load Time | ~0ms | ~2-10s (first time) |
| Execution | Nativo | WebAssembly |
| Bibliotecas | Built-in JS | pandas, numpy, sklearn |
| Ideal Para | Transformações simples | Análise de dados, ML |

### Recomendações

✅ **Use JavaScript quando:**
- Transformação simples de strings/arrays
- Performance crítica
- Não precisa de bibliotecas científicas

✅ **Use Python quando:**
- Análise de dados com pandas
- Cálculos estatísticos com numpy
- Machine learning com scikit-learn
- Operações matemáticas complexas

## Troubleshooting

### Script não executa

```
❌ Erro no script: SyntaxError: Unexpected token
```

**Solução:** Verifique sintaxe. JavaScript requer `return`, Python não.

### Python não carrega

```
❌ Python não está disponível. Recarregue a página.
```

**Solução:** Aguarde Pyodide carregar (tag script em layout.tsx). Recarregue página.

### Variável não substituída

```
Olá {{nome_cliente}}!  # Aparece literal ao invés do valor
```

**Solução:** Certifique-se que variável foi criada por nó anterior no fluxo.

### Timeout no Script

```
❌ Erro no script: Script execution timeout
```

**Solução:** Aumente timeout em Settings ou otimize código.

## Arquivos de Referência

- [PROPERTY_MODAL_USAGE_EXAMPLE.md](PROPERTY_MODAL_USAGE_EXAMPLE.md) - Guia completo PropertyModal
- [BUILDER_NODES_SPECIFICATION.md](BUILDER_NODES_SPECIFICATION.md) - Especificação detalhada de todos os nós
- [CustomNode.tsx](frontend/src/components/admin/builder/CustomNode.tsx) - Visual dos nós
- [ScriptProperties.tsx](frontend/src/components/admin/builder/ScriptProperties.tsx) - Referência completa
- [FlowSimulator.tsx](frontend/src/components/admin/builder/FlowSimulator.tsx) - Simulador

## Roadmap Futuro

### Próximas Melhorias

1. 🔄 **Monaco Editor** - Editor de código profissional
2. 🔄 **Autocomplete** - Sugestões de variáveis
3. 🔄 **Breakpoints** - Debug passo-a-passo no simulator
4. 🔄 **Version History** - Histórico de versões de fluxos
5. 🔄 **Templates de Fluxo** - Fluxos pré-construídos
6. 🔄 **Export/Import** - Compartilhar fluxos entre organizações
7. 🔄 **Colaboração** - Múltiplos usuários editando simultaneamente

### Nós Futuros

- **Webhook Receiver** - Receber webhooks externos
- **Payment** - Integração com gateways de pagamento
- **Calendar** - Agendamento de eventos
- **File Upload** - Upload de arquivos (PDF, imagens)
- **Voice Note** - Enviar/receber áudios
- **Location** - Compartilhar/solicitar localização

---

**Última Atualização**: Janeiro 2025
**Versão**: 2.0.0
**Autores**: PyTake Team
