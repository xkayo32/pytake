"""
Script para sincronizar nós do canvas_data para a tabela nodes
Executa uma única vez para migrar dados existentes
"""

import asyncio
import logging
from sqlalchemy import select
from app.core.database import get_db, async_session
from app.models.chatbot import Flow, Node
from app.repositories.chatbot import NodeRepository

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def sync_all_flows():
    """Sincroniza todos os flows que têm canvas_data"""
    async with async_session() as session:
        try:
            # Buscar todos os flows com canvas_data
            result = await session.execute(
                select(Flow).where(
                    Flow.canvas_data.isnot(None),
                    Flow.deleted_at.is_(None)
                )
            )
            flows = result.scalars().all()

            logger.info(f"Found {len(flows)} flows to sync")

            node_repo = NodeRepository(session)

            for flow in flows:
                logger.info(f"Syncing flow {flow.id} ({flow.name})")

                # Delete existing nodes
                await node_repo.delete_by_flow(flow.id, flow.organization_id)

                # Extract nodes from canvas_data
                canvas_data = flow.canvas_data or {}
                nodes_data = canvas_data.get("nodes", [])

                if not nodes_data:
                    logger.warning(f"No nodes in canvas_data for flow {flow.id}")
                    continue

                # Create Node instances
                nodes_to_create = []
                for idx, node_data in enumerate(nodes_data):
                    react_flow_id = node_data.get("id")
                    node_info = node_data.get("data", {})
                    node_type = node_info.get("nodeType", "custom")
                    position = node_data.get("position", {})

                    node = Node(
                        flow_id=flow.id,
                        organization_id=flow.organization_id,
                        node_id=react_flow_id,
                        node_type=node_type,
                        label=node_info.get("label", f"Node {idx + 1}"),
                        data=node_info,
                        position_x=position.get("x", 0),
                        position_y=position.get("y", 0),
                        order=idx,
                    )
                    nodes_to_create.append(node)

                # Bulk create
                if nodes_to_create:
                    await node_repo.bulk_create(nodes_to_create)
                    logger.info(f"✅ Created {len(nodes_to_create)} nodes for flow {flow.id}")

            await session.commit()
            logger.info("✅ All flows synced successfully!")

        except Exception as e:
            logger.error(f"Error syncing flows: {e}")
            await session.rollback()
            raise


if __name__ == "__main__":
    asyncio.run(sync_all_flows())
