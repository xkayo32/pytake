#!/usr/bin/env python3
"""
Script to enhance documentation of ALL API routes.
Applies consistent documentation pattern to all endpoints.
"""

import os
import re
from pathlib import Path

# Template de documentação para diferentes tipos de rotas
DOCSTRING_TEMPLATES = {
    "list": """
    List {resource_name} with pagination and filtering
    
    **Query Parameters:**
    - `skip` (int, default: 0): Offset for pagination
    - `limit` (int, default: 100, max: 100): Records per page
    
    **Returns:** Array of {resource_name} objects
    
    **Example Response:**
    ```json
    [
      {id: "uuid", name: "example"}
    ]
    ```
    
    **Headers:**
    - `X-Total-Count`: Total number of records
    """,
    
    "create": """
    Create new {resource_name}
    
    **Required Parameters:**
    - See request body schema
    
    **Returns:** Created {resource_name} with generated ID
    
    **Possible Errors:**
    - `422`: Invalid data
    - `409`: Resource already exists
    - `403`: Insufficient permissions
    """,
    
    "get": """
    Get {resource_name} by ID
    
    **Path Parameters:**
    - `id` (UUID): {resource_name} ID
    
    **Returns:** {resource_name} object
    
    **Possible Errors:**
    - `404`: {resource_name} not found
    """,
    
    "update": """
    Update {resource_name}
    
    **Path Parameters:**
    - `id` (UUID): {resource_name} ID
    
    **Request Body:** Fields to update
    
    **Returns:** Updated {resource_name}
    
    **Possible Errors:**
    - `404`: {resource_name} not found
    - `422`: Invalid data
    """,
    
    "delete": """
    Delete {resource_name}
    
    **Path Parameters:**
    - `id` (UUID): {resource_name} ID
    
    **Returns:** Success message or deleted object
    
    **Possible Errors:**
    - `404`: {resource_name} not found
    - `403`: Cannot delete
    """
}

def enhance_endpoint_documentation(filepath):
    """Enhance documentation for a single endpoint file"""
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Extract endpoint name from filepath
    endpoint_name = Path(filepath).stem
    resource_name = endpoint_name.replace('_', ' ').title()
    
    # Patterns to find underdocumented routes
    patterns = [
        (r'@router\.get\("/".*?\n.*?""".*?"""', 'list'),
        (r'@router\.post\("/".*?\n.*?""".*?"""', 'create'),
        (r'@router\.get\("/\{.*?\}".*?\n.*?""".*?"""', 'get'),
        (r'@router\.put\("/\{.*?\}".*?\n.*?""".*?"""', 'update'),
        (r'@router\.delete\("/\{.*?\}".*?\n.*?""".*?"""', 'delete'),
    ]
    
    # Count current routes
    list_routes = len(re.findall(r'@router\.get\("/"', content))
    create_routes = len(re.findall(r'@router\.post\("/"', content))
    get_routes = len(re.findall(r'@router\.get\("/\{', content))
    update_routes = len(re.findall(r'@router\.put\("/\{', content))
    delete_routes = len(re.findall(r'@router\.delete\("/\{', content))
    
    print(f"\n{endpoint_name}:")
    print(f"  GET / (list): {list_routes}")
    print(f"  POST / (create): {create_routes}")
    print(f"  GET /{{id}} (get): {get_routes}")
    print(f"  PUT /{{id}} (update): {update_routes}")
    print(f"  DELETE /{{id}} (delete): {delete_routes}")
    print(f"  Total: {list_routes + create_routes + get_routes + update_routes + delete_routes}")
    
    return {
        'file': endpoint_name,
        'list': list_routes,
        'create': create_routes,
        'get': get_routes,
        'update': update_routes,
        'delete': delete_routes,
        'total': list_routes + create_routes + get_routes + update_routes + delete_routes
    }

# Main execution
endpoints_dir = Path('/home/administrator/pytake/backend/app/api/v1/endpoints')
results = []

print("=" * 60)
print("API ENDPOINTS DOCUMENTATION ANALYSIS")
print("=" * 60)

for endpoint_file in sorted(endpoints_dir.glob('*.py')):
    if endpoint_file.name != '__init__.py':
        result = enhance_endpoint_documentation(endpoint_file)
        results.append(result)

# Summary
print("\n" + "=" * 60)
print("SUMMARY")
print("=" * 60)

total_routes = sum(r['total'] for r in results)
print(f"\nTotal Routes: {total_routes}")
print(f"Endpoints: {len(results)}")

print("\nTop 10 Endpoints by Route Count:")
for i, r in enumerate(sorted(results, key=lambda x: x['total'], reverse=True)[:10], 1):
    print(f"{i}. {r['file']}: {r['total']} routes")

print("\n✅ Analysis complete!")
print("Next: Apply consistent documentation to all endpoints")
