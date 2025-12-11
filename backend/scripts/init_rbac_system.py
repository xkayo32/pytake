"""
Script para inicializar RBAC system e migrar usuários existentes

Execução:
    docker exec pytake-backend-dev python -m scripts.init_rbac_system
"""

import asyncio
import sys
import logging
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker, Session

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_rbac_system():
    """Initialize RBAC system for all organizations"""
    
    # Import ALL models first
    from app.models import (
        Base, User, Organization, Role, Permission, RolePermission,
    )
    from app.services.role_service import RoleService
    from app.core.config import settings
    
    # Create sync engine
    db_url = str(settings.DATABASE_URL).replace("postgresql://", "postgresql+psycopg2://")
    engine = create_engine(db_url, echo=False)
    Session = sessionmaker(bind=engine)
    db = Session()
    
    try:
        # Get all organizations
        organizations = db.query(Organization).all()
        
        logger.info(f"Found {len(organizations)} organizations")
        
        # Initialize RBAC for each organization
        for org in organizations:
            logger.info(f"Initializing RBAC for organization: {org.name} ({org.id})")
            
            # Usar async service de forma síncrona (não ideal, mas funciona para init)
            service = RoleService(db)
            try:
                # Run async init synchronously
                asyncio.run(service.initialize_system_roles(org.id))
                logger.info(f"✅ RBAC initialized for {org.name}")
            except Exception as e:
                logger.warning(f"⚠️ RBAC already initialized for {org.name}: {e}")
        
        # Migrate existing users to use role_id
        logger.info("\n" + "="*60)
        logger.info("Migrating existing users to new RBAC system...")
        logger.info("="*60)
        
        users_to_migrate = db.query(User).filter(User.role != None).all()
        
        logger.info(f"Found {len(users_to_migrate)} users to migrate")
        
        for user in users_to_migrate:
            # Map old role string to new role_id
            old_role = user.role
            org_id = user.organization_id
            
            # Get the corresponding role
            role = db.query(Role).filter(
                Role.name == old_role,
                Role.organization_id == org_id
            ).first()
            
            if role:
                user.role_id = role.id
                user.role = None  # Clear old role field
                db.flush()
                logger.info(f"✅ User {user.email} ({old_role}) -> role_id={role.id}")
            else:
                logger.warning(f"⚠️ User {user.email}: Role '{old_role}' not found in org {org_id}")
        
        db.commit()
        
        logger.info("\n" + "="*60)
        logger.info("✅ RBAC initialization complete!")
        logger.info("="*60)
        logger.info("\nSummary:")
        logger.info(f"- Organizations configured: {len(organizations)}")
        logger.info(f"- Users migrated: {len(users_to_migrate)}")
        logger.info("\nNext steps:")
        logger.info("1. All users now have role_id assigned to new RBAC system")
        logger.info("2. System roles (super_admin, org_admin, agent, viewer) are available")
        logger.info("3. Use /roles endpoints to manage permissions dynamically")
        logger.info("4. Update endpoints to use @Depends(require_permission_dynamic('...'))")
        
    except Exception as e:
        logger.error(f"❌ Error during RBAC initialization: {e}", exc_info=True)
        db.rollback()
        raise
    finally:
        db.close()
        engine.dispose()


if __name__ == "__main__":
    init_rbac_system()
