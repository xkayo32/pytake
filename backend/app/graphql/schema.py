"""
Main GraphQL Schema
Combines all queries, mutations, and subscriptions
"""

import strawberry
from strawberry.fastapi import GraphQLRouter

from app.graphql.queries.auth import AuthQuery
from app.graphql.mutations.auth import AuthMutation


@strawberry.type
class Query(AuthQuery):
    """
    Root Query type
    Combines all query types from different modules
    """
    pass


@strawberry.type
class Mutation(AuthMutation):
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
