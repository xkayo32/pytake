"""
Migration script - Assign roles to existing users

Executa:
1. Inicializa roles padrão para todas as organizações
2. Assign role 'super_admin' para usuários com role='super_admin'
3. Assign role 'org_admin' para usuários com role='org_admin'
4. Assign role 'agent' para demais usuários
"""

import asyncio
import logging
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.models import Base, Role, User
from app.services.role_service import RoleService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def migrate_users_to_dynamic_roles(db: AsyncSession):
    """Migrate existing users to dynamic role system"""
    
    logger.info("=" * 80)
    logger.info("MIGRAÇÃO: Usuários para Sistema Dinâmico de Roles")
    logger.info("=" * 80)
    
    # Step 1: Get all organizations
    stmt = select(User.organization_id).distinct()
    result = await db.execute(stmt)
    org_ids = [row[0] for row in result.fetchall()]
    
    logger.info(f"\n✓ Encontradas {len(org_ids)} organizações")
    
    # Step 2: Initialize system roles for each organization
    for org_id in org_ids:
        logger.info(f"\n  Inicializando roles para org: {org_id}")
        service = RoleService(db)
        
        try:
            await service.initialize_system_roles(org_id)
            logger.info(f"  ✓ Roles inicializadas para org {org_id}")
        except Exception as e:
            logger.warning(f"  ⚠ Roles já existentes para org {org_id}: {e}")
    
    # Step 3: Assign roles to existing users
    logger.info("\n\n  Atribuindo roles aos usuários...")
    
    # Get all users with legacy role string
    stmt = select(User).where(User.role.isnot(None))
    result = await db.execute(stmt)
    users_with_legacy_role = result.scalars().all()
    
    logger.info(f"  Encontrados {len(users_with_legacy_role)} usuários com role legada\n")
    
    migration_stats = {
        "super_admin": 0,
        "org_admin": 0,
        "agent": 0,
        "viewer": 0,
        "unknown": 0,
    }
    
    for user in users_with_legacy_role:
        try:
            # Get role ID by name and organization
            stmt = select(Role).where(
                (Role.name == user.role) &
                (Role.organization_id == user.organization_id)
            )
            result = await db.execute(stmt)
            role = result.scalars().first()
            
            if role:
                # Update user.role_id
                user.role_id = role.id
                migration_stats[user.role] += 1
                logger.info(f"  ✓ {user.email:40} ({user.role:15}) -> role_id={str(role.id)[:8]}...")
            else:
                logger.warning(f"  ⚠ Role não encontrada para {user.email} ({user.role})")
                migration_stats["unknown"] += 1
                
        except Exception as e:
            logger.error(f"  ✗ Erro ao processar {user.email}: {e}")
            migration_stats["unknown"] += 1
    
    # Commit changes
    try:
        await db.commit()
        logger.info("\n✓ Mudanças commitadas com sucesso")
    except Exception as e:
        logger.error(f"\n✗ Erro ao commitar: {e}")
        await db.rollback()
        return False
    
    # Print summary
    logger.info("\n" + "=" * 80)
    logger.info("RESUMO DA MIGRAÇÃO:")
    logger.info("=" * 80)
    for role_name, count in migration_stats.items():
        if count > 0:
            logger.info(f"  {role_name:15}: {count:3} usuários")
    logger.info("=" * 80 + "\n")
    
    return True


async def main():
    """Main migration function"""
    # Get database URL from environment
    import os
    from dotenv import load_dotenv
    
    load_dotenv()
    
    db_url = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/pytake"
    )
    
    logger.info(f"Conectando ao banco: {db_url.split('@')[1] if '@' in db_url else '...'}")
    
    # Create async engine
    engine = create_async_engine(db_url, echo=False)
    
    # Create session
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    try:
        async with async_session() as db:
            success = await migrate_users_to_dynamic_roles(db)
            
            if success:
                logger.info("\n✓ MIGRAÇÃO CONCLUÍDA COM SUCESSO!")
                return 0
            else:
                logger.error("\n✗ MIGRAÇÃO FALHOU!")
                return 1
                
    except Exception as e:
        logger.error(f"\n✗ Erro fatal: {e}", exc_info=True)
        return 1
    finally:
        await engine.dispose()


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)
