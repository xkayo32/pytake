"""
Script para criar usuário admin no PyTake
"""
import sys
sys.path.insert(0, "/app")

from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.core.security import hash_password


def create_admin_user(email: str, password: str, full_name: str):
    """Cria usuário admin"""
    
    # Usar engine síncrono
    db_url = str(settings.DATABASE_URL).replace("postgresql+asyncpg://", "postgresql://")
    print(f"🔌 Conectando ao banco...")
    
    engine = create_engine(
        db_url,
        echo=False,
        poolclass=NullPool,
    )
    
    try:
        with engine.connect() as conn:
            # 1. Obter ou criar organização PyTake
            result = conn.execute(
                text("SELECT id FROM organizations WHERE name = 'PyTake' LIMIT 1")
            )
            org_row = result.fetchone()
            
            if not org_row:
                print("📦 Organização 'PyTake' não existe. Criando...")
                conn.execute(
                    text("""
                        INSERT INTO organizations (name, slug, is_trial)
                        VALUES ('PyTake', 'pytake', true)
                    """)
                )
                conn.commit()
                
                result = conn.execute(
                    text("SELECT id FROM organizations WHERE name = 'PyTake' LIMIT 1")
                )
                org_row = result.fetchone()
            
            org_id = org_row[0]
            print(f"✅ Organização encontrada: {org_id}")
            
            # 2. Verificar se usuário já existe
            result = conn.execute(
                text("SELECT id FROM users WHERE email = :email"),
                {"email": email}
            )
            existing = result.fetchone()
            
            if existing:
                print(f"⚠️  Usuário {email} já existe. Atualizando...")
                conn.execute(
                    text("""
                        UPDATE users 
                        SET password_hash = :password_hash,
                            full_name = :full_name,
                            role = 'super_admin',
                            is_active = true
                        WHERE email = :email
                    """),
                    {
                        "email": email,
                        "password_hash": hash_password(password),
                        "full_name": full_name,
                    }
                )
                conn.commit()
                print(f"✅ Usuário {email} atualizado como super_admin")
            else:
                # 3. Criar novo usuário admin
                print(f"👤 Criando novo usuário admin {email}...")
                password_hash = hash_password(password)
                
                conn.execute(
                    text("""
                        INSERT INTO users (
                            organization_id, email, password_hash, full_name,
                            role, is_active, email_verified
                        )
                        VALUES (
                            :org_id, :email, :password_hash, :full_name,
                            :role, true, true
                        )
                    """),
                    {
                        "org_id": org_id,
                        "email": email,
                        "password_hash": password_hash,
                        "full_name": full_name,
                        "role": "super_admin",
                    }
                )
                conn.commit()
                print(f"✅ Usuário admin criado com sucesso!")
            
            print("\n" + "="*50)
            print("✨ USUÁRIO ADMIN CRIADO!")
            print("="*50)
            print(f"\n📧 Email: {email}")
            print(f"🔑 Senha: {password}")
            print(f"👤 Nome: {full_name}")
            print(f"🎖️  Role: super_admin")
            print(f"\n🔗 URL: https://app-dev.pytake.net/login")
            print("="*50)
    
    except Exception as e:
        print(f"❌ Erro: {e}")
        import traceback
        traceback.print_exc()
    finally:
        engine.dispose()


if __name__ == "__main__":
    email = sys.argv[1] if len(sys.argv) > 1 else "admin@pytake.net"
    password = sys.argv[2] if len(sys.argv) > 2 else "nYVUJy9w5hYQGh52CSpM0g"
    full_name = sys.argv[3] if len(sys.argv) > 3 else "Administrador PyTake"
    
    create_admin_user(email, password, full_name)
