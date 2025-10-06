# 💻 Guia de Desenvolvimento - PyTake

## 📋 Índice
- [Requisitos](#requisitos)
- [Setup Local](#setup-local)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Comandos Úteis](#comandos-úteis)
- [Desenvolvimento](#desenvolvimento)
- [Testes](#testes)
- [Boas Práticas](#boas-práticas)

---

## 🔧 Requisitos

### Backend
- **Python** 3.11+
- **PostgreSQL** 15+
- **Redis** 7+
- **MongoDB** 7+
- **Docker** & Docker Compose (recomendado)

### Frontend
- **Node.js** 18+ (LTS)
- **npm** ou **pnpm** (recomendado)

### Ferramentas
- **Git**
- **VS Code** (recomendado) ou editor de preferência
- **Postman** ou **Insomnia** (testar API)

---

## 🚀 Setup Local

### 1. Clonar Repositório

```bash
git clone https://github.com/your-org/pytake.git
cd pytake
```

### 2. Setup com Docker (Recomendado)

```bash
# Copiar arquivos de ambiente
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Subir containers
docker-compose up -d

# Aguardar containers iniciarem (30s)
docker-compose ps

# Aplicar migrations
docker-compose exec backend alembic upgrade head

# Criar super usuário
docker-compose exec backend python scripts/create_superuser.py
```

**Acessar:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- MongoDB: localhost:27017

### 3. Setup Manual (Sem Docker)

#### Backend

```bash
cd backend

# Criar virtualenv
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Instalar dependências
pip install -r requirements.txt
pip install -r requirements-dev.txt  # dev dependencies

# Configurar .env
cp .env.example .env
# Editar .env com suas configurações

# Iniciar serviços externos (PostgreSQL, Redis, MongoDB)
# Via Docker:
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15-alpine
docker run -d -p 6379:6379 redis:7-alpine
docker run -d -p 27017:27017 mongo:7

# Criar database
createdb pytake_dev

# Aplicar migrations
alembic upgrade head

# Seed data (opcional)
python scripts/seed_data.py

# Iniciar servidor
uvicorn app.main:app --reload --port 8000
```

#### Frontend

```bash
cd frontend

# Instalar dependências
pnpm install

# Configurar .env
cp .env.example .env.local
# Editar com URL do backend

# Iniciar dev server
pnpm dev
```

#### Celery (Background Tasks)

```bash
cd backend

# Worker
celery -A app.tasks.celery_app worker --loglevel=info

# Beat (scheduler)
celery -A app.tasks.celery_app beat --loglevel=info

# Flower (monitoring - opcional)
celery -A app.tasks.celery_app flower --port=5555
```

---

## 📁 Estrutura do Projeto

```
pytake/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── endpoints/
│   │   │   │   │   ├── auth.py
│   │   │   │   │   ├── contacts.py
│   │   │   │   │   ├── messages.py
│   │   │   │   │   └── ...
│   │   │   │   └── router.py
│   │   │   └── deps.py
│   │   ├── core/
│   │   │   ├── config.py          # Configurações
│   │   │   ├── security.py        # JWT, passwords
│   │   │   └── database.py        # DB connections
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── contact.py
│   │   │   └── ...
│   │   ├── schemas/
│   │   │   ├── user.py           # Pydantic schemas
│   │   │   ├── contact.py
│   │   │   └── ...
│   │   ├── services/
│   │   │   ├── auth_service.py
│   │   │   ├── whatsapp_service.py
│   │   │   └── ...
│   │   ├── repositories/
│   │   │   ├── base.py
│   │   │   ├── user_repository.py
│   │   │   └── ...
│   │   ├── tasks/
│   │   │   ├── celery_app.py
│   │   │   ├── whatsapp_tasks.py
│   │   │   └── ...
│   │   ├── integrations/
│   │   │   ├── whatsapp/
│   │   │   │   ├── client.py
│   │   │   │   └── webhook_handler.py
│   │   │   └── ...
│   │   └── main.py               # FastAPI app
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   ├── alembic/                  # Migrations
│   ├── scripts/                  # Utility scripts
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   └── .env.example
│
├── frontend/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/
│   │   │   ├── chatbots/
│   │   │   ├── conversations/
│   │   │   ├── contacts/
│   │   │   └── ...
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/                   # Shadcn components
│   │   ├── layout/
│   │   ├── chatbot/
│   │   └── ...
│   ├── lib/
│   │   ├── api.ts               # API client
│   │   ├── utils.ts
│   │   └── ...
│   ├── stores/
│   │   ├── authStore.ts
│   │   └── ...
│   ├── types/
│   │   ├── api.ts
│   │   └── ...
│   ├── public/
│   ├── package.json
│   └── .env.example
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## ⚡ Comandos Úteis

### Docker Compose

```bash
# Subir todos os serviços
docker-compose up -d

# Ver logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Parar serviços
docker-compose stop

# Reiniciar serviço
docker-compose restart backend

# Remover tudo
docker-compose down -v

# Rebuild após mudanças
docker-compose up -d --build
```

### Backend

```bash
# Ativar virtualenv
source venv/bin/activate

# Instalar dependência
pip install package-name
pip freeze > requirements.txt

# Rodar servidor
uvicorn app.main:app --reload

# Criar migration
alembic revision -m "create_users_table"

# Aplicar migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1

# Rodar testes
pytest
pytest tests/unit
pytest -v --cov=app

# Lint & Format
black app/
isort app/
flake8 app/
mypy app/

# Celery worker
celery -A app.tasks.celery_app worker -l info

# Celery beat
celery -A app.tasks.celery_app beat -l info
```

### Frontend

```bash
# Instalar dependência
pnpm add package-name
pnpm add -D package-name  # dev dependency

# Dev server
pnpm dev

# Build production
pnpm build

# Start production
pnpm start

# Lint
pnpm lint

# Type check
pnpm type-check

# Format
pnpm format
```

---

## 🛠️ Desenvolvimento

### Backend - FastAPI

#### Criar novo endpoint

**1. Criar schema (Pydantic)**
```python
# app/schemas/contact.py
from pydantic import BaseModel, EmailStr

class ContactCreate(BaseModel):
    whatsapp_id: str
    name: str
    email: EmailStr | None = None

class ContactResponse(ContactCreate):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True
```

**2. Criar endpoint**
```python
# app/api/v1/endpoints/contacts.py
from fastapi import APIRouter, Depends
from app.schemas.contact import ContactCreate, ContactResponse
from app.services.contact_service import ContactService

router = APIRouter()

@router.post("/", response_model=ContactResponse, status_code=201)
async def create_contact(
    data: ContactCreate,
    service: ContactService = Depends()
):
    contact = await service.create_contact(data)
    return contact
```

**3. Registrar router**
```python
# app/api/v1/router.py
from fastapi import APIRouter
from app.api.v1.endpoints import contacts

api_router = APIRouter()
api_router.include_router(contacts.router, prefix="/contacts", tags=["contacts"])
```

#### Criar serviço

```python
# app/services/contact_service.py
from app.repositories.contact_repository import ContactRepository
from app.schemas.contact import ContactCreate

class ContactService:
    def __init__(self, repo: ContactRepository = Depends()):
        self.repo = repo

    async def create_contact(self, data: ContactCreate):
        # Lógica de negócio
        contact = await self.repo.create(data)
        # Trigger events, send webhooks, etc
        return contact
```

#### Criar model

```python
# app/models/contact.py
from sqlalchemy import Column, String, Boolean, ARRAY
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.models.base import Base, TimestampMixin

class Contact(Base, TimestampMixin):
    __tablename__ = "contacts"

    id = Column(UUID, primary_key=True, server_default=text("gen_random_uuid()"))
    organization_id = Column(UUID, ForeignKey("organizations.id"), nullable=False)
    whatsapp_id = Column(String(20), nullable=False)
    name = Column(String(255))
    email = Column(String(255))
    tags = Column(ARRAY(String), default=[])
    attributes = Column(JSONB, default={})
    opt_in = Column(Boolean, default=True)
```

#### Criar migration

```bash
alembic revision -m "create_contacts_table"
```

```python
# alembic/versions/xxx_create_contacts_table.py
def upgrade():
    op.create_table(
        'contacts',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), primary_key=True),
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('whatsapp_id', sa.String(20), nullable=False),
        sa.Column('name', sa.String(255)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('idx_contacts_whatsapp', 'contacts', ['whatsapp_id'])

def downgrade():
    op.drop_table('contacts')
```

#### Criar teste

```python
# tests/unit/test_contact_service.py
import pytest
from app.services.contact_service import ContactService
from app.schemas.contact import ContactCreate

@pytest.mark.asyncio
async def test_create_contact(db_session):
    service = ContactService()
    data = ContactCreate(
        whatsapp_id="+5511999999999",
        name="Test User"
    )
    contact = await service.create_contact(data)
    assert contact.name == "Test User"
    assert contact.id is not None
```

### Frontend - Next.js

#### Criar nova página

```typescript
// app/(dashboard)/contacts/page.tsx
export default function ContactsPage() {
  return (
    <div>
      <h1>Contatos</h1>
      {/* Conteúdo */}
    </div>
  )
}
```

#### Criar componente

```typescript
// components/contacts/ContactList.tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function ContactList() {
  const { data, isLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => api.get('/contacts').then(r => r.data)
  })

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      {data.data.map(contact => (
        <div key={contact.id}>{contact.name}</div>
      ))}
    </div>
  )
}
```

#### API Client

```typescript
// lib/api.ts
import axios from 'axios'

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
})

