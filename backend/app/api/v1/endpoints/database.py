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
    Test database connection and validate configuration.

    Validates connection configuration and attempts to connect to the database.
    Supports multiple database engines with automatic driver detection.

    **Path Parameters:** None

    **Request Body:**
    - config (DatabaseConfig, required):
      - connection_type (str): 'postgresql', 'mysql', 'mongodb', 'sqlite'
      - host (str): Database server hostname
      - port (int): Connection port
      - database (str): Database name
      - username (str, optional): Authentication user
      - password (str, optional): Authentication password
      - extra_params (dict, optional): Engine-specific options

    **Database Engine Support:**
    - **PostgreSQL**: psycopg2-binary required, supports connection pooling
    - **MySQL**: pymysql required, supports TLS
    - **MongoDB**: pymongo required, supports replica sets
    - **SQLite**: Built-in, no extra packages needed

    **Returns:**
    - success (bool): Connection successful
    - message (str): Connection status message
    - connection_time (float): Time taken in milliseconds
    - server_version (str): Database server version

    **Example Request:**
    ```json
    {
        "config": {
            "connection_type": "postgresql",
            "host": "postgres.example.com",
            "port": 5432,
            "database": "pytake_prod",
            "username": "app_user",
            "password": "secure_password"
        }
    }
    ```

    **Example Response (Success):**
    ```json
    {
        "success": true,
        "message": "Connection successful",
        "connection_time": 245.5,
        "server_version": "PostgreSQL 15.2"
    }
    ```

    **Example Response (Failure):**
    ```json
    {
        "success": false,
        "message": "Connection refused - host unreachable",
        "connection_time": 30000,
        "server_version": null
    }
    ```

    **Permissions:**
    - Requires: Authenticated user (any role)
    - Note: All users can test database connections

    **Error Codes:**
    - 401: Unauthorized (invalid or missing token)
    - 422: Unprocessable Entity (missing required fields in config)
    - 500: Server error (database connection error, driver not found)
    - 504: Gateway Timeout (connection timeout exceeded)
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
    Execute database query against configured database connection.

    Executes SQL or NoSQL queries with support for caching, parameter binding,
    and configurable timeouts. Enforces security restrictions on dangerous operations.

    **Path Parameters:** None

    **Request Body:**
    - config (DatabaseConfig, required):
      - connection_type (str): 'postgresql', 'mysql', 'mongodb', 'sqlite'
      - host (str): Database server hostname
      - port (int): Connection port
      - database (str): Database name
      - username (str, optional): Authentication user
      - password (str, optional): Authentication password
    - query (str, required): SQL or NoSQL query string
    - query_type (str): 'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CUSTOM'
    - parameters (dict, optional): Query parameter bindings (prevents SQL injection)
    - timeout (int): Query timeout 1-300 seconds (default: 30)
    - cache (bool): Enable query result caching (default: false)
    - cache_key (str, optional): Custom cache identifier
    - cache_ttl (int, optional): Cache TTL in seconds (10-86400)
    - max_rows (int): Maximum rows to return (1-10000, default: 1000)

    **Security Notes:**
    - Always use parameters for user input (prevents SQL injection)
    - DROP and TRUNCATE operations are blocked for data protection
    - DELETE without WHERE clause raises warning
    - Results limited to max_rows (prevents memory exhaustion)
    - Query timeout enforced (1-300 seconds)
    - Credentials are not logged or cached

    **Cache Behavior:**
    - Enable cache for frequently accessed, rarely changing data
    - Cache TTL: 10 seconds to 24 hours
    - Cached results returned immediately without re-executing
    - from_cache field indicates if result is from cache

    **Query Types:**
    - **SELECT**: Returns data array with row count
    - **INSERT/UPDATE/DELETE**: Returns affected row count
    - **CUSTOM**: Any valid SQL/NoSQL command

    **SQL Example (PostgreSQL):**
    ```sql
    SELECT id, name, email FROM users WHERE organization_id = %(org_id)s ORDER BY created_at DESC LIMIT %(limit)s
    ```

    **SQL Parameters:**
    ```json
    {
        "org_id": "550e8400-e29b-41d4-a716-446655440000",
        "limit": 100
    }
    ```

    **MongoDB Format:**
    ```json
    {
        "collection": "conversations",
        "operation": "find",
        "filter": {"organization_id": "550e8400-e29b-41d4-a716-446655440000"},
        "projection": {"id": 1, "name": 1, "status": 1},
        "limit": 100
    }
    ```

    **Returns:**
    - success (bool): Query executed successfully
    - data (array): Array of result rows (SELECT only, null for other operations)
    - row_count (int): Number of rows affected (INSERT/UPDATE/DELETE) or returned (SELECT)
    - execution_time (float): Query execution time in milliseconds
    - from_cache (bool): Result served from cache
    - error (str, optional): Error message on failure

    **Example Request (SELECT):**
    ```json
    {
        "config": {
            "connection_type": "postgresql",
            "host": "postgres.example.com",
            "port": 5432,
            "database": "pytake",
            "username": "app_user",
            "password": "secure_password"
        },
        "query": "SELECT id, name FROM organizations WHERE status = %(status)s LIMIT %(limit)s",
        "query_type": "SELECT",
        "parameters": {"status": "active", "limit": 50},
        "timeout": 30,
        "cache": true,
        "cache_ttl": 300,
        "max_rows": 1000
    }
    ```

    **Example Response (Success):**
    ```json
    {
        "result": {
            "success": true,
            "data": [
                {"id": "550e8400-e29b-41d4-a716-446655440000", "name": "Acme Corp"},
                {"id": "550e8400-e29b-41d4-a716-446655440001", "name": "Tech Startup"}
            ],
            "row_count": 2,
            "execution_time": 125.4,
            "from_cache": false
        },
        "warnings": null
    }
    ```

    **Example Response (Delete Warning):**
    ```json
    {
        "result": {
            "success": true,
            "row_count": 150,
            "execution_time": 542.8,
            "from_cache": false
        },
        "warnings": ["DELETE without WHERE clause - this will delete ALL rows!"]
    }
    ```

    **Permissions:**
    - Requires: Authenticated user (org_admin recommended)
    - Note: Query execution follows database user permissions

    **Error Codes:**
    - 401: Unauthorized (invalid or missing token)
    - 422: Unprocessable Entity (invalid query or missing required fields)
    - 400: Bad Request (DROP/TRUNCATE operation blocked)
    - 500: Server error (query execution error, connection failure)
    - 504: Gateway Timeout (query timeout exceeded)
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
