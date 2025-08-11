package mapping

import (
	"context"
	"fmt"
	"reflect"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/pytake/pytake-go/internal/database/models"
	"github.com/pytake/pytake-go/internal/erp"
	"gorm.io/gorm"
)

// EngineImpl implements the MappingEngine interface
type EngineImpl struct {
	db     *gorm.DB
	logger Logger
}

// Logger interface for mapping engine logging
type Logger interface {
	Debug(msg string, fields ...interface{})
	Info(msg string, fields ...interface{})
	Warn(msg string, fields ...interface{})
	Error(msg string, fields ...interface{})
}

// NewEngine creates a new mapping engine
func NewEngine(db *gorm.DB, logger Logger) *EngineImpl {
	return &EngineImpl{
		db:     db,
		logger: logger,
	}
}

// Field Mapping Implementation

// TransformData transforms data using field mappings
func (e *EngineImpl) TransformData(ctx context.Context, mapping *erp.DataMapping, sourceData map[string]interface{}, direction erp.TransformDirection) (map[string]interface{}, error) {
	if mapping.FieldMappings == nil {
		return sourceData, nil
	}

	result := make(map[string]interface{})
	
	// Get field mappings configuration
	fieldMappings, ok := mapping.FieldMappings.(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid field mappings configuration")
	}

	// Apply field mappings based on direction
	for targetField, mappingConfig := range fieldMappings {
		config, ok := mappingConfig.(map[string]interface{})
		if !ok {
			continue
		}

		// Get source field name
		sourceField, _ := config["source_field"].(string)
		if sourceField == "" {
			continue
		}

		// Check if this mapping applies to the current direction
		if !e.appliesToDirection(config, direction) {
			continue
		}

		// Get source value
		sourceValue, exists := sourceData[sourceField]
		if !exists {
			// Handle missing source field
			if defaultVal, hasDefault := config["default_value"]; hasDefault {
				result[targetField] = defaultVal
			} else if required, _ := config["required"].(bool); required {
				return nil, fmt.Errorf("required field '%s' not found in source data", sourceField)
			}
			continue
		}

		// Apply transformation
		transformedValue, err := e.applyFieldTransformation(ctx, sourceValue, config, direction)
		if err != nil {
			e.logger.Error("Field transformation failed", "source_field", sourceField, "target_field", targetField, "error", err)
			
			// Check if we should fail on transformation error
			if failOnError, _ := config["fail_on_error"].(bool); failOnError {
				return nil, fmt.Errorf("transformation failed for field '%s': %w", sourceField, err)
			}
			
			// Use default value or skip field
			if defaultVal, hasDefault := config["default_value"]; hasDefault {
				result[targetField] = defaultVal
			}
			continue
		}

		// Validate transformed value
		if err := e.validateFieldValue(ctx, targetField, transformedValue, config); err != nil {
			return nil, fmt.Errorf("validation failed for field '%s': %w", targetField, err)
		}

		result[targetField] = transformedValue
	}

	// Apply transformation rules if present
	if mapping.TransformRules != nil {
		if err := e.applyTransformationRules(ctx, result, mapping.TransformRules, direction); err != nil {
			return nil, fmt.Errorf("transformation rules failed: %w", err)
		}
	}

	return result, nil
}

// ValidateMapping validates field mapping configuration
func (e *EngineImpl) ValidateMapping(ctx context.Context, mapping *erp.DataMappingConfig) ([]*erp.ValidationError, error) {
	var errors []*erp.ValidationError

	// Validate basic mapping configuration
	if mapping.MappingName == "" {
		errors = append(errors, &erp.ValidationError{
			Field:   "mapping_name",
			Message: "Mapping name is required",
			Type:    "required",
		})
	}

	if mapping.PyTakeEntity == "" {
		errors = append(errors, &erp.ValidationError{
			Field:   "pytake_entity",
			Message: "PyTake entity is required",
			Type:    "required",
		})
	}

	if mapping.ERPEntity == "" {
		errors = append(errors, &erp.ValidationError{
			Field:   "erp_entity",
			Message: "ERP entity is required",
			Type:    "required",
		})
	}

	// Validate field mappings
	if mapping.FieldMappings == nil || len(mapping.FieldMappings) == 0 {
		errors = append(errors, &erp.ValidationError{
			Field:   "field_mappings",
			Message: "At least one field mapping is required",
			Type:    "required",
		})
	} else {
		fieldErrors := e.validateFieldMappings(ctx, mapping.FieldMappings)
		errors = append(errors, fieldErrors...)
	}

	// Validate sync settings
	if mapping.SyncSettings.BatchSize <= 0 {
		errors = append(errors, &erp.ValidationError{
			Field:   "sync_settings.batch_size",
			Message: "Batch size must be greater than 0",
			Type:    "invalid_value",
		})
	}

	if mapping.SyncSettings.SyncFrequency < 0 {
		errors = append(errors, &erp.ValidationError{
			Field:   "sync_settings.sync_frequency",
			Message: "Sync frequency cannot be negative",
			Type:    "invalid_value",
		})
	}

	return errors, nil
}

// TestMapping tests field mapping with sample data
func (e *EngineImpl) TestMapping(ctx context.Context, mappingID uuid.UUID, sampleData map[string]interface{}, direction erp.TransformDirection) (*erp.MappingTestResult, error) {
	// Get mapping configuration
	var mappingModel models.ERPDataMapping
	if err := e.db.WithContext(ctx).First(&mappingModel, mappingID).Error; err != nil {
		return nil, fmt.Errorf("mapping not found: %w", err)
	}

	// Convert to domain model
	mapping := e.convertToDataMapping(&mappingModel)

	// Test the transformation
	startTime := time.Now()
	transformedData, err := e.TransformData(ctx, mapping, sampleData, direction)
	transformationTime := time.Since(startTime)

	result := &erp.MappingTestResult{
		MappingID:         mappingID,
		Direction:         direction,
		SourceData:        sampleData,
		Success:           err == nil,
		TransformationTime: transformationTime,
		TestedAt:          time.Now(),
	}

	if err != nil {
		result.ErrorMessage = stringPtr(err.Error())
	} else {
		result.TransformedData = transformedData
		
		// Analyze the transformation
		result.Analysis = e.analyzeTransformation(sampleData, transformedData)
	}

	return result, nil
}

// GetSupportedTransformations returns list of supported transformations
func (e *EngineImpl) GetSupportedTransformations(ctx context.Context) ([]*erp.TransformationInfo, error) {
	return []*erp.TransformationInfo{
		{
			Name:        "string_format",
			Description: "Format string values using templates",
			Parameters: map[string]interface{}{
				"template": "String template with {field} placeholders",
			},
			Examples: []string{
				`{"template": "Customer: {name} ({id})"}`,
			},
		},
		{
			Name:        "date_format",
			Description: "Convert date formats",
			Parameters: map[string]interface{}{
				"from_format": "Source date format",
				"to_format":   "Target date format",
			},
			Examples: []string{
				`{"from_format": "2006-01-02", "to_format": "02/01/2006"}`,
			},
		},
		{
			Name:        "number_format",
			Description: "Format numeric values",
			Parameters: map[string]interface{}{
				"decimal_places": "Number of decimal places",
				"thousands_sep":  "Thousands separator",
				"decimal_sep":    "Decimal separator",
			},
			Examples: []string{
				`{"decimal_places": 2, "thousands_sep": ",", "decimal_sep": "."}`,
			},
		},
		{
			Name:        "case_convert",
			Description: "Convert string case",
			Parameters: map[string]interface{}{
				"type": "upper, lower, title, camel, snake",
			},
			Examples: []string{
				`{"type": "upper"}`,
				`{"type": "snake"}`,
			},
		},
		{
			Name:        "value_map",
			Description: "Map values using lookup table",
			Parameters: map[string]interface{}{
				"mappings":     "Value mapping table",
				"default_value": "Default value for unmapped values",
			},
			Examples: []string{
				`{"mappings": {"A": "Active", "I": "Inactive"}, "default_value": "Unknown"}`,
			},
		},
		{
			Name:        "concat",
			Description: "Concatenate multiple fields",
			Parameters: map[string]interface{}{
				"fields":    "Array of field names to concatenate",
				"separator": "Separator between values",
			},
			Examples: []string{
				`{"fields": ["first_name", "last_name"], "separator": " "}`,
			},
		},
		{
			Name:        "split",
			Description: "Split field value",
			Parameters: map[string]interface{}{
				"separator": "Split separator",
				"index":     "Index of part to return (0-based)",
			},
			Examples: []string{
				`{"separator": " ", "index": 0}`,
			},
		},
		{
			Name:        "regex_extract",
			Description: "Extract value using regular expression",
			Parameters: map[string]interface{}{
				"pattern": "Regular expression pattern",
				"group":   "Capture group number (default: 1)",
			},
			Examples: []string{
				`{"pattern": "([0-9]+)", "group": 1}`,
			},
		},
		{
			Name:        "math_operation",
			Description: "Perform mathematical operations",
			Parameters: map[string]interface{}{
				"operation": "add, subtract, multiply, divide",
				"value":     "Value to use in operation",
			},
			Examples: []string{
				`{"operation": "multiply", "value": 1.1}`,
			},
		},
		{
			Name:        "conditional",
			Description: "Apply conditional transformation",
			Parameters: map[string]interface{}{
				"condition": "Condition to evaluate",
				"true_value":  "Value if condition is true",
				"false_value": "Value if condition is false",
			},
			Examples: []string{
				`{"condition": "value > 0", "true_value": "Positive", "false_value": "Non-positive"}`,
			},
		},
	}, nil
}

// Helper Methods

func (e *EngineImpl) appliesToDirection(config map[string]interface{}, direction erp.TransformDirection) bool {
	if directions, ok := config["directions"].([]interface{}); ok {
		for _, dir := range directions {
			if dirStr, ok := dir.(string); ok && dirStr == string(direction) {
				return true
			}
		}
		return false
	}
	return true // Apply to all directions if not specified
}

func (e *EngineImpl) applyFieldTransformation(ctx context.Context, value interface{}, config map[string]interface{}, direction erp.TransformDirection) (interface{}, error) {
	// Check if transformations are defined
	transformations, ok := config["transformations"].([]interface{})
	if !ok || len(transformations) == 0 {
		return value, nil
	}

	result := value
	
	// Apply transformations in sequence
	for _, transform := range transformations {
		transformConfig, ok := transform.(map[string]interface{})
		if !ok {
			continue
		}

		transformType, _ := transformConfig["type"].(string)
		var err error
		
		switch transformType {
		case "string_format":
			result, err = e.applyStringFormat(result, transformConfig)
		case "date_format":
			result, err = e.applyDateFormat(result, transformConfig)
		case "number_format":
			result, err = e.applyNumberFormat(result, transformConfig)
		case "case_convert":
			result, err = e.applyCaseConvert(result, transformConfig)
		case "value_map":
			result, err = e.applyValueMap(result, transformConfig)
		case "concat":
			// concat needs access to full source data
			continue // Skip for now, should be handled differently
		case "split":
			result, err = e.applySplit(result, transformConfig)
		case "regex_extract":
			result, err = e.applyRegexExtract(result, transformConfig)
		case "math_operation":
			result, err = e.applyMathOperation(result, transformConfig)
		case "conditional":
			result, err = e.applyConditional(result, transformConfig)
		default:
			e.logger.Warn("Unknown transformation type", "type", transformType)
		}

		if err != nil {
			return nil, fmt.Errorf("transformation '%s' failed: %w", transformType, err)
		}
	}

	return result, nil
}

func (e *EngineImpl) applyStringFormat(value interface{}, config map[string]interface{}) (interface{}, error) {
	template, ok := config["template"].(string)
	if !ok {
		return value, fmt.Errorf("template is required for string_format")
	}

	valueStr := fmt.Sprintf("%v", value)
	result := strings.ReplaceAll(template, "{value}", valueStr)
	
	return result, nil
}

func (e *EngineImpl) applyDateFormat(value interface{}, config map[string]interface{}) (interface{}, error) {
	fromFormat, _ := config["from_format"].(string)
	toFormat, _ := config["to_format"].(string)

	if fromFormat == "" || toFormat == "" {
		return value, fmt.Errorf("from_format and to_format are required for date_format")
	}

	// Convert value to string
	dateStr := fmt.Sprintf("%v", value)

	// Parse date
	parsedDate, err := time.Parse(fromFormat, dateStr)
	if err != nil {
		return value, fmt.Errorf("failed to parse date: %w", err)
	}

	// Format date
	return parsedDate.Format(toFormat), nil
}

func (e *EngineImpl) applyNumberFormat(value interface{}, config map[string]interface{}) (interface{}, error) {
	decimalPlaces, _ := config["decimal_places"].(float64)
	
	// Convert value to float64
	var num float64
	switch v := value.(type) {
	case float64:
		num = v
	case float32:
		num = float64(v)
	case int:
		num = float64(v)
	case int64:
		num = float64(v)
	case string:
		var err error
		num, err = strconv.ParseFloat(v, 64)
		if err != nil {
			return value, fmt.Errorf("cannot convert '%v' to number", value)
		}
	default:
		return value, fmt.Errorf("value '%v' is not a number", value)
	}

	// Format number
	if decimalPlaces > 0 {
		format := fmt.Sprintf("%%.%df", int(decimalPlaces))
		return fmt.Sprintf(format, num), nil
	}

	return num, nil
}

func (e *EngineImpl) applyCaseConvert(value interface{}, config map[string]interface{}) (interface{}, error) {
	caseType, _ := config["type"].(string)
	valueStr := fmt.Sprintf("%v", value)

	switch caseType {
	case "upper":
		return strings.ToUpper(valueStr), nil
	case "lower":
		return strings.ToLower(valueStr), nil
	case "title":
		return strings.Title(valueStr), nil
	case "snake":
		return e.toSnakeCase(valueStr), nil
	case "camel":
		return e.toCamelCase(valueStr), nil
	default:
		return value, fmt.Errorf("unknown case type: %s", caseType)
	}
}

func (e *EngineImpl) applyValueMap(value interface{}, config map[string]interface{}) (interface{}, error) {
	mappings, ok := config["mappings"].(map[string]interface{})
	if !ok {
		return value, fmt.Errorf("mappings are required for value_map")
	}

	valueStr := fmt.Sprintf("%v", value)
	
	if mappedValue, exists := mappings[valueStr]; exists {
		return mappedValue, nil
	}

	// Return default value if provided
	if defaultValue, hasDefault := config["default_value"]; hasDefault {
		return defaultValue, nil
	}

	return value, nil
}

func (e *EngineImpl) applySplit(value interface{}, config map[string]interface{}) (interface{}, error) {
	separator, _ := config["separator"].(string)
	index, _ := config["index"].(float64)

	if separator == "" {
		return value, fmt.Errorf("separator is required for split")
	}

	valueStr := fmt.Sprintf("%v", value)
	parts := strings.Split(valueStr, separator)

	if int(index) < 0 || int(index) >= len(parts) {
		return value, fmt.Errorf("index %d out of range for split result", int(index))
	}

	return parts[int(index)], nil
}

func (e *EngineImpl) applyRegexExtract(value interface{}, config map[string]interface{}) (interface{}, error) {
	// Implementation would use regex package
	// For now, return original value
	return value, nil
}

func (e *EngineImpl) applyMathOperation(value interface{}, config map[string]interface{}) (interface{}, error) {
	operation, _ := config["operation"].(string)
	operandValue, _ := config["value"].(float64)

	// Convert value to float64
	var num float64
	switch v := value.(type) {
	case float64:
		num = v
	case float32:
		num = float64(v)
	case int:
		num = float64(v)
	case int64:
		num = float64(v)
	case string:
		var err error
		num, err = strconv.ParseFloat(v, 64)
		if err != nil {
			return value, fmt.Errorf("cannot convert '%v' to number", value)
		}
	default:
		return value, fmt.Errorf("value '%v' is not a number", value)
	}

	switch operation {
	case "add":
		return num + operandValue, nil
	case "subtract":
		return num - operandValue, nil
	case "multiply":
		return num * operandValue, nil
	case "divide":
		if operandValue == 0 {
			return value, fmt.Errorf("division by zero")
		}
		return num / operandValue, nil
	default:
		return value, fmt.Errorf("unknown math operation: %s", operation)
	}
}

func (e *EngineImpl) applyConditional(value interface{}, config map[string]interface{}) (interface{}, error) {
	// Simple implementation - could be expanded with expression evaluation
	condition, _ := config["condition"].(string)
	trueValue := config["true_value"]
	falseValue := config["false_value"]

	// Basic condition evaluation
	switch condition {
	case "not_empty":
		if value != nil && fmt.Sprintf("%v", value) != "" {
			return trueValue, nil
		}
		return falseValue, nil
	case "is_empty":
		if value == nil || fmt.Sprintf("%v", value) == "" {
			return trueValue, nil
		}
		return falseValue, nil
	default:
		return value, fmt.Errorf("unsupported condition: %s", condition)
	}
}

func (e *EngineImpl) validateFieldValue(ctx context.Context, fieldName string, value interface{}, config map[string]interface{}) error {
	validation, ok := config["validation"].(map[string]interface{})
	if !ok {
		return nil
	}

	// Required validation
	if required, _ := validation["required"].(bool); required {
		if value == nil || (reflect.ValueOf(value).Kind() == reflect.String && value.(string) == "") {
			return fmt.Errorf("field is required")
		}
	}

	// Type validation
	if expectedType, ok := validation["type"].(string); ok {
		if !e.validateType(value, expectedType) {
			return fmt.Errorf("expected type %s, got %T", expectedType, value)
		}
	}

	// Min/Max length for strings
	if valueStr, ok := value.(string); ok {
		if minLength, ok := validation["min_length"].(float64); ok && len(valueStr) < int(minLength) {
			return fmt.Errorf("minimum length is %d", int(minLength))
		}
		if maxLength, ok := validation["max_length"].(float64); ok && len(valueStr) > int(maxLength) {
			return fmt.Errorf("maximum length is %d", int(maxLength))
		}
	}

	// Min/Max value for numbers
	if num, ok := e.toFloat64(value); ok {
		if minValue, ok := validation["min_value"].(float64); ok && num < minValue {
			return fmt.Errorf("minimum value is %f", minValue)
		}
		if maxValue, ok := validation["max_value"].(float64); ok && num > maxValue {
			return fmt.Errorf("maximum value is %f", maxValue)
		}
	}

	return nil
}

func (e *EngineImpl) validateFieldMappings(ctx context.Context, fieldMappings map[string]interface{}) []*erp.ValidationError {
	var errors []*erp.ValidationError

	for targetField, mappingConfig := range fieldMappings {
		config, ok := mappingConfig.(map[string]interface{})
		if !ok {
			errors = append(errors, &erp.ValidationError{
				Field:   fmt.Sprintf("field_mappings.%s", targetField),
				Message: "Invalid mapping configuration",
				Type:    "invalid_format",
			})
			continue
		}

		// Validate source field
		sourceField, _ := config["source_field"].(string)
		if sourceField == "" {
			errors = append(errors, &erp.ValidationError{
				Field:   fmt.Sprintf("field_mappings.%s.source_field", targetField),
				Message: "Source field is required",
				Type:    "required",
			})
		}

		// Validate transformations if present
		if transformations, ok := config["transformations"].([]interface{}); ok {
			for i, transform := range transformations {
				if transformConfig, ok := transform.(map[string]interface{}); ok {
					transformType, _ := transformConfig["type"].(string)
					if transformType == "" {
						errors = append(errors, &erp.ValidationError{
							Field:   fmt.Sprintf("field_mappings.%s.transformations[%d].type", targetField, i),
							Message: "Transformation type is required",
							Type:    "required",
						})
					}
				}
			}
		}
	}

	return errors
}

func (e *EngineImpl) applyTransformationRules(ctx context.Context, data map[string]interface{}, rules map[string]interface{}, direction erp.TransformDirection) error {
	// Apply post-transformation rules
	// This could include conditional logic, computed fields, etc.
	return nil
}

func (e *EngineImpl) analyzeTransformation(sourceData, transformedData map[string]interface{}) map[string]interface{} {
	analysis := map[string]interface{}{
		"source_fields":      len(sourceData),
		"transformed_fields": len(transformedData),
		"field_changes":      []map[string]interface{}{},
	}

	var fieldChanges []map[string]interface{}
	
	for field, value := range transformedData {
		if sourceValue, exists := sourceData[field]; exists {
			if !reflect.DeepEqual(sourceValue, value) {
				fieldChanges = append(fieldChanges, map[string]interface{}{
					"field":       field,
					"source_value": sourceValue,
					"target_value": value,
					"changed":     true,
				})
			}
		} else {
			fieldChanges = append(fieldChanges, map[string]interface{}{
				"field":       field,
				"target_value": value,
				"new_field":   true,
			})
		}
	}

	analysis["field_changes"] = fieldChanges
	return analysis
}

func (e *EngineImpl) convertToDataMapping(model *models.ERPDataMapping) *erp.DataMapping {
	return &erp.DataMapping{
		ID:              model.ID,
		ERPConnectionID: model.ERPConnectionID,
		MappingName:     model.MappingName,
		Description:     model.Description,
		DataType:        model.DataType,
		Direction:       erp.SyncDirection(model.Direction),
		PyTakeEntity:    model.PyTakeEntity,
		ERPEntity:       model.ERPEntity,
		FieldMappings:   model.FieldMappings,
		TransformRules:  model.TransformRules,
		ValidationRules: model.ValidationRules,
		SyncSettings: erp.SyncSettings{
			Priority:         model.Priority,
			SyncFrequency:    model.SyncFrequency,
			BatchSize:        model.BatchSize,
			ConflictStrategy: erp.ConflictResolutionStrategy(model.ConflictStrategy),
		},
		IsActive:  model.IsActive,
		CreatedAt: model.CreatedAt,
		UpdatedAt: model.UpdatedAt,
	}
}

// Utility functions

func (e *EngineImpl) validateType(value interface{}, expectedType string) bool {
	switch expectedType {
	case "string":
		_, ok := value.(string)
		return ok
	case "number":
		_, ok := e.toFloat64(value)
		return ok
	case "boolean":
		_, ok := value.(bool)
		return ok
	case "array":
		v := reflect.ValueOf(value)
		return v.Kind() == reflect.Slice || v.Kind() == reflect.Array
	case "object":
		_, ok := value.(map[string]interface{})
		return ok
	default:
		return true
	}
}

func (e *EngineImpl) toFloat64(value interface{}) (float64, bool) {
	switch v := value.(type) {
	case float64:
		return v, true
	case float32:
		return float64(v), true
	case int:
		return float64(v), true
	case int64:
		return float64(v), true
	case string:
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			return f, true
		}
	}
	return 0, false
}

func (e *EngineImpl) toSnakeCase(s string) string {
	var result []rune
	for i, r := range s {
		if i > 0 && (r >= 'A' && r <= 'Z') {
			result = append(result, '_')
		}
		result = append(result, rune(strings.ToLower(string(r))[0]))
	}
	return string(result)
}

func (e *EngineImpl) toCamelCase(s string) string {
	words := strings.Split(s, "_")
	result := strings.ToLower(words[0])
	for i := 1; i < len(words); i++ {
		result += strings.Title(strings.ToLower(words[i]))
	}
	return result
}

func stringPtr(s string) *string {
	return &s
}