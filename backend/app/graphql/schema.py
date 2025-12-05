"""
Main GraphQL Schema
Combines all queries, mutations, and subscriptions
"""

import strawberry
from strawberry.fastapi import GraphQLRouter

from app.graphql.queries.auth import AuthQuery
from app.graphql.queries.organization import OrganizationQuery
from app.graphql.queries.user import UserQuery
from app.graphql.mutations.auth import AuthMutation
from app.graphql.mutations.organization import OrganizationMutation
from app.graphql.mutations.user import UserMutation


@strawberry.type
class Query(AuthQuery, OrganizationQuery, UserQuery):
    """
    Root Query type
    Combines all query types from different modules
    """
    pass


@strawberry.type
class Mutation(AuthMutation, OrganizationMutation, UserMutation):
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
