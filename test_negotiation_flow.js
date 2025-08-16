#!/usr/bin/env node

/**
 * Script para testar o Flow de Negociação do PyTake
 * 
 * Uso:
 * node test_negotiation_flow.js
 */

const BASE_URL = 'http://localhost:8080/api/v1/webhook';

// Simular diferentes cenários de negociação
const testScenarios = [
    {
        name: "Cenário 1: Desconto 30%",
        contact_id: "5511999999001",
        selected_option: "discount_30",
        description: "Cliente escolhe desconto de 30% para pagamento à vista"
    },
    {
        name: "Cenário 2: Parcelamento 2x",
        contact_id: "5511999999002", 
        selected_option: "installment_2x",
        description: "Cliente escolhe parcelamento em 2x sem juros"
    },
    {
        name: "Cenário 3: Proposta Customizada",
        contact_id: "5511999999003",
        selected_option: "custom_proposal",
        custom_proposal: "Posso pagar R$ 100,00 em 3 parcelas de R$ 33,33",
        description: "Cliente faz proposta personalizada"
    },
    {
        name: "Cenário 4: Falar com Atendente",
        contact_id: "5511999999004",
        selected_option: "talk_to_agent",
        description: "Cliente prefere falar com atendente humano"
    },
    {
        name: "Cenário 5: Flow Completo Desconto 20%",
        contact_id: "5511999999005",
        selected_option: "discount_20",
        description: "Cliente escolhe desconto de 20% com prazo de 3 dias"
    }
];

async function testNegotiationFlow() {
    console.log('🤖 Testando Sistema de Flow de Negociação PyTake\n');
    console.log('=' .repeat(60));
    
    for (const scenario of testScenarios) {
        console.log(`\n📋 ${scenario.name}`);
        console.log(`📱 Contact ID: ${scenario.contact_id}`);
        console.log(`📝 ${scenario.description}\n`);
        
        try {
            // Simular o cenário completo
            const response = await fetch(`${BASE_URL}/simulate-negotiation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contact_id: scenario.contact_id,
                    selected_option: scenario.selected_option,
                    custom_proposal: scenario.custom_proposal
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Sucesso!');
                console.log('📊 Passos executados:');
                result.steps.forEach((step, index) => {
                    console.log(`   ${index + 1}. ${step}`);
                });
            } else {
                const error = await response.text();
                console.log('❌ Erro:', error);
            }
            
        } catch (error) {
            console.log('❌ Erro de conexão:', error.message);
        }
        
        console.log('-'.repeat(60));
        
        // Aguardar um pouco entre testes
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n🏁 Testes concluídos!');
    
    // Verificar sessões ativas
    await checkActiveSessions();
}

async function checkActiveSessions() {
    console.log('\n📊 Verificando sessões ativas...');
    
    try {
        const response = await fetch(`${BASE_URL.replace('/webhook', '/flows')}/sessions/active`);
        
        if (response.ok) {
            const sessions = await response.json();
            console.log(`📈 Total de sessões ativas: ${sessions.length}`);
            
            sessions.forEach((session, index) => {
                console.log(`   ${index + 1}. Contact: ${session.contact_id} | Status: ${session.status} | Node: ${session.current_node_id}`);
            });
        } else {
            console.log('❌ Erro ao verificar sessões');
        }
    } catch (error) {
        console.log('❌ Erro:', error.message);
    }
}

async function testSendTemplate() {
    console.log('\n📤 Testando envio de template de negociação...');
    
    try {
        const response = await fetch(`${BASE_URL}/send-negotiation-template`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token' // Token de teste
            },
            body: JSON.stringify({
                contact_id: "5511999999999",
                customer_name: "João Silva",
                amount: "150.00"
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Template enviado:', result.message);
        } else {
            console.log('❌ Erro ao enviar template');
        }
    } catch (error) {
        console.log('❌ Erro:', error.message);
    }
}

// Executar testes
(async () => {
    console.log('🚀 Iniciando testes do Flow Engine...\n');
    
    // Verificar se o servidor está rodando
    try {
        const healthCheck = await fetch('http://localhost:8080/health');
        if (!healthCheck.ok) {
            throw new Error('Health check failed');
        }
        console.log('✅ Servidor PyTake Flow Engine está online!\n');
    } catch (error) {
        console.log('❌ Erro: Servidor não está rodando. Execute primeiro:');
        console.log('   cargo run --release\n');
        process.exit(1);
    }
    
    await testSendTemplate();
    await testNegotiationFlow();
    
    console.log('\n' + '='.repeat(60));
    console.log('📚 Documentação:');
    console.log('   GET  /health - Health check');
    console.log('   POST /api/v1/webhook/simulate-negotiation - Simular negociação');
    console.log('   POST /api/v1/webhook/send-negotiation-template - Enviar template');
    console.log('   GET  /api/v1/flows/sessions/active - Listar sessões ativas');
    console.log('   GET  /api/v1/flows/sessions/stats - Estatísticas');
    console.log('\n💡 Para usar em produção:');
    console.log('   1. Configure as variáveis de ambiente (.env)');
    console.log('   2. Configure o webhook do WhatsApp apontando para /api/v1/webhook/whatsapp');
    console.log('   3. Envie templates via API ou diretamente pelo WhatsApp Business');
    console.log('\n🔗 Exemplo de template button payload: "start_flow:negotiation_flow"');
})();