"""
RBAC Seed Data - Permissions and System Roles
"""

# Lista de permissões do sistema
PERMISSIONS_SEED = [
    # Contatos
    {"name": "contacts:read", "category": "contacts", "description": "Visualizar contatos"},
    {"name": "contacts:create", "category": "contacts", "description": "Criar contatos"},
    {"name": "contacts:update", "category": "contacts", "description": "Editar contatos"},
    {"name": "contacts:delete", "category": "contacts", "description": "Excluir contatos"},

    # Conversas
    {"name": "conversations:read", "category": "conversations", "description": "Visualizar conversas"},
    {"name": "conversations:manage", "category": "conversations", "description": "Gerenciar conversas (atribuir, transferir)"},
    {"name": "conversations:close", "category": "conversations", "description": "Encerrar conversas"},

    # Mensagens
    {"name": "messages:read", "category": "messages", "description": "Visualizar mensagens"},
    {"name": "messages:create", "category": "messages", "description": "Enviar mensagens"},
    {"name": "messages:delete", "category": "messages", "description": "Excluir mensagens"},

    # Campanhas
    {"name": "campaigns:read", "category": "campaigns", "description": "Visualizar campanhas"},
    {"name": "campaigns:create", "category": "campaigns", "description": "Criar campanhas"},
    {"name": "campaigns:update", "category": "campaigns", "description": "Editar campanhas"},
    {"name": "campaigns:delete", "category": "campaigns", "description": "Excluir campanhas"},
    {"name": "campaigns:execute", "category": "campaigns", "description": "Executar/pausar campanhas"},

    # Chatbots / Flow Builder
    {"name": "chatbots:read", "category": "chatbots", "description": "Visualizar chatbots"},
    {"name": "chatbots:create", "category": "chatbots", "description": "Criar chatbots"},
    {"name": "chatbots:update", "category": "chatbots", "description": "Editar chatbots"},
    {"name": "chatbots:delete", "category": "chatbots", "description": "Excluir chatbots"},
    {"name": "chatbots:publish", "category": "chatbots", "description": "Publicar/ativar chatbots"},

    # Analytics / Relatórios
    {"name": "analytics:read", "category": "analytics", "description": "Visualizar relatórios"},
    {"name": "analytics:export", "category": "analytics", "description": "Exportar relatórios"},

    # Configurações
    {"name": "settings:read", "category": "settings", "description": "Visualizar configurações"},
    {"name": "settings:manage", "category": "settings", "description": "Gerenciar configurações da organização"},

    # Usuários / Equipe
    {"name": "users:read", "category": "users", "description": "Visualizar usuários"},
    {"name": "users:create", "category": "users", "description": "Convidar usuários"},
    {"name": "users:update", "category": "users", "description": "Editar usuários"},
    {"name": "users:delete", "category": "users", "description": "Remover usuários"},
    {"name": "users:manage_roles", "category": "users", "description": "Atribuir roles aos usuários"},

    # Roles
    {"name": "roles:read", "category": "roles", "description": "Visualizar roles"},
    {"name": "roles:create", "category": "roles", "description": "Criar roles"},
    {"name": "roles:update", "category": "roles", "description": "Editar roles"},
    {"name": "roles:delete", "category": "roles", "description": "Excluir roles"},
    {"name": "roles:manage_permissions", "category": "roles", "description": "Gerenciar permissões das roles"},

    # WhatsApp
    {"name": "whatsapp:read", "category": "whatsapp", "description": "Visualizar números WhatsApp"},
    {"name": "whatsapp:manage", "category": "whatsapp", "description": "Gerenciar conexões WhatsApp"},

    # Templates
    {"name": "templates:read", "category": "templates", "description": "Visualizar templates"},
    {"name": "templates:create", "category": "templates", "description": "Criar templates"},
    {"name": "templates:update", "category": "templates", "description": "Editar templates"},
    {"name": "templates:delete", "category": "templates", "description": "Excluir templates"},
]

# Roles do sistema com suas permissões
SYSTEM_ROLES = [
    {
        "name": "Super Admin",
        "description": "Acesso total ao sistema",
        "is_system": True,
        "permissions": [
            # Super admin tem todas as permissões
            "contacts:read", "contacts:create", "contacts:update", "contacts:delete",
            "conversations:read", "conversations:manage", "conversations:close",
            "messages:read", "messages:create", "messages:delete",
            "campaigns:read", "campaigns:create", "campaigns:update", "campaigns:delete", "campaigns:execute",
            "chatbots:read", "chatbots:create", "chatbots:update", "chatbots:delete", "chatbots:publish",
            "analytics:read", "analytics:export",
            "settings:read", "settings:manage",
            "users:read", "users:create", "users:update", "users:delete", "users:manage_roles",
            "roles:read", "roles:create", "roles:update", "roles:delete", "roles:manage_permissions",
            "whatsapp:read", "whatsapp:manage",
            "templates:read", "templates:create", "templates:update", "templates:delete",
        ]
    },
    {
        "name": "Admin",
        "description": "Administrador da organização",
        "is_system": True,
        "permissions": [
            # Admin tem tudo menos gerenciamento de sistema
            "contacts:read", "contacts:create", "contacts:update", "contacts:delete",
            "conversations:read", "conversations:manage", "conversations:close",
            "messages:read", "messages:create", "messages:delete",
            "campaigns:read", "campaigns:create", "campaigns:update", "campaigns:delete", "campaigns:execute",
            "chatbots:read", "chatbots:create", "chatbots:update", "chatbots:delete", "chatbots:publish",
            "analytics:read", "analytics:export",
            "settings:read", "settings:manage",
            "users:read", "users:create", "users:update", "users:delete", "users:manage_roles",
            "roles:read", "roles:create", "roles:update", "roles:delete", "roles:manage_permissions",
            "whatsapp:read", "whatsapp:manage",
            "templates:read", "templates:create", "templates:update", "templates:delete",
        ]
    },
    {
        "name": "Supervisor",
        "description": "Supervisor de atendimento",
        "is_system": True,
        "permissions": [
            "contacts:read", "contacts:create", "contacts:update",
            "conversations:read", "conversations:manage", "conversations:close",
            "messages:read", "messages:create",
            "analytics:read",
            "users:read",
            "templates:read",
        ]
    },
    {
        "name": "Agente",
        "description": "Agente de atendimento",
        "is_system": True,
        "permissions": [
            "contacts:read", "contacts:create", "contacts:update",
            "conversations:read", "conversations:manage",
            "messages:read", "messages:create",
            "templates:read",
        ]
    },
    {
        "name": "Visualizador",
        "description": "Apenas visualização",
        "is_system": True,
        "permissions": [
            "contacts:read",
            "conversations:read",
            "messages:read",
            "analytics:read",
        ]
    }
]
