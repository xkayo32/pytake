# Sistema de Módulos - PyTake

## Visão Geral

O sistema de módulos do PyTake permite estender a funcionalidade do sistema através de plugins que podem ser desenvolvidos e mantidos separadamente. Os módulos podem integrar com APIs externas, processar dados, ou adicionar novas funcionalidades ao fluxo de conversação.

## Arquitetura de Módulos

### Trait Principal

```rust
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[async_trait]
pub trait Module: Send + Sync {
    /// Nome único do módulo
    fn name(&self) -> &str;
    
    /// Versão do módulo (semver)
    fn version(&self) -> &str;
    
    /// Descrição do módulo
    fn description(&self) -> &str;
    
    /// Schema de configuração (JSON Schema)
    fn config_schema(&self) -> serde_json::Value;
    
    /// Executa a lógica do módulo
    async fn execute(&self, context: ModuleContext) -> Result<ModuleResponse, ModuleError>;
    
    /// Valida a configuração do módulo
    async fn validate_config(&self, config: &serde_json::Value) -> Result<(), ValidationError> {
        // Implementação padrão usando JSON Schema
        Ok(())
    }
    
    /// Lifecycle: chamado quando o módulo é carregado
    async fn on_load(&mut self) -> Result<(), ModuleError> {
        Ok(())
    }
    
    /// Lifecycle: chamado quando o módulo é descarregado
    async fn on_unload(&mut self) -> Result<(), ModuleError> {
        Ok(())
    }
}
```

### Estruturas de Dados

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModuleContext {
    /// ID da conversa atual
    pub conversation_id: String,
    
    /// ID do cliente (WhatsApp)
    pub customer_id: String,
    
    /// Parâmetros passados para o módulo
    pub parameters: HashMap<String, serde_json::Value>,
    
    /// Configuração do módulo
    pub config: serde_json::Value,
    
    /// Variáveis do fluxo
    pub flow_variables: HashMap<String, serde_json::Value>,
    
    /// Metadados da execução
    pub metadata: ModuleMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModuleResponse {
    /// Status da execução
    pub status: ModuleStatus,
    
    /// Dados retornados pelo módulo
    pub data: Option<serde_json::Value>,
    
    /// Variáveis a serem salvas no fluxo
    pub variables: HashMap<String, serde_json::Value>,
    
    /// Mensagem para log/debug
    pub message: Option<String>,
    
    /// Próxima ação sugerida
    pub next_action: Option<NextAction>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ModuleStatus {
    Success,
    Error,
    Warning,
    Pending,
}
```

## Tipos de Módulos

### 1. Módulo de API REST

```rust
pub struct RestApiModule {
    name: String,
    client: reqwest::Client,
}

impl RestApiModule {
    pub fn new() -> Self {
        Self {
            name: "rest_api".to_string(),
            client: reqwest::Client::new(),
        }
    }
}

#[async_trait]
impl Module for RestApiModule {
    fn name(&self) -> &str {
        &self.name
    }
    
    async fn execute(&self, context: ModuleContext) -> Result<ModuleResponse, ModuleError> {
        let url = context.parameters.get("url")
            .ok_or(ModuleError::MissingParameter("url"))?;
        
        let method = context.parameters.get("method")
            .and_then(|v| v.as_str())
            .unwrap_or("GET");
        
        // Executar requisição HTTP...
    }
}
```

### 2. Módulo de Boleto

```rust
pub struct BoletoModule {
    name: String,
    api_key: String,
}

impl BoletoModule {
    pub fn new(api_key: String) -> Self {
        Self {
            name: "boleto".to_string(),
            api_key,
        }
    }
    
    async fn fetch_boleto(&self, cpf: &str) -> Result<Boleto, ModuleError> {
        // Integração com sistema de boletos
    }
}
```

### 3. Módulo de CRM

```rust
pub struct CrmModule {
    name: String,
    crm_client: CrmClient,
}

impl CrmModule {
    async fn get_customer_data(&self, phone: &str) -> Result<Customer, ModuleError> {
        // Buscar dados do cliente no CRM
    }
    
    async fn create_ticket(&self, data: TicketData) -> Result<String, ModuleError> {
        // Criar ticket no CRM
    }
}
```

## Desenvolvimento de Módulos

### Estrutura de Diretório

```
backend/modules/
├── seu_modulo/
│   ├── Cargo.toml
│   ├── src/
│   │   ├── lib.rs
│   │   ├── config.rs
│   │   └── handlers.rs
│   ├── tests/
│   │   └── integration.rs
│   └── README.md
```

### Cargo.toml do Módulo

```toml
[package]
name = "pytake-module-exemplo"
version = "0.1.0"
edition = "2021"

[dependencies]
pytake-modules = { path = "../../crates/pytake-modules" }
async-trait = "0.1"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1.37", features = ["full"] }
reqwest = { version = "0.12", features = ["json"] }

[dev-dependencies]
mockall = "0.12"
tokio-test = "0.4"
```

### Exemplo Completo

```rust
use pytake_modules::{Module, ModuleContext, ModuleResponse, ModuleError, ModuleStatus};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};

#[derive(Debug)]
pub struct WeatherModule {
    name: String,
    api_key: String,
    client: reqwest::Client,
}

impl WeatherModule {
    pub fn new(api_key: String) -> Self {
        Self {
            name: "weather".to_string(),
            api_key,
            client: reqwest::Client::new(),
        }
    }
}

#[async_trait]
impl Module for WeatherModule {
    fn name(&self) -> &str {
        &self.name
    }
    
    fn version(&self) -> &str {
        "1.0.0"
    }
    
    fn description(&self) -> &str {
        "Busca informações meteorológicas para uma cidade"
    }
    
    fn config_schema(&self) -> serde_json::Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "api_key": {
                    "type": "string",
                    "description": "API key para o serviço de clima"
                }
            },
            "required": ["api_key"]
        })
    }
    
    async fn execute(&self, context: ModuleContext) -> Result<ModuleResponse, ModuleError> {
        // Extrair cidade dos parâmetros
        let city = context.parameters
            .get("city")
            .and_then(|v| v.as_str())
            .ok_or_else(|| ModuleError::MissingParameter("city".to_string()))?;
        
        // Fazer chamada à API
        let url = format!(
            "https://api.openweathermap.org/data/2.5/weather?q={}&appid={}&units=metric&lang=pt_br",
            city, self.api_key
        );
        
        let response = self.client
            .get(&url)
            .send()
            .await
            .map_err(|e| ModuleError::External(e.to_string()))?;
        
        if !response.status().is_success() {
            return Err(ModuleError::ApiError(response.status().as_u16()));
        }
        
        let weather_data: serde_json::Value = response
            .json()
            .await
            .map_err(|e| ModuleError::ParseError(e.to_string()))?;
        
        // Formatar resposta
        let temperature = weather_data["main"]["temp"].as_f64().unwrap_or(0.0);
        let description = weather_data["weather"][0]["description"].as_str().unwrap_or("Desconhecido");
        
        let message = format!(
            "Clima em {}: {}°C, {}",
            city, temperature, description
        );
        
        Ok(ModuleResponse {
            status: ModuleStatus::Success,
            data: Some(weather_data),
            variables: HashMap::from([
                ("weather_temperature".to_string(), serde_json::json!(temperature)),
                ("weather_description".to_string(), serde_json::json!(description)),
            ]),
            message: Some(message),
            next_action: None,
        })
    }
}
```

## Registro e Carregamento

### Registry

```rust
pub struct ModuleRegistry {
    modules: HashMap<String, Box<dyn Module>>,
}

