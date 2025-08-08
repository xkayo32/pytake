#!/usr/bin/env python3
"""
Script para testar endpoints de métricas WhatsApp
"""
import requests
import json
import os

# Configurações
ACCESS_TOKEN = os.environ.get('WHATSAPP_ACCESS_TOKEN', 
    'EAAJLLK95RIUBPBxhYMQQGrHFhhVTgGrdMKLDbTXK3p1udVslhZBkVMgzF4MfBIklsRVZAKXu9sHqpELTaZAZAEDuctKSFFGnPYDXQUU1tq9fa2M20vGtApxp5zdIH39pQyIxEUwm4Mm2e7EfNTOtqnNVSoZAFoJZBv0sheUaMyCXSKzOhr0U9vQMCrN1kBiRMkqQZDZD')
PHONE_NUMBER_ID = "574293335763643"
GRAPH_API_URL = "https://graph.facebook.com/v21.0"

def test_phone_health():
    """Testar saúde do número WhatsApp"""
    print("\n=== Testando Saúde do Número ===")
    
    url = f"{GRAPH_API_URL}/{PHONE_NUMBER_ID}"
    params = {
        "fields": "display_phone_number,verified_name,quality_rating,status,code_verification_status,platform_type,throughput,name_status"
    }
    headers = {"Authorization": f"Bearer {ACCESS_TOKEN}"}
    
    try:
        response = requests.get(url, params=params, headers=headers)
        data = response.json()
        
        if 'error' in data:
            print(f"❌ Erro: {data['error']}")
        else:
            print(f"✅ Número: {data.get('display_phone_number', 'N/A')}")
            print(f"✅ Nome Verificado: {data.get('verified_name', 'N/A')}")
            print(f"✅ Quality Rating: {data.get('quality_rating', 'UNKNOWN')}")
            print(f"✅ Status: {data.get('status', 'N/A')}")
            print(f"✅ Platform: {data.get('platform_type', 'N/A')}")
            
            # Calcular health score
            quality = data.get('quality_rating', 'UNKNOWN')
            if quality == 'HIGH':
                score = 100
            elif quality == 'MEDIUM':
                score = 80
            elif quality == 'LOW':
                score = 40
            else:
                score = 50
            print(f"✅ Health Score: {score}/100")
            
    except Exception as e:
        print(f"❌ Erro ao buscar saúde: {e}")

def test_messaging_limits():
    """Testar limites de mensagens"""
    print("\n=== Testando Limites de Mensagens ===")
    
    # Buscar informações da conta business
    url = f"{GRAPH_API_URL}/603204376199428"
    params = {"fields": "messaging_limit_tier,name"}
    headers = {"Authorization": f"Bearer {ACCESS_TOKEN}"}
    
    try:
        response = requests.get(url, params=params, headers=headers)
        data = response.json()
        
        if 'error' in data:
            print(f"❌ Erro: {data['error']}")
        else:
            tier = data.get('messaging_limit_tier', 'UNKNOWN')
            print(f"✅ Tier Atual: {tier}")
            
            # Limites por tier
            limits = {
                "TIER_0": 250,
                "TIER_1": 1000,
                "TIER_2": 10000,
                "TIER_3": 100000,
                "TIER_4": "UNLIMITED"
            }
            print(f"✅ Limite Diário: {limits.get(tier, 'UNKNOWN')} mensagens")
            
    except Exception as e:
        print(f"❌ Erro ao buscar limites: {e}")

def test_template_stats():
    """Testar estatísticas de templates"""
    print("\n=== Testando Templates ===")
    
    url = f"{GRAPH_API_URL}/603204376199428/message_templates"
    headers = {"Authorization": f"Bearer {ACCESS_TOKEN}"}
    
    try:
        response = requests.get(url, headers=headers)
        data = response.json()
        
        if 'error' in data:
            print(f"❌ Erro: {data['error']}")
        else:
            templates = data.get('data', [])
            print(f"✅ Total de Templates: {len(templates)}")
            
            # Contar por status
            status_count = {}
            for template in templates:
                status = template.get('status', 'UNKNOWN')
                status_count[status] = status_count.get(status, 0) + 1
            
            for status, count in status_count.items():
                print(f"  - {status}: {count}")
            
            # Listar templates aprovados
            approved = [t for t in templates if t.get('status') == 'APPROVED']
            if approved:
                print("\n📋 Templates Aprovados:")
                for t in approved[:5]:  # Mostrar apenas 5
                    print(f"  - {t.get('name')} ({t.get('language', 'N/A')})")
                    
    except Exception as e:
        print(f"❌ Erro ao buscar templates: {e}")

def test_conversation_analytics():
    """Testar analytics de conversas (simulado)"""
    print("\n=== Analytics de Conversas (Últimos 7 dias) ===")
    
    # Por enquanto, mostrar dados simulados pois requer configuração específica
    print("📊 Métricas Simuladas:")
    print("  - Mensagens Enviadas: 1,250")
    print("  - Mensagens Entregues: 1,200 (96%)")
    print("  - Mensagens Lidas: 980 (81.7%)")
    print("  - Mensagens Recebidas: 850")
    print("  - Conversas Ativas: 125")
    print("  - Custo Total: $12.50 USD")

def main():
    print("🔍 Testando Métricas WhatsApp para PyTake")
    print("=" * 50)
    
    test_phone_health()
    test_messaging_limits()
    test_template_stats()
    test_conversation_analytics()
    
    print("\n" + "=" * 50)
    print("✅ Testes de métricas concluídos!")
    print("\n📌 Endpoints disponíveis na API:")
    print("  GET /api/v1/whatsapp/health - Saúde do número")
    print("  GET /api/v1/whatsapp/analytics - Analytics de mensagens")
    print("  GET /api/v1/whatsapp/quality - Métricas de qualidade")
    print("  GET /api/v1/whatsapp/limits - Limites de mensagens")
    print("  GET /api/v1/whatsapp/dashboard - Dashboard completo")

if __name__ == "__main__":
    main()