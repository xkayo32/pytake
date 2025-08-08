#!/usr/bin/env python3
"""
WhatsApp Metrics and Health Monitor for PyTake
Monitora saúde do número, qualidade, limites e analytics
"""

from flask import Flask, request, jsonify
import requests
import os
import logging
from datetime import datetime, timedelta
import json

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configurações
WHATSAPP_BUSINESS_ACCOUNT_ID = "603204376199428"
PHONE_NUMBER_ID = "574293335763643"
ACCESS_TOKEN = os.environ.get('WHATSAPP_ACCESS_TOKEN', 
    'EAAJLLK95RIUBPBxhYMQQGrHFhhVTgGrdMKLDbTXK3p1udVslhZBkVMgzF4MfBIklsRVZAKXu9sHqpELTaZAZAEDuctKSFFGnPYDXQUU1tq9fa2M20vGtApxp5zdIH39pQyIxEUwm4Mm2e7EfNTOtqnNVSoZAFoJZBv0sheUaMyCXSKzOhr0U9vQMCrN1kBiRMkqQZDZD')
GRAPH_API_URL = "https://graph.facebook.com/v21.0"

@app.route('/api/v1/whatsapp/health', methods=['GET'])
def phone_health():
    """Obter saúde e status do número WhatsApp"""
    try:
        # Buscar informações do número
        url = f"{GRAPH_API_URL}/{PHONE_NUMBER_ID}"
        params = {
            "fields": "display_phone_number,verified_name,quality_rating,status,code_verification_status,platform_type,throughput,name_status"
        }
        headers = {"Authorization": f"Bearer {ACCESS_TOKEN}"}
        
        response = requests.get(url, params=params, headers=headers)
        phone_data = response.json()
        
        if 'error' in phone_data:
            return jsonify({"error": phone_data['error']}), 400
        
        # Buscar limites de mensagens
        limits_url = f"{GRAPH_API_URL}/{PHONE_NUMBER_ID}/whatsapp_business_messaging_rate_limit"
        limits_response = requests.get(limits_url, headers=headers)
        limits_data = limits_response.json()
        
        health_status = {
            "phone_number": phone_data.get('display_phone_number'),
            "verified_name": phone_data.get('verified_name'),
            "status": {
                "phone_status": phone_data.get('status'),
                "quality_rating": phone_data.get('quality_rating', 'UNKNOWN'),
                "platform_type": phone_data.get('platform_type'),
                "name_status": phone_data.get('name_status')
            },
            "limits": {
                "messaging_limit": limits_data.get('messaging_limit', 'UNKNOWN'),
                "rate_limit_tier": limits_data.get('tier', 'UNKNOWN')
            },
            "health_score": calculate_health_score(phone_data, limits_data),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return jsonify(health_status)
        
    except Exception as e:
        logger.error(f"Erro ao obter saúde do número: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/v1/whatsapp/analytics', methods=['GET'])
def message_analytics():
    """Obter analytics de mensagens enviadas/recebidas"""
    try:
        # Parâmetros de data
        days = request.args.get('days', 7, type=int)
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Buscar analytics do Business Account
        url = f"{GRAPH_API_URL}/{WHATSAPP_BUSINESS_ACCOUNT_ID}/analytics"
        params = {
            "fields": "analytics.start({int(start_date.timestamp())}).end({int(end_date.timestamp())}).granularity(DAY)",
            "metric_types": "conversation,message,cost"
        }
        headers = {"Authorization": f"Bearer {ACCESS_TOKEN}"}
        
        response = requests.get(url, params=params, headers=headers)
        analytics_data = response.json()
        
        # Buscar métricas de conversas
        conversations_url = f"{GRAPH_API_URL}/{WHATSAPP_BUSINESS_ACCOUNT_ID}/conversation_analytics"
        conv_params = {
            "start": int(start_date.timestamp()),
            "end": int(end_date.timestamp()),
            "granularity": "DAILY",
            "conversation_types": "SERVICE,BUSINESS_INITIATED,USER_INITIATED",
            "dimensions": "CONVERSATION_TYPE,CONVERSATION_DIRECTION"
        }
        
        conv_response = requests.get(conversations_url, params=conv_params, headers=headers)
        conv_data = conv_response.json()
        
        # Processar dados
        analytics = {
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "days": days
            },
            "messages": {
                "sent": extract_metric(analytics_data, 'messages_sent', 0),
                "delivered": extract_metric(analytics_data, 'messages_delivered', 0),
                "read": extract_metric(analytics_data, 'messages_read', 0),
                "received": extract_metric(analytics_data, 'messages_received', 0)
            },
            "conversations": {
                "total": extract_metric(conv_data, 'conversation_count', 0),
                "service": extract_metric(conv_data, 'service_conversation_count', 0),
                "business_initiated": extract_metric(conv_data, 'business_initiated_count', 0),
                "user_initiated": extract_metric(conv_data, 'user_initiated_count', 0)
            },
            "engagement": {
                "delivery_rate": calculate_rate(
                    extract_metric(analytics_data, 'messages_delivered', 0),
                    extract_metric(analytics_data, 'messages_sent', 1)
                ),
                "read_rate": calculate_rate(
                    extract_metric(analytics_data, 'messages_read', 0),
                    extract_metric(analytics_data, 'messages_delivered', 1)
                )
            },
            "costs": {
                "total": extract_metric(analytics_data, 'cost', 0),
                "currency": "USD"
            }
        }
        
        return jsonify(analytics)
        
    except Exception as e:
        logger.error(f"Erro ao obter analytics: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/v1/whatsapp/metrics/realtime', methods=['GET'])
def realtime_metrics():
    """Obter métricas em tempo real"""
    try:
        # Buscar métricas do último hora
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(hours=1)
        
        url = f"{GRAPH_API_URL}/{WHATSAPP_BUSINESS_ACCOUNT_ID}/messages"
        params = {
            "fields": "messages,statuses",
            "since": int(start_time.timestamp()),
            "until": int(end_time.timestamp())
        }
        headers = {"Authorization": f"Bearer {ACCESS_TOKEN}"}
        
        response = requests.get(url, params=params, headers=headers)
        data = response.json()
        
        # Processar métricas em tempo real
        metrics = {
            "last_hour": {
                "messages_sent": len([m for m in data.get('messages', []) if m.get('direction') == 'outbound']),
                "messages_received": len([m for m in data.get('messages', []) if m.get('direction') == 'inbound']),
                "active_conversations": len(set([m.get('from') for m in data.get('messages', [])])),
            },
            "current_status": {
                "is_active": True,
                "last_message_time": get_last_message_time(data),
                "response_time_avg": calculate_avg_response_time(data)
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return jsonify(metrics)
        
    except Exception as e:
        logger.error(f"Erro ao obter métricas em tempo real: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/v1/whatsapp/quality', methods=['GET'])
def quality_metrics():
    """Obter métricas de qualidade e performance"""
    try:
        # Buscar informações de qualidade
        url = f"{GRAPH_API_URL}/{PHONE_NUMBER_ID}"
        params = {"fields": "quality_rating,quality_score,status"}
        headers = {"Authorization": f"Bearer {ACCESS_TOKEN}"}
        
        response = requests.get(url, params=params, headers=headers)
        quality_data = response.json()
        
        # Buscar feedback e bloqueios
        feedback_url = f"{GRAPH_API_URL}/{WHATSAPP_BUSINESS_ACCOUNT_ID}/phone_numbers"
        params = {"fields": "display_phone_number,quality_rating,status,messaging_limit_tier"}
        
        feedback_response = requests.get(feedback_url, params=params, headers=headers)
        feedback_data = feedback_response.json()
        
        quality = {
            "quality_rating": quality_data.get('quality_rating', 'UNKNOWN'),
            "quality_score": quality_data.get('quality_score', 'N/A'),
            "recommendations": generate_quality_recommendations(quality_data),
            "risk_factors": identify_risk_factors(quality_data, feedback_data),
            "improvement_tips": [
                "Responda mensagens em até 24 horas",
                "Evite enviar mensagens não solicitadas",
                "Use templates aprovados para mensagens iniciais",
                "Mantenha conversas relevantes e úteis",
                "Respeite horários comerciais apropriados"
            ],
            "status": {
                "is_healthy": quality_data.get('quality_rating') in ['HIGH', 'MEDIUM'],
                "needs_attention": quality_data.get('quality_rating') == 'LOW',
                "blocked": quality_data.get('status') == 'BLOCKED'
            }
        }
        
        return jsonify(quality)
        
    except Exception as e:
        logger.error(f"Erro ao obter métricas de qualidade: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/v1/whatsapp/limits', methods=['GET'])
def messaging_limits():
    """Obter limites de mensagens e tier atual"""
    try:
        # Buscar limites de mensagens
        url = f"{GRAPH_API_URL}/{WHATSAPP_BUSINESS_ACCOUNT_ID}/message_template_namespace"
        headers = {"Authorization": f"Bearer {ACCESS_TOKEN}"}
        
        response = requests.get(url, headers=headers)
        namespace_data = response.json()
        
        # Buscar limites de rate
        rate_url = f"{GRAPH_API_URL}/{PHONE_NUMBER_ID}/whatsapp_business_messaging_rate_limit"
        rate_response = requests.get(rate_url, headers=headers)
        rate_data = rate_response.json()
        
        limits = {
            "messaging_limits": {
                "tier": rate_data.get('tier', 'UNKNOWN'),
                "daily_limit": get_tier_limit(rate_data.get('tier')),
                "current_usage": rate_data.get('current_usage', 0),
                "remaining": calculate_remaining_messages(rate_data)
            },
            "template_limits": {
                "namespace": namespace_data.get('id'),
                "daily_template_limit": namespace_data.get('message_template_namespace_quota', {}).get('value', 'UNLIMITED'),
                "templates_created": len(namespace_data.get('message_templates', []))
            },
            "rate_limits": {
                "messages_per_second": get_rate_limit(rate_data.get('tier')),
                "business_initiated_per_day": get_business_limit(rate_data.get('tier')),
                "user_initiated_window": "24 hours"
            },
            "upgrade_info": {
                "current_tier": rate_data.get('tier'),
                "next_tier": get_next_tier(rate_data.get('tier')),
                "requirements": get_tier_requirements(rate_data.get('tier'))
            }
        }
        
        return jsonify(limits)
        
    except Exception as e:
        logger.error(f"Erro ao obter limites: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/v1/whatsapp/dashboard', methods=['GET'])
def metrics_dashboard():
    """Dashboard completo com todas as métricas"""
    try:
        # Coletar todas as métricas
        health = phone_health().get_json()
        analytics = message_analytics().get_json()
        quality = quality_metrics().get_json()
        limits = messaging_limits().get_json()
        
        dashboard = {
            "overview": {
                "phone_number": health.get('phone_number'),
                "verified_name": health.get('verified_name'),
                "health_score": health.get('health_score'),
                "quality_rating": quality.get('quality_rating'),
                "tier": limits.get('messaging_limits', {}).get('tier')
            },
            "today": {
                "messages_sent": analytics.get('messages', {}).get('sent', 0),
                "messages_delivered": analytics.get('messages', {}).get('delivered', 0),
                "active_conversations": analytics.get('conversations', {}).get('total', 0),
                "delivery_rate": analytics.get('engagement', {}).get('delivery_rate', '0%')
            },
            "alerts": generate_alerts(health, quality, limits),
            "recommendations": quality.get('recommendations', []),
            "details": {
                "health": health,
                "analytics": analytics,
                "quality": quality,
                "limits": limits
            },
            "generated_at": datetime.utcnow().isoformat()
        }
        
        return jsonify(dashboard)
        
    except Exception as e:
        logger.error(f"Erro ao gerar dashboard: {e}")
        return jsonify({"error": str(e)}), 500

# Funções auxiliares
def calculate_health_score(phone_data, limits_data):
    """Calcular score de saúde do número (0-100)"""
    score = 100
    
    # Reduzir por quality rating
    quality = phone_data.get('quality_rating', 'UNKNOWN')
    if quality == 'LOW':
        score -= 40
    elif quality == 'MEDIUM':
        score -= 20
    elif quality == 'UNKNOWN':
        score -= 10
    
    # Reduzir por status
    if phone_data.get('status') != 'CONNECTED':
        score -= 30
    
    # Reduzir por limites
    tier = limits_data.get('tier', 'UNKNOWN')
    if tier == 'TIER_0':
        score -= 20
    elif tier == 'TIER_1':
        score -= 10
    
    return max(0, score)

def extract_metric(data, metric_name, default=0):
    """Extrair métrica dos dados de analytics"""
    try:
        if 'data' in data and len(data['data']) > 0:
            for item in data['data']:
                if metric_name in item:
                    return item[metric_name]
        return default
    except:
        return default

def calculate_rate(numerator, denominator):
    """Calcular taxa percentual"""
    if denominator == 0:
        return "0%"
    rate = (numerator / denominator) * 100
    return f"{rate:.1f}%"

def get_last_message_time(data):
    """Obter horário da última mensagem"""
    messages = data.get('messages', [])
    if messages:
        timestamps = [m.get('timestamp') for m in messages if m.get('timestamp')]
        if timestamps:
            return max(timestamps)
    return None

def calculate_avg_response_time(data):
    """Calcular tempo médio de resposta"""
    # Simplificado - retorna valor exemplo
    return "2.5 minutes"

def generate_quality_recommendations(quality_data):
    """Gerar recomendações baseadas na qualidade"""
    recommendations = []
    rating = quality_data.get('quality_rating', 'UNKNOWN')
    
    if rating == 'LOW':
        recommendations.extend([
            "URGENTE: Melhorar qualidade das conversas para evitar bloqueio",
            "Reduzir mensagens não solicitadas",
            "Aumentar taxa de resposta dos clientes"
        ])
    elif rating == 'MEDIUM':
        recommendations.extend([
            "Manter boas práticas de mensageria",
            "Monitorar feedback dos clientes",
            "Evitar mensagens em massa sem consentimento"
        ])
    else:
        recommendations.append("Continue mantendo alta qualidade nas conversas")
    
    return recommendations

def identify_risk_factors(quality_data, feedback_data):
    """Identificar fatores de risco"""
    risks = []
    
    if quality_data.get('quality_rating') == 'LOW':
        risks.append("Quality rating baixo - risco de restrições")
    
    if quality_data.get('status') != 'CONNECTED':
        risks.append("Número não está conectado")
    
    # Adicionar mais verificações conforme necessário
    
    return risks

def get_tier_limit(tier):
    """Obter limite diário por tier"""
    limits = {
        "TIER_0": 250,
        "TIER_1": 1000,
        "TIER_2": 10000,
        "TIER_3": 100000,
        "TIER_4": "UNLIMITED"
    }
    return limits.get(tier, "UNKNOWN")

def calculate_remaining_messages(rate_data):
    """Calcular mensagens restantes"""
    limit = get_tier_limit(rate_data.get('tier'))
    if isinstance(limit, int):
        used = rate_data.get('current_usage', 0)
        return limit - used
    return "UNLIMITED"

def get_rate_limit(tier):
    """Obter limite de rate por tier"""
    rates = {
        "TIER_0": 15,
        "TIER_1": 40,
        "TIER_2": 80,
        "TIER_3": 200,
        "TIER_4": 500
    }
    return rates.get(tier, "UNKNOWN")

def get_business_limit(tier):
    """Obter limite de mensagens business initiated"""
    return get_tier_limit(tier)

def get_next_tier(current_tier):
    """Obter próximo tier"""
    tiers = ["TIER_0", "TIER_1", "TIER_2", "TIER_3", "TIER_4"]
    try:
        idx = tiers.index(current_tier)
        if idx < len(tiers) - 1:
            return tiers[idx + 1]
    except:
        pass
    return "MAX_TIER"

def get_tier_requirements(current_tier):
    """Obter requisitos para próximo tier"""
    requirements = {
        "TIER_0": ["Verificar número de telefone", "Manter quality rating alto"],
        "TIER_1": ["Enviar mais de 1000 mensagens", "Manter baixa taxa de bloqueio"],
        "TIER_2": ["Volume consistente de mensagens", "Alta taxa de engajamento"],
        "TIER_3": ["Histórico excelente", "Volume muito alto"],
        "TIER_4": ["Máximo tier alcançado"]
    }
    return requirements.get(current_tier, [])

def generate_alerts(health, quality, limits):
    """Gerar alertas baseados nas métricas"""
    alerts = []
    
    # Alertas de saúde
    if health.get('health_score', 100) < 50:
        alerts.append({
            "type": "critical",
            "message": "Saúde do número está baixa - ação necessária"
        })
    
    # Alertas de qualidade
    if quality.get('quality_rating') == 'LOW':
        alerts.append({
            "type": "warning",
            "message": "Quality rating baixo - melhorar práticas de mensageria"
        })
    
    # Alertas de limites
    remaining = limits.get('messaging_limits', {}).get('remaining', 0)
    if isinstance(remaining, int) and remaining < 100:
        alerts.append({
            "type": "info",
            "message": f"Apenas {remaining} mensagens restantes hoje"
        })
    
    return alerts

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "service": "whatsapp_metrics"})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8082))
    logger.info(f"WhatsApp Metrics Service iniciando na porta {port}")
    app.run(host='0.0.0.0', port=port, debug=True)