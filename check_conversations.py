#!/usr/bin/env python3
import os
import sys
sys.path.insert(0, '/app')
os.chdir('/app')

from sqlalchemy import text, create_engine, desc
from app.core.database import DATABASE_URL

sync_url = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
engine = create_engine(sync_url, echo=False)

with engine.connect() as conn:
    # Última conversa criada
    result = conn.execute(text("""
        SELECT id, contact_phone, current_node_id, is_bot_active, active_flow_id, created_at 
        FROM conversations 
        ORDER BY created_at DESC 
        LIMIT 3
    """))
    
    print("=" * 80)
    print("ÚLTIMAS 3 CONVERSAS")
    print("=" * 80)
    for row in result:
        print(f"ID: {row[0]}")
        print(f"  Telefone: {row[1]}")
        print(f"  Current Node ID: {row[2]}")
        print(f"  Bot Ativo: {row[3]}")
        print(f"  Flow ID: {row[4]}")
        print(f"  Criada em: {row[5]}")
        print()

    # Contar mensagens
    result = conn.execute(text("SELECT COUNT(*) as total FROM messages"))
    print(f"Total de mensagens no banco: {result.scalar()}")
    
    result = conn.execute(text("SELECT COUNT(*) as total FROM conversations"))
    print(f"Total de conversas no banco: {result.scalar()}")
