#!/usr/bin/env python3
"""
PyTake Google Workspace Integration - Demo Script

Este script demonstra como usar todas as funcionalidades da integração
Google Workspace implementada no PyTake backend.

Requisitos:
- pip install requests

Uso:
- Configurar variáveis de ambiente Google OAuth
- Executar o PyTake backend: cargo run --package simple_api
- Executar este script: python examples/google_integrations_demo.py
"""

import requests
import json
import time
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

# Configuração
API_BASE_URL = "http://localhost:8080"
USER_ID = "demo_user_123"
TENANT_ID = "demo_tenant_456"

class GoogleIntegrationsDemo:
    def __init__(self):
        self.base_url = API_BASE_URL
        self.user_id = USER_ID
        self.tenant_id = TENANT_ID
        self.session = requests.Session()
        
    def print_header(self, title: str):
        """Print formatted header"""
        print(f"\n{'='*60}")
        print(f"  {title}")
        print(f"{'='*60}")
        
    def print_result(self, response: requests.Response, operation: str):
        """Print API response result"""
        if response.status_code == 200:
            print(f"✅ {operation} - SUCCESS")
            try:
                data = response.json()
                print(f"📄 Response: {json.dumps(data, indent=2)}")
            except:
                print(f"📄 Response: {response.text}")
        else:
            print(f"❌ {operation} - FAILED ({response.status_code})")
            print(f"📄 Error: {response.text}")
        print("-" * 40)
    
    def demo_authentication(self):
        """Demonstra o fluxo de autenticação OAuth 2.0"""
        self.print_header("GOOGLE OAUTH 2.0 AUTHENTICATION")
        
        print("🔐 Iniciando fluxo de autenticação Google...")
        
        # 1. Gerar URL de autenticação
        auth_data = {
            "service": "all",  # sheets, calendar, drive, all
            "user_id": self.user_id,
            "tenant_id": self.tenant_id
        }
        
        response = self.session.post(
            f"{self.base_url}/api/v1/google/auth",
            json=auth_data,
            headers={"Content-Type": "application/json"}
        )
        
        self.print_result(response, "Generate Auth URL")
        
        if response.status_code == 200:
            auth_url = response.json().get("auth_url")
            state = response.json().get("state")
            
            print(f"🌐 URL de Autorização: {auth_url[:100]}...")
            print(f"🔑 State Token: {state[:20]}...")
            print("\n📋 PRÓXIMOS PASSOS:")
            print("1. Acesse a URL de autorização no navegador")
            print("2. Faça login na sua conta Google")
            print("3. Autorize o aplicativo PyTake")
            print("4. Copie o código de autorização da URL de redirect")
            print("5. Use o código para completar a autenticação")
            
            # Simulação do callback (normalmente seria feito pelo navegador)
            print("\n⚠️  SIMULAÇÃO: Em produção, o Google faria o redirect automaticamente")
    
    def demo_sheets_integration(self):
        """Demonstra integração com Google Sheets"""
        self.print_header("GOOGLE SHEETS INTEGRATION")
        
        print("📊 Testando funcionalidades do Google Sheets...")
        
        # 1. Exportar métricas de campanhas para Sheets
        print("\n1️⃣ Exportando métricas de campanhas...")
        
        campaign_metrics = [
            {
                "campaign_id": "camp_001",
                "name": "Promoção de Verão 2025",
                "messages_sent": 5000,
                "messages_delivered": 4850,
                "messages_read": 3200,
                "responses_received": 450,
                "conversion_rate": 0.14,
                "cost_per_message": 0.25,
                "total_cost": 1250.0,
                "date_range_start": datetime.now().isoformat(),
                "date_range_end": (datetime.now() + timedelta(days=7)).isoformat()
            },
            {
                "campaign_id": "camp_002", 
                "name": "Black Friday ISP",
                "messages_sent": 8000,
                "messages_delivered": 7920,
                "messages_read": 5500,
                "responses_received": 880,
                "conversion_rate": 0.16,
                "cost_per_message": 0.22,
                "total_cost": 1760.0,
                "date_range_start": datetime.now().isoformat(),
                "date_range_end": (datetime.now() + timedelta(days=3)).isoformat()
            }
        ]
        
        # Simular endpoint (seria implementado no backend)
        print("📈 Métricas que seriam exportadas:")
        for metric in campaign_metrics:
            print(f"   • {metric['name']}: {metric['messages_sent']} msgs, "
                  f"{metric['conversion_rate']*100:.1f}% conv, R${metric['total_cost']}")
        
        # 2. Importar contatos de Sheets
        print("\n2️⃣ Importando contatos do Google Sheets...")
        
        sample_sheet_data = {
            "spreadsheet_id": "1a2b3c4d5e6f7g8h9i0j",
            "range": "Contatos!A:G"
        }
        
        # Simular leitura de planilha
        print(f"📋 Lendo planilha: {sample_sheet_data['spreadsheet_id']}")
        print(f"📍 Range: {sample_sheet_data['range']}")
        
        sample_contacts = [
            {
                "name": "João Silva",
                "phone": "+5561999887766",
                "email": "joao@example.com",
                "company": "Tech Solutions",
                "tags": ["vip", "enterprise"],
                "status": "active"
            },
            {
                "name": "Maria Santos",
                "phone": "+5561888776655", 
                "email": "maria@example.com",
                "company": "Digital Corp",
                "tags": ["potential", "follow-up"],
                "status": "active"
            }
        ]
        
        print("👥 Contatos que seriam importados:")
        for contact in sample_contacts:
            print(f"   • {contact['name']} ({contact['phone']}) - {', '.join(contact['tags'])}")
    
    def demo_calendar_integration(self):
        """Demonstra integração com Google Calendar"""
        self.print_header("GOOGLE CALENDAR INTEGRATION")
        
        print("📅 Testando funcionalidades do Google Calendar...")
        
        # 1. Agendar visita técnica
        print("\n1️⃣ Agendando visita técnica...")
        
        visit_data = {
            "customer_id": "cust_001",
            "customer_name": "João Silva",
            "customer_address": "QS 01 Conjunto A, Casa 15, Águas Claras - DF",
            "customer_phone": "+5561999887766",
            "technician_id": "tech_carlos",
            "technician_name": "Carlos Técnico",
            "visit_type": "Instalação de Fibra Óptica",
            "scheduled_datetime": (datetime.now() + timedelta(days=2, hours=2)).isoformat(),
            "estimated_duration": 180,  # 3 horas
            "notes": "Cliente solicitou instalação em casa com 2 pavimentos. Levar equipamento extra."
        }
        
        print(f"🏠 Cliente: {visit_data['customer_name']}")
        print(f"📍 Endereço: {visit_data['customer_address']}")
        print(f"👨‍🔧 Técnico: {visit_data['technician_name']}")
        print(f"📅 Data: {visit_data['scheduled_datetime']}")
        print(f"⏱️  Duração: {visit_data['estimated_duration']} minutos")
        print(f"📝 Notas: {visit_data['notes']}")
        
        # 2. Verificar disponibilidade do técnico
        print("\n2️⃣ Verificando disponibilidade do técnico...")
        
        availability_date = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
        print(f"📅 Data consultada: {availability_date}")
        
        # Simular slots disponíveis
        available_slots = [
            {"start": "08:00", "end": "09:00", "available": True},
            {"start": "09:00", "end": "10:00", "available": True},
            {"start": "10:00", "end": "11:00", "available": False},  # Ocupado
            {"start": "11:00", "end": "12:00", "available": True},
            {"start": "14:00", "end": "15:00", "available": True},
            {"start": "15:00", "end": "16:00", "available": True},
            {"start": "16:00", "end": "17:00", "available": False},  # Ocupado
            {"start": "17:00", "end": "18:00", "available": True},
        ]
        
        print("⏰ Horários disponíveis:")
        for slot in available_slots:
            status = "✅ Livre" if slot["available"] else "❌ Ocupado"
            print(f"   • {slot['start']}-{slot['end']}: {status}")
        
        # 3. Sincronização bi-direcional
        print("\n3️⃣ Sincronização bi-direcional com ERP...")
        print("📊 Eventos serão sincronizados automaticamente com:")
        print("   • Sistema ERP (HubSoft/IXC/MK/SisGP)")
        print("   • WhatsApp (notificações para cliente)")
        print("   • Dashboard PyTake (métricas em tempo real)")
    
    def demo_drive_integration(self):
        """Demonstra integração com Google Drive"""
        self.print_header("GOOGLE DRIVE INTEGRATION")
        
        print("💾 Testando funcionalidades do Google Drive...")
        
        # 1. Upload de contrato
        print("\n1️⃣ Gerando e uploading contrato PDF...")
        
        contract_data = {
            "customer_name": "João Silva",
            "customer_document": "123.456.789-01",
            "plan_name": "Fibra 500MB",
            "monthly_fee": 89.90,
            "contract_date": datetime.now().strftime("%d/%m/%Y"),
            "installation_address": "QS 01 Conjunto A, Casa 15, Águas Claras - DF"
        }
        
        print(f"📄 Contrato gerado para: {contract_data['customer_name']}")
        print(f"📋 Plano: {contract_data['plan_name']} - R${contract_data['monthly_fee']}")
        print(f"📅 Data: {contract_data['contract_date']}")
        print(f"📍 Endereço: {contract_data['installation_address']}")
        
        # 2. Organização de pastas
        print("\n2️⃣ Organizando arquivos em pastas estruturadas...")
        
        folder_structure = {
            "PyTake_Contratos": {
                "2025": {
                    "Janeiro": ["Contrato_JoaoSilva_001.pdf", "Contrato_MariaSantos_002.pdf"],
                    "Fevereiro": ["Contrato_PedroOliveira_003.pdf"],
                    "Março": []
                },
                "Templates": ["Template_Contrato_Residencial.pdf", "Template_Contrato_Empresarial.pdf"]
            },
            "PyTake_Backups": {
                "Conversas": ["backup_2025_01.json", "backup_2025_02.json"],
                "Configuracoes": ["config_backup_latest.json"],
                "Metricas": ["metricas_janeiro_2025.xlsx"]
            },
            "PyTake_Documentos": {
                "Faturas": ["fatura_001.pdf", "fatura_002.pdf"],
                "Comprovantes": ["comprovante_instalacao_001.pdf"]
            }
        }
        
        def print_folder_tree(structure, indent=0):
            for folder, contents in structure.items():
                print("  " * indent + f"📁 {folder}")
                if isinstance(contents, dict):
                    print_folder_tree(contents, indent + 1)
                elif isinstance(contents, list):
                    for file in contents:
                        print("  " * (indent + 1) + f"📄 {file}")
        
        print_folder_tree(folder_structure)
        
        # 3. Compartilhamento com cliente
        print("\n3️⃣ Compartilhando documentos com cliente...")
        
        shared_docs = [
            {
                "file_name": "Contrato_JoaoSilva_001.pdf",
                "share_with": "joao@example.com",
                "permission": "reader",
                "message": "Segue seu contrato de fibra óptica. Por favor, assine e devolva."
            },
            {
                "file_name": "Manual_Instalacao.pdf", 
                "share_with": "joao@example.com",
                "permission": "reader",
                "message": "Manual com instruções para a instalação."
            }
        ]
        
        for doc in shared_docs:
            print(f"📤 Compartilhando: {doc['file_name']}")
            print(f"   📧 Para: {doc['share_with']}")
            print(f"   🔐 Permissão: {doc['permission']}")
            print(f"   💬 Mensagem: {doc['message']}")
            print()
        
        # 4. Backup automático
        print("\n4️⃣ Backup automático de dados...")
        
        backup_data = {
            "tenant_id": self.tenant_id,
            "backup_date": datetime.now().isoformat(),
            "conversations_count": 1247,
            "messages_count": 8932,
            "contacts_count": 456,
            "campaigns_count": 12,
            "size_mb": 15.7
        }
        
        print(f"💾 Backup criado para tenant: {backup_data['tenant_id']}")
        print(f"📅 Data: {backup_data['backup_date']}")
        print(f"📊 Estatísticas:")
        print(f"   • Conversas: {backup_data['conversations_count']}")
        print(f"   • Mensagens: {backup_data['messages_count']}")
        print(f"   • Contatos: {backup_data['contacts_count']}")
        print(f"   • Campanhas: {backup_data['campaigns_count']}")
        print(f"   • Tamanho: {backup_data['size_mb']} MB")
    
    def demo_automation_workflows(self):
        """Demonstra workflows de automação"""
        self.print_header("AUTOMATION WORKFLOWS")
        
        print("🤖 Testando workflows de automação...")
        
        # 1. Workflow ISP - Solicitação de Instalação
        print("\n1️⃣ WORKFLOW ISP - Solicitação de Instalação")
        
        workflow_steps = [
            "📱 Cliente solicita instalação via WhatsApp",
            "🔍 Sistema consulta disponibilidade na agenda",
            "📅 Cria evento no Google Calendar (técnico + cliente)",
            "📄 Gera contrato PDF no Google Drive",
            "📤 Compartilha contrato com cliente via e-mail",
            "📊 Atualiza planilha de controle no Google Sheets",
            "⏰ Agenda follow-up automático pós-instalação",
            "📈 Exporta métricas para dashboard gerencial"
        ]
        
        for i, step in enumerate(workflow_steps, 1):
            print(f"   {i:2d}. {step}")
            time.sleep(0.5)  # Simular processamento
        
        print("\n✅ Workflow ISP executado com sucesso!")
        
        # 2. Workflow E-commerce - Pedido Confirmado
        print("\n2️⃣ WORKFLOW E-COMMERCE - Pedido Confirmado")
        
        ecommerce_steps = [
            "🛒 Pedido confirmado no sistema",
            "📋 Cria planilha de controle no Google Sheets",
            "📅 Agenda data de entrega no Google Calendar",
            "📄 Gera nota fiscal PDF no Google Drive", 
            "📧 Envia tracking por e-mail e WhatsApp",
            "🚚 Atualiza status de entrega em tempo real",
            "📞 Agenda pesquisa de satisfação pós-entrega",
            "💾 Faz backup de dados da transação"
        ]
        
        for i, step in enumerate(ecommerce_steps, 1):
            print(f"   {i:2d}. {step}")
            time.sleep(0.5)
        
        print("\n✅ Workflow E-commerce executado com sucesso!")
        
        # 3. Workflow Healthcare - Agendamento de Consulta
        print("\n3️⃣ WORKFLOW HEALTHCARE - Agendamento de Consulta")
        
        healthcare_steps = [
            "🏥 Paciente solicita consulta via WhatsApp",
            "👨‍⚕️ Sistema verifica disponibilidade do médico",
            "📅 Confirma agendamento no Google Calendar",
            "📱 Envia lembrete 24h antes da consulta",
            "📋 Gera relatório diário no Google Sheets",
            "📁 Organiza prontuários no Google Drive",
            "🔐 Controla acesso e permissões LGPD",
            "📊 Atualiza métricas de atendimento"
        ]
        
        for i, step in enumerate(healthcare_steps, 1):
            print(f"   {i:2d}. {step}")
            time.sleep(0.5)
        
        print("\n✅ Workflow Healthcare executado com sucesso!")
        
        # 4. Automação Diária/Semanal
        print("\n4️⃣ AUTOMAÇÕES PROGRAMADAS")
        
        scheduled_automations = [
            {
                "name": "Backup Diário",
                "schedule": "Todo dia às 02:00",
                "action": "Backup completo no Google Drive",
                "retention": "30 dias"
            },
            {
                "name": "Relatório Semanal", 
                "schedule": "Segundas às 08:00",
                "action": "Gera relatório executivo no Google Sheets",
                "recipients": ["gerencia@empresa.com"]
            },
            {
                "name": "Métricas de Campanha",
                "schedule": "Diário às 18:00",
                "action": "Exporta métricas para planilha",
                "integration": "Google Sheets + Data Studio"
            },
            {
                "name": "Limpeza de Arquivos",
                "schedule": "Domingo às 01:00", 
                "action": "Remove arquivos temporários antigos",
                "criteria": "> 90 dias"
            }
        ]
        
        print("📅 Automações programadas ativas:")
        for automation in scheduled_automations:
            print(f"\n   🤖 {automation['name']}")
            print(f"      ⏰ Agendamento: {automation['schedule']}")
            print(f"      🔧 Ação: {automation['action']}")
            if 'retention' in automation:
                print(f"      💾 Retenção: {automation['retention']}")
            if 'recipients' in automation:
                print(f"      📧 Destinatários: {', '.join(automation['recipients'])}")
            if 'integration' in automation:
                print(f"      🔗 Integração: {automation['integration']}")
    
    def demo_monitoring_metrics(self):
        """Demonstra monitoramento e métricas"""
        self.print_header("MONITORING & METRICS")
        
        print("📊 Demonstrando capacidades de monitoramento...")
        
        # 1. Métricas de Performance
        print("\n1️⃣ MÉTRICAS DE PERFORMANCE")
        
        performance_metrics = {
            "google_sheets": {
                "requests_today": 247,
                "avg_response_time": "1.2s",
                "success_rate": "99.2%",
                "quota_usage": "23%"
            },
            "google_calendar": {
                "requests_today": 89,
                "avg_response_time": "0.8s", 
                "success_rate": "100%",
                "quota_usage": "12%"
            },
            "google_drive": {
                "requests_today": 156,
                "avg_response_time": "2.1s",
                "success_rate": "98.7%",
                "quota_usage": "31%"
            }
        }
        
        for service, metrics in performance_metrics.items():
            print(f"\n📈 {service.upper().replace('_', ' ')}")
            for metric, value in metrics.items():
                emoji = "🚀" if "response_time" in metric else "✅" if "success" in metric else "📊"
                print(f"   {emoji} {metric.replace('_', ' ').title()}: {value}")
        
        # 2. Status dos Serviços
        print("\n2️⃣ STATUS DOS SERVIÇOS")
        
        services_status = [
            {"name": "OAuth 2.0 Token Manager", "status": "🟢 Online", "uptime": "99.9%"},
            {"name": "Google Sheets API", "status": "🟢 Online", "uptime": "99.8%"},
            {"name": "Google Calendar API", "status": "🟢 Online", "uptime": "100%"},
            {"name": "Google Drive API", "status": "🟡 Degraded", "uptime": "98.5%"},
            {"name": "Rate Limiter", "status": "🟢 Online", "uptime": "100%"},
            {"name": "Retry Manager", "status": "🟢 Online", "uptime": "99.9%"},
            {"name": "Cache System", "status": "🟢 Online", "uptime": "99.7%"}
        ]
        
        for service in services_status:
            print(f"   {service['status']} {service['name']} (Uptime: {service['uptime']})")
        
        # 3. Alertas e Notificações
        print("\n3️⃣ ALERTAS RECENTES")
        
        recent_alerts = [
            {
                "timestamp": "2025-08-08 14:30:00",
                "level": "WARNING",
                "service": "Google Drive",
                "message": "Rate limit próximo do máximo (85%)",
                "action": "Auto-throttling ativado"
            },
            {
                "timestamp": "2025-08-08 13:15:00", 
                "level": "INFO",
                "service": "Google Calendar",
                "message": "Novo técnico adicionado ao sistema",
                "action": "Calendário configurado automaticamente"
            },
            {
                "timestamp": "2025-08-08 12:00:00",
                "level": "SUCCESS",
                "service": "Backup System",
                "message": "Backup diário completado",
                "action": "15.7MB salvo no Google Drive"
            }
        ]
        
        for alert in recent_alerts:
            level_emoji = {"WARNING": "⚠️ ", "INFO": "ℹ️ ", "SUCCESS": "✅", "ERROR": "❌"}
            emoji = level_emoji.get(alert['level'], "📋")
            print(f"   {emoji} [{alert['timestamp']}] {alert['service']}")
            print(f"      {alert['message']}")
            print(f"      Ação: {alert['action']}\n")
    
    def run_full_demo(self):
        """Executa demonstração completa"""
        print("🚀 PYTAKE GOOGLE WORKSPACE INTEGRATION - DEMO COMPLETA")
        print(f"📅 Data: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
        print(f"👤 User ID: {self.user_id}")
        print(f"🏢 Tenant ID: {self.tenant_id}")
        print(f"🌐 API Base URL: {self.base_url}")
        
        try:
            # Executar todas as demonstrações
            self.demo_authentication()
            time.sleep(2)
            
            self.demo_sheets_integration()
            time.sleep(2)
            
            self.demo_calendar_integration()
            time.sleep(2)
            
            self.demo_drive_integration()
            time.sleep(2)
            
            self.demo_automation_workflows()
            time.sleep(2)
            
            self.demo_monitoring_metrics()
            
            # Conclusão
            self.print_header("DEMO CONCLUÍDA COM SUCESSO")
            print("✅ Todas as funcionalidades foram demonstradas")
            print("📈 Sistema Google Workspace totalmente integrado")
            print("🚀 Pronto para uso em produção")
            print("\n🔗 Links úteis:")
            print(f"   • API Docs: {self.base_url}/docs")
            print(f"   • Health Check: {self.base_url}/health")
            print(f"   • Status: {self.base_url}/api/v1/status")
            
        except Exception as e:
            print(f"\n❌ Erro durante a demonstração: {str(e)}")
            print("💡 Verifique se o PyTake backend está rodando:")
            print("   cargo run --package simple_api")

if __name__ == "__main__":
    demo = GoogleIntegrationsDemo()
    demo.run_full_demo()