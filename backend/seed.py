"""
Script de seed para criar dados iniciais no banco de dados
"""
import asyncio
import sys
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.security import hash_password


async def seed_database():
    """Cria organização e usuários padrão"""

    # Create async engine
    # Convert postgresql:// to postgresql+asyncpg://
    db_url = str(settings.DATABASE_URL).replace('postgresql://', 'postgresql+asyncpg://')
    engine = create_async_engine(
        db_url,
        echo=True,
    )

    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as session:
        try:
            # 1. Criar organização padrão
            print("🏢 Criando organização padrão...")
            org_result = await session.execute(
                text("""
                    INSERT INTO organizations (name, slug, settings, is_active)
                    VALUES (:name, :slug, :settings, true)
                    RETURNING id
                """),
                {
                    "name": "PyTake Demo",
                    "slug": "pytake-demo",
                    "settings": "{}",
                }
            )
            org_id = org_result.scalar_one()
            print(f"✅ Organização criada: {org_id}")

            # 2. Criar usuário admin
            print("👤 Criando usuário admin...")
            admin_password = hash_password("Admin123")
            await session.execute(
                text("""
                    INSERT INTO users (
                        organization_id, email, password_hash, full_name,
                        role, is_active, permissions
                    )
                    VALUES (
                        :org_id, :email, :password_hash, :full_name,
                        :role, true, ARRAY[]::varchar[]
                    )
                """),
                {
                    "org_id": org_id,
                    "email": "admin@pytake.com",
                    "password_hash": admin_password,
                    "full_name": "Administrador",
                    "role": "org_admin",
                }
            )
            print("✅ Usuário admin criado: admin@pytake.com")

            # 3. Criar usuário agente
            print("👤 Criando usuário agente...")
            agent_password = hash_password("Agente123")
            await session.execute(
                text("""
                    INSERT INTO users (
                        organization_id, email, password_hash, full_name,
                        role, is_active, permissions, agent_status
                    )
                    VALUES (
                        :org_id, :email, :password_hash, :full_name,
                        :role, true, ARRAY[]::varchar[], :agent_status
                    )
                """),
                {
                    "org_id": org_id,
                    "email": "agente@pytake.com",
                    "password_hash": agent_password,
                    "full_name": "Agente de Suporte",
                    "role": "agent",
                    "agent_status": "available",
                }
            )
            print("✅ Usuário agente criado: agente@pytake.com")

            # Commit transaction
            await session.commit()

            print("\n✨ Seed concluído com sucesso!")
            print("\n📋 Credenciais de acesso:")
            print("   Admin:")
            print("   - Email: admin@pytake.com")
            print("   - Senha: Admin123")
            print("\n   Agente:")
            print("   - Email: agente@pytake.com")
            print("   - Senha: Agente123")

        except Exception as e:
            await session.rollback()
            print(f"❌ Erro ao criar seed: {e}")
            raise
        finally:
            await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed_database())