impl ModuleRegistry {
    pub fn new() -> Self {
        Self {
            modules: HashMap::new(),
        }
    }
    
    pub fn register(&mut self, module: Box<dyn Module>) -> Result<(), RegistryError> {
        let name = module.name().to_string();
        
        if self.modules.contains_key(&name) {
            return Err(RegistryError::DuplicateModule(name));
        }
        
        self.modules.insert(name, module);
        Ok(())
    }
    
    pub fn get(&self, name: &str) -> Option<&dyn Module> {
        self.modules.get(name).map(|m| m.as_ref())
    }
}
```

## Uso no Flow

### Nó de Módulo

```yaml
- id: check_weather
  type: module
  module: weather
  parameters:
    city: "{{customer_city}}"
  on_success:
    - send_weather_info
  on_error:
    - send_error_message
```

### Configuração no Painel

```json
{
  "module": "weather",
  "config": {
    "api_key": "sua-api-key-aqui"
  },
  "timeout": 5000,
  "retry": {
    "attempts": 3,
    "delay": 1000
  }
}
```

## Segurança

### Sandboxing

- Módulos executam com permissões limitadas
- Timeout configurável por módulo
- Rate limiting por módulo
- Isolamento de memória

### Validação

```rust
impl Module for SecureModule {
    async fn validate_config(&self, config: &serde_json::Value) -> Result<(), ValidationError> {
        // Validar API keys
        if let Some(api_key) = config.get("api_key").and_then(|v| v.as_str()) {
            if api_key.len() < 32 {
                return Err(ValidationError::InvalidApiKey);
            }
        }
        
        // Validar URLs permitidas
        if let Some(urls) = config.get("allowed_urls").and_then(|v| v.as_array()) {
            for url in urls {
                // Validar formato de URL
            }
        }
        
        Ok(())
    }
}
```

## Boas Práticas

1. **Error Handling**: Sempre retorne erros descritivos
2. **Timeouts**: Implemente timeouts em operações externas
3. **Logging**: Use `tracing` para logs estruturados
4. **Testing**: Escreva testes unitários e de integração
5. **Documentation**: Documente parâmetros e respostas
6. **Versioning**: Use versionamento semântico
7. **Configuration**: Valide todas as configurações
8. **Security**: Nunca exponha credenciais em logs

## Exemplo de Teste

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use tokio::test;
    
    #[test]
    async fn test_weather_module() {
        let module = WeatherModule::new("test-key".to_string());
        
        let mut context = ModuleContext {
            conversation_id: "123".to_string(),
            customer_id: "456".to_string(),
            parameters: HashMap::from([
                ("city".to_string(), serde_json::json!("São Paulo"))
            ]),
            config: serde_json::json!({}),
            flow_variables: HashMap::new(),
            metadata: Default::default(),
        };
        
        let result = module.execute(context).await;
        assert!(result.is_ok());
        
        let response = result.unwrap();
        assert_eq!(response.status, ModuleStatus::Success);
        assert!(response.data.is_some());
    }
}
```