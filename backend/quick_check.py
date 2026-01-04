import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, text

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def main():
    try:
        async with AsyncSessionLocal() as session:
            # Check WhatsApp Number
            result = await session.execute(
                text("SELECT phone_number, default_flow_id FROM whatsapp_numbers LIMIT 1")
            )
            row = result.first()
            if row:
                print(f"Número: {row[0]}")
                print(f"Flow: {row[1]}")
            
            # Check Latest Conversations
            result = await session.execute(
                text("SELECT id, contact_phone, current_node_id FROM conversations ORDER BY created_at DESC LIMIT 1")
            )
            row = result.first()
            if row:
                print(f"\nÚltima conversa:")
                print(f"  ID: {row[0]}")
                print(f"  Telefone: {row[1]}")
                print(f"  Current Node: {row[2]}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
