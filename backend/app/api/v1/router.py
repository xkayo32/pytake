"""
API v1 Router
Combines all v1 endpoints
"""

from fastapi import APIRouter

from app.api.v1.endpoints import auth, organizations, users, contacts, conversations, whatsapp, chatbots, campaigns, analytics

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(organizations.router, prefix="/organizations", tags=["Organizations"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(contacts.router, prefix="/contacts", tags=["Contacts"])
api_router.include_router(conversations.router, prefix="/conversations", tags=["Conversations"])
api_router.include_router(whatsapp.router, prefix="/whatsapp", tags=["WhatsApp"])
api_router.include_router(chatbots.router, prefix="/chatbots", tags=["Chatbots"])
api_router.include_router(campaigns.router, prefix="/campaigns", tags=["Campaigns"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])

# Future routers will be added here:
# api_router.include_router(chatbots.router, prefix="/chatbots", tags=["Chatbots"])
# api_router.include_router(conversations.router, prefix="/conversations", tags=["Conversations"])
# api_router.include_router(contacts.router, prefix="/contacts", tags=["Contacts"])
# api_router.include_router(campaigns.router, prefix="/campaigns", tags=["Campaigns"])
# api_router.include_router(webhooks.router, prefix="/webhooks", tags=["Webhooks"])
