#!/usr/bin/env python3
"""
Script para verificar se o fluxo está sendo acionado corretamente
"""

import os
os.environ.setdefault("ENV", "development")

import asyncio
from datetime import datetime

async def main():
    from app.services.whatsapp_service import WhatsAppService
    from app.core.database import AsyncSessionLocal
    from sqlalchemy import select, text
    from app.models.whatsapp_number import WhatsAppNumber
    
    # Payload de webhook com contato novo
    webhook = {
        "object": "whatsapp_business_account",
        "entry": [{
            "changes": [{
                "value": {
                    "messaging_product": "whatsapp",
                    "metadata": {
                        "display_phone_number": "556181277787",
                        "phone_number_id": "574293335763643"
                    },
                    "messages": [{
                        "from": "5511987654321",
                        "id": f"wamid.test_{int(datetime.utcnow().timestamp())}",
                        "timestamp": str(int(datetime.utcnow().timestamp())),
                        "type": "text",
                        "text": {"body": "Olá! Testando o fluxo!"},
                        "profile": {"name": "Teste Bot 2"}
                    }],
                    "statuses": []
                },
                "field": "messages"
            }]
        }]
    }
    
    async with AsyncSessionLocal() as db:
        try:
            print("=" * 80)
            print("🔍 VERIFICANDO INTEGRAÇÃO DO FLUXO")
            print("=" * 80)
            
            # 1. Buscar número
            stmt = select(WhatsAppNumber).where(
                WhatsAppNumber.phone_number_id == "574293335763643"
            )
            result = await db.execute(stmt)
            number = result.scalar_one_or_none()
            
            if not number:
                print("❌ Número não encontrado!")
                return
            
            print(f"\n✅ Número: {number.phone_number}")
            print(f"   Fluxo vinculado: {number.default_flow_id}")
            
            # 2. Processar webhook
            print(f"\n📨 Processando webhook...")
            service = WhatsAppService(db)
            await service.process_webhook(webhook)
            await db.commit()
            print("✅ Webhook processado")
            
            # 3. Consultar conversa
            print(f"\n📋 Buscando conversa criada...")
            query = text("""
                SELECT c.id, c.is_bot_active, c.active_flow_id, c.current_node_id, cnt.whatsapp_name
                FROM conversations c
                JOIN contacts cnt ON cnt.id = c.contact_id
                WHERE c.organization_id = :org_id 
                AND cnt.whatsapp_id = '5511987654321'
                ORDER BY c.created_at DESC LIMIT 1
            """)
            result = await db.execute(query, {"org_id": str(number.organization_id)})
            row = result.fetchone()
            
            if row:
                conv_id, is_bot, flow_id, node_id, contact_name = row
                print(f"✅ Conversa encontrada: {conv_id}")
                print(f"   Contato: {contact_name}")
                print(f"   is_bot_active: {is_bot}")
                print(f"   active_flow_id: {flow_id}")
                print(f"   current_node_id: {node_id}")
                
                print("\n" + "=" * 80)
                if node_id:
                    print("✅ SUCESSO! O fluxo FOI ACIONADO!")
                    print(f"   O first node foi definido: {node_id}")
                else:
                    print("❌ ERRO! O fluxo NÃO foi acionado!")
                    print(f"   current_node_id continua NULL")
                print("=" * 80)
                
                # Cleanup
                print(f"\n🧹 Removendo dados de teste...")
                await db.execute(text(f"DELETE FROM messages WHERE conversation_id = '{conv_id}'"))
                await db.execute(text(f"DELETE FROM conversations WHERE id = '{conv_id}'"))
                await db.commit()
                print("✅ Limpeza completa!")
            else:
                print("❌ Nenhuma conversa foi criada!")
                
        except Exception as e:
            print(f"❌ Erro: {e}")
            import traceback
            traceback.print_exc()
            await db.rollback()

if __name__ == "__main__":
    asyncio.run(main())
