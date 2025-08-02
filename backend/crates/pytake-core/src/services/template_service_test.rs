#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::template_service::{TemplateService, TemplateVariable};

    #[test]
    fn test_extract_variables() {
        let service = TemplateService::new();
        let content = "Olá {{nome}}, seu pedido {{numero}} está pronto!";
        
        let variables = service.extract_variables(content);
        
        assert_eq!(variables.len(), 2);
        assert!(variables.iter().any(|v| v.name == "nome"));
        assert!(variables.iter().any(|v| v.name == "numero"));
    }

    #[test]
    fn test_substitute_variables() {
        let service = TemplateService::new();
        let content = "Olá {{nome}}, bem-vindo à {{empresa}}!";
        let mut vars = std::collections::HashMap::new();
        vars.insert("nome".to_string(), "João".to_string());
        vars.insert("empresa".to_string(), "PyTake".to_string());
        
        let result = service.substitute_variables(content, &vars).unwrap();
        
        assert_eq!(result, "Olá João, bem-vindo à PyTake!");
    }

    #[test]
    fn test_substitute_variables_missing() {
        let service = TemplateService::new();
        let content = "Olá {{nome}}!";
        let vars = std::collections::HashMap::new();
        
        let result = service.substitute_variables(content, &vars);
        
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_shortcut() {
        let service = TemplateService::new();
        
        assert!(service.validate_shortcut("/welcome").is_ok());
        assert!(service.validate_shortcut("/hello123").is_ok());
        assert!(service.validate_shortcut("/test_123").is_ok());
        
        assert!(service.validate_shortcut("welcome").is_err());
        assert!(service.validate_shortcut("/").is_err());
        assert!(service.validate_shortcut("/hello world").is_err());
        assert!(service.validate_shortcut("/hello@123").is_err());
    }

    #[test]
    fn test_variable_extraction_no_duplicates() {
        let service = TemplateService::new();
        let content = "{{nome}} e {{nome}} são {{nome}}";
        
        let variables = service.extract_variables(content);
        
        assert_eq!(variables.len(), 1);
        assert_eq!(variables[0].name, "nome");
    }

    #[test]
    fn test_nested_braces_ignored() {
        let service = TemplateService::new();
        let content = "Normal {{var}} but {{{invalid}}} and {{{{also_invalid}}}}";
        
        let variables = service.extract_variables(content);
        
        assert_eq!(variables.len(), 1);
        assert_eq!(variables[0].name, "var");
    }
}