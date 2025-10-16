"""
Flow Template Repository - Manages flow templates stored as JSON files
"""

import json
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any

from app.schemas.ai_assistant import FlowTemplate, FlowTemplateDetail, TemplateCategory

logger = logging.getLogger(__name__)


class FlowTemplateRepository:
    """
    Repository for flow templates.

    Templates are stored as JSON files in app/templates/flows/ directory.
    Each template is a complete flow definition that can be imported.
    """

    # Templates directory (relative to backend/)
    TEMPLATES_DIR = Path(__file__).parent.parent / "templates" / "flows"

    @classmethod
    def list_categories(cls) -> List[TemplateCategory]:
        """
        List all available template categories.

        Returns:
            List of TemplateCategory objects
        """
        # Hardcoded categories (could be loaded from categories.json later)
        categories = [
            TemplateCategory(
                id="lead_qualification",
                name="Qualificação de Leads",
                description="Capture e qualifique leads de forma automatizada",
                icon="🎯",
                template_count=0
            ),
            TemplateCategory(
                id="sales_ecommerce",
                name="Vendas e E-commerce",
                description="Catálogos, pedidos, carrinhos e vendas",
                icon="🛒",
                template_count=0
            ),
            TemplateCategory(
                id="scheduling",
                name="Agendamento",
                description="Agendamentos de consultas, serviços e reservas",
                icon="📅",
                template_count=0
            ),
            TemplateCategory(
                id="customer_support",
                name="Suporte ao Cliente",
                description="FAQ, tickets e atendimento automatizado",
                icon="🎫",
                template_count=0
            ),
            TemplateCategory(
                id="marketing",
                name="Marketing",
                description="Campanhas, eventos e promoções",
                icon="📢",
                template_count=0
            ),
            TemplateCategory(
                id="onboarding",
                name="Onboarding",
                description="Boas-vindas e tutoriais de produtos",
                icon="👋",
                template_count=0
            ),
        ]

        # Count templates per category
        if cls.TEMPLATES_DIR.exists():
            for template_file in cls.TEMPLATES_DIR.glob("*.json"):
                try:
                    with open(template_file, 'r', encoding='utf-8') as f:
                        template_data = json.load(f)
                        category_id = template_data.get("category")
                        for cat in categories:
                            if cat.id == category_id:
                                cat.template_count += 1
                                break
                except Exception as e:
                    logger.warning(f"Error reading template {template_file}: {e}")

        return categories

    @classmethod
    async def list_templates(
        cls,
        category: Optional[str] = None,
        subcategory: Optional[str] = None,
        complexity: Optional[str] = None,
        language: str = "pt-BR",
        tags: Optional[List[str]] = None,
        skip: int = 0,
        limit: int = 50
    ) -> tuple[List[FlowTemplate], int]:
        """
        List available templates with filters.

        Args:
            category: Filter by category ID
            subcategory: Filter by subcategory
            complexity: Filter by complexity (simple, medium, complex)
            language: Filter by language (default: pt-BR)
            tags: Filter by tags (templates must have at least one matching tag)
            skip: Pagination offset
            limit: Pagination limit

        Returns:
            Tuple of (templates list, total count)
        """
        templates = []

        # Ensure directory exists
        if not cls.TEMPLATES_DIR.exists():
            logger.warning(f"Templates directory does not exist: {cls.TEMPLATES_DIR}")
            return [], 0

        # Load all template files
        for template_file in cls.TEMPLATES_DIR.glob("*.json"):
            try:
                with open(template_file, 'r', encoding='utf-8') as f:
                    template_data = json.load(f)

                # Apply filters
                if category and template_data.get("category") != category:
                    continue

                if subcategory and template_data.get("subcategory") != subcategory:
                    continue

                if complexity and template_data.get("complexity") != complexity:
                    continue

                if language and template_data.get("metadata", {}).get("language") != language:
                    continue

                if tags:
                    template_tags = set(template_data.get("tags", []))
                    if not any(tag in template_tags for tag in tags):
                        continue

                # Create FlowTemplate object (without flow_data)
                template = FlowTemplate(
                    id=template_data["id"],
                    name=template_data["name"],
                    description=template_data["description"],
                    category=template_data["category"],
                    subcategory=template_data.get("subcategory"),
                    thumbnail_url=template_data.get("thumbnail_url"),
                    preview_image_url=template_data.get("preview_image_url"),
                    tags=template_data.get("tags", []),
                    complexity=template_data.get("complexity", "medium"),
                    estimated_setup_time=template_data.get("estimated_setup_time", ""),
                    node_count=template_data.get("node_count", 0),
                    features=template_data.get("features", []),
                    variables_used=template_data.get("variables_used", []),
                    requires_integrations=template_data.get("requires_integrations", []),
                    use_count=template_data.get("metadata", {}).get("use_count", 0),
                    rating=template_data.get("metadata", {}).get("rating", 0.0),
                    language=template_data.get("metadata", {}).get("language", "pt-BR")
                )

                templates.append(template)

            except Exception as e:
                logger.error(f"Error loading template {template_file}: {e}")
                continue

        # Sort by use_count (popularity) descending
        templates.sort(key=lambda t: t.use_count, reverse=True)

        # Pagination
        total = len(templates)
        templates = templates[skip:skip + limit]

        return templates, total

    @classmethod
    async def get_template(cls, template_id: str) -> Optional[FlowTemplateDetail]:
        """
        Get a specific template by ID with full flow data.

        Args:
            template_id: Template ID

        Returns:
            FlowTemplateDetail if found, None otherwise
        """
        template_file = cls.TEMPLATES_DIR / f"{template_id}.json"

        if not template_file.exists():
            logger.warning(f"Template not found: {template_id}")
            return None

        try:
            with open(template_file, 'r', encoding='utf-8') as f:
                template_data = json.load(f)

            # Create FlowTemplateDetail with flow_data included
            template = FlowTemplateDetail(
                id=template_data["id"],
                name=template_data["name"],
                description=template_data["description"],
                category=template_data["category"],
                subcategory=template_data.get("subcategory"),
                thumbnail_url=template_data.get("thumbnail_url"),
                preview_image_url=template_data.get("preview_image_url"),
                tags=template_data.get("tags", []),
                complexity=template_data.get("complexity", "medium"),
                estimated_setup_time=template_data.get("estimated_setup_time", ""),
                node_count=template_data.get("node_count", 0),
                features=template_data.get("features", []),
                variables_used=template_data.get("variables_used", []),
                requires_integrations=template_data.get("requires_integrations", []),
                use_count=template_data.get("metadata", {}).get("use_count", 0),
                rating=template_data.get("metadata", {}).get("rating", 0.0),
                language=template_data.get("metadata", {}).get("language", "pt-BR"),
                flow_data=template_data.get("flow_data", {})
            )

            return template

        except Exception as e:
            logger.error(f"Error loading template {template_id}: {e}")
            return None

    @classmethod
    async def increment_use_count(cls, template_id: str) -> bool:
        """
        Increment use count for a template.

        Args:
            template_id: Template ID

        Returns:
            True if successful, False otherwise
        """
        template_file = cls.TEMPLATES_DIR / f"{template_id}.json"

        if not template_file.exists():
            return False

        try:
            # Read template
            with open(template_file, 'r', encoding='utf-8') as f:
                template_data = json.load(f)

            # Increment use_count
            if "metadata" not in template_data:
                template_data["metadata"] = {}

            current_count = template_data["metadata"].get("use_count", 0)
            template_data["metadata"]["use_count"] = current_count + 1

            # Write back
            with open(template_file, 'w', encoding='utf-8') as f:
                json.dump(template_data, f, indent=2, ensure_ascii=False)

            logger.info(f"Incremented use_count for template {template_id}: {current_count} -> {current_count + 1}")
            return True

        except Exception as e:
            logger.error(f"Error incrementing use_count for template {template_id}: {e}")
            return False

    @classmethod
    async def search_templates(
        cls,
        query: str,
        language: str = "pt-BR",
        limit: int = 10
    ) -> List[FlowTemplate]:
        """
        Search templates by query string.

        Searches in: name, description, tags, features

        Args:
            query: Search query
            language: Language filter
            limit: Max results

        Returns:
            List of matching templates
        """
        if not query:
            return []

        query_lower = query.lower()
        matches = []

        # Load all templates
        if not cls.TEMPLATES_DIR.exists():
            return []

        for template_file in cls.TEMPLATES_DIR.glob("*.json"):
            try:
                with open(template_file, 'r', encoding='utf-8') as f:
                    template_data = json.load(f)

                # Language filter
                if template_data.get("metadata", {}).get("language") != language:
                    continue

                # Search in multiple fields
                searchable_text = " ".join([
                    template_data.get("name", "").lower(),
                    template_data.get("description", "").lower(),
                    " ".join(template_data.get("tags", [])).lower(),
                    " ".join(template_data.get("features", [])).lower(),
                ])

                if query_lower in searchable_text:
                    template = FlowTemplate(
                        id=template_data["id"],
                        name=template_data["name"],
                        description=template_data["description"],
                        category=template_data["category"],
                        subcategory=template_data.get("subcategory"),
                        thumbnail_url=template_data.get("thumbnail_url"),
                        preview_image_url=template_data.get("preview_image_url"),
                        tags=template_data.get("tags", []),
                        complexity=template_data.get("complexity", "medium"),
                        estimated_setup_time=template_data.get("estimated_setup_time", ""),
                        node_count=template_data.get("node_count", 0),
                        features=template_data.get("features", []),
                        variables_used=template_data.get("variables_used", []),
                        requires_integrations=template_data.get("requires_integrations", []),
                        use_count=template_data.get("metadata", {}).get("use_count", 0),
                        rating=template_data.get("metadata", {}).get("rating", 0.0),
                        language=template_data.get("metadata", {}).get("language", "pt-BR")
                    )
                    matches.append(template)

            except Exception as e:
                logger.error(f"Error searching in template {template_file}: {e}")
                continue

        # Sort by relevance (use_count as proxy)
        matches.sort(key=lambda t: t.use_count, reverse=True)

        return matches[:limit]
