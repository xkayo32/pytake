#!/usr/bin/env python3
"""
Script para simular webhook de mensagem WhatsApp e analisar
por que o fluxo não é acionado
"""

import asyncio
import json
import hmac
import hashlib
from datetime import datetime
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

async def main():
    import os
    os.environ.setdefault("ENV", "development")
    
    # Importar após definir ENV
    from app.core.config import settings
    from app.services.whatsapp_service import WhatsAppService
    from app.core.database import AsyncSessionLocal
    from sqlalchemy import select
    from app.models.whatsapp_number import WhatsAppNumber
    from app.models.contact import Contact
    from app.models.conversation import Conversation
    
    # Criar payload do webhook
    webhook_payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
                "changes": [
                    {
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {
                                "display_phone_number": "556181277787",
                                "phone_number_id": "574293335763643"  # Meta ID do número
                            },
                            "messages": [
                                {
                                    "from": "5511999999999",  # Número de contato (usuário)
                                    "id": "wamid.test_" + str(int(datetime.utcnow().timestamp())),
                                    "timestamp": str(int(datetime.utcnow().timestamp())),
                                    "type": "text",
                                    "text": {
                                        "body": "Olá! Tudo bem? Vim via webhook!"
                                    },
                                    "profile": {
                                        "name": "Cliente Teste"
                                    }
                                }
                            ],
                            "statuses": []
                        },
                        "field": "messages"
                    }
                ]
            }
        ]
    }
    
    print("=" * 80)
    print("🔍 SIMULANDO WEBHOOK DE MENSAGEM WHATSAPP")
    print("=" * 80)
    
    async with AsyncSessionLocal() as db:
        try:
            # 1. Buscar número WhatsApp
            print("\n1️⃣  Buscando número WhatsApp com phone_number_id '574293335763643'...")
            stmt = select(WhatsAppNumber).where(
                WhatsAppNumber.phone_number_id == "574293335763643"
            )
            result = await db.execute(stmt)
            whatsapp_number = result.scalar_one_or_none()
            
            if not whatsapp_number:
                print("❌ Número WhatsApp não encontrado!")
                return
            
            print(f"✅ Encontrado: {whatsapp_number.phone_number}")
            print(f"   ID: {whatsapp_number.id}")
            print(f"   org_id: {whatsapp_number.organization_id}")
            print(f"   default_flow_id: {whatsapp_number.default_flow_id}")
            
            # 2. Verificar se há fluxo padrão
            if not whatsapp_number.default_flow_id:
                print(f"\n⚠️  AVISO: Número NÃO tem default_flow_id configurado!")
                print(f"   Você precisa vincular um fluxo ao número para teste!")
                return
            
            print(f"\n✅ Fluxo padrão está configurado: {whatsapp_number.default_flow_id}")
            
            # 3. Processar webhook
            print("\n2️⃣  Processando webhook...")
            whatsapp_service = WhatsAppService(db)
            await whatsapp_service.process_webhook(webhook_payload)
            await db.commit()
            print("✅ Webhook processado!")
            
            # 4. Buscar contato e conversa criados
            print("\n3️⃣  Buscando conversa criada...")
            stmt = select(Conversation).where(
                Conversation.organization_id == whatsapp_number.organization_id
            ).order_by(Conversation.created_at.desc())
            
            result = await db.execute(stmt)
            conversation = result.scalars().first()
            
            if not conversation:
                print("❌ Conversa não foi criada!")
                return
            
            print(f"✅ Conversa criada: {conversation.id}")
            print(f"   is_bot_active: {conversation.is_bot_active}")
            print(f"   active_flow_id: {conversation.active_flow_id}")
            print(f"   current_node_id: {conversation.current_node_id}")
            
            print("\n" + "=" * 80)
            print("📋 ANÁLISE DOS RESULTADOS")
            print("=" * 80)
            
            if conversation.current_node_id:
                print(f"\n✅ SUCESSO! O fluxo foi iniciado!")
                print(f"   current_node_id está definido como: {conversation.current_node_id}")
            else:
                print(f"\n❌ PROBLEMA! O fluxo NÃO foi iniciado!")
                print(f"   current_node_id continua vazio")
                print(f"   Isso indica que _trigger_chatbot não funcionou!")
            
            # 5. CLEANUP
            print(f"\n4️⃣  Removendo dados de teste...")
            await db.delete(conversation)
            
            # Buscar e remover contato
            stmt = select(Contact).where(Contact.whatsapp_id == "5511999999999")
            result = await db.execute(stmt)
            contact = result.scalar_one_or_none()
            if contact:
                await db.delete(contact)
            
            await db.commit()
            print("✅ Dados de teste removidos!")
            
            print("\n" + "=" * 80)
            
        except Exception as e:
            print(f"\n❌ ERRO: {e}")
            import traceback
            traceback.print_exc()
            await db.rollback()

if __name__ == "__main__":
    asyncio.run(main())