// Interceptor para adicionar token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

#### Zustand Store

```typescript
// stores/authStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password })
        set({ user: response.data.user, token: response.data.access_token })
      },
      logout: () => set({ user: null, token: null })
    }),
    { name: 'auth-storage' }
  )
)
```

---

## 🧪 Testes

### Backend (pytest)

```bash
# Rodar todos testes
pytest

# Testes específicos
pytest tests/unit
pytest tests/integration
pytest tests/unit/test_auth.py

# Com cobertura
pytest --cov=app --cov-report=html

# Verbose
pytest -v

# Parar no primeiro erro
pytest -x
```

**Exemplo de teste:**
```python
# tests/unit/services/test_auth_service.py
import pytest
from app.services.auth_service import AuthService
from app.core.security import verify_password

@pytest.mark.asyncio
async def test_login_success(db_session):
    service = AuthService(db_session)
    result = await service.login("user@example.com", "password123")
    assert result.access_token is not None
    assert result.user.email == "user@example.com"

@pytest.mark.asyncio
async def test_login_wrong_password(db_session):
    service = AuthService(db_session)
    with pytest.raises(InvalidCredentialsError):
        await service.login("user@example.com", "wrong_password")
```

### Frontend (Jest + Testing Library)

```bash
# Rodar testes
pnpm test

# Watch mode
pnpm test:watch

# Cobertura
pnpm test:coverage
```

