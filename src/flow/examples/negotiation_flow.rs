use crate::flow::*;
use crate::flow::nodes::*;
use std::collections::HashMap;

/// Criar flow de negociação para usuários que clicaram em "Negociar" no template
pub fn create_negotiation_flow() -> Flow {
    Flow {
        id: "negotiation_flow".to_string(),
        name: "Fluxo de Negociação".to_string(),
        nodes: vec![
            // 1. Node de entrada - Boas-vindas à negociação
            FlowNode {
                id: "welcome_negotiation".to_string(),
                node_type: "message".to_string(),
                config: serde_json::to_value(MessageNode {
                    content: "🤝 Olá! Vamos negociar sua pendência de R$ {{amount}}. \nEstou aqui para encontrar a melhor solução para você!".to_string(),
                    media_type: None,
                    media_url: None,
                }).unwrap(),
                next: Some("check_payment_situation".to_string()),
                conditions: None,
            },

            // 2. Verificar situação atual do pagamento
            FlowNode {
                id: "check_payment_situation".to_string(),
                node_type: "api".to_string(),
                config: serde_json::to_value(ApiNode {
                    endpoint: "/api/billing/customer/{{contact_id}}/pending".to_string(),
                    method: "GET".to_string(),
                    headers: Some([("Authorization".to_string(), "Bearer {{api_token}}".to_string())].into()),
                    body: None,
                    response_variable: Some("payment_data".to_string()),
                }).unwrap(),
                next: Some("show_negotiation_options".to_string()),
                conditions: None,
            },

            // 3. Apresentar opções de negociação
            FlowNode {
                id: "show_negotiation_options".to_string(),
                node_type: "interactive_list".to_string(),
                config: serde_json::to_value(InteractiveListNode {
                    content: ListContent {
                        header: "Opções de Negociação".to_string(),
                        body: "Escolha a melhor opção para quitar sua pendência:".to_string(),
                        footer: Some("Todas as opções são válidas por 48h".to_string()),
                        sections: vec![
                            ListSection {
                                title: "Desconto à Vista".to_string(),
                                rows: vec![
                                    ListRow {
                                        id: "discount_30".to_string(),
                                        title: "30% de desconto".to_string(),
                                        description: Some("Pagamento até hoje - R$ {{discount_30_amount}}".to_string()),
                                    },
                                    ListRow {
                                        id: "discount_20".to_string(),
                                        title: "20% de desconto".to_string(),
                                        description: Some("Pagamento até 3 dias - R$ {{discount_20_amount}}".to_string()),
                                    },
                                    ListRow {
                                        id: "discount_10".to_string(),
                                        title: "10% de desconto".to_string(),
                                        description: Some("Pagamento até 7 dias - R$ {{discount_10_amount}}".to_string()),
                                    },
                                ],
                            },
                            ListSection {
                                title: "Parcelamento".to_string(),
                                rows: vec![
                                    ListRow {
                                        id: "installment_2x".to_string(),
                                        title: "2x sem juros".to_string(),
                                        description: Some("2 parcelas de R$ {{installment_2x_amount}}".to_string()),
                                    },
                                    ListRow {
                                        id: "installment_3x".to_string(),
                                        title: "3x com juros".to_string(),
                                        description: Some("3 parcelas de R$ {{installment_3x_amount}}".to_string()),
                                    },
                                ],
                            },
                            ListSection {
                                title: "Outras Opções".to_string(),
                                rows: vec![
                                    ListRow {
                                        id: "custom_proposal".to_string(),
                                        title: "Fazer proposta".to_string(),
                                        description: Some("Sugira um valor ou condição".to_string()),
                                    },
                                    ListRow {
                                        id: "talk_to_agent".to_string(),
                                        title: "Falar com atendente".to_string(),
                                        description: Some("Conversar com especialista".to_string()),
                                    },
                                ],
                            },
                        ],
                    },
                }).unwrap(),
                next: Some("process_negotiation_choice".to_string()),
                conditions: None,
            },

            // 4. Processar escolha da negociação
            FlowNode {
                id: "process_negotiation_choice".to_string(),
                node_type: "switch".to_string(),
                config: serde_json::to_value(SwitchNode {
                    condition: "{{selected_option}}".to_string(),
                    cases: [
                        ("discount_30".to_string(), "process_discount_30".to_string()),
                        ("discount_20".to_string(), "process_discount_20".to_string()),
                        ("discount_10".to_string(), "process_discount_10".to_string()),
                        ("installment_2x".to_string(), "process_installment_2x".to_string()),
                        ("installment_3x".to_string(), "process_installment_3x".to_string()),
                        ("custom_proposal".to_string(), "ask_custom_proposal".to_string()),
                        ("talk_to_agent".to_string(), "transfer_to_agent".to_string()),
                        ("default".to_string(), "show_negotiation_options".to_string()),
                    ].into(),
                }).unwrap(),
                next: None,
                conditions: None,
            },

            // 5a. Processar desconto de 30%
            FlowNode {
                id: "process_discount_30".to_string(),
                node_type: "buttons".to_string(),
                config: serde_json::to_value(ButtonsNode {
                    message: "🎉 Excelente escolha! \n\nDesconto de 30% aplicado:\n💰 Valor original: R$ {{amount}}\n✅ Valor com desconto: R$ {{discount_30_amount}}\n⏰ Válido até hoje às 23:59\n\nDeseja prosseguir?".to_string(),
                    buttons: vec![
                        ButtonOption {
                            id: Some("confirm_discount_30".to_string()),
                            text: "✅ Confirmar".to_string(),
                            next: Some("generate_payment_link".to_string()),
                        },
                        ButtonOption {
                            id: Some("back_to_options".to_string()),
                            text: "⬅️ Voltar".to_string(),
                            next: Some("show_negotiation_options".to_string()),
                        },
                        ButtonOption {
                            id: Some("talk_to_agent".to_string()),
                            text: "💬 Falar com atendente".to_string(),
                            next: Some("transfer_to_agent".to_string()),
                        },
                    ],
                }).unwrap(),
                next: None,
                conditions: None,
            },

            // 5b. Processar desconto de 20%
            FlowNode {
                id: "process_discount_20".to_string(),
                node_type: "buttons".to_string(),
                config: serde_json::to_value(ButtonsNode {
                    message: "✨ Ótima opção! \n\nDesconto de 20% aplicado:\n💰 Valor original: R$ {{amount}}\n✅ Valor com desconto: R$ {{discount_20_amount}}\n⏰ Válido até {{discount_20_deadline}}\n\nDeseja prosseguir?".to_string(),
                    buttons: vec![
                        ButtonOption {
                            id: Some("confirm_discount_20".to_string()),
                            text: "✅ Confirmar".to_string(),
                            next: Some("generate_payment_link".to_string()),
                        },
                        ButtonOption {
                            id: Some("back_to_options".to_string()),
                            text: "⬅️ Voltar".to_string(),
                            next: Some("show_negotiation_options".to_string()),
                        },
                        ButtonOption {
                            id: Some("talk_to_agent".to_string()),
                            text: "💬 Falar com atendente".to_string(),
                            next: Some("transfer_to_agent".to_string()),
                        },
                    ],
                }).unwrap(),
                next: None,
                conditions: None,
            },

            // 5c. Parcelamento 2x
            FlowNode {
                id: "process_installment_2x".to_string(),
                node_type: "buttons".to_string(),
                config: serde_json::to_value(ButtonsNode {
                    message: "📋 Parcelamento em 2x sem juros:\n\n💳 1ª parcela: R$ {{installment_2x_amount}} (hoje)\n💳 2ª parcela: R$ {{installment_2x_amount}} (em 30 dias)\n\n⚠️ Em caso de atraso, volta ao valor integral.\n\nDeseja prosseguir?".to_string(),
                    buttons: vec![
                        ButtonOption {
                            id: Some("confirm_installment_2x".to_string()),
                            text: "✅ Confirmar".to_string(),
                            next: Some("generate_payment_link".to_string()),
                        },
                        ButtonOption {
                            id: Some("back_to_options".to_string()),
                            text: "⬅️ Voltar".to_string(),
                            next: Some("show_negotiation_options".to_string()),
                        },
                        ButtonOption {
                            id: Some("talk_to_agent".to_string()),
                            text: "💬 Falar com atendente".to_string(),
                            next: Some("transfer_to_agent".to_string()),
                        },
                    ],
                }).unwrap(),
                next: None,
                conditions: None,
            },

            // 6. Proposta customizada
            FlowNode {
                id: "ask_custom_proposal".to_string(),
                node_type: "input".to_string(),
                config: serde_json::to_value(InputNode {
                    message: "💡 Qual é sua proposta?\n\nDigite o valor que consegue pagar ou descreva sua situação. Nossa equipe analisará sua proposta.".to_string(),
                    variable: "custom_proposal".to_string(),
                    validation: Some("min:10,max:500".to_string()),
                    input_type: Some("text".to_string()),
                }).unwrap(),
                next: Some("process_custom_proposal".to_string()),
                conditions: None,
            },

            // 7. Processar proposta customizada
            FlowNode {
                id: "process_custom_proposal".to_string(),
                node_type: "api".to_string(),
                config: serde_json::to_value(ApiNode {
                    endpoint: "/api/negotiations/create".to_string(),
                    method: "POST".to_string(),
                    headers: Some([("Authorization".to_string(), "Bearer {{api_token}}".to_string())].into()),
                    body: Some(serde_json::json!({
                        "contact_id": "{{contact_id}}",
                        "original_amount": "{{amount}}",
                        "proposal": "{{custom_proposal}}",
                        "type": "custom"
                    })),
                    response_variable: Some("negotiation_id".to_string()),
                }).unwrap(),
                next: Some("confirm_custom_proposal".to_string()),
                conditions: None,
            },

            // 8. Confirmar proposta customizada
            FlowNode {
                id: "confirm_custom_proposal".to_string(),
                node_type: "message".to_string(),
                config: serde_json::to_value(MessageNode {
                    content: "📝 Proposta recebida com sucesso!\n\n🔍 Sua proposta: {{custom_proposal}}\n📋 Protocolo: {{negotiation_id}}\n\n⏱️ Nossa equipe analisará sua proposta em até 2 horas úteis e retornará por WhatsApp.\n\n📞 Você também pode acompanhar pelo telefone (11) 9999-9999".to_string(),
                    media_type: None,
                    media_url: None,
                }).unwrap(),
                next: Some("end".to_string()),
                conditions: None,
            },

            // 9. Gerar link de pagamento
            FlowNode {
                id: "generate_payment_link".to_string(),
                node_type: "api".to_string(),
                config: serde_json::to_value(ApiNode {
                    endpoint: "/api/payments/generate-link".to_string(),
                    method: "POST".to_string(),
                    headers: Some([("Authorization".to_string(), "Bearer {{api_token}}".to_string())].into()),
                    body: Some(serde_json::json!({
                        "contact_id": "{{contact_id}}",
                        "amount": "{{final_amount}}",
                        "description": "Pagamento negociado - {{selected_option}}",
                        "expires_in": 2880 // 48 horas
                    })),
                    response_variable: Some("payment_link".to_string()),
                }).unwrap(),
                next: Some("send_payment_link".to_string()),
                conditions: None,
            },

            // 10. Enviar link de pagamento
            FlowNode {
                id: "send_payment_link".to_string(),
                node_type: "message".to_string(),
                config: serde_json::to_value(MessageNode {
                    content: "🎉 Negociação confirmada!\n\n💳 Link de pagamento gerado:\n{{payment_link}}\n\n⏰ Válido por 48 horas\n💰 Valor: R$ {{final_amount}}\n\n✅ Após o pagamento, sua situação será regularizada em até 2 horas.\n\n❓ Dúvidas? Digite 'ajuda'".to_string(),
                    media_type: None,
                    media_url: None,
                }).unwrap(),
                next: Some("end".to_string()),
                conditions: None,
            },

            // 11. Transferir para atendente
            FlowNode {
                id: "transfer_to_agent".to_string(),
                node_type: "message".to_string(),
                config: serde_json::to_value(MessageNode {
                    content: "👨‍💼 Transferindo para um atendente especializado...\n\n⏱️ Aguarde alguns instantes que logo alguém estará disponível para ajudá-lo com sua negociação.\n\n📞 Ou ligue: (11) 9999-9999".to_string(),
                    media_type: None,
                    media_url: None,
                }).unwrap(),
                next: Some("end".to_string()),
                conditions: None,
            },
        ],
        variables: [
            ("amount".to_string(), serde_json::Value::String("150.00".to_string())),
            ("discount_30_amount".to_string(), serde_json::Value::String("105.00".to_string())),
            ("discount_20_amount".to_string(), serde_json::Value::String("120.00".to_string())),
            ("discount_10_amount".to_string(), serde_json::Value::String("135.00".to_string())),
            ("installment_2x_amount".to_string(), serde_json::Value::String("75.00".to_string())),
            ("installment_3x_amount".to_string(), serde_json::Value::String("55.00".to_string())),
        ].into(),
        settings: FlowSettings {
            timeout_minutes: Some(60), // 1 hora para negociar
            max_iterations: Some(15),
            fallback_node: Some("transfer_to_agent".to_string()),
        },
    }
}

/// Criar template de negociação que redireciona para o flow
pub fn create_negotiation_template() -> serde_json::Value {
    serde_json::json!({
        "name": "payment_negotiation",
        "language": {"code": "pt_BR"},
        "components": [
            {
                "type": "header",
                "format": "text",
                "text": "💰 Pendência Financeira"
            },
            {
                "type": "body",
                "text": "Olá {{1}}!\n\nVocê tem uma pendência de R$ {{2}} em aberto.\n\nQue tal negociarmos uma condição especial para você?"
            },
            {
                "type": "footer",
                "text": "PyTake - Soluções em cobrança"
            },
            {
                "type": "buttons",
                "buttons": [
                    {
                        "type": "reply",
                        "reply": {
                            "id": "start_flow:negotiation_flow",
                            "title": "💬 Negociar"
                        }
                    },
                    {
                        "type": "reply", 
                        "reply": {
                            "id": "pix_payment",
                            "title": "💳 Pagar PIX"
                        }
                    },
                    {
                        "type": "reply",
                        "reply": {
                            "id": "transfer:billing_agent",
                            "title": "🧑‍💼 Atendente"
                        }
                    }
                ]
            }
        ]
    })
}