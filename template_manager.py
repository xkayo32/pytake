#!/usr/bin/env python3
"""
WhatsApp Template Manager for PyTake Backend
Gerencia criação, listagem e deleção de templates
"""

from flask import Flask, request, jsonify
import requests
import os
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configurações
WHATSAPP_BUSINESS_ACCOUNT_ID = "603204376199428"
ACCESS_TOKEN = os.environ.get('WHATSAPP_ACCESS_TOKEN', 
    'EAAJLLK95RIUBPBxhYMQQGrHFhhVTgGrdMKLDbTXK3p1udVslhZBkVMgzF4MfBIklsRVZAKXu9sHqpELTaZAZAEDuctKSFFGnPYDXQUU1tq9fa2M20vGtApxp5zdIH39pQyIxEUwm4Mm2e7EfNTOtqnNVSoZAFoJZBv0sheUaMyCXSKzOhr0U9vQMCrN1kBiRMkqQZDZD')
GRAPH_API_URL = "https://graph.facebook.com/v21.0"

@app.route('/api/v1/templates', methods=['GET'])
def list_templates():
    """Listar todos os templates"""
    try:
        url = f"{GRAPH_API_URL}/{WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates"
        headers = {"Authorization": f"Bearer {ACCESS_TOKEN}"}
        
        response = requests.get(url, headers=headers)
        data = response.json()
        
        if 'error' in data:
            return jsonify({"error": data['error']}), 400
            
        # Formatar resposta
        templates = []
        for template in data.get('data', []):
            templates.append({
                "id": template.get('id'),
                "name": template.get('name'),
                "status": template.get('status'),
                "category": template.get('category'),
                "language": template.get('language'),
                "components": template.get('components', [])
            })
        
        return jsonify({
            "templates": templates,
            "count": len(templates)
        })
        
    except Exception as e:
        logger.error(f"Erro ao listar templates: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/v1/templates', methods=['POST'])
def create_template():
    """Criar novo template"""
    try:
        data = request.get_json()
        
        # Validar dados obrigatórios
        required_fields = ['name', 'category', 'language', 'components']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Campo obrigatório: {field}"}), 400
        
        # Preparar payload para API do Meta
        payload = {
            "name": data['name'],
            "category": data['category'].upper(),  # UTILITY, MARKETING, AUTHENTICATION
            "language": data['language'],  # pt_BR, en_US, etc
            "components": data['components']
        }
        
        # Adicionar campos opcionais
        if 'allow_category_change' in data:
            payload['allow_category_change'] = data['allow_category_change']
            
        url = f"{GRAPH_API_URL}/{WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates"
        headers = {
            "Authorization": f"Bearer {ACCESS_TOKEN}",
            "Content-Type": "application/json"
        }
        
        response = requests.post(url, json=payload, headers=headers)
        result = response.json()
        
        if 'error' in result:
            return jsonify({"error": result['error']}), 400
            
        return jsonify({
            "success": True,
            "template_id": result.get('id'),
            "status": result.get('status', 'PENDING'),
            "message": "Template criado e aguardando aprovação do Meta"
        }), 201
        
    except Exception as e:
        logger.error(f"Erro ao criar template: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/v1/templates/<template_id>', methods=['DELETE'])
def delete_template(template_id):
    """Deletar template"""
    try:
        # Primeiro, obter o nome do template
        url = f"{GRAPH_API_URL}/{template_id}"
        headers = {"Authorization": f"Bearer {ACCESS_TOKEN}"}
        
        response = requests.get(url, headers=headers)
        template_data = response.json()
        
        if 'error' in template_data:
            return jsonify({"error": "Template não encontrado"}), 404
            
        template_name = template_data.get('name')
        
        # Deletar template usando o nome
        delete_url = f"{GRAPH_API_URL}/{WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates"
        params = {"name": template_name}
        
        response = requests.delete(delete_url, headers=headers, params=params)
        
        if response.status_code == 200:
            return jsonify({
                "success": True,
                "message": f"Template '{template_name}' deletado com sucesso"
            })
        else:
            return jsonify({"error": "Erro ao deletar template"}), 400
            
    except Exception as e:
        logger.error(f"Erro ao deletar template: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/v1/templates/examples', methods=['GET'])
def template_examples():
    """Retornar exemplos de templates"""
    examples = [
        {
            "name": "pedido_confirmado",
            "category": "UTILITY",
            "language": "pt_BR",
            "components": [
                {
                    "type": "HEADER",
                    "format": "TEXT",
                    "text": "Pedido Confirmado ✅"
                },
                {
                    "type": "BODY",
                    "text": "Olá {{1}}! Seu pedido #{{2}} foi confirmado com sucesso.\n\nValor total: R$ {{3}}\n\nPrazo de entrega estimado: {{4}} dias úteis.\n\nObrigado pela sua compra!"
                },
                {
                    "type": "FOOTER",
                    "text": "PyTake - Atendimento Automatizado"
                }
            ]
        },
        {
            "name": "boas_vindas",
            "category": "UTILITY", 
            "language": "pt_BR",
            "components": [
                {
                    "type": "HEADER",
                    "format": "TEXT",
                    "text": "Bem-vindo(a) ao PyTake! 🎉"
                },
                {
                    "type": "BODY",
                    "text": "Olá {{1}}!\n\nÉ um prazer ter você conosco. Agora você pode:\n\n✅ Receber atualizações em tempo real\n✅ Fazer pedidos pelo WhatsApp\n✅ Acompanhar suas compras\n✅ Falar com nosso suporte\n\nDigite MENU para ver todas as opções disponíveis."
                },
                {
                    "type": "FOOTER",
                    "text": "Responda PARAR para cancelar notificações"
                },
                {
                    "type": "BUTTONS",
                    "buttons": [
                        {
                            "type": "QUICK_REPLY",
                            "text": "Ver Menu"
                        },
                        {
                            "type": "QUICK_REPLY", 
                            "text": "Falar com Suporte"
                        }
                    ]
                }
            ]
        },
        {
            "name": "codigo_verificacao",
            "category": "AUTHENTICATION",
            "language": "pt_BR",
            "components": [
                {
                    "type": "BODY",
                    "text": "Seu código de verificação PyTake é: {{1}}\n\nNão compartilhe este código com ninguém.",
                    "add_security_recommendation": True
                },
                {
                    "type": "FOOTER",
                    "text": "Código válido por 10 minutos"
                }
            ]
        },
        {
            "name": "promocao_especial",
            "category": "MARKETING",
            "language": "pt_BR",
            "components": [
                {
                    "type": "HEADER",
                    "format": "IMAGE"
                },
                {
                    "type": "BODY",
                    "text": "🎁 {{1}}, temos uma oferta especial para você!\n\n{{2}}% de desconto em {{3}}.\n\nOferta válida até {{4}}.\n\nUse o código: {{5}}"
                },
                {
                    "type": "FOOTER",
                    "text": "Termos e condições se aplicam"
                },
                {
                    "type": "BUTTONS",
                    "buttons": [
                        {
                            "type": "URL",
                            "text": "Comprar Agora",
                            "url": "https://api.pytake.net/promo/{{1}}"
                        }
                    ]
                }
            ]
        }
    ]
    
    return jsonify({
        "examples": examples,
        "note": "Use estes exemplos como base. Variáveis são definidas com {{número}}",
        "categories": {
            "UTILITY": "Atualizações de pedidos, lembretes, confirmações",
            "MARKETING": "Promoções, ofertas (requer opt-in do cliente)",
            "AUTHENTICATION": "Códigos de verificação, OTP"
        }
    })

@app.route('/api/v1/templates/send', methods=['POST'])
def send_template():
    """Enviar mensagem usando template"""
    try:
        data = request.get_json()
        
        # Validar dados
        if not data.get('to') or not data.get('template_name'):
            return jsonify({"error": "Campos obrigatórios: to, template_name"}), 400
        
        # Preparar payload
        payload = {
            "messaging_product": "whatsapp",
            "to": data['to'],
            "type": "template",
            "template": {
                "name": data['template_name'],
                "language": {
                    "code": data.get('language', 'pt_BR')
                }
            }
        }
        
        # Adicionar parâmetros se fornecidos
        if 'parameters' in data:
            components = []
            
            # Header parameters
            if 'header_params' in data['parameters']:
                components.append({
                    "type": "header",
                    "parameters": data['parameters']['header_params']
                })
            
            # Body parameters
            if 'body_params' in data['parameters']:
                body_params = []
                for param in data['parameters']['body_params']:
                    body_params.append({
                        "type": "text",
                        "text": str(param)
                    })
                components.append({
                    "type": "body",
                    "parameters": body_params
                })
            
            if components:
                payload['template']['components'] = components
        
        # Enviar mensagem
        url = f"{GRAPH_API_URL}/{os.environ.get('WHATSAPP_PHONE_NUMBER_ID', '574293335763643')}/messages"
        headers = {
            "Authorization": f"Bearer {ACCESS_TOKEN}",
            "Content-Type": "application/json"
        }
        
        response = requests.post(url, json=payload, headers=headers)
        result = response.json()
        
        if 'error' in result:
            return jsonify({"error": result['error']}), 400
            
        return jsonify({
            "success": True,
            "message_id": result['messages'][0]['id'],
            "status": "sent"
        })
        
    except Exception as e:
        logger.error(f"Erro ao enviar template: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "service": "template_manager"})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8081))
    logger.info(f"Template Manager iniciando na porta {port}")
    app.run(host='0.0.0.0', port=port, debug=True)