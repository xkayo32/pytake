#!/usr/bin/env python3
import os
os.environ['PYTAKE_ENV'] = 'development'

from sqlalchemy import text, create_engine
from app.core.database import DATABASE_URL

# Create sync engine
sync_url = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
engine = create_engine(sync_url, echo=False)

with engine.connect() as conn:
    # Delete messages first
    result = conn.execute(
        text("DELETE FROM messages WHERE conversation_id = :id"),
        {"id": "693d31b6-3634-4bed-949c-2d77ebb0c37a"}
    )
    print(f"✅ Deletadas {result.rowcount} mensagens")
    
    # Delete conversation
    result = conn.execute(
        text("DELETE FROM conversations WHERE id = :id"),
        {"id": "693d31b6-3634-4bed-949c-2d77ebb0c37a"}
    )
    print(f"✅ Conversa deletada" if result.rowcount > 0 else "❌ Não encontrada")
    
    conn.commit()

print("\n✅ Limpeza concluída!")
