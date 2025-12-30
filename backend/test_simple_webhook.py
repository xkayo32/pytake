#!/usr/bin/env python3
"""
Script simples para testar webhook e verificar se fluxo foi acionado
"""

import asyncio
import os
from datetime import datetime

os.environ.setdefault("ENV", "development")

async def main():
    from app.services.whatsapp_service import WhatsAppService
    from app.core.database import AsyncSessionLocal
    from sqlalchemy import select, text
    from app.models.whatsapp_number import WhatsAppNumber
    
    webhook_payload = {
        "object": "whatsapp_business_account",
        "entry": [{
            "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
            "changes": [{
                "value": {
                    "messaging_product": "whatsapp",
                    "metadata": {
                        "display_phone_number": "556181277787",
                        "phone_number_id": "574293335763643"
                    },
                    "messages": [{
                        "from": "5511999999999",
                        "id": f"wamid.test_{int(datetime.utcnow().timestamp())}",
                        "timestamp": str(int(datetime.utcnow().timestamp())),
                        "type": "text",
                        "text": {"body": "Teste webhook!"},
                        "profile": {"name": "Cliente Teste"}
                    }],
                    "statuses": []
                },
                "field": "messages"
            }]
        }]
    }
    
    print("=" * 80)
    print("🔍 TESTE DE WEBHOOK + FLUXO PADRÃO")
    print("=" * 80)
    
    async with AsyncSessionLocal() as db:
        try:
            # Buscar número WhatsApp
            print("\n1️⃣  Buscando número WhatsApp...")
            stmt = select(WhatsAppNumber).where(
                WhatsAppNumber.phone_number_id == "574293335763643"
            )
            result = await db.execute(stmt)
            whatsapp_number = result.scalar_one_or_none()
            
            if not whatsapp_number:
                print("❌ Número não encontrado!")
                return
            
            print(f"✅ Encontrado: {whatsapp_number.phone_number}")
            print(f"   default_flow_id: {whatsapp_number.default_flow_id}")
            
            if not whatsapp_number.default_flow_id:
                print("❌ Número não tem fluxo padrão!")
                return
            
            # Processar webhook
            print("\n2️⃣  Processando webhook...")
            service = WhatsAppService(db)
            await service.process_webhook(webhook_payload)
            await db.commit()
            print("✅ Webhook processado!")
            
            # Consultar última conversa criada com SQL puro
            print("\n3️⃣  Consultando conversa criada...")
            query = text("""
                SELECT id, is_bot_active, active_flow_id, current_node_id, created_at
                FROM conversations
                WHERE organization_id = :org_id
                ORDER BY created_at DESC
                LIMIT 1
            """)
            result = await db.execute(query, {"org_id": str(whatsapp_number.organization_id)})
            row = result.fetchone()
            
            if not row:
                print("❌ Nenhuma conversa foi criada!")
                return
            
            conv_id, is_bot_active, active_flow_id, current_node_id, created_at = row
            
            print(f"✅ Conversa: {conv_id}")
            print(f"   is_bot_active: {is_bot_active}")
            print(f"   active_flow_id: {active_flow_id}")
            print(f"   current_node_id: {current_node_id}")
            print(f"   created_at: {created_at}")
            
            print("\n" + "=" * 80)
            print("📋 RESULTADO")
            print("=" * 80)
            
            if current_node_id:
                print(f"\n✅ SUCESSO! Fluxo foi acionado!")
                print(f"   current_node_id: {current_node_id}")
            else:
                print(f"\n❌ PROBLEMA! Fluxo NÃO foi acionado!")
                print(f"   current_node_id está NULL")
            
            # Cleanup
            print(f"\n4️⃣  Limpando dados...")
            cleanup = text("DELETE FROM conversations WHERE id = :conv_id")
            await db.execute(cleanup, {"conv_id": str(conv_id)})
            await db.commit()
            print("✅ Limpeza concluída!")
            
        except Exception as e:
            print(f"\n❌ ERRO: {e}")
            import traceback
            traceback.print_exc()
            await db.rollback()

if __name__ == "__main__":
    asyncio.run(main())
