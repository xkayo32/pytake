# 🔧 Chatbot Builder - Guia de Implementação Técnica

## 📋 Índice

1. [Sistema de Secrets](#sistema-de-secrets)
2. [Componente LLM Agent](#componente-llm-agent)
3. [Componente Database Query](#componente-database-query)
4. [Sistema de Variáveis](#sistema-de-variáveis)
5. [Editor de Propriedades Dinâmico](#editor-de-propriedades)

---

## 🔐 Sistema de Secrets

### 1.1 Schema do Banco de Dados

```python
# backend/app/models/secret.py
from sqlalchemy import Column, String, UUID, Boolean, Text, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB
from app.models.base import Base, TimestampMixin
import enum

class SecretScope(str, enum.Enum):
    ORGANIZATION = "organization"  # Disponível para toda org
    CHATBOT = "chatbot"            # Apenas para um chatbot específico

class Secret(Base, TimestampMixin):
    __tablename__ = "secrets"

    id = Column(UUID, primary_key=True, server_default=text("gen_random_uuid()"))
    organization_id = Column(UUID, ForeignKey("organizations.id"), nullable=False)
    chatbot_id = Column(UUID, ForeignKey("chatbots.id"), nullable=True)  # Null = org-wide

    name = Column(String(255), nullable=False)  # Ex: "openai_api_key"
    display_name = Column(String(255), nullable=False)  # Ex: "OpenAI API Key"
    description = Column(Text, nullable=True)

    # Valor criptografado com Fernet (symmetric encryption)
    encrypted_value = Column(Text, nullable=False)

    scope = Column(SQLEnum(SecretScope), default=SecretScope.CHATBOT)
    is_active = Column(Boolean, default=True)

    # Metadata
    metadata = Column(JSONB, default={})  # Tags, categoria, etc.

    # Audit
    last_used_at = Column(DateTime, nullable=True)
    usage_count = Column(Integer, default=0)
```

### 1.2 Migração

```bash
# Criar migração
alembic revision --autogenerate -m "add_secrets_table"

# Migration file
"""add_secrets_table

Revision ID: xxxx
Revises: yyyy
Create Date: 2025-01-12

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

def upgrade():
    op.create_table(
        'secrets',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('chatbot_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('display_name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('encrypted_value', sa.Text(), nullable=False),
        sa.Column('scope', sa.Enum('organization', 'chatbot', name='secretscope'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('last_used_at', sa.DateTime(), nullable=True),
        sa.Column('usage_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['chatbot_id'], ['chatbots.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Indexes
    op.create_index('ix_secrets_organization_id', 'secrets', ['organization_id'])
    op.create_index('ix_secrets_chatbot_id', 'secrets', ['chatbot_id'])
    op.create_index('ix_secrets_name', 'secrets', ['name'])

    # Unique constraint: name único por organização/chatbot
    op.create_unique_constraint(
        'uq_secrets_org_chatbot_name',
        'secrets',
        ['organization_id', 'chatbot_id', 'name']
    )

def downgrade():
    op.drop_table('secrets')
    op.execute('DROP TYPE secretscope')
```

### 1.3 Serviço de Criptografia

```python
# backend/app/core/encryption.py
from cryptography.fernet import Fernet
from app.core.config import settings
import base64

class EncryptionService:
    def __init__(self):
        # Gerar chave: Fernet.generate_key()
        # Armazenar em variável de ambiente: ENCRYPTION_KEY
        self.cipher = Fernet(settings.ENCRYPTION_KEY.encode())

    def encrypt(self, plaintext: str) -> str:
        """Criptografa um texto usando Fernet"""
        encrypted = self.cipher.encrypt(plaintext.encode())
        return base64.b64encode(encrypted).decode()

    def decrypt(self, encrypted_text: str) -> str:
        """Descriptografa um texto"""
        encrypted_bytes = base64.b64decode(encrypted_text.encode())
        decrypted = self.cipher.decrypt(encrypted_bytes)
        return decrypted.decode()

# Singleton
encryption_service = EncryptionService()
```

### 1.4 Repository

```python
# backend/app/repositories/secret.py
from typing import List, Optional
from uuid import UUID
from app.repositories.base import BaseRepository
from app.models.secret import Secret, SecretScope

class SecretRepository(BaseRepository[Secret]):
    async def get_by_name(
        self,
        organization_id: UUID,
        name: str,
        chatbot_id: Optional[UUID] = None
    ) -> Optional[Secret]:
        """Busca secret por nome"""
        filters = {
            "organization_id": organization_id,
            "name": name,
            "is_active": True
        }
        if chatbot_id:
            filters["chatbot_id"] = chatbot_id

        result = await self.db.execute(
            select(Secret).filter_by(**filters)
        )
        return result.scalar_one_or_none()

    async def list_available(
        self,
        organization_id: UUID,
        chatbot_id: Optional[UUID] = None
    ) -> List[Secret]:
        """Lista secrets disponíveis (org-wide + específicos do chatbot)"""
        query = select(Secret).where(
            Secret.organization_id == organization_id,
            Secret.is_active == True,
            or_(
                Secret.scope == SecretScope.ORGANIZATION,
                Secret.chatbot_id == chatbot_id
            )
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())
```

### 1.5 Service

```python
# backend/app/services/secret_service.py
from typing import List, Optional
from uuid import UUID
from app.repositories.secret import SecretRepository
from app.core.encryption import encryption_service
from app.schemas.secret import SecretCreate, SecretUpdate, SecretInDB, SecretWithoutValue

class SecretService:
    def __init__(self, db: AsyncSession):
        self.repository = SecretRepository(Secret, db)

    async def create_secret(
        self,
        organization_id: UUID,
        data: SecretCreate
    ) -> SecretInDB:
        """Cria um novo secret"""
        # Verificar se já existe
        existing = await self.repository.get_by_name(
            organization_id,
            data.name,
            data.chatbot_id
        )
        if existing:
            raise ValueError("Secret com este nome já existe")

        # Criptografar valor
        encrypted_value = encryption_service.encrypt(data.value)

        # Criar
        secret = await self.repository.create({
            "organization_id": organization_id,
            "chatbot_id": data.chatbot_id,
            "name": data.name,
            "display_name": data.display_name,
            "description": data.description,
            "encrypted_value": encrypted_value,
            "scope": data.scope,
            "metadata": data.metadata or {}
        })
        return SecretInDB.model_validate(secret)

    async def get_decrypted_value(
        self,
        secret_id: UUID,
        organization_id: UUID
    ) -> str:
        """Retorna valor descriptografado (uso interno)"""
        secret = await self.repository.get(secret_id)
        if not secret or secret.organization_id != organization_id:
            raise ValueError("Secret não encontrado")

        # Atualizar estatísticas de uso
        await self.repository.update(secret_id, {
            "last_used_at": datetime.utcnow(),
            "usage_count": secret.usage_count + 1
        })

        return encryption_service.decrypt(secret.encrypted_value)

    async def list_secrets(
        self,
        organization_id: UUID,
        chatbot_id: Optional[UUID] = None
    ) -> List[SecretWithoutValue]:
        """Lista secrets (sem expor valores)"""
        secrets = await self.repository.list_available(
            organization_id,
            chatbot_id
        )
        return [
            SecretWithoutValue.model_validate(s)
            for s in secrets
        ]
```

### 1.6 Schemas

```python
# backend/app/schemas/secret.py
from pydantic import BaseModel, Field
from typing import Optional, Dict
from uuid import UUID
from datetime import datetime
from app.models.secret import SecretScope

class SecretBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    display_name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    scope: SecretScope = SecretScope.CHATBOT
    metadata: Optional[Dict] = None

class SecretCreate(SecretBase):
    value: str = Field(..., min_length=1)  # Valor em plaintext
    chatbot_id: Optional[UUID] = None

class SecretUpdate(BaseModel):
    display_name: Optional[str] = None
    description: Optional[str] = None
    value: Optional[str] = None  # Se fornecido, re-criptografa
    is_active: Optional[bool] = None
    metadata: Optional[Dict] = None

class SecretWithoutValue(SecretBase):
    """Schema para listar secrets (sem expor valor)"""
    id: UUID
    organization_id: UUID
    chatbot_id: Optional[UUID]
    is_active: bool
    last_used_at: Optional[datetime]
    usage_count: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class SecretInDB(SecretWithoutValue):
    """Schema interno (inclui encrypted_value)"""
    encrypted_value: str
```

### 1.7 API Endpoints

```python
# backend/app/api/v1/endpoints/secrets.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.services.secret_service import SecretService
from app.schemas.secret import SecretCreate, SecretUpdate, SecretWithoutValue

router = APIRouter()

@router.post("/", response_model=SecretWithoutValue)
async def create_secret(
    data: SecretCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Criar novo secret"""
    service = SecretService(db)
    return await service.create_secret(current_user.organization_id, data)

@router.get("/", response_model=List[SecretWithoutValue])
async def list_secrets(
    chatbot_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Listar secrets disponíveis"""
    service = SecretService(db)
    return await service.list_secrets(
        current_user.organization_id,
        chatbot_id
    )

@router.get("/{secret_id}", response_model=SecretWithoutValue)
async def get_secret(
    secret_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obter detalhes do secret (sem valor)"""
    service = SecretService(db)
    # ... implementar

@router.put("/{secret_id}", response_model=SecretWithoutValue)
async def update_secret(
    secret_id: UUID,
    data: SecretUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Atualizar secret"""
    # ... implementar

@router.delete("/{secret_id}")
async def delete_secret(
    secret_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Deletar secret"""
    # ... implementar
```

### 1.8 Frontend - Types

```typescript
// frontend/src/types/secret.ts

export type SecretScope = 'organization' | 'chatbot';

export interface Secret {
  id: string;
  organization_id: string;
  chatbot_id: string | null;
  name: string;
  display_name: string;
  description: string | null;
  scope: SecretScope;
  is_active: boolean;
  metadata: Record<string, any>;
  last_used_at: string | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface SecretCreate {
  name: string;
  display_name: string;
  description?: string;
  value: string;  // Plaintext, backend irá criptografar
  scope: SecretScope;
  chatbot_id?: string | null;
  metadata?: Record<string, any>;
}

export interface SecretUpdate {
  display_name?: string;
  description?: string;
  value?: string;
  is_active?: boolean;
  metadata?: Record<string, any>;
}
```

### 1.9 Frontend - API

```typescript
// frontend/src/lib/api/secrets.ts
import { api } from '../api';
import type { Secret, SecretCreate, SecretUpdate } from '@/types/secret';

export const secretsAPI = {
  list: async (chatbotId?: string) => {
    const params = chatbotId ? { chatbot_id: chatbotId } : {};
    const response = await api.get<Secret[]>('/secrets', { params });
    return response.data;
  },

  get: async (id: string) => {
    const response = await api.get<Secret>(`/secrets/${id}`);
    return response.data;
  },

  create: async (data: SecretCreate) => {
    const response = await api.post<Secret>('/secrets', data);
    return response.data;
  },

  update: async (id: string, data: SecretUpdate) => {
    const response = await api.put<Secret>(`/secrets/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    await api.delete(`/secrets/${id}`);
  },
};
```

### 1.10 Frontend - Componente Selector

```typescript
// frontend/src/components/builder/SecretSelector.tsx
'use client';

import { useEffect, useState } from 'react';
import { secretsAPI } from '@/lib/api/secrets';
import type { Secret } from '@/types/secret';
import { Key, Plus } from 'lucide-react';

interface SecretSelectorProps {
  value: string | null;
  onChange: (secretId: string | null) => void;
  chatbotId?: string;
  label?: string;
  placeholder?: string;
}

export function SecretSelector({
  value,
  onChange,
  chatbotId,
  label = 'API Key',
  placeholder = 'Selecione uma chave'
}: SecretSelectorProps) {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadSecrets();
  }, [chatbotId]);

  const loadSecrets = async () => {
    try {
      setIsLoading(true);
      const data = await secretsAPI.list(chatbotId);
      setSecrets(data);
    } catch (error) {
      console.error('Erro ao carregar secrets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>
      <div className="flex gap-2">
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value || null)}
          className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        >
          <option value="">{placeholder}</option>
          {secrets.map((secret) => (
            <option key={secret.id} value={secret.id}>
              {secret.display_name}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          title="Adicionar nova chave"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Modal de criação */}
      {showCreateModal && (
        <CreateSecretModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            loadSecrets();
            setShowCreateModal(false);
          }}
          chatbotId={chatbotId}
        />
      )}
    </div>
  );
}
```

---

## 🤖 Componente LLM Agent

### 2.1 Configuração do LangChain

```bash
# backend/requirements.txt
langchain==0.1.0
langchain-openai==0.0.5
langchain-anthropic==0.1.0
langchain-google-genai==0.0.6
langchain-community==0.0.20
```

### 2.2 Estrutura de Providers

```python
# backend/app/integrations/llm/providers.py
from enum import Enum
from typing import Dict, List

class LLMProvider(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"
    GROQ = "groq"
    AZURE = "azure"
    CUSTOM = "custom"

# Modelos por provider
PROVIDER_MODELS: Dict[LLMProvider, List[str]] = {
    LLMProvider.OPENAI: [
        "gpt-4-turbo",
        "gpt-4-turbo-preview",
        "gpt-4",
        "gpt-3.5-turbo",
        "gpt-3.5-turbo-16k",
    ],
    LLMProvider.ANTHROPIC: [
        "claude-3-5-sonnet-20241022",
        "claude-3-opus-20240229",
        "claude-3-sonnet-20240229",
        "claude-3-haiku-20240307",
    ],
    LLMProvider.GOOGLE: [
        "gemini-1.5-pro",
        "gemini-1.5-flash",
        "gemini-pro",
    ],
    LLMProvider.GROQ: [
        "llama3-70b-8192",
        "llama3-8b-8192",
        "mixtral-8x7b-32768",
        "gemma-7b-it",
    ],
    LLMProvider.AZURE: [
        "gpt-4",
        "gpt-35-turbo",
    ],
}

def get_models_for_provider(provider: LLMProvider) -> List[str]:
    """Retorna lista de modelos para um provider"""
    return PROVIDER_MODELS.get(provider, [])
```

### 2.3 Executor LLM

```python
# backend/app/integrations/llm/executor.py
from typing import Dict, Any, Optional, List
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.memory import ConversationBufferMemory
from langchain.chains import ConversationChain
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from app.services.secret_service import SecretService
from app.integrations.llm.providers import LLMProvider

class LLMAgentExecutor:
    def __init__(
        self,
        db: AsyncSession,
        organization_id: UUID,
        config: Dict[str, Any]
    ):
        self.db = db
        self.organization_id = organization_id
        self.config = config
        self.secret_service = SecretService(db)
        self.llm = None
        self.chain = None

    async def initialize(self):
        """Inicializa o LLM com as configurações"""
        # Buscar API key
        api_key = await self.secret_service.get_decrypted_value(
            self.config['api_key_secret_id'],
            self.organization_id
        )

        # Criar instância do LLM
        provider = LLMProvider(self.config['provider'])
        model = self.config['model']

        if provider == LLMProvider.OPENAI:
            self.llm = ChatOpenAI(
                model=model,
                api_key=api_key,
                temperature=self.config.get('temperature', 0.7),
                max_tokens=self.config.get('max_tokens', 1000),
            )
        elif provider == LLMProvider.ANTHROPIC:
            self.llm = ChatAnthropic(
                model=model,
                api_key=api_key,
                temperature=self.config.get('temperature', 0.7),
                max_tokens=self.config.get('max_tokens', 1000),
            )
        elif provider == LLMProvider.GOOGLE:
            self.llm = ChatGoogleGenerativeAI(
                model=model,
                google_api_key=api_key,
                temperature=self.config.get('temperature', 0.7),
                max_output_tokens=self.config.get('max_tokens', 1000),
            )
        # ... outros providers

        # Criar chain com memória
        memory = ConversationBufferMemory(
            return_messages=True,
            memory_key="chat_history"
        )

        prompt = ChatPromptTemplate.from_messages([
            ("system", self.config['system_prompt']),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}")
        ])

        self.chain = ConversationChain(
            llm=self.llm,
            memory=memory,
            prompt=prompt
        )

    async def execute(
        self,
        user_input: str,
        context: Optional[Dict] = None,
        history: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """Executa o agente LLM"""
        if not self.llm:
            await self.initialize()

        try:
            # Adicionar histórico se fornecido
            if history and self.config.get('include_history'):
                for msg in history[-self.config.get('history_length', 10):]:
                    if msg['role'] == 'user':
                        self.chain.memory.chat_memory.add_user_message(msg['content'])
                    else:
                        self.chain.memory.chat_memory.add_ai_message(msg['content'])

            # Executar
            response = await self.chain.ainvoke({
                "input": user_input,
                **context or {}
            })

            return {
                "success": True,
                "response": response['response'],
                "tokens_used": response.get('tokens_used'),
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "fallback_message": self.config.get('fallback_message')
            }
```

### 2.4 Integração no Executor de Fluxos

```python
# backend/app/services/chatbot_execution_service.py
from app.integrations.llm.executor import LLMAgentExecutor

class ChatbotExecutionService:
    async def execute_node(self, node: Dict, context: Dict) -> Dict:
        """Executa um nó do fluxo"""
        node_type = node['data']['nodeType']

        if node_type == 'llm_agent':
            return await self._execute_llm_agent(node, context)
        # ... outros tipos de nó

    async def _execute_llm_agent(self, node: Dict, context: Dict) -> Dict:
        """Executa nó LLM Agent"""
        config = node['data']['config']

        executor = LLMAgentExecutor(
            db=self.db,
            organization_id=context['organization_id'],
            config=config
        )

        # Obter input do usuário
        user_input = context.get('last_user_message', '')

        # Executar
        result = await executor.execute(
            user_input=user_input,
            context=context,
            history=context.get('conversation_history')
        )

        # Armazenar resultado em variável
        if result['success']:
            context['variables'][config['output_variable']] = result['response']

        return result
```

---

## 📊 Componente Database Query

### 3.1 Modelo de Conexão

```python
# backend/app/models/database_connection.py
from sqlalchemy import Column, String, UUID, Boolean, Text, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB
from app.models.base import Base, TimestampMixin
import enum

class DatabaseType(str, enum.Enum):
    POSTGRESQL = "postgresql"
    MYSQL = "mysql"
    MONGODB = "mongodb"
    SQLITE = "sqlite"

class DatabaseConnection(Base, TimestampMixin):
    __tablename__ = "database_connections"

    id = Column(UUID, primary_key=True, server_default=text("gen_random_uuid()"))
    organization_id = Column(UUID, ForeignKey("organizations.id"), nullable=False)

    name = Column(String(255), nullable=False)
    database_type = Column(SQLEnum(DatabaseType), nullable=False)

    # Connection details (podem conter refs a secrets)
    host = Column(String(255))
    port = Column(Integer)
    database_name = Column(String(255))
    username_secret_id = Column(UUID, ForeignKey("secrets.id"))
    password_secret_id = Column(UUID, ForeignKey("secrets.id"))

    # Connection string alternativa (para MongoDB, etc.)
    connection_string_secret_id = Column(UUID, ForeignKey("secrets.id"), nullable=True)

    # Options
    ssl_enabled = Column(Boolean, default=False)
    connection_options = Column(JSONB, default={})

    is_active = Column(Boolean, default=True)
```

### 3.2 Executor de Query

```python
# backend/app/integrations/database/query_executor.py
from sqlalchemy import create_engine, text
from pymongo import MongoClient
from typing import Dict, Any, List
import re

class DatabaseQueryExecutor:
    ALLOWED_COMMANDS = ['SELECT', 'INSERT', 'UPDATE', 'DELETE']
    MAX_ROWS = 1000
    TIMEOUT = 30  # segundos

    def __init__(self, connection: DatabaseConnection, secret_service: SecretService):
        self.connection = connection
        self.secret_service = secret_service

    async def execute_query(
        self,
        query: str,
        parameters: Dict[str, Any],
        organization_id: UUID
    ) -> Dict[str, Any]:
        """Executa query com validação de segurança"""
        # Validar query
        if not self._is_safe_query(query):
            raise ValueError("Query contém comandos não permitidos")

        # Substituir variáveis
        query = self._replace_variables(query, parameters)

        # Executar baseado no tipo de banco
        if self.connection.database_type == DatabaseType.POSTGRESQL:
            return await self._execute_sql(query, organization_id)
        elif self.connection.database_type == DatabaseType.MONGODB:
            return await self._execute_mongo(query, organization_id)
        # ... outros

    def _is_safe_query(self, query: str) -> bool:
        """Valida se query é segura"""
        query_upper = query.strip().upper()

        # Verificar comando
        command = query_upper.split()[0]
        if command not in self.ALLOWED_COMMANDS:
            return False

        # Verificar comandos perigosos
        dangerous = ['DROP', 'TRUNCATE', 'ALTER', 'CREATE', 'GRANT', 'REVOKE']
        for cmd in dangerous:
            if cmd in query_upper:
                return False

        return True

    async def _execute_sql(self, query: str, org_id: UUID) -> Dict:
        """Executa query SQL"""
        # Obter credenciais
        username = await self.secret_service.get_decrypted_value(
            self.connection.username_secret_id,
            org_id
        )
        password = await self.secret_service.get_decrypted_value(
            self.connection.password_secret_id,
            org_id
        )

        # Criar connection string
        conn_str = f"{self.connection.database_type}://{username}:{password}@{self.connection.host}:{self.connection.port}/{self.connection.database_name}"

        # Criar engine
        engine = create_engine(conn_str, pool_size=1, max_overflow=0)

        try:
            with engine.connect() as conn:
                result = conn.execute(text(query))

                if query.strip().upper().startswith('SELECT'):
                    rows = result.fetchmany(self.MAX_ROWS)
                    return {
                        "success": True,
                        "rows": [dict(row) for row in rows],
                        "row_count": len(rows)
                    }
                else:
                    conn.commit()
                    return {
                        "success": True,
                        "affected_rows": result.rowcount
                    }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
        finally:
            engine.dispose()
```

---

**Continua...**

Este guia cobre os componentes principais. Nos próximos passos, implementaremos:
- Editor de propriedades dinâmico
- Sistema de variáveis completo
- Validação visual de fluxos
- Testes end-to-end

---

**Próximos passos sugeridos:**
1. Implementar sistema de secrets completo
2. Criar componente LLM Agent funcional
3. Testar integração com OpenAI/Anthropic
4. Implementar componente Database Query
5. Criar editor de propriedades dinâmico

**Prioridade**: Sistema de Secrets → LLM Agent → Database Query