**Exemplo de teste:**
```typescript
// components/LoginForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { LoginForm } from './LoginForm'

describe('LoginForm', () => {
  it('renders login form', () => {
    render(<LoginForm />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('submits form with valid data', async () => {
    const onSubmit = jest.fn()
    render(<LoginForm onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'user@example.com' }
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' }
    })
    fireEvent.click(screen.getByText('Login'))

    expect(onSubmit).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123'
    })
  })
})
```

---

## ✅ Boas Práticas

### Git Workflow

**Branch naming:**
```
feature/user-authentication
bugfix/fix-login-error
hotfix/critical-security-patch
refactor/improve-database-queries
```

**Commits:**
```bash
# Formato: tipo(escopo): mensagem

git commit -m "feat(auth): add JWT authentication"
git commit -m "fix(api): resolve CORS issue"
git commit -m "docs(readme): update installation steps"
git commit -m "refactor(contacts): optimize query performance"
git commit -m "test(auth): add unit tests for login"
```

**Tipos:**
- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Documentação
- `style`: Formatação (não afeta código)
- `refactor`: Refatoração
- `test`: Testes
- `chore`: Manutenção

### Code Style

**Python (PEP 8 + Black):**
- Linhas: max 100 caracteres
- Imports: isort
- Type hints sempre que possível
- Docstrings em funções públicas

**TypeScript:**
- ESLint + Prettier
- Functional components (React)
- Named exports (não default)
- Tipos explícitos

### Segurança

- **NUNCA** commitar .env
- **NUNCA** commitar secrets/tokens
- Usar variáveis de ambiente
- Validar input do usuário
- Sanitizar dados
- Rate limiting em endpoints sensíveis
- CORS configurado corretamente

### Performance

- Usar índices no banco
- Cache com Redis
- Lazy loading (frontend)
- Pagination em listas
- Otimizar queries (N+1)
- Code splitting (Next.js)

---

## 🎨 Chatbot Builder (React Flow)

### Biblioteca: React Flow

**Instalação:**
```bash
cd frontend
pnpm add reactflow
```

**Documentação:** https://reactflow.dev

### Estrutura do Builder

```
frontend/components/chatbot/FlowEditor/
├── Canvas.tsx              # Componente principal
├── Toolbar.tsx             # Toolbar com ações
├── Sidebar.tsx             # Sidebar com paleta de nós
├── NodeTypes/
│   ├── StartNode.tsx
│   ├── MessageNode.tsx
│   ├── QuestionNode.tsx
│   ├── ConditionNode.tsx
│   ├── ActionNode.tsx
│   ├── ApiCallNode.tsx
│   ├── AiPromptNode.tsx
│   ├── JumpNode.tsx
│   ├── EndNode.tsx
│   └── HandoffNode.tsx
├── Edges/
│   └── CustomEdge.tsx
├── Panels/
│   ├── MiniMap.tsx
│   ├── Controls.tsx
│   └── Background.tsx
└── NodeConfigPanel.tsx     # Painel de configuração do nó
```

### Implementação Básica

**Canvas.tsx:**
```typescript
'use client'

import { useCallback, useState } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node
} from 'reactflow'
import 'reactflow/dist/style.css'

import { nodeTypes } from './NodeTypes'
import { Toolbar } from './Toolbar'
import { Sidebar } from './Sidebar'

export function FlowCanvas({ flowId }: { flowId: string }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
  }, [])

  const onSave = useCallback(async () => {
    const flowData = {
      nodes,
      edges
    }

    // Salvar no backend
    await fetch(`/api/flows/${flowId}`, {
      method: 'PATCH',
      body: JSON.stringify({ canvas_data: flowData })
    })
  }, [nodes, edges, flowId])

  return (
    <div className="flex h-screen">
      <Sidebar onAddNode={(type) => {
        // Adicionar novo nó
        const newNode = {
          id: `${type}-${Date.now()}`,
          type,
          position: { x: 250, y: 250 },
          data: { label: type }
        }
        setNodes((nds) => [...nds, newNode])
      }} />

      <div className="flex-1">
        <Toolbar onSave={onSave} />

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      {selectedNode && (
        <NodeConfigPanel
          node={selectedNode}
          onUpdate={(data) => {
            setNodes((nds) =>
              nds.map((n) =>
                n.id === selectedNode.id
                  ? { ...n, data: { ...n.data, ...data } }
                  : n
              )
            )
          }}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  )
}
```

### Tipos de Nós Customizados

**MessageNode.tsx:**
```typescript
import { Handle, Position, NodeProps } from 'reactflow'
import { MessageSquare } from 'lucide-react'

export function MessageNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 bg-white shadow-lg min-w-[200px]
        ${selected ? 'border-blue-500' : 'border-gray-300'}
      `}
    >
      <Handle type="target" position={Position.Top} />

      <div className="flex items-center gap-2 mb-2">
        <MessageSquare className="w-4 h-4 text-blue-500" />
        <span className="font-semibold text-sm">Mensagem</span>
      </div>

      <div className="text-xs text-gray-600">
        {data.content?.text || 'Configure a mensagem'}
      </div>

      {data.buttons && data.buttons.length > 0 && (
        <div className="mt-2 space-y-1">
          {data.buttons.map((btn: any, idx: number) => (
            <div key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
              {btn.text}
            </div>
          ))}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}
```

**QuestionNode.tsx:**
```typescript
import { Handle, Position, NodeProps } from 'reactflow'
import { HelpCircle } from 'lucide-react'

export function QuestionNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 bg-white shadow-lg min-w-[200px]
        ${selected ? 'border-purple-500' : 'border-gray-300'}
      `}
    >
      <Handle type="target" position={Position.Top} />

      <div className="flex items-center gap-2 mb-2">
        <HelpCircle className="w-4 h-4 text-purple-500" />
        <span className="font-semibold text-sm">Pergunta</span>
      </div>

      <div className="text-xs text-gray-600 mb-2">
        {data.question || 'Digite sua pergunta'}
      </div>

      <div className="text-xs text-gray-500">
        Salvar em: <code className="bg-gray-100 px-1">{data.variable || 'variavel'}</code>
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}
```

**ConditionNode.tsx:**
```typescript
import { Handle, Position, NodeProps } from 'reactflow'
import { GitBranch } from 'lucide-react'

export function ConditionNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 bg-white shadow-lg min-w-[200px]
        ${selected ? 'border-yellow-500' : 'border-gray-300'}
      `}
    >
      <Handle type="target" position={Position.Top} />

      <div className="flex items-center gap-2 mb-2">
        <GitBranch className="w-4 h-4 text-yellow-500" />
        <span className="font-semibold text-sm">Condição</span>
      </div>

      <div className="text-xs text-gray-600">
        Se {data.variable || 'variavel'} {data.operator || '=='} {data.value || 'valor'}
      </div>

      <div className="flex justify-between mt-3">
        <div className="text-xs text-green-600">✓ Sim</div>
        <div className="text-xs text-red-600">✗ Não</div>
      </div>

      <Handle type="source" position={Position.Bottom} id="true" style={{ left: '30%' }} />
      <Handle type="source" position={Position.Bottom} id="false" style={{ left: '70%' }} />
    </div>
  )
}
```

### Registrar Tipos de Nós

**NodeTypes/index.ts:**
```typescript
import { NodeTypes } from 'reactflow'
import { StartNode } from './StartNode'
import { MessageNode } from './MessageNode'
import { QuestionNode } from './QuestionNode'
import { ConditionNode } from './ConditionNode'
import { ActionNode } from './ActionNode'
import { ApiCallNode } from './ApiCallNode'
import { AiPromptNode } from './AiPromptNode'
import { JumpNode } from './JumpNode'
import { EndNode } from './EndNode'
import { HandoffNode } from './HandoffNode'

