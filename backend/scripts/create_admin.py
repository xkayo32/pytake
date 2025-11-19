#!/usr/bin/env python3
"""
Script para criar usuário admin padrão no sistema
Usage: python create_admin.py
"""

import asyncio
import os
import sys
from datetime import datetime

# Adicionar backend ao path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.user import User
from app.models.organization import Organization
from app.services.auth_service import hash_password
import secrets


async def create_admin_user():
    """Criar usuário administrador padrão"""

    # Configurações
    DATABASE_URL = os.getenv(
        "DATABASE_URL", "postgresql://pytake:pytake@localhost:5432/pytake"
    )
    ADMIN_EMAIL = "admin@pytake.net"
    ADMIN_NAME = "Administrador Sistema"
    ADMIN_ORG = "PyTake Admin"
    
    # Gerar senha segura
    ADMIN_PASSWORD = secrets.token_urlsafe(16)

    try:
        # Conectar ao banco
        engine = create_engine(DATABASE_URL, echo=False)
        Session = sessionmaker(bind=engine)
        session = Session()

        print("\n" + "=" * 70)
        print("🔐 CRIANDO USUÁRIO ADMIN".center(70))
        print("=" * 70)

        # Verificar se admin já existe
        existing_user = session.query(User).filter(User.email == ADMIN_EMAIL).first()
        if existing_user:
            print(f"❌ Usuário {ADMIN_EMAIL} já existe no sistema!")
            session.close()
            return

        # Verificar/Criar organização admin
        admin_org = (
            session.query(Organization)
            .filter(Organization.name == ADMIN_ORG)
            .first()
        )

        if not admin_org:
            print(f"📦 Criando organização: {ADMIN_ORG}...")
            admin_org = Organization(
                name=ADMIN_ORG,
                slug="pytake-admin",
                description="Organização administrativa do PyTake",
                is_active=True,
            )
            session.add(admin_org)
            session.flush()
        else:
            print(f"✅ Organização encontrada: {ADMIN_ORG}")

        # Criar usuário admin
        print(f"\n👤 Criando usuário admin...")
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

        print("\n" + "=" * 70)
        print("✅ USUÁRIO ADMIN CRIADO COM SUCESSO".center(70))
        print("=" * 70)
        print(f"\n📧 Email:    {ADMIN_EMAIL}")
        print(f"🔑 Senha:    {ADMIN_PASSWORD}")
        print(f"👥 Role:     super_admin")
        print(f"🏢 Org:      {ADMIN_ORG}")
        print("\n⚠️  IMPORTANTE:")
        print("   • Guarde a senha em lugar seguro")
        print("   • Mude a senha na primeira vez que fizer login")
        print("   • Use: /admin/users para gerenciar usuários")
        print("=" * 70 + "\n")

        session.close()

    except Exception as e:
        print(f"\n❌ Erro ao criar admin: {str(e)}")
        raise


if __name__ == "__main__":
    asyncio.run(create_admin_user())
