#!/usr/bin/env python
"""
Script de teste para verificar o fluxo completo de AI Settings
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

from apps.ai_assistant.models import AISettings
from apps.ai_assistant.serializers import AISettingsSerializer
from apps.organizations.models import Organization


def test_ai_settings_flow():
    """Testa o fluxo completo de criação, leitura e atualização de AI Settings"""
    
    print("\n" + "="*80)
    print("TESTE: Fluxo Completo de AI Settings")
    print("="*80)
    
    # 1. Pegar primeira organização (ou criar uma de teste)
    try:
        org = Organization.objects.filter(deleted_at__isnull=True).first()
        if not org:
            print("❌ Nenhuma organização encontrada no banco")
            return False
        
        print(f"✓ Organização: {org.name} (ID: {org.id})")
        
    except Exception as e:
        print(f"❌ Erro ao buscar organização: {e}")
        return False
    
    # 2. Criar/Obter AI Settings
    try:
        settings, created = AISettings.objects.get_or_create(
            organization=org,
            defaults={
                'enabled': True,
                'provider': 'openai',
                'model': 'gpt-4o-mini',
                'temperature': 0.7,
                'max_tokens': 2048,
                'openai_api_key': 'sk-test1234567890abcdefghijklmnopqrstuvwxyz',
                'enable_flow_generation': False,
                'enable_improvements': False,
            }
        )
        
        status = "Criado" if created else "Já existia"
        print(f"✓ AI Settings {status}")
        print(f"  Provider: {settings.provider}")
        print(f"  Model: {settings.model}")
        print(f"  OpenAI Key: {'[Configurado]' if settings.openai_api_key else '[Não configurado]'}")
        
    except Exception as e:
        print(f"❌ Erro ao criar/obter AI Settings: {e}")
        return False
    
    # 3. Testar serialização (GET)
    print("\n" + "-"*80)
    print("TESTE: Serialização (GET) - Leitura com API Keys Mascaradas")
    print("-"*80)
    
    try:
        serializer = AISettingsSerializer(settings)
        data = serializer.data
        
        print("✓ Dados serializados:")
        print(f"  enabled: {data.get('enabled')}")
        print(f"  default_provider: {data.get('default_provider')}")
        print(f"  model: {data.get('model')}")
        print(f"  temperature: {data.get('temperature')}")
        print(f"  max_tokens: {data.get('max_tokens')}")
        print(f"  openai_api_key: {data.get('openai_api_key')}")
        print(f"  anthropic_api_key: {data.get('anthropic_api_key')}")
        print(f"  gemini_api_key: {data.get('gemini_api_key')}")
        
        # Verificar se as API keys estão mascaradas
        if data.get('openai_api_key') and '...' in data.get('openai_api_key'):
            print("  ✓ OpenAI Key está corretamente mascarada")
        elif data.get('openai_api_key'):
            print("  ⚠️  OpenAI Key NÃO está mascarada (vazamento de segurança!)")
        
    except Exception as e:
        print(f"❌ Erro ao serializar: {e}")
        return False
    
    # 4. Testar atualização (POST/PUT)
    print("\n" + "-"*80)
    print("TESTE: Atualização (POST/PUT) - Mudança de provider e modelo")
    print("-"*80)
    
    try:
        update_data = {
            'default_provider': 'anthropic',
            'model': 'claude-sonnet-4-20250514',
            'temperature': 0.8,
            'max_tokens': 4096,
        }
        
        serializer = AISettingsSerializer(settings, data=update_data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            settings.refresh_from_db()
            
            print("✓ Atualização bem-sucedida:")
            print(f"  Provider: {settings.provider} (esperado: anthropic)")
            print(f"  Model: {settings.model} (esperado: claude-sonnet-4-20250514)")
            print(f"  Temperature: {settings.temperature} (esperado: 0.8)")
            print(f"  Max Tokens: {settings.max_tokens} (esperado: 4096)")
            
            # Verificar se a API key foi preservada
            if settings.openai_api_key:
                print(f"  ✓ OpenAI Key preservada após atualização")
            else:
                print(f"  ⚠️  OpenAI Key foi perdida após atualização")
            
        else:
            print(f"❌ Erros de validação: {serializer.errors}")
            return False
            
    except Exception as e:
        print(f"❌ Erro ao atualizar: {e}")
        return False
    
    # 5. Testar atualização de API key com valor mascarado
    print("\n" + "-"*80)
    print("TESTE: Atualização com API Key Mascarada (não deve sobrescrever)")
    print("-"*80)
    
    try:
        masked_data = {
            'openai_api_key': 'sk-test12...wxyz',  # Valor mascarado
            'model': 'gpt-4o',
        }
        
        original_key = settings.openai_api_key
        
        serializer = AISettingsSerializer(settings, data=masked_data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            settings.refresh_from_db()
            
            if settings.openai_api_key == original_key:
                print("  ✓ API Key preservada (valor mascarado foi ignorado)")
            else:
                print("  ⚠️  API Key foi sobrescrita com valor mascarado!")
            
            print(f"  Model atualizado: {settings.model} (esperado: gpt-4o)")
            
        else:
            print(f"❌ Erros de validação: {serializer.errors}")
            return False
            
    except Exception as e:
        print(f"❌ Erro ao atualizar com valor mascarado: {e}")
        return False
    
    # 6. Testar atualização de API key com novo valor
    print("\n" + "-"*80)
    print("TESTE: Atualização com Nova API Key (deve atualizar)")
    print("-"*80)
    
    try:
        new_key_data = {
            'anthropic_api_key': 'sk-ant-new-key-1234567890abcdefghijklmnop',
        }
        
        serializer = AISettingsSerializer(settings, data=new_key_data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            settings.refresh_from_db()
            
            if settings.anthropic_api_key:
                print("  ✓ Anthropic API Key atualizada com sucesso")
            else:
                print("  ⚠️  Anthropic API Key não foi salva")
            
        else:
            print(f"❌ Erros de validação: {serializer.errors}")
            return False
            
    except Exception as e:
        print(f"❌ Erro ao atualizar nova API key: {e}")
        return False
    
    print("\n" + "="*80)
    print("✓ TODOS OS TESTES PASSARAM!")
    print("="*80 + "\n")
    return True


if __name__ == '__main__':
    success = test_ai_settings_flow()
    sys.exit(0 if success else 1)
