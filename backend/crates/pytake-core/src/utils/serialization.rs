//! Serialization utilities for consistent data handling

use crate::errors::{CoreError, CoreResult};
use serde::{Serialize, de::DeserializeOwned};
use std::collections::HashMap;

/// Serialize a value to JSON string
pub fn to_json_string<T>(value: &T) -> CoreResult<String>
where
    T: Serialize,
{
    serde_json::to_string(value)
        .map_err(|e| CoreError::serialization(format!("Failed to serialize to JSON: {}", e)))
}

/// Serialize a value to pretty JSON string
pub fn to_json_pretty<T>(value: &T) -> CoreResult<String>
where
    T: Serialize,
{
    serde_json::to_string_pretty(value)
        .map_err(|e| CoreError::serialization(format!("Failed to serialize to pretty JSON: {}", e)))
}

/// Deserialize a JSON string to a value
pub fn from_json_string<T>(json: &str) -> CoreResult<T>
where
    T: DeserializeOwned,
{
    serde_json::from_str(json)
        .map_err(|e| CoreError::serialization(format!("Failed to deserialize from JSON: {}", e)))
}

/// Serialize to JSON bytes
pub fn to_json_bytes<T>(value: &T) -> CoreResult<Vec<u8>>
where
    T: Serialize,
{
    serde_json::to_vec(value)
        .map_err(|e| CoreError::serialization(format!("Failed to serialize to JSON bytes: {}", e)))
}

/// Deserialize from JSON bytes
pub fn from_json_bytes<T>(bytes: &[u8]) -> CoreResult<T>
where
    T: DeserializeOwned,
{
    serde_json::from_slice(bytes)
        .map_err(|e| CoreError::serialization(format!("Failed to deserialize from JSON bytes: {}", e)))
}

/// Convert a value to a JSON value (serde_json::Value)
pub fn to_json_value<T>(value: &T) -> CoreResult<serde_json::Value>
where
    T: Serialize,
{
    serde_json::to_value(value)
        .map_err(|e| CoreError::serialization(format!("Failed to convert to JSON value: {}", e)))
}

/// Convert from a JSON value to a specific type
pub fn from_json_value<T>(value: serde_json::Value) -> CoreResult<T>
where
    T: DeserializeOwned,
{
    serde_json::from_value(value)
        .map_err(|e| CoreError::serialization(format!("Failed to convert from JSON value: {}", e)))
}

/// Merge two JSON objects
pub fn merge_json_objects(
    base: &mut serde_json::Value,
    other: serde_json::Value,
) -> CoreResult<()> {
    match (base, other) {
        (serde_json::Value::Object(base_map), serde_json::Value::Object(other_map)) => {
            for (key, value) in other_map {
                base_map.insert(key, value);
            }
            Ok(())
        },
        _ => Err(CoreError::serialization(
            "Both values must be JSON objects to merge".to_string()
        )),
    }
}

/// Deep merge two JSON objects (recursive)
pub fn deep_merge_json_objects(
    base: &mut serde_json::Value,
    other: serde_json::Value,
) -> CoreResult<()> {
    match (base, other) {
        (serde_json::Value::Object(base_map), serde_json::Value::Object(other_map)) => {
            for (key, value) in other_map {
                match base_map.get_mut(&key) {
                    Some(existing_value) if existing_value.is_object() && value.is_object() => {
                        deep_merge_json_objects(existing_value, value)?;
                    },
                    _ => {
                        base_map.insert(key, value);
                    }
                }
            }
            Ok(())
        },
        _ => Err(CoreError::serialization(
            "Both values must be JSON objects to deep merge".to_string()
        )),
    }
}

/// Extract specific fields from a JSON object
pub fn extract_json_fields(
    value: &serde_json::Value,
    fields: &[&str],
) -> CoreResult<HashMap<String, serde_json::Value>> {
    match value {
        serde_json::Value::Object(map) => {
            let mut result = HashMap::new();
            for field in fields {
                if let Some(field_value) = map.get(*field) {
                    result.insert(field.to_string(), field_value.clone());
                }
            }
            Ok(result)
        },
        _ => Err(CoreError::serialization(
            "Value must be a JSON object to extract fields".to_string()
        )),
    }
}

/// Remove null values from a JSON object recursively
pub fn remove_null_values(value: &mut serde_json::Value) {
    match value {
        serde_json::Value::Object(map) => {
            map.retain(|_, v| !v.is_null());
            for (_, v) in map.iter_mut() {
                remove_null_values(v);
            }
        },
        serde_json::Value::Array(arr) => {
            for item in arr.iter_mut() {
                remove_null_values(item);
            }
        },
        _ => {},
    }
}

/// Flatten a nested JSON object with dot notation keys
pub fn flatten_json_object(
    value: &serde_json::Value,
    prefix: Option<String>,
) -> CoreResult<HashMap<String, serde_json::Value>> {
    let mut result = HashMap::new();
    
    match value {
        serde_json::Value::Object(map) => {
            for (key, val) in map {
                let new_key = if let Some(ref p) = prefix {
                    format!("{}.{}", p, key)
                } else {
                    key.clone()
                };
                
                match val {
                    serde_json::Value::Object(_) => {
                        let nested = flatten_json_object(val, Some(new_key))?;
                        result.extend(nested);
                    },
                    _ => {
                        result.insert(new_key, val.clone());
                    }
                }
            }
        },
        _ => {
            let key = prefix.unwrap_or_else(|| "value".to_string());
            result.insert(key, value.clone());
        }
    }
    
    Ok(result)
}

/// Unflatten a JSON object from dot notation keys
pub fn unflatten_json_object(
    flattened: HashMap<String, serde_json::Value>,
) -> CoreResult<serde_json::Value> {
    let mut result = serde_json::Map::new();
    
    for (key, value) in flattened {
        let parts: Vec<&str> = key.split('.').collect();
        let mut current = &mut result;
        
        for (i, part) in parts.iter().enumerate() {
            if i == parts.len() - 1 {
                // Last part, insert the value
                current.insert(part.to_string(), value.clone());
            } else {
                // Intermediate part, ensure it's an object
                let entry = current
                    .entry(part.to_string())
                    .or_insert_with(|| serde_json::Value::Object(serde_json::Map::new()));
                
                match entry {
                    serde_json::Value::Object(map) => {
                        current = map;
                    },
                    _ => {
                        return Err(CoreError::serialization(
                            format!("Conflicting key path at '{}'", key)
                        ));
                    }
                }
            }
        }
    }
    
    Ok(serde_json::Value::Object(result))
}

/// Validate that a JSON object conforms to a basic schema
pub fn validate_json_schema(
    value: &serde_json::Value,
    required_fields: &[&str],
    optional_fields: &[&str],
) -> CoreResult<()> {
    match value {
        serde_json::Value::Object(map) => {
            // Check required fields
            for field in required_fields {
                if !map.contains_key(*field) {
                    return Err(CoreError::validation(
                        format!("Missing required field: {}", field)
                    ));
                }
            }
            
            // Check for unexpected fields
            let allowed_fields: std::collections::HashSet<&str> = required_fields
                .iter()
                .chain(optional_fields.iter())
                .copied()
                .collect();
                
            for key in map.keys() {
                if !allowed_fields.contains(key.as_str()) {
                    return Err(CoreError::validation(
                        format!("Unexpected field: {}", key)
                    ));
                }
            }
            
            Ok(())
        },
        _ => Err(CoreError::validation(
            "Value must be a JSON object for schema validation".to_string()
        )),
    }
}

/// Convert between different serialization formats (if needed in the future)
pub trait SerializationFormat {
    fn serialize<T: Serialize>(&self, value: &T) -> CoreResult<Vec<u8>>;
    fn deserialize<T: DeserializeOwned>(&self, data: &[u8]) -> CoreResult<T>;
}

/// JSON serialization format
pub struct JsonFormat;

impl SerializationFormat for JsonFormat {
    fn serialize<T: Serialize>(&self, value: &T) -> CoreResult<Vec<u8>> {
        to_json_bytes(value)
    }
    
    fn deserialize<T: DeserializeOwned>(&self, data: &[u8]) -> CoreResult<T> {
        from_json_bytes(data)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};

    #[derive(Debug, Serialize, Deserialize, PartialEq)]
    struct TestStruct {
        name: String,
        age: u32,
        active: bool,
    }

    #[test]
    fn test_json_serialization() {
        let test_data = TestStruct {
            name: "John Doe".to_string(),
            age: 30,
            active: true,
        };

        let json_string = to_json_string(&test_data).unwrap();
        assert!(json_string.contains("John Doe"));
        assert!(json_string.contains("30"));
        assert!(json_string.contains("true"));

        let deserialized: TestStruct = from_json_string(&json_string).unwrap();
        assert_eq!(deserialized, test_data);
    }

    #[test]
    fn test_json_pretty_serialization() {
        let test_data = TestStruct {
            name: "Jane Doe".to_string(),
            age: 25,
            active: false,
        };

        let pretty_json = to_json_pretty(&test_data).unwrap();
        assert!(pretty_json.contains("  ")); // Should have indentation
        assert!(pretty_json.contains("\n")); // Should have newlines
    }

    #[test]
    fn test_json_bytes_serialization() {
        let test_data = TestStruct {
            name: "Bob".to_string(),
            age: 40,
            active: true,
        };

        let bytes = to_json_bytes(&test_data).unwrap();
        let deserialized: TestStruct = from_json_bytes(&bytes).unwrap();
        assert_eq!(deserialized, test_data);
    }

    #[test]
    fn test_json_value_conversion() {
        let test_data = TestStruct {
            name: "Alice".to_string(),
            age: 35,
            active: true,
        };

        let json_value = to_json_value(&test_data).unwrap();
        assert!(json_value.is_object());

        let converted_back: TestStruct = from_json_value(json_value).unwrap();
        assert_eq!(converted_back, test_data);
    }

    #[test]
    fn test_json_object_merge() {
        let mut base = serde_json::json!({
            "name": "John",
            "age": 30
        });

        let other = serde_json::json!({
            "city": "New York",
            "active": true
        });

        merge_json_objects(&mut base, other).unwrap();

        assert_eq!(base["name"], "John");
        assert_eq!(base["age"], 30);
        assert_eq!(base["city"], "New York");
        assert_eq!(base["active"], true);
    }

    #[test]
    fn test_deep_merge_json_objects() {
        let mut base = serde_json::json!({
            "user": {
                "name": "John",
                "age": 30
            },
            "settings": {
                "theme": "dark"
            }
        });

        let other = serde_json::json!({
            "user": {
                "city": "New York"
            },
            "settings": {
                "language": "en"
            }
        });

        deep_merge_json_objects(&mut base, other).unwrap();

        assert_eq!(base["user"]["name"], "John");
        assert_eq!(base["user"]["age"], 30);
        assert_eq!(base["user"]["city"], "New York");
        assert_eq!(base["settings"]["theme"], "dark");
        assert_eq!(base["settings"]["language"], "en");
    }

    #[test]
    fn test_extract_json_fields() {
        let value = serde_json::json!({
            "name": "John",
            "age": 30,
            "city": "New York",
            "active": true
        });

        let extracted = extract_json_fields(&value, &["name", "age"]).unwrap();
        
        assert_eq!(extracted.len(), 2);
        assert_eq!(extracted["name"], "John");
        assert_eq!(extracted["age"], 30);
        assert!(!extracted.contains_key("city"));
    }

    #[test]
    fn test_remove_null_values() {
        let mut value = serde_json::json!({
            "name": "John",
            "age": null,
            "settings": {
                "theme": "dark",
                "notifications": null
            }
        });

        remove_null_values(&mut value);

        assert_eq!(value["name"], "John");
        assert!(!value.as_object().unwrap().contains_key("age"));
        assert_eq!(value["settings"]["theme"], "dark");
        assert!(!value["settings"].as_object().unwrap().contains_key("notifications"));
    }

    #[test]
    fn test_flatten_json_object() {
        let value = serde_json::json!({
            "user": {
                "name": "John",
                "address": {
                    "city": "New York",
                    "zip": "10001"
                }
            },
            "active": true
        });

        let flattened = flatten_json_object(&value, None).unwrap();

        assert_eq!(flattened["user.name"], "John");
        assert_eq!(flattened["user.address.city"], "New York");
        assert_eq!(flattened["user.address.zip"], "10001");
        assert_eq!(flattened["active"], true);
    }

    #[test]
    fn test_unflatten_json_object() {
        let mut flattened = HashMap::new();
        flattened.insert("user.name".to_string(), serde_json::Value::String("John".to_string()));
        flattened.insert("user.age".to_string(), serde_json::Value::Number(serde_json::Number::from(30)));
        flattened.insert("active".to_string(), serde_json::Value::Bool(true));

        let unflattened = unflatten_json_object(flattened).unwrap();

        assert_eq!(unflattened["user"]["name"], "John");
        assert_eq!(unflattened["user"]["age"], 30);
        assert_eq!(unflattened["active"], true);
    }

    #[test]
    fn test_validate_json_schema() {
        let value = serde_json::json!({
            "name": "John",
            "age": 30,
            "city": "New York"
        });

        // Valid schema
        let result = validate_json_schema(&value, &["name", "age"], &["city", "country"]);
        assert!(result.is_ok());

        // Missing required field
        let result = validate_json_schema(&value, &["name", "email"], &["city"]);
        assert!(result.is_err());

        // Unexpected field
        let result = validate_json_schema(&value, &["name"], &["age"]);
        assert!(result.is_err()); // "city" is not in allowed fields
    }

    #[test]
    fn test_serialization_format() {
        let format = JsonFormat;
        let test_data = TestStruct {
            name: "Test".to_string(),
            age: 25,
            active: true,
        };

        let serialized = format.serialize(&test_data).unwrap();
        let deserialized: TestStruct = format.deserialize(&serialized).unwrap();

        assert_eq!(deserialized, test_data);
    }
}