"""Database query endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.database import (
    TestConnectionRequest,
    TestConnectionResponse,
    ExecuteQueryRequest,
    ExecuteQueryResponse,
    QueryResult,
)
from app.services.database_service import DatabaseService

router = APIRouter()


@router.post("/test-connection", response_model=TestConnectionResponse)
async def test_database_connection(
    request: TestConnectionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Test database connection.

    Validates connection configuration and attempts to connect to the database.

    - **PostgreSQL**: psycopg2-binary required
    - **MySQL**: pymysql required
    - **MongoDB**: pymongo required
    - **SQLite**: Built-in, no extra packages needed

    Returns connection status, time, and server version.
    """
    # Test connection
    success, message, connection_time, server_version = await DatabaseService.test_connection(
        request.config
    )

    return TestConnectionResponse(
        success=success,
        message=message,
        connection_time=connection_time,
        server_version=server_version,
    )


@router.post("/execute-query", response_model=ExecuteQueryResponse)
async def execute_database_query(
    request: ExecuteQueryRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Execute database query.

    Executes SQL or NoSQL queries against configured database.

    **Security Notes:**
    - Always use parameters for user input (prevents SQL injection)
    - Results limited to max_rows (default 1000, max 10000)
    - Query timeout enforced (1-300 seconds)
    - Credentials are not logged or cached

    **Cache:**
    - Enable cache for frequently accessed, rarely changing data
    - Cache TTL: 10 seconds to 24 hours
    - Cached results returned immediately

    **Query Types:**
    - **SELECT**: Returns data array
    - **INSERT/UPDATE/DELETE**: Returns affected row count
    - **CUSTOM**: Any valid SQL/NoSQL command

    **MongoDB Format:**
    ```json
    {
        "collection": "users",
        "operation": "find",
        "filter": {"age": {"$gt": 18}},
        "projection": {"name": 1, "email": 1}
    }
    ```

    **Returns:**
    - success: Query executed successfully
    - data: Array of result rows (SELECT only)
    - row_count: Number of rows affected/returned
    - execution_time: Query execution time in seconds
    - from_cache: Result served from cache
    """
    # Validate query type
    query_upper = request.query.strip().upper()

    # Warn about dangerous operations
    warnings = []

    if request.query_type == 'SELECT':
        if not query_upper.startswith('SELECT'):
            warnings.append("Query type is SELECT but query doesn't start with SELECT")

    if 'DROP ' in query_upper or 'TRUNCATE ' in query_upper:
        return ExecuteQueryResponse(
            result=QueryResult(
                success=False,
                execution_time=0,
                error="DROP and TRUNCATE operations are not allowed for security reasons"
            )
        )

    if request.config.connection_type != 'mongodb' and 'DELETE ' in query_upper and 'WHERE' not in query_upper:
        warnings.append("DELETE without WHERE clause - this will delete ALL rows!")

    # Execute query
    result = await DatabaseService.execute_query(
        config=request.config,
        query=request.query,
        parameters=request.parameters,
        timeout=request.timeout,
        cache=request.cache,
        cache_key=request.cache_key,
        cache_ttl=request.cache_ttl,
        max_rows=request.max_rows,
    )

    return ExecuteQueryResponse(
        result=result,
        warnings=warnings if warnings else None
    )
