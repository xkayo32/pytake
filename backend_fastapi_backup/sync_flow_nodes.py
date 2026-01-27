#!/usr/bin/env python3
"""
Script para sincronizar os nodes do fluxo a partir do canvas_data
"""

import os
os.environ.setdefault("ENV", "development")

import asyncio
from uuid import UUID

async def main():
    from app.services.chatbot_service import ChatbotService
    from app.core.database import AsyncSessionLocal
    from sqlalchemy import select
    from app.models.chatbot import Flow
    
    async with AsyncSessionLocal() as db:
        try:
            print("=" * 80)
            print("🔄 SINCRONIZANDO NODES DO FLUXO")
            print("=" * 80)
            
            # Buscar o fluxo
            flow_id = UUID("58756867-7eb4-4dba-a146-6736fc7ddcd2")
            org_id = UUID("1b936628-583c-4554-953a-78f9bd82aefc")
            
            stmt = select(Flow).where(Flow.id == flow_id)
            result = await db.execute(stmt)
            flow = result.scalar_one_or_none()
            
            if not flow:
                print("❌ Fluxo não encontrado!")
                return
            
            print(f"\n✅ Fluxo encontrado: {flow.name}")
            print(f"   ID: {flow.id}")
            print(f"   Canvas nodes: {len(flow.canvas_data.get('nodes', []))}")
            
            # Sincronizar nodes
            print(f"\n🔄 Sincronizando nodes...")
            chatbot_service = ChatbotService(db)
            await chatbot_service._sync_nodes_from_canvas(flow.id, org_id, flow.canvas_data)
            await db.commit()
            print("✅ Nodes sincronizados!")
            
            # Verificar resultado
            print(f"\n📋 Verificando nodes criados...")
            from app.models.chatbot import Node
            stmt = select(Node).where(Node.flow_id == flow_id)
            result = await db.execute(stmt)
            nodes = result.scalars().all()
            
            print(f"✅ Total de nodes: {len(nodes)}")
            for node in nodes:
                print(f"   - {node.node_id}: {node.node_type} ({node.label})")
            
            # Verificar start node
            start_node = next((n for n in nodes if n.node_type == "start"), None)
            if start_node:
                print(f"\n✅ Start node encontrado: {start_node.id}")
            else:
                print(f"\n❌ Start node NÃO encontrado!")
            
            print("\n" + "=" * 80)
            print("✅ SINCRONIZAÇÃO CONCLUÍDA!")
            print("=" * 80)
            
        except Exception as e:
            print(f"❌ Erro: {e}")
            import traceback
            traceback.print_exc()
            await db.rollback()

if __name__ == "__main__":
    asyncio.run(main())
