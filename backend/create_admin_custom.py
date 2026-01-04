#!/usr/bin/env python3
"""
Script para criar/atualizar usuário admin com credenciais específicas
"""

import sys
import os
sys.path.insert(0, '/app')

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.user import User
from app.models.organization import Organization
from app.services.auth_service import hash_password
from datetime import datetime

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://pytake_user:password@postgres:5432/pytake"
)

def create_custom_admin():
    """Criar admin com credenciais específicas"""
    
    engine = create_engine(DATABASE_URL, echo=False)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        ADMIN_EMAIL = "admin@pytake.net"
        ADMIN_PASSWORD = "nYVUJy9w5hYQGh52CSpM0g"
        ADMIN_NAME = "Administrador Sistema"
        ADMIN_ORG = "PyTake Admin"
        
        print(f"🔐 Criando admin com senha específica...")
        
        # Verificar/Criar organização
        admin_org = session.query(Organization).filter(
            Organization.name == ADMIN_ORG
        ).first()
        
        if not admin_org:
            print(f"📦 Criando organização: {ADMIN_ORG}")
            admin_org = Organization(
                name=ADMIN_ORG,
                slug="pytake-admin",
                description="Organização administrativa do PyTake",
                is_active=True,
            )
            session.add(admin_org)
            session.flush()
        
        # Criar usuário
        admin_user = User(
            organization_id=admin_org.id,
            email=ADMIN_EMAIL,
            password_hash=hash_password(ADMIN_PASSWORD),
            full_name=ADMIN_NAME,
            role="super_admin",
            is_active=True,
            email_verified=True,
            email_verified_at=datetime.utcnow(),
        )
        
        session.add(admin_user)
        session.commit()
        
        print(f"✅ Admin criado com sucesso!")
        print(f"📧 Email:    {ADMIN_EMAIL}")
        print(f"🔑 Senha:    {ADMIN_PASSWORD}")
        print(f"👥 Role:     super_admin")
        print(f"🏢 Org:      {ADMIN_ORG}")
        
        session.close()
        return True
        
    except Exception as e:
        print(f"❌ Erro: {str(e)}")
        session.close()
        return False

if __name__ == "__main__":
    create_custom_admin()
