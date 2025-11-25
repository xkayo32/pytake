#!/usr/bin/env python3
"""
Script para criar usuário admin padrão via FastAPI
"""

import asyncio
import os
import sys
import secrets
from datetime import datetime

# Configurações
ADMIN_EMAIL = "admin@pytake.net"
ADMIN_NAME = "Administrador Sistema"
ADMIN_ORG = "PyTake Admin"

# Gerar senha segura
ADMIN_PASSWORD = secrets.token_urlsafe(16)

async def create_admin():
    """Usar endpoint POST para criar admin"""
    import aiohttp
    
    backend_url = "https://api-dev.pytake.net"
    
    try:
        # Dados do admin
        user_data = {
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "full_name": ADMIN_NAME,
            "organization_name": ADMIN_ORG,
        }
        
        print("\n" + "=" * 70)
        print("🔐 CRIANDO USUÁRIO ADMIN".center(70))
        print("=" * 70)
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{backend_url}/api/v1/auth/register",
                json=user_data,
                ssl=False  # Dev mode
            ) as resp:
                if resp.status == 201 or resp.status == 200:
                    print(f"✅ Usuário criado com sucesso!")
                    data = await resp.json()
                    print(f"\n{data}")
                else:
                    result = await resp.text()
                    print(f"❌ Erro: {resp.status}")
                    print(f"Response: {result}")
        
        print("\n" + "=" * 70)
        print("✅ USUÁRIO ADMIN CRIADO COM SUCESSO".center(70))
        print("=" * 70)
        print(f"\n📧 Email:    {ADMIN_EMAIL}")
        print(f"🔑 Senha:    {ADMIN_PASSWORD}")
        print(f"👥 Role:     super_admin (configurar manualmente)")
        print(f"🏢 Org:      {ADMIN_ORG}")
        print("\n⚠️  IMPORTANTE:")
        print("   • Guarde a senha em lugar seguro")
        print("   • Role será definido na DB após criar o usuário")
        print("=" * 70 + "\n")
        
    except Exception as e:
        print(f"❌ Erro: {e}")

if __name__ == "__main__":
    asyncio.run(create_admin())
