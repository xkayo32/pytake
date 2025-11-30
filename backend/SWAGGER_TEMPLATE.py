"""
Template para enriquecer documentação Swagger em endpoints
Copie e adapte este template para cada endpoint
"""

# ============================================
# IMPORTS NECESSÁRIOS NO TOPO DO ARQUIVO
# ============================================

from fastapi import APIRouter, Depends, Query, status
from app.core.swagger_examples import (
    # Adicione os exemplos que precisa usar:
    CONTACT_EXAMPLES,
    CONVERSATION_EXAMPLES,
    MESSAGE_EXAMPLES,
    FLOW_EXAMPLES,
    WHATSAPP_EXAMPLES,
    AUTH_EXAMPLES,
    ERROR_EXAMPLES,
)

# Altere a tag conforme o tipo de endpoint
router = APIRouter(tags=["NomeCategoria"])


# ============================================
# TEMPLATE PARA GET (LISTAR COM PAGINAÇÃO)
# ============================================

@router.get(
    "/",
    response_model=List[YourModel],
    summary="Listar todos os itens",
    responses={
        200: {
            "description": "Lista de itens recuperada com sucesso",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "id": "550e8400-e29b-41d4-a716-446655440000",
                            "name": "Item 1",
                            "status": "active",
                            "created_at": "2025-11-30T10:00:00Z",
                        }
                    ]
                }
            },
        },
        401: {
            "description": "Não autenticado",
            "content": {
                "application/json": {
                    "example": ERROR_EXAMPLES["unauthorized"]
                }
            },
        },
    },
)
async def list_items(
    skip: int = Query(0, ge=0, description="Número de itens a pular"),
    limit: int = Query(100, ge=1, le=100, description="Número de itens a retornar"),
    query: Optional[str] = Query(None, description="Buscar por nome, email, etc"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    # Listar todos os itens

    **Retorna lista paginada de itens da organização.**

    ### Query Parameters:
    - **skip** (integer, padrão=0): Número de itens a pular
    - **limit** (integer, padrão=100): Número de itens (máx 100)
    - **query** (string, opcional): Termo de busca

    ### Response:
    Array de objetos com:
    - **id**: Identificador único (UUID)
    - **name**: Nome do item
    - **status**: Status (active, inactive, etc)
    - **created_at**: Data de criação (ISO 8601)

    ### Headers de Paginação:
    - `X-Total-Count`: Total de itens disponíveis
    - `X-Page`: Página atual
    - `X-Per-Page`: Itens por página

    ### Autenticação:
    Requer token de acesso válido

    ### Erros:
    - `401 Unauthorized`: Token inválido ou expirado

    ### Example cURL:
    ```bash
    curl -X GET "http://localhost:8000/api/v1/items?skip=0&limit=10" \\
      -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
    ```
    """
    service = YourService(db)
    return await service.list_items(
        organization_id=current_user.organization_id,
        query=query,
        skip=skip,
        limit=limit,
    )


# ============================================
# TEMPLATE PARA POST (CRIAR)
# ============================================

@router.post(
    "/",
    response_model=YourModel,
    status_code=status.HTTP_201_CREATED,
    summary="Criar novo item",
    responses={
        201: {
            "description": "Item criado com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "id": "550e8400-e29b-41d4-a716-446655440000",
                        "name": "Novo Item",
                        "status": "active",
                        "created_at": "2025-11-30T10:00:00Z",
                    }
                }
            },
        },
        400: {
            "description": "Erro de validação",
            "content": {
                "application/json": {
                    "example": ERROR_EXAMPLES["validation_error"]
                }
            },
        },
        401: {
            "description": "Não autenticado",
            "content": {
                "application/json": {
                    "example": ERROR_EXAMPLES["unauthorized"]
                }
            },
        },
    },
)
async def create_item(
    data: YourCreateSchema,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    # Criar novo item

    **Cria um novo item na organização.**

    ### Request Body:
    - **name** (string, obrigatório): Nome do item (máx 255 caracteres)
    - **description** (string, opcional): Descrição detalhada
    - **status** (string, opcional): Status inicial

    ### Response:
    Objeto item completo com:
    - **id**: ID único gerado
    - **name**: Nome fornecido
    - **description**: Descrição
    - **status**: Status (padrão: "active")
    - **created_at**: Timestamp de criação
    - **updated_at**: Timestamp de atualização

    ### Autenticação:
    Requer token de acesso válido

    ### Validação:
    - **name**: Obrigatório, máximo 255 caracteres
    - **description**: Opcional

    ### Erros:
    - `400 Bad Request`: Validação falhou
    - `401 Unauthorized`: Token inválido

    ### Example cURL:
    ```bash
    curl -X POST http://localhost:8000/api/v1/items \\
      -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \\
      -H "Content-Type: application/json" \\
      -d '{
        "name": "Meu Item",
        "description": "Descrição do item",
        "status": "active"
      }'
    ```
    """
    service = YourService(db)
    return await service.create_item(
        data=data,
        organization_id=current_user.organization_id,
    )


# ============================================
# TEMPLATE PARA GET BY ID
# ============================================

@router.get(
    "/{item_id}",
    response_model=YourModel,
    summary="Obter detalhes do item",
    responses={
        200: {
            "description": "Item recuperado",
            "content": {
                "application/json": {
                    "example": {
                        "id": "550e8400-e29b-41d4-a716-446655440000",
                        "name": "Item 1",
                        "description": "Descrição completa",
                        "status": "active",
                        "created_at": "2025-11-30T10:00:00Z",
                        "updated_at": "2025-11-30T10:00:00Z",
                    }
                }
            },
        },
        401: {
            "description": "Não autenticado",
            "content": {
                "application/json": {
                    "example": ERROR_EXAMPLES["unauthorized"]
                }
            },
        },
        404: {
            "description": "Item não encontrado",
            "content": {
                "application/json": {
                    "example": ERROR_EXAMPLES["not_found"]
                }
            },
        },
    },
)
async def get_item(
    item_id: UUID = Query(..., description="ID único do item"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    # Obter detalhes do item

    **Retorna todas as informações de um item específico.**

    ### Path Parameters:
    - **item_id** (UUID, obrigatório): Identificador único do item

    ### Response:
    Objeto item completo com todos os campos

    ### Autenticação:
    Requer token de acesso válido

    ### Erros:
    - `401 Unauthorized`: Token inválido
    - `404 Not Found`: Item não existe ou não pertence à organização

    ### Example cURL:
    ```bash
    curl -X GET http://localhost:8000/api/v1/items/550e8400-e29b-41d4-a716-446655440000 \\
      -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
    ```
    """
    service = YourService(db)
    return await service.get_by_id(
        item_id=item_id,
        organization_id=current_user.organization_id,
    )


# ============================================
# TEMPLATE PARA PUT (ATUALIZAR)
# ============================================

@router.put(
    "/{item_id}",
    response_model=YourModel,
    summary="Atualizar item",
    responses={
        200: {
            "description": "Item atualizado",
            "content": {
                "application/json": {
                    "example": {
                        "id": "550e8400-e29b-41d4-a716-446655440000",
                        "name": "Item Atualizado",
                        "status": "active",
                        "updated_at": "2025-11-30T11:00:00Z",
                    }
                }
            },
        },
        400: {
            "description": "Erro de validação",
            "content": {
                "application/json": {
                    "example": ERROR_EXAMPLES["validation_error"]
                }
            },
        },
        401: {
            "description": "Não autenticado",
            "content": {
                "application/json": {
                    "example": ERROR_EXAMPLES["unauthorized"]
                }
            },
        },
        404: {
            "description": "Item não encontrado",
            "content": {
                "application/json": {
                    "example": ERROR_EXAMPLES["not_found"]
                }
            },
        },
    },
)
async def update_item(
    item_id: UUID,
    data: YourUpdateSchema,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    # Atualizar item

    **Atualiza um ou mais campos do item.**

    ### Path Parameters:
    - **item_id** (UUID, obrigatório): ID do item a atualizar

    ### Request Body (todos opcionais):
    - **name** (string): Novo nome
    - **description** (string): Nova descrição
    - **status** (string): Novo status

    ### Response:
    Item atualizado com novos valores

    ### Autenticação:
    Requer token de acesso válido

    ### Erros:
    - `400 Bad Request`: Validação falhou
    - `401 Unauthorized`: Token inválido
    - `404 Not Found`: Item não encontrado

    ### Example cURL:
    ```bash
    curl -X PUT http://localhost:8000/api/v1/items/550e8400-e29b-41d4-a716-446655440000 \\
      -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \\
      -H "Content-Type: application/json" \\
      -d '{
        "name": "Novo Nome",
        "status": "inactive"
      }'
    ```
    """
    service = YourService(db)
    return await service.update_item(
        item_id=item_id,
        data=data,
        organization_id=current_user.organization_id,
    )


# ============================================
# TEMPLATE PARA DELETE
# ============================================

@router.delete(
    "/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Deletar item",
    responses={
        204: {
            "description": "Item deletado com sucesso (soft delete)",
        },
        401: {
            "description": "Não autenticado",
            "content": {
                "application/json": {
                    "example": ERROR_EXAMPLES["unauthorized"]
                }
            },
        },
        404: {
            "description": "Item não encontrado",
            "content": {
                "application/json": {
                    "example": ERROR_EXAMPLES["not_found"]
                }
            },
        },
    },
)
async def delete_item(
    item_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    # Deletar item

    **Deleta um item (soft delete - dados mantidos).**

    Items deletados ficam ocultos nas consultas normais mas podem ser restaurados.

    ### Path Parameters:
    - **item_id** (UUID, obrigatório): ID do item a deletar

    ### Response:
    Sem conteúdo (HTTP 204)

    ### Autenticação:
    Requer token de acesso válido

    ### Erros:
    - `401 Unauthorized`: Token inválido
    - `404 Not Found`: Item não encontrado

    ### Example cURL:
    ```bash
    curl -X DELETE http://localhost:8000/api/v1/items/550e8400-e29b-41d4-a716-446655440000 \\
      -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
    ```
    """
    service = YourService(db)
    await service.delete_item(
        item_id=item_id,
        organization_id=current_user.organization_id,
    )
    return None


# ============================================
# TEMPLATE PARA AÇÃO CUSTOMIZADA
# ============================================

@router.post(
    "/{item_id}/action",
    response_model=dict,
    summary="Executar ação no item",
    responses={
        200: {
            "description": "Ação executada com sucesso",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Ação concluída",
                        "data": {},
                    }
                }
            },
        },
        400: {
            "description": "Erro na ação",
            "content": {
                "application/json": {
                    "example": ERROR_EXAMPLES["validation_error"]
                }
            },
        },
        401: {
            "description": "Não autenticado",
            "content": {
                "application/json": {
                    "example": ERROR_EXAMPLES["unauthorized"]
                }
            },
        },
        404: {
            "description": "Item não encontrado",
            "content": {
                "application/json": {
                    "example": ERROR_EXAMPLES["not_found"]
                }
            },
        },
    },
)
async def perform_action(
    item_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    # Executar ação no item

    **Executa uma ação específica no item.**

    ### Path Parameters:
    - **item_id** (UUID, obrigatório): ID do item

    ### Response:
    - **success** (boolean): Se a ação foi bem-sucedida
    - **message** (string): Mensagem de resultado
    - **data** (object): Dados retornados pela ação

    ### Autenticação:
    Requer token de acesso válido

    ### Erros:
    - `400 Bad Request`: Ação não pode ser executada neste estado
    - `401 Unauthorized`: Token inválido
    - `404 Not Found`: Item não encontrado

    ### Example cURL:
    ```bash
    curl -X POST http://localhost:8000/api/v1/items/550e8400-e29b-41d4-a716-446655440000/action \\
      -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
    ```
    """
    service = YourService(db)
    result = await service.perform_action(
        item_id=item_id,
        organization_id=current_user.organization_id,
    )
    return {
        "success": True,
        "message": "Ação concluída com sucesso",
        "data": result,
    }
