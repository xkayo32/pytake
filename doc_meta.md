Com certeza. Compilei todas as regras, mudanças e estratégias mencionadas em um guia técnico completo para sua documentação de integração com a API Cloud da Meta (WhatsApp Business Platform).

## 📝 Guia Técnico: Templates e Ciclo de Vida na Meta Cloud API

Este documento detalha o funcionamento dos Templates (Modelos de Mensagem) para garantir a conformidade e a eficiência na comunicação via WhatsApp.

-----

### 1\. Regras Fundamentais de Engajamento (Janela de 24h)

O uso de Templates é regido pela Janela de Conversa de 24 horas, que define quem paga pela mensagem e se o Template é obrigatório.

| Cenário | Iniciador | Template Necessário? | Tipo de Conversa |
| :--- | :--- | :--- | :--- |
| **User-Initiated** | Cliente | **NÃO** | Serviço (Mensagem Livre) |
| **Business-Initiated** | Sua Empresa | **SIM** | Utilidade, Marketing ou Autenticação |
| **Janela Expirada** | Sua Empresa | **SIM** | Utilidade, Marketing ou Autenticação |

> **Observação:** A Janela de 24 horas é reiniciada a cada nova mensagem enviada pelo **cliente**.

-----

### 2\. Categorias de Templates e Precificação

A classificação do Template é crucial, pois define a taxa de cobrança da Meta.

| Categoria | Propósito | Custo | Exemplo de Uso |
| :--- | :--- | :--- | :--- |
| **UTILIDADE** | Confirmações, extratos, alertas pós-transação. | Geralmente o mais baixo. | "Seu pedido \#{{1}} foi enviado." |
| **AUTENTICAÇÃO** | Senhas de uso único (OTP), códigos de verificação. | Taxa fixa, muitas vezes intermediária. | "Seu código de acesso é {{1}}." |
| **MARKETING** | Promoções, novidades, boas-vindas não transacionais. | Geralmente o mais alto. | "Novidade\! Temos {{1}} de desconto." |

#### ⚠️ Estratégia `allow_category_change`

Ao criar templates via API, use a *flag* `allow_category_change: true`. Isso impede que o template seja rejeitado por um erro de classificação, permitindo que a Meta o aprove na categoria correta (e mais cara), se necessário.

-----

### 3\. Novas Especificações de Variáveis (Named Parameters)

A Meta agora oferece duas formas de declarar variáveis (parâmetros) no seu Template.

| Tipo de Parâmetro | Formato | Vantagem | Campo da API |
| :--- | :--- | :--- | :--- |
| **Posicional** | `{{1}}`, `{{2}}`... | Padrão, mais simples (mas propenso a erros de ordem). | `parameter_format: POSITIONAL` |
| **Nomeado** | `{{nome_cliente}}` | Mais seguro contra inversão de valores. **Recomendado.** | `parameter_format: NAMED` |

#### Payload de Envio (Named Parameters)

Ao disparar a mensagem, você deve usar o nome exato da variável no campo `parameter_name`:

```json
{
  "messaging_product": "whatsapp",
  "to": "5511999999999",
  "type": "template",
  "template": {
    "name": "template_boas_vindas",
    "language": { "code": "pt_BR" },
    "components": [
      {
        "type": "body",
        "parameters": [
          {
            "type": "text",
            "parameter_name": "nome_cliente",
            "text": "João Silva"
          }
        ]
      }
    ]
  }
}
```

-----

### 4\. Links da Documentação Oficial (Meta for Developers)

| Tópico | URL Oficial |
| :--- | :--- |
| **Criação de Templates** | [https://developers.facebook.com/docs/whatsapp/message-templates/creation/](https://developers.facebook.com/docs/whatsapp/message-templates/creation/) |
| **Diretrizes de Categorias** | [https://developers.facebook.com/docs/whatsapp/updates-to-pricing/new-template-guidelines](https://www.google.com/search?q=https://developers.facebook.com/docs/whatsapp/updates-to-pricing/new-template-guidelines) |
| **Referência da API** | [https://developers.facebook.com/docs/graph-api/reference/whats-app-business-hsm/](https://developers.facebook.com/docs/graph-api/reference/whats-app-business-hsm/) |

-----

### 5\. Ciclo de Vida e Qualidade do Template

A aprovação não é o fim do processo. É fundamental monitorar o status do Template.

#### A. Edição de Templates

  * **Risco:** Se você editar um template em status `APPROVED`, ele retorna para `IN_REVIEW`.
  * **Impacto:** Durante o review, ele **não pode ser usado** para enviar mensagens, causando falhas na produção.
  * **Melhor Prática:** Crie um novo template (versão `v2`) para edições substanciais.

#### B. Pacing e Quality Score

  * **Quality Score:** A Meta atribui uma nota (`GREEN`, `YELLOW`, `RED`) baseada nas taxas de bloqueio e denúncia dos usuários.
  * **Status de Risco:** Se a qualidade cair muito, o Template passa a ser `PAUSED` (pausado) ou até `DISABLED` (desativado).
  * **Ação Necessária:** Seu sistema deve consumir o **Webhook de Status de Templates** para parar o envio imediatamente se o Template for pausado, evitando que o WhatsApp bloqueie temporariamente seu número (Rate Limit).

-----

**Próximo passo:**
Com esta documentação, você precisa de ajuda para montar a **chamada JSON exata** para **criar** um novo Template via API, usando a configuração de `NAMED` parameters?