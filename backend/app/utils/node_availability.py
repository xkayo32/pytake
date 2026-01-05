"""
Node availability based on WhatsApp connection type.

Defines which chatbot nodes are available for each WhatsApp connection type:
- official (Meta Cloud API)
- qrcode (Evolution API)
"""

from typing import List, Dict, Any


class NodeAvailability:
    """Manage node availability based on WhatsApp connection type."""

    # All available node types
    ALL_NODES = [
        "start",
        "message",
        "question",
        "condition",
        "end",
        "handoff",
        "delay",
        "jump",
        "action",
        "api_call",
        "ai_prompt",
        "database_query",
        "script",
        "set_variable",
        "random",
        "datetime",
        "analytics",
        "whatsapp_template",
        "interactive_buttons",
        "interactive_list",
    ]

    # Nodes that work on BOTH official and qrcode
    UNIVERSAL_NODES = [
        "start",
        "message",
        "question",
        "condition",
        "end",
        "handoff",
        "delay",
        "jump",
        "action",
        "api_call",
        "ai_prompt",
        "database_query",
        "script",
        "set_variable",
        "random",
        "datetime",
        "analytics",
    ]

    # Nodes EXCLUSIVE to Meta Cloud API (official)
    OFFICIAL_ONLY_NODES = [
        "whatsapp_template",  # Templates require Meta approval
    ]

    # Nodes that work but are EXPERIMENTAL on Evolution API
    EXPERIMENTAL_NODES = [
        "interactive_buttons",  # Works via Baileys (unofficial)
        "interactive_list",     # Works via Baileys (unofficial)
    ]

    @classmethod
    def get_available_nodes(cls, connection_type: str) -> List[str]:
        """
        Get list of available node types for a connection type.

        Args:
            connection_type: 'official' or 'qrcode'

        Returns:
            List of available node type strings
        """
        if connection_type == "official":
            # Official API supports ALL nodes
            return cls.ALL_NODES.copy()
        elif connection_type == "qrcode":
            # Evolution API supports universal + experimental nodes
            return cls.UNIVERSAL_NODES + cls.EXPERIMENTAL_NODES
        else:
            # Unknown connection type - return only universal nodes (safe)
            return cls.UNIVERSAL_NODES.copy()

    @classmethod
    def get_node_metadata(cls, connection_type: str) -> Dict[str, Dict[str, Any]]:
        """
        Get metadata for all nodes including availability and warnings.

        Args:
            connection_type: 'official' or 'qrcode'

        Returns:
            Dict with node_type as key and metadata as value
        """
        metadata = {}

        for node_type in cls.ALL_NODES:
            available = node_type in cls.get_available_nodes(connection_type)

            # Determine status
            if not available:
                status = "unavailable"
                warning = "Este node não está disponível para conexões Evolution API"
            elif node_type in cls.EXPERIMENTAL_NODES and connection_type == "qrcode":
                status = "experimental"
                warning = (
                    "Este node é experimental na Evolution API. "
                    "Funcionalidade pode ser limitada."
                )
            else:
                status = "available"
                warning = None

            metadata[node_type] = {
                "available": available,
                "status": status,
                "warning": warning,
                "connection_type": connection_type,
            }

        return metadata

    @classmethod
    def is_node_available(
        cls,
        node_type: str,
        connection_type: str
    ) -> bool:
        """
        Check if a specific node type is available for a connection type.

        Args:
            node_type: Type of node (e.g., 'whatsapp_template')
            connection_type: 'official' or 'qrcode'

        Returns:
            True if node is available, False otherwise
        """
        available_nodes = cls.get_available_nodes(connection_type)
        return node_type in available_nodes

    @classmethod
    def get_node_warning(
        cls,
        node_type: str,
        connection_type: str
    ) -> str | None:
        """
        Get warning message for a node type if applicable.

        Args:
            node_type: Type of node
            connection_type: 'official' or 'qrcode'

        Returns:
            Warning message or None
        """
        metadata = cls.get_node_metadata(connection_type)
        return metadata.get(node_type, {}).get("warning")


def get_available_nodes_for_number(connection_type: str) -> List[str]:
    """
    Helper function to get available nodes for a WhatsApp number.

    Args:
        connection_type: 'official' or 'qrcode'

    Returns:
        List of available node type strings
    """
    return NodeAvailability.get_available_nodes(connection_type)


def validate_node_compatibility(
    node_type: str,
    connection_type: str,
    raise_error: bool = True
) -> bool:
    """
    Validate if a node is compatible with a connection type.

    Args:
        node_type: Type of node to validate
        connection_type: 'official' or 'qrcode'
        raise_error: If True, raises ValueError on incompatibility

    Returns:
        True if compatible

    Raises:
        ValueError: If node is incompatible and raise_error=True
    """
    is_available = NodeAvailability.is_node_available(node_type, connection_type)
    
    if not is_available and raise_error:
        warning = NodeAvailability.get_node_warning(node_type, connection_type)
        raise ValueError(
            f"Node '{node_type}' não é compatível com '{connection_type}'. {warning}"
        )
    
    return is_available


def get_node_descriptions_for_ai() -> Dict[str, str]:
    """
    Get detailed descriptions of all node types for AI prompt generation.
    
    Returns:
        Dict mapping node_type to description string
    """
    return {
        "start": "Início do flow - Ponto de entrada do fluxo conversacional",
        "message": "Envia mensagem ao usuário - Texto simples ou com variáveis",
        "question": "Faz pergunta e armazena resposta em variável - Captura input do usuário",
        "condition": "Ramificação baseada em condições - if/else logic",
        "end": "Finaliza flow - Encerra a conversa",
        "handoff": "Transfere para atendente humano - Passa para queue ou departamento",
        "delay": "Pausa temporizada - Aguarda X segundos antes de continuar",
        "jump": "Navega para outro node ou flow - Redirecionamento",
        "action": "Executa ações (salvar contato, enviar email, webhook) - Side effects",
        "api_call": "Chama APIs externas - Integração com sistemas externos",
        "ai_prompt": "Usa IA para processar informações - GPT/Claude para análise",
        "database_query": "Consulta banco de dados - SELECT/INSERT/UPDATE queries",
        "script": "Executa código JavaScript - Lógica customizada",
        "set_variable": "Define ou atualiza variável - Manipulação de dados",
        "random": "Escolhe caminho aleatório - A/B testing ou variação",
        "datetime": "Trabalha com datas/horas - Agendamentos e validações temporais",
        "analytics": "Registra evento analítico - Tracking e métricas",
        "whatsapp_template": "Envia template aprovado pelo WhatsApp - Apenas Official API",
        "interactive_buttons": "Botões interativos WhatsApp (até 3 opções) - Apenas Official API",
        "interactive_list": "Lista interativa WhatsApp (4+ opções) - Apenas Official API",
    }
