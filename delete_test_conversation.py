#!/usr/bin/env python3
import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ DATABASE_URL not set")
    exit(1)

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def delete_conversation():
    try:
        async with AsyncSessionLocal() as session:
            conversation_id = "693d31b6-3634-4bed-949c-2d77ebb0c37a"
            
            # Delete messages first (FK constraint)
            result = await session.execute(
                text("DELETE FROM messages WHERE conversation_id = :conv_id"),
                {"conv_id": conversation_id}
            )
            msg_count = result.rowcount
            print(f"✅ Deletadas {msg_count} mensagens")
            
            # Then delete conversation
            result = await session.execute(
                text("DELETE FROM conversations WHERE id = :conv_id"),
                {"conv_id": conversation_id}
            )
            if result.rowcount > 0:
                print("✅ Conversa deletada")
            else:
                print("❌ Conversa não encontrada")
            
            await session.commit()
    except Exception as e:
        print(f"❌ Erro: {e}")

asyncio.run(delete_conversation())
