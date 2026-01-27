"""Database query schemas."""
from typing import Any, Dict, List, Optional, Literal
from pydantic import BaseModel, Field, validator


class DatabaseConnectionConfig(BaseModel):
    """Database connection configuration."""
    connection_type: Literal['postgres', 'mysql', 'mongodb', 'sqlite'] = Field(
        ...,
        description="Type of database"
    )
    host: Optional[str] = Field(default='localhost', description="Database host")
    port: Optional[int] = Field(default=5432, description="Database port")
    database: str = Field(..., description="Database name or file path for SQLite")
    username: Optional[str] = Field(default=None, description="Database username")
    password: Optional[str] = Field(default=None, description="Database password")

    @validator('port', always=True)
    def set_default_port(cls, v, values):
        """Set default port based on connection type."""
        if v is None and 'connection_type' in values:
            default_ports = {
                'postgres': 5432,
                'mysql': 3306,
                'mongodb': 27017,
                'sqlite': 0,
            }
            return default_ports.get(values['connection_type'], 5432)
        return v


class TestConnectionRequest(BaseModel):
    """Test database connection request."""
    config: DatabaseConnectionConfig = Field(..., description="Connection configuration")


class TestConnectionResponse(BaseModel):
    """Test database connection response."""
    success: bool = Field(..., description="Connection successful")
    message: str = Field(..., description="Result message")
    connection_time: Optional[float] = Field(
        default=None,
        description="Connection time in seconds"
    )
    server_version: Optional[str] = Field(
        default=None,
        description="Database server version"
    )


class QueryParameter(BaseModel):
    """Query parameter for prepared statements."""
    name: str = Field(..., description="Parameter name")
    value: Any = Field(..., description="Parameter value")
    type: Optional[str] = Field(default='auto', description="Parameter type")


class ExecuteQueryRequest(BaseModel):
    """Execute database query request."""
    config: DatabaseConnectionConfig = Field(..., description="Connection configuration")
    query: str = Field(..., description="SQL or NoSQL query to execute")
    query_type: Literal['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CUSTOM'] = Field(
        default='SELECT',
        description="Type of query"
    )
    parameters: Optional[List[QueryParameter]] = Field(
        default=[],
        description="Query parameters for prepared statements"
    )
    timeout: int = Field(default=30, ge=1, le=300, description="Query timeout in seconds")
    cache: bool = Field(default=False, description="Enable result caching")
    cache_key: Optional[str] = Field(default=None, description="Custom cache key")
    cache_ttl: int = Field(default=300, ge=10, le=86400, description="Cache TTL in seconds")
    max_rows: int = Field(default=1000, ge=1, le=10000, description="Maximum rows to return")


class QueryResult(BaseModel):
    """Query execution result."""
    success: bool = Field(..., description="Query executed successfully")
    data: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="Query result data"
    )
    row_count: int = Field(default=0, description="Number of rows affected/returned")
    execution_time: float = Field(..., description="Query execution time in seconds")
    from_cache: bool = Field(default=False, description="Result was served from cache")
    error: Optional[str] = Field(default=None, description="Error message if failed")


class ExecuteQueryResponse(BaseModel):
    """Execute database query response."""
    result: QueryResult = Field(..., description="Query result")
    warnings: Optional[List[str]] = Field(
        default=None,
        description="Warnings about query execution"
    )
