"""
Main GraphQL Schema
Combines all queries, mutations, and subscriptions
"""

import strawberry
from strawberry.fastapi import GraphQLRouter

from app.graphql.queries.auth import AuthQuery
from app.graphql.queries.organization import OrganizationQuery
from app.graphql.queries.user import UserQuery
from app.graphql.queries.department import DepartmentQuery
from app.graphql.queries.queue import QueueQuery
from app.graphql.queries.contact import ContactQuery
from app.graphql.queries.conversation import ConversationQuery
from app.graphql.queries.whatsapp import WhatsAppQuery
from app.graphql.queries.chatbot import ChatbotQuery
from app.graphql.queries.campaign import CampaignQuery
from app.graphql.mutations.auth import AuthMutation
from app.graphql.mutations.organization import OrganizationMutation
from app.graphql.mutations.user import UserMutation
from app.graphql.mutations.department import DepartmentMutation
from app.graphql.mutations.queue import QueueMutation
from app.graphql.mutations.contact import ContactMutation
from app.graphql.mutations.conversation import ConversationMutation
from app.graphql.mutations.whatsapp import WhatsAppMutation
from app.graphql.mutations.chatbot import ChatbotMutation
from app.graphql.mutations.campaign import CampaignMutation


@strawberry.type
class Query(AuthQuery, OrganizationQuery, UserQuery, DepartmentQuery, QueueQuery, ContactQuery, ConversationQuery, WhatsAppQuery, ChatbotQuery, CampaignQuery):
    """
    Root Query type
    Combines all query types from different modules
    """
    pass


@strawberry.type
class Mutation(AuthMutation, OrganizationMutation, UserMutation, DepartmentMutation, QueueMutation, ContactMutation, ConversationMutation, WhatsAppMutation, ChatbotMutation, CampaignMutation):
    """
    Root Mutation type
    Combines all mutation types from different modules
    """
    pass


# Create the GraphQL schema
schema = strawberry.Schema(
    query=Query,
    mutation=Mutation,
    # subscription=Subscription,  # Will be added later
)
