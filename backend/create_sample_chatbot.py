#!/usr/bin/env python
"""
Script para criar um chatbot de exemplo
Autor: Kayo Carvalho Fernandes
Data: 10/02/2026
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, '/home/administrator/pytake/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pytake.settings')
django.setup()

from apps.chatbots.models import Chatbot
from apps.organizations.models import Organization


def create_sample_chatbot():
    """Cria um chatbot de exemplo para permitir uso dos templates"""
    
    print("\n" + "="*80)
    print("CRIANDO CHATBOT DE EXEMPLO")
    print("="*80)
    
    try:
        # Pegar primeira organização
        org = Organization.objects.filter(deleted_at__isnull=True).first()
        
        if not org:
            print("❌ Nenhuma organização encontrada")
            return False
        
        print(f"✓ Organização: {org.name}")
        
        # Verificar se já existe um chatbot
        existing = Chatbot.objects.filter(
            organization=org,
            deleted_at__isnull=True
        ).first()
        
        if existing:
            print(f"✓ Chatbot já existe: {existing.name}")
            return True
        
        # Criar chatbot de exemplo
        chatbot = Chatbot.objects.create(
            organization=org,
            name="Atendimento Principal",
            description="Chatbot principal para atendimento ao cliente",
            is_active=True,
            is_published=False,
            settings={
                "greeting_message": "Olá! Como posso ajudar você hoje?",
                "fallback_message": "Desculpe, não entendi. Pode reformular?",
                "flow": {
                    "nodes": [],
                    "edges": []
                }
            }
        )
        
        print(f"✓ Chatbot criado: {chatbot.name} (ID: {chatbot.id})")
        print(f"  Ativo: {chatbot.is_active}")
        print(f"  Publicado: {chatbot.is_published}")
        
        print("\n" + "="*80)
        print("✅ CHATBOT CRIADO COM SUCESSO!")
        print("Agora você pode usar os templates de flows.")
        print("="*80 + "\n")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro ao criar chatbot: {e}")
        return False


if __name__ == '__main__':
    success = create_sample_chatbot()
    sys.exit(0 if success else 1)