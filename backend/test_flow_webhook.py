#!/usr/bin/env python3
"""
Script de teste para debugar por que o fluxo não é acionado
quando uma mensagem é recebida via webhook do WhatsApp
"""

import asyncio
import json
from datetime import datetime, timedelta
from uuid import UUID
import sys
import os
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

# Set environment
os.environ.setdefault("ENV", "development")

async def main():
    from sqlalchemy import select
    
    from app.models.whatsapp_number import WhatsAppNumber
    from app.models.contact import Contact
    from app.models.conversation import Conversation, Message
    from app.models.chatbot import Flow
    from app.core.database import async_engine, AsyncSessionLocal
    
    # Use existing async session
    async_session = AsyncSessionLocal
    
    async with async_session() as session:
        try:
            print("=" * 80)
            print("🔍 TESTE DE FLUXO WHATSAPP")
            print("=" * 80)
            
            # 1. Get WhatsApp number
            print("\n1️⃣  Buscando número WhatsApp...")
            stmt = select(WhatsAppNumber).where(WhatsAppNumber.phone_number == "+556181277787")
            result = await session.execute(stmt)
            whatsapp_number = result.scalar_one_or_none()
            
            if not whatsapp_number:
                print("❌ Número WhatsApp não encontrado!")
                return
            
            print(f"✅ Encontrado: {whatsapp_number.phone_number}")
            print(f"   ID: {whatsapp_number.id}")
            print(f"   Organização: {whatsapp_number.organization_id}")
            print(f"   default_chatbot_id: {whatsapp_number.default_chatbot_id}")
            print(f"   default_flow_id: {whatsapp_number.default_flow_id}")
            
            # 2. Get Flow
            print("\n2️⃣  Buscando fluxo...")
            stmt = select(Flow).where(Flow.name == "Vendas e Conversão")
            result = await session.execute(stmt)
            flow = result.scalar_one_or_none()
            
            if not flow:
                print("❌ Fluxo não encontrado!")
                return
            
            print(f"✅ Encontrado: {flow.name}")
            print(f"   ID: {flow.id}")
            print(f"   is_main: {flow.is_main}")
            
            # 3. Create test contact
            print("\n3️⃣  Criando contato de teste...")
            test_contact = Contact(
                organization_id=whatsapp_number.organization_id,
                whatsapp_id="5511999999999",
                whatsapp_name="Teste Bot",
                source="whatsapp",
                lifecycle_stage="lead",
                last_message_received_at=datetime.utcnow(),
            )
            session.add(test_contact)
            await session.flush()
            print(f"✅ Contato criado: {test_contact.id}")
            
            # 4. Create conversation WITH default flow
            print("\n4️⃣  Criando conversa com fluxo padrão...")
            now = datetime.utcnow()
            window_expires = now + timedelta(hours=24)
            
            test_conversation = Conversation(
                organization_id=whatsapp_number.organization_id,
                contact_id=test_contact.id,
                whatsapp_number_id=whatsapp_number.id,
                status="open",
                channel="whatsapp",
                first_message_at=now,
                last_message_at=now,
                last_inbound_message_at=now,
                window_expires_at=window_expires,
                is_bot_active=True,
                active_chatbot_id=whatsapp_number.default_chatbot_id,
                active_flow_id=flow.id,  # 🔴 CRITICAL: Set default flow
                messages_from_contact=0,
                total_messages=0,
            )
            session.add(test_conversation)
            await session.flush()
            print(f"✅ Conversa criada: {test_conversation.id}")
            print(f"   is_bot_active: {test_conversation.is_bot_active}")
            print(f"   active_flow_id: {test_conversation.active_flow_id}")
            print(f"   active_chatbot_id: {test_conversation.active_chatbot_id}")
            
            # 5. Create test message
            print("\n5️⃣  Criando mensagem de teste...")
            test_message = Message(
                organization_id=whatsapp_number.organization_id,
                conversation_id=test_conversation.id,
                whatsapp_number_id=whatsapp_number.id,
                direction="inbound",
                sender_type="contact",
                whatsapp_message_id="wamid.test_12345",
                whatsapp_timestamp=int(datetime.utcnow().timestamp()),
                message_type="text",
                content={"text": "Olá, tudo bem?"},
                status="received",
            )
            session.add(test_message)
            await session.flush()
            print(f"✅ Mensagem criada: {test_message.id}")
            
            # 6. Commit all
            await session.commit()
            print("\n6️⃣  Dados salvos no banco!")
            
            print("\n" + "=" * 80)
            print("📋 RESUMO DO TESTE")
            print("=" * 80)
            print(f"\nContato: {test_contact.id}")
            print(f"Conversa: {test_conversation.id}")
            print(f"Mensagem: {test_message.id}")
            print(f"Fluxo vinculado: {flow.id} ({flow.name})")
            
            print("\n⏳ Aguardando 3 segundos para o sistema processar...")
            await asyncio.sleep(3)
            
            # 7. Check conversation after processing
            print("\n7️⃣  Verificando estado da conversa após processamento...")
            await session.refresh(test_conversation)
            print(f"   current_node_id: {test_conversation.current_node_id}")
            print(f"   active_flow_id: {test_conversation.active_flow_id}")
            print(f"   is_bot_active: {test_conversation.is_bot_active}")
            
            if test_conversation.current_node_id:
                print(f"\n✅ SUCESSO! Fluxo foi iniciado e current_node_id foi definido!")
            else:
                print(f"\n❌ PROBLEMA! current_node_id ainda está vazio!")
                print("   O fluxo NÃO foi acionado!")
            
            # 8. CLEANUP
            print("\n8️⃣  Limpando dados de teste...")
            await session.delete(test_message)
            await session.delete(test_conversation)
            await session.delete(test_contact)
            await session.commit()
            print(f"✅ Dados removidos com sucesso!")
            
            print("\n" + "=" * 80)
            print("✅ TESTE CONCLUÍDO")
            print("=" * 80)
            
        except Exception as e:
            print(f"\n❌ ERRO: {e}")
            import traceback
            traceback.print_exc()
            await session.rollback()
        finally:
            await async_engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
