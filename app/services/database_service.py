"""Database query service."""
import time
import json
import hashlib
from typing import Any, Dict, List, Optional, Tuple
from contextlib import asynccontextmanager

from app.schemas.database import (
    DatabaseConnectionConfig,
    QueryParameter,
    QueryResult,
)
from app.core.redis import redis_client


class DatabaseService:
    """Service for database connections and queries."""

    @staticmethod
    async def test_connection(config: DatabaseConnectionConfig) -> Tuple[bool, str, Optional[float], Optional[str]]:
        """
        Test database connection.

        Returns:
            Tuple of (success, message, connection_time, server_version)
        """
        start_time = time.time()

        try:
            if config.connection_type == 'postgres':
                return await DatabaseService._test_postgres(config, start_time)
            elif config.connection_type == 'mysql':
                return await DatabaseService._test_mysql(config, start_time)
            elif config.connection_type == 'mongodb':
                return await DatabaseService._test_mongodb(config, start_time)
            elif config.connection_type == 'sqlite':
                return await DatabaseService._test_sqlite(config, start_time)
            else:
                return False, f"Unsupported database type: {config.connection_type}", None, None

        except Exception as e:
            return False, f"Connection failed: {str(e)}", None, None

    @staticmethod
    async def _test_postgres(config: DatabaseConnectionConfig, start_time: float) -> Tuple[bool, str, float, str]:
        """Test PostgreSQL connection."""
        try:
            import psycopg2

            conn = psycopg2.connect(
                host=config.host,
                port=config.port,
                database=config.database,
                user=config.username,
                password=config.password,
                connect_timeout=10
            )

            cursor = conn.cursor()
            cursor.execute("SELECT version();")
            version = cursor.fetchone()[0]
            cursor.close()
            conn.close()

            connection_time = time.time() - start_time
            version_parts = version.split()[:2]
            return True, "PostgreSQL connection successful", connection_time, ' '.join(version_parts)

        except ImportError:
            return False, "psycopg2 not installed. Run: pip install psycopg2-binary", None, None
        except Exception as e:
            return False, str(e), None, None

    @staticmethod
    async def _test_mysql(config: DatabaseConnectionConfig, start_time: float) -> Tuple[bool, str, float, str]:
        """Test MySQL connection."""
        try:
            import pymysql

            conn = pymysql.connect(
                host=config.host,
                port=config.port,
                database=config.database,
                user=config.username,
                password=config.password,
                connect_timeout=10
            )

            cursor = conn.cursor()
            cursor.execute("SELECT VERSION();")
            version = cursor.fetchone()[0]
            cursor.close()
            conn.close()

            connection_time = time.time() - start_time
            return True, "MySQL connection successful", connection_time, f"MySQL {version}"

        except ImportError:
            return False, "pymysql not installed. Run: pip install pymysql", None, None
        except Exception as e:
            return False, str(e), None, None

    @staticmethod
    async def _test_mongodb(config: DatabaseConnectionConfig, start_time: float) -> Tuple[bool, str, float, str]:
        """Test MongoDB connection."""
        try:
            from pymongo import MongoClient
            from pymongo.errors import ConnectionFailure

            # Build connection string
            if config.username and config.password:
                connection_string = f"mongodb://{config.username}:{config.password}@{config.host}:{config.port}/{config.database}"
            else:
                connection_string = f"mongodb://{config.host}:{config.port}/{config.database}"

            client = MongoClient(
                connection_string,
                serverSelectionTimeoutMS=10000
            )

            # Test connection
            client.admin.command('ping')
            server_info = client.server_info()
            version = server_info.get('version', 'Unknown')
            client.close()

            connection_time = time.time() - start_time
            return True, "MongoDB connection successful", connection_time, f"MongoDB {version}"

        except ImportError:
            return False, "pymongo not installed. Run: pip install pymongo", None, None
        except ConnectionFailure:
            return False, "Failed to connect to MongoDB server", None, None
        except Exception as e:
            return False, str(e), None, None

    @staticmethod
    async def _test_sqlite(config: DatabaseConnectionConfig, start_time: float) -> Tuple[bool, str, float, str]:
        """Test SQLite connection."""
        try:
            import sqlite3

            conn = sqlite3.connect(config.database, timeout=10)
            cursor = conn.cursor()
            cursor.execute("SELECT sqlite_version();")
            version = cursor.fetchone()[0]
            cursor.close()
            conn.close()

            connection_time = time.time() - start_time
            return True, "SQLite connection successful", connection_time, f"SQLite {version}"

        except Exception as e:
            return False, str(e), None, None

    @staticmethod
    async def execute_query(
        config: DatabaseConnectionConfig,
        query: str,
        parameters: Optional[List[QueryParameter]] = None,
        timeout: int = 30,
        cache: bool = False,
        cache_key: Optional[str] = None,
        cache_ttl: int = 300,
        max_rows: int = 1000,
    ) -> QueryResult:
        """
        Execute database query.

        Args:
            config: Database connection configuration
            query: SQL or NoSQL query to execute
            parameters: Query parameters for prepared statements
            timeout: Query timeout in seconds
            cache: Enable result caching
            cache_key: Custom cache key
            cache_ttl: Cache TTL in seconds
            max_rows: Maximum rows to return

        Returns:
            QueryResult with execution details
        """
        # Check cache first
        if cache:
            cached_result = await DatabaseService._get_from_cache(
                config, query, parameters, cache_key
            )
            if cached_result:
                return cached_result

        # Execute query
        start_time = time.time()

        try:
            if config.connection_type == 'postgres':
                result = await DatabaseService._execute_postgres(
                    config, query, parameters, timeout, max_rows
                )
            elif config.connection_type == 'mysql':
                result = await DatabaseService._execute_mysql(
                    config, query, parameters, timeout, max_rows
                )
            elif config.connection_type == 'mongodb':
                result = await DatabaseService._execute_mongodb(
                    config, query, timeout, max_rows
                )
            elif config.connection_type == 'sqlite':
                result = await DatabaseService._execute_sqlite(
                    config, query, parameters, timeout, max_rows
                )
            else:
                return QueryResult(
                    success=False,
                    execution_time=time.time() - start_time,
                    error=f"Unsupported database type: {config.connection_type}"
                )

            result.execution_time = time.time() - start_time

            # Cache result if enabled
            if cache and result.success:
                await DatabaseService._save_to_cache(
                    config, query, parameters, cache_key, cache_ttl, result
                )

            return result

        except Exception as e:
            return QueryResult(
                success=False,
                execution_time=time.time() - start_time,
                error=str(e)
            )

    @staticmethod
    async def _execute_postgres(
        config: DatabaseConnectionConfig,
        query: str,
        parameters: Optional[List[QueryParameter]],
        timeout: int,
        max_rows: int,
    ) -> QueryResult:
        """Execute PostgreSQL query."""
        try:
            import psycopg2
            import psycopg2.extras

            conn = psycopg2.connect(
                host=config.host,
                port=config.port,
                database=config.database,
                user=config.username,
                password=config.password,
                connect_timeout=timeout
            )

            cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

            # Prepare parameters
            params = None
            if parameters:
                params = {p.name: p.value for p in parameters}

            # Execute query
            cursor.execute(query, params)

            # Fetch results for SELECT queries
            if query.strip().upper().startswith('SELECT'):
                rows = cursor.fetchmany(max_rows)
                data = [dict(row) for row in rows]
                row_count = len(data)
            else:
                conn.commit()
                data = None
                row_count = cursor.rowcount

            cursor.close()
            conn.close()

            return QueryResult(
                success=True,
                data=data,
                row_count=row_count,
                execution_time=0  # Will be set by caller
            )

        except ImportError:
            return QueryResult(
                success=False,
                execution_time=0,
                error="psycopg2 not installed"
            )
        except Exception as e:
            return QueryResult(
                success=False,
                execution_time=0,
                error=str(e)
            )

    @staticmethod
    async def _execute_mysql(
        config: DatabaseConnectionConfig,
        query: str,
        parameters: Optional[List[QueryParameter]],
        timeout: int,
        max_rows: int,
    ) -> QueryResult:
        """Execute MySQL query."""
        try:
            import pymysql
            import pymysql.cursors

            conn = pymysql.connect(
                host=config.host,
                port=config.port,
                database=config.database,
                user=config.username,
                password=config.password,
                connect_timeout=timeout,
                cursorclass=pymysql.cursors.DictCursor
            )

            cursor = conn.cursor()

            # Prepare parameters
            params = None
            if parameters:
                params = {p.name: p.value for p in parameters}

            # Execute query
            cursor.execute(query, params)

            # Fetch results for SELECT queries
            if query.strip().upper().startswith('SELECT'):
                rows = cursor.fetchmany(max_rows)
                data = list(rows)
                row_count = len(data)
            else:
                conn.commit()
                data = None
                row_count = cursor.rowcount

            cursor.close()
            conn.close()

            return QueryResult(
                success=True,
                data=data,
                row_count=row_count,
                execution_time=0
            )

        except ImportError:
            return QueryResult(
                success=False,
                execution_time=0,
                error="pymysql not installed"
            )
        except Exception as e:
            return QueryResult(
                success=False,
                execution_time=0,
                error=str(e)
            )

    @staticmethod
    async def _execute_mongodb(
        config: DatabaseConnectionConfig,
        query: str,
        timeout: int,
        max_rows: int,
    ) -> QueryResult:
        """Execute MongoDB query."""
        try:
            from pymongo import MongoClient
            import json

            # Parse query as JSON
            query_obj = json.loads(query)

            # Build connection string
            if config.username and config.password:
                connection_string = f"mongodb://{config.username}:{config.password}@{config.host}:{config.port}/{config.database}"
            else:
                connection_string = f"mongodb://{config.host}:{config.port}/{config.database}"

            client = MongoClient(
                connection_string,
                serverSelectionTimeoutMS=timeout * 1000
            )

            db = client[config.database]

            # Get collection
            collection_name = query_obj.get('collection')
            if not collection_name:
                return QueryResult(
                    success=False,
                    execution_time=0,
                    error="Missing 'collection' field in query"
                )

            collection = db[collection_name]

            # Execute query based on operation
            operation = query_obj.get('operation', 'find')

            if operation == 'find':
                filter_obj = query_obj.get('filter', {})
                projection = query_obj.get('projection')
                results = list(collection.find(filter_obj, projection).limit(max_rows))

                # Convert ObjectId to string
                for doc in results:
                    if '_id' in doc:
                        doc['_id'] = str(doc['_id'])

                row_count = len(results)
                data = results

            elif operation == 'insert_one':
                document = query_obj.get('document', {})
                result = collection.insert_one(document)
                data = [{"inserted_id": str(result.inserted_id)}]
                row_count = 1

            elif operation == 'update_many':
                filter_obj = query_obj.get('filter', {})
                update = query_obj.get('update', {})
                result = collection.update_many(filter_obj, update)
                data = [{"modified_count": result.modified_count}]
                row_count = result.modified_count

            elif operation == 'delete_many':
                filter_obj = query_obj.get('filter', {})
                result = collection.delete_many(filter_obj)
                data = [{"deleted_count": result.deleted_count}]
                row_count = result.deleted_count

            else:
                return QueryResult(
                    success=False,
                    execution_time=0,
                    error=f"Unsupported operation: {operation}"
                )

            client.close()

            return QueryResult(
                success=True,
                data=data,
                row_count=row_count,
                execution_time=0
            )

        except ImportError:
            return QueryResult(
                success=False,
                execution_time=0,
                error="pymongo not installed"
            )
        except json.JSONDecodeError:
            return QueryResult(
                success=False,
                execution_time=0,
                error="Invalid JSON query format"
            )
        except Exception as e:
            return QueryResult(
                success=False,
                execution_time=0,
                error=str(e)
            )

    @staticmethod
    async def _execute_sqlite(
        config: DatabaseConnectionConfig,
        query: str,
        parameters: Optional[List[QueryParameter]],
        timeout: int,
        max_rows: int,
    ) -> QueryResult:
        """Execute SQLite query."""
        try:
            import sqlite3

            conn = sqlite3.connect(config.database, timeout=timeout)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            # Prepare parameters
            params = None
            if parameters:
                params = {p.name: p.value for p in parameters}

            # Execute query
            cursor.execute(query, params or {})

            # Fetch results for SELECT queries
            if query.strip().upper().startswith('SELECT'):
                rows = cursor.fetchmany(max_rows)
                data = [dict(row) for row in rows]
                row_count = len(data)
            else:
                conn.commit()
                data = None
                row_count = cursor.rowcount

            cursor.close()
            conn.close()

            return QueryResult(
                success=True,
                data=data,
                row_count=row_count,
                execution_time=0
            )

        except Exception as e:
            return QueryResult(
                success=False,
                execution_time=0,
                error=str(e)
            )

    @staticmethod
    async def _get_cache_key(
        config: DatabaseConnectionConfig,
        query: str,
        parameters: Optional[List[QueryParameter]],
        custom_key: Optional[str],
    ) -> str:
        """Generate cache key for query."""
        if custom_key:
            return f"db_query:{custom_key}"

        # Generate key from config + query + params
        key_parts = [
            config.connection_type,
            config.host or '',
            str(config.port),
            config.database,
            query,
        ]

        if parameters:
            params_str = json.dumps([{'name': p.name, 'value': str(p.value)} for p in parameters])
            key_parts.append(params_str)

        key_string = '|'.join(key_parts)
        key_hash = hashlib.md5(key_string.encode()).hexdigest()

        return f"db_query:{key_hash}"

    @staticmethod
    async def _get_from_cache(
        config: DatabaseConnectionConfig,
        query: str,
        parameters: Optional[List[QueryParameter]],
        custom_key: Optional[str],
    ) -> Optional[QueryResult]:
        """Get query result from cache."""
        if not redis_client or not redis_client.redis:
            return None

        try:
            cache_key = await DatabaseService._get_cache_key(
                config, query, parameters, custom_key
            )

            cached_data = redis_client.redis.get(cache_key)
            if cached_data:
                result_dict = json.loads(cached_data)
                result = QueryResult(**result_dict)
                result.from_cache = True
                return result

        except Exception:
            pass

        return None

    @staticmethod
    async def _save_to_cache(
        config: DatabaseConnectionConfig,
        query: str,
        parameters: Optional[List[QueryParameter]],
        custom_key: Optional[str],
        ttl: int,
        result: QueryResult,
    ) -> None:
        """Save query result to cache."""
        if not redis_client or not redis_client.redis:
            return

        try:
            cache_key = await DatabaseService._get_cache_key(
                config, query, parameters, custom_key
            )

            result_dict = result.model_dump()
            result_dict['from_cache'] = False

            redis_client.redis.setex(
                cache_key,
                ttl,
                json.dumps(result_dict, default=str)
            )

        except Exception:
            pass