export const nodeTypes: NodeTypes = {
  start: StartNode,
  message: MessageNode,
  question: QuestionNode,
  condition: ConditionNode,
  action: ActionNode,
  api_call: ApiCallNode,
  ai_prompt: AiPromptNode,
  jump: JumpNode,
  end: EndNode,
  handoff: HandoffNode
}
```

### Formato de Dados (Salvo no DB)

```typescript
interface FlowData {
  nodes: Array<{
    id: string
    type: 'start' | 'message' | 'question' | 'condition' | 'action' | 'api_call' | 'ai_prompt' | 'jump' | 'end' | 'handoff'
    position: { x: number; y: number }
    data: {
      label?: string
      // Campos específicos por tipo de nó
      [key: string]: any
    }
  }>
  edges: Array<{
    id: string
    source: string
    target: string
    sourceHandle?: string
    targetHandle?: string
  }>
}
```

**Exemplo:**
```json
{
  "nodes": [
    {
      "id": "start-1",
      "type": "start",
      "position": { "x": 250, "y": 0 },
      "data": { "label": "Início" }
    },
    {
      "id": "message-2",
      "type": "message",
      "position": { "x": 250, "y": 150 },
      "data": {
        "label": "Saudação",
        "content": {
          "text": "Olá {{name}}! Como posso ajudar?",
          "buttons": [
            { "id": "btn1", "text": "Vendas" },
            { "id": "btn2", "text": "Suporte" }
          ]
        }
      }
    }
  ],
  "edges": [
    {
      "id": "e1-2",
      "source": "start-1",
      "target": "message-2"
    }
  ]
}
```

### Features Essenciais

**Undo/Redo:**
```typescript
import { useReactFlow } from 'reactflow'

const { setNodes, setEdges } = useReactFlow()
const [history, setHistory] = useState<FlowData[]>([])
const [currentIndex, setCurrentIndex] = useState(0)

const undo = () => {
  if (currentIndex > 0) {
    const prevState = history[currentIndex - 1]
    setNodes(prevState.nodes)
    setEdges(prevState.edges)
    setCurrentIndex(currentIndex - 1)
  }
}

const redo = () => {
  if (currentIndex < history.length - 1) {
    const nextState = history[currentIndex + 1]
    setNodes(nextState.nodes)
    setEdges(nextState.edges)
    setCurrentIndex(currentIndex + 1)
  }
}
```

**Validação de Fluxo:**
```typescript
function validateFlow(nodes: Node[], edges: Edge[]): string[] {
  const errors: string[] = []

  // Verificar se tem Start node
  const hasStart = nodes.some(n => n.type === 'start')
  if (!hasStart) {
    errors.push('Fluxo deve ter um nó Start')
  }

  // Verificar nós sem conexão
  const connectedNodes = new Set<string>()
  edges.forEach(e => {
    connectedNodes.add(e.source)
    connectedNodes.add(e.target)
  })

  nodes.forEach(n => {
    if (n.type !== 'start' && !connectedNodes.has(n.id)) {
      errors.push(`Nó "${n.data.label}" não está conectado`)
    }
  })

  return errors
}
```

---

## 🔗 Links Úteis

- **FastAPI Docs**: https://fastapi.tiangolo.com
- **Next.js Docs**: https://nextjs.org/docs
- **SQLAlchemy**: https://docs.sqlalchemy.org
- **Pydantic**: https://docs.pydantic.dev
- **React Query**: https://tanstack.com/query
- **Zustand**: https://zustand-demo.pmnd.rs
- **Shadcn/UI**: https://ui.shadcn.com
- **React Flow**: https://reactflow.dev

---

**Versão:** 1.0.1
**Última atualização:** 2025-10-03
