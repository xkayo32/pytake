package segmentation

import (
	"context"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/pytake/pytake-go/internal/database/models"
	"gorm.io/gorm"
)

// RuleEngineImpl implements the RuleEngine interface
type RuleEngineImpl struct {
	db     *gorm.DB
	logger Logger
}

// NewRuleEngine creates a new rule engine
func NewRuleEngine(db *gorm.DB, logger Logger) RuleEngine {
	return &RuleEngineImpl{
		db:     db,
		logger: logger,
	}
}

// EvaluateRules evaluates a complete set of segmentation rules for a contact
func (r *RuleEngineImpl) EvaluateRules(ctx context.Context, tenantID, contactID uuid.UUID, rules *SegmentationRules) (bool, error) {
	if rules == nil {
		return false, nil
	}
	
	// Get contact data
	var contact models.Contact
	err := r.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", contactID, tenantID).
		First(&contact).Error
	
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return false, nil
		}
		return false, fmt.Errorf("failed to retrieve contact: %w", err)
	}
	
	return r.evaluateRulesForContact(ctx, &contact, rules)
}

// evaluateRulesForContact evaluates rules against a contact object
func (r *RuleEngineImpl) evaluateRulesForContact(ctx context.Context, contact *models.Contact, rules *SegmentationRules) (bool, error) {
	if rules == nil {
		return false, nil
	}
	
	var results []bool
	
	// Evaluate all conditions
	for _, condition := range rules.Conditions {
		result, err := r.evaluateConditionForContact(ctx, contact, condition)
		if err != nil {
			return false, err
		}
		results = append(results, result)
	}
	
	// Evaluate nested groups
	for _, group := range rules.Groups {
		result, err := r.evaluateRulesForContact(ctx, contact, group)
		if err != nil {
			return false, err
		}
		results = append(results, result)
	}
	
	if len(results) == 0 {
		return false, nil
	}
	
	// Apply logical operator
	switch rules.Operator {
	case LogicalOperatorAND:
		for _, result := range results {
			if !result {
				return false, nil
			}
		}
		return true, nil
		
	case LogicalOperatorOR:
		for _, result := range results {
			if result {
				return true, nil
			}
		}
		return false, nil
		
	default:
		return false, fmt.Errorf("unsupported logical operator: %s", rules.Operator)
	}
}

// EvaluateCondition evaluates a single condition for a contact
func (r *RuleEngineImpl) EvaluateCondition(ctx context.Context, tenantID, contactID uuid.UUID, condition *SegmentCondition) (bool, error) {
	// Get contact data
	var contact models.Contact
	err := r.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", contactID, tenantID).
		First(&contact).Error
	
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return false, nil
		}
		return false, fmt.Errorf("failed to retrieve contact: %w", err)
	}
	
	return r.evaluateConditionForContact(ctx, &contact, condition)
}

// evaluateConditionForContact evaluates a condition against a contact object
func (r *RuleEngineImpl) evaluateConditionForContact(ctx context.Context, contact *models.Contact, condition *SegmentCondition) (bool, error) {
	// Get the field value from the contact
	fieldValue, err := r.getContactFieldValue(contact, condition.Field)
	if err != nil {
		return false, err
	}
	
	// Evaluate the condition based on the operator
	return r.evaluateConditionValue(fieldValue, condition)
}

// getContactFieldValue extracts a field value from a contact
func (r *RuleEngineImpl) getContactFieldValue(contact *models.Contact, field string) (interface{}, error) {
	switch field {
	// Basic fields
	case "name":
		return contact.Name, nil
	case "phone_number":
		return contact.PhoneNumber, nil
	case "email":
		if contact.Email != nil {
			return *contact.Email, nil
		}
		return "", nil
	case "created_at":
		return contact.CreatedAt, nil
	case "updated_at":
		return contact.UpdatedAt, nil
	case "last_message_at":
		if contact.LastMessageAt != nil {
			return *contact.LastMessageAt, nil
		}
		return nil, nil
	case "is_active":
		return contact.IsActive, nil
	case "tags":
		return contact.Tags, nil
		
	// Custom fields
	default:
		if strings.HasPrefix(field, "custom.") {
			fieldName := strings.TrimPrefix(field, "custom.")
			if contact.CustomFields != nil {
				if value, exists := contact.CustomFields[fieldName]; exists {
					return value, nil
				}
			}
			return nil, nil
		}
		
		return nil, fmt.Errorf("unsupported field: %s", field)
	}
}

// evaluateConditionValue evaluates a condition based on the operator and values
func (r *RuleEngineImpl) evaluateConditionValue(fieldValue interface{}, condition *SegmentCondition) (bool, error) {
	switch condition.Operator {
	
	// String operators
	case "equals":
		return r.evaluateEquals(fieldValue, condition.Value, condition.CaseSensitive)
	case "not_equals":
		result, err := r.evaluateEquals(fieldValue, condition.Value, condition.CaseSensitive)
		return !result, err
	case "contains":
		return r.evaluateContains(fieldValue, condition.Value, condition.CaseSensitive)
	case "not_contains":
		result, err := r.evaluateContains(fieldValue, condition.Value, condition.CaseSensitive)
		return !result, err
	case "starts_with":
		return r.evaluateStartsWith(fieldValue, condition.Value, condition.CaseSensitive)
	case "ends_with":
		return r.evaluateEndsWith(fieldValue, condition.Value, condition.CaseSensitive)
	case "matches_regex":
		return r.evaluateRegex(fieldValue, condition.Value)
		
	// Numeric operators
	case "greater_than":
		return r.evaluateGreaterThan(fieldValue, condition.Value)
	case "greater_than_or_equal":
		return r.evaluateGreaterThanOrEqual(fieldValue, condition.Value)
	case "less_than":
		return r.evaluateLessThan(fieldValue, condition.Value)
	case "less_than_or_equal":
		return r.evaluateLessThanOrEqual(fieldValue, condition.Value)
	case "between":
		return r.evaluateBetween(fieldValue, condition.NumberRange)
		
	// Date operators
	case "date_equals":
		return r.evaluateDateEquals(fieldValue, condition.Value)
	case "date_before":
		return r.evaluateDateBefore(fieldValue, condition.Value)
	case "date_after":
		return r.evaluateDateAfter(fieldValue, condition.Value)
	case "date_between":
		return r.evaluateDateBetween(fieldValue, condition.DateRange)
	case "within_days":
		return r.evaluateWithinDays(fieldValue, condition.Value)
	case "older_than_days":
		return r.evaluateOlderThanDays(fieldValue, condition.Value)
		
	// Boolean operators
	case "is_true":
		return r.evaluateIsTrue(fieldValue)
	case "is_false":
		return r.evaluateIsFalse(fieldValue)
		
	// Null operators
	case "is_null":
		return r.evaluateIsNull(fieldValue)
	case "is_not_null":
		return r.evaluateIsNotNull(fieldValue)
		
	// Array operators
	case "in_list":
		return r.evaluateInList(fieldValue, condition.ListOptions)
	case "not_in_list":
		result, err := r.evaluateInList(fieldValue, condition.ListOptions)
		return !result, err
	case "array_contains":
		return r.evaluateArrayContains(fieldValue, condition.Value)
	case "array_not_contains":
		result, err := r.evaluateArrayContains(fieldValue, condition.Value)
		return !result, err
		
	default:
		return false, fmt.Errorf("unsupported operator: %s", condition.Operator)
	}
}

// String operator implementations

func (r *RuleEngineImpl) evaluateEquals(fieldValue interface{}, conditionValue interface{}, caseSensitive *bool) (bool, error) {
	fieldStr := fmt.Sprintf("%v", fieldValue)
	conditionStr := fmt.Sprintf("%v", conditionValue)
	
	if caseSensitive == nil || !*caseSensitive {
		fieldStr = strings.ToLower(fieldStr)
		conditionStr = strings.ToLower(conditionStr)
	}
	
	return fieldStr == conditionStr, nil
}

func (r *RuleEngineImpl) evaluateContains(fieldValue interface{}, conditionValue interface{}, caseSensitive *bool) (bool, error) {
	fieldStr := fmt.Sprintf("%v", fieldValue)
	conditionStr := fmt.Sprintf("%v", conditionValue)
	
	if caseSensitive == nil || !*caseSensitive {
		fieldStr = strings.ToLower(fieldStr)
		conditionStr = strings.ToLower(conditionStr)
	}
	
	return strings.Contains(fieldStr, conditionStr), nil
}

func (r *RuleEngineImpl) evaluateStartsWith(fieldValue interface{}, conditionValue interface{}, caseSensitive *bool) (bool, error) {
	fieldStr := fmt.Sprintf("%v", fieldValue)
	conditionStr := fmt.Sprintf("%v", conditionValue)
	
	if caseSensitive == nil || !*caseSensitive {
		fieldStr = strings.ToLower(fieldStr)
		conditionStr = strings.ToLower(conditionStr)
	}
	
	return strings.HasPrefix(fieldStr, conditionStr), nil
}

func (r *RuleEngineImpl) evaluateEndsWith(fieldValue interface{}, conditionValue interface{}, caseSensitive *bool) (bool, error) {
	fieldStr := fmt.Sprintf("%v", fieldValue)
	conditionStr := fmt.Sprintf("%v", conditionValue)
	
	if caseSensitive == nil || !*caseSensitive {
		fieldStr = strings.ToLower(fieldStr)
		conditionStr = strings.ToLower(conditionStr)
	}
	
	return strings.HasSuffix(fieldStr, conditionStr), nil
}

func (r *RuleEngineImpl) evaluateRegex(fieldValue interface{}, conditionValue interface{}) (bool, error) {
	fieldStr := fmt.Sprintf("%v", fieldValue)
	pattern := fmt.Sprintf("%v", conditionValue)
	
	matched, err := regexp.MatchString(pattern, fieldStr)
	if err != nil {
		return false, fmt.Errorf("invalid regex pattern: %w", err)
	}
	
	return matched, nil
}

// Numeric operator implementations

func (r *RuleEngineImpl) evaluateGreaterThan(fieldValue interface{}, conditionValue interface{}) (bool, error) {
	fieldNum, err := r.toFloat64(fieldValue)
	if err != nil {
		return false, err
	}
	
	conditionNum, err := r.toFloat64(conditionValue)
	if err != nil {
		return false, err
	}
	
	return fieldNum > conditionNum, nil
}

func (r *RuleEngineImpl) evaluateGreaterThanOrEqual(fieldValue interface{}, conditionValue interface{}) (bool, error) {
	fieldNum, err := r.toFloat64(fieldValue)
	if err != nil {
		return false, err
	}
	
	conditionNum, err := r.toFloat64(conditionValue)
	if err != nil {
		return false, err
	}
	
	return fieldNum >= conditionNum, nil
}

func (r *RuleEngineImpl) evaluateLessThan(fieldValue interface{}, conditionValue interface{}) (bool, error) {
	fieldNum, err := r.toFloat64(fieldValue)
	if err != nil {
		return false, err
	}
	
	conditionNum, err := r.toFloat64(conditionValue)
	if err != nil {
		return false, err
	}
	
	return fieldNum < conditionNum, nil
}

func (r *RuleEngineImpl) evaluateLessThanOrEqual(fieldValue interface{}, conditionValue interface{}) (bool, error) {
	fieldNum, err := r.toFloat64(fieldValue)
	if err != nil {
		return false, err
	}
	
	conditionNum, err := r.toFloat64(conditionValue)
	if err != nil {
		return false, err
	}
	
	return fieldNum <= conditionNum, nil
}

func (r *RuleEngineImpl) evaluateBetween(fieldValue interface{}, numberRange *NumberRangeValue) (bool, error) {
	if numberRange == nil {
		return false, fmt.Errorf("number range is required for between operator")
	}
	
	fieldNum, err := r.toFloat64(fieldValue)
	if err != nil {
		return false, err
	}
	
	if numberRange.Min != nil && fieldNum < *numberRange.Min {
		return false, nil
	}
	
	if numberRange.Max != nil && fieldNum > *numberRange.Max {
		return false, nil
	}
	
	return true, nil
}

// Date operator implementations

func (r *RuleEngineImpl) evaluateDateEquals(fieldValue interface{}, conditionValue interface{}) (bool, error) {
	fieldDate, err := r.toTime(fieldValue)
	if err != nil {
		return false, err
	}
	
	conditionDate, err := r.toTime(conditionValue)
	if err != nil {
		return false, err
	}
	
	// Compare dates (ignoring time)
	return fieldDate.Format("2006-01-02") == conditionDate.Format("2006-01-02"), nil
}

func (r *RuleEngineImpl) evaluateDateBefore(fieldValue interface{}, conditionValue interface{}) (bool, error) {
	fieldDate, err := r.toTime(fieldValue)
	if err != nil {
		return false, err
	}
	
	conditionDate, err := r.toTime(conditionValue)
	if err != nil {
		return false, err
	}
	
	return fieldDate.Before(conditionDate), nil
}

func (r *RuleEngineImpl) evaluateDateAfter(fieldValue interface{}, conditionValue interface{}) (bool, error) {
	fieldDate, err := r.toTime(fieldValue)
	if err != nil {
		return false, err
	}
	
	conditionDate, err := r.toTime(conditionValue)
	if err != nil {
		return false, err
	}
	
	return fieldDate.After(conditionDate), nil
}

func (r *RuleEngineImpl) evaluateDateBetween(fieldValue interface{}, dateRange *DateRangeValue) (bool, error) {
	if dateRange == nil {
		return false, fmt.Errorf("date range is required for date_between operator")
	}
	
	fieldDate, err := r.toTime(fieldValue)
	if err != nil {
		return false, err
	}
	
	if dateRange.From != nil && fieldDate.Before(*dateRange.From) {
		return false, nil
	}
	
	if dateRange.To != nil && fieldDate.After(*dateRange.To) {
		return false, nil
	}
	
	return true, nil
}

func (r *RuleEngineImpl) evaluateWithinDays(fieldValue interface{}, conditionValue interface{}) (bool, error) {
	fieldDate, err := r.toTime(fieldValue)
	if err != nil {
		return false, err
	}
	
	days, err := r.toFloat64(conditionValue)
	if err != nil {
		return false, err
	}
	
	cutoffDate := time.Now().AddDate(0, 0, -int(days))
	return fieldDate.After(cutoffDate), nil
}

func (r *RuleEngineImpl) evaluateOlderThanDays(fieldValue interface{}, conditionValue interface{}) (bool, error) {
	fieldDate, err := r.toTime(fieldValue)
	if err != nil {
		return false, err
	}
	
	days, err := r.toFloat64(conditionValue)
	if err != nil {
		return false, err
	}
	
	cutoffDate := time.Now().AddDate(0, 0, -int(days))
	return fieldDate.Before(cutoffDate), nil
}

// Boolean operator implementations

func (r *RuleEngineImpl) evaluateIsTrue(fieldValue interface{}) (bool, error) {
	if fieldValue == nil {
		return false, nil
	}
	
	switch v := fieldValue.(type) {
	case bool:
		return v, nil
	case string:
		return strings.ToLower(v) == "true", nil
	default:
		return false, fmt.Errorf("cannot evaluate boolean condition on non-boolean value")
	}
}

func (r *RuleEngineImpl) evaluateIsFalse(fieldValue interface{}) (bool, error) {
	result, err := r.evaluateIsTrue(fieldValue)
	return !result, err
}

// Null operator implementations

func (r *RuleEngineImpl) evaluateIsNull(fieldValue interface{}) (bool, error) {
	return fieldValue == nil, nil
}

func (r *RuleEngineImpl) evaluateIsNotNull(fieldValue interface{}) (bool, error) {
	return fieldValue != nil, nil
}

// Array operator implementations

func (r *RuleEngineImpl) evaluateInList(fieldValue interface{}, listOptions *ListConditionOptions) (bool, error) {
	if listOptions == nil || len(listOptions.Values) == 0 {
		return false, nil
	}
	
	fieldStr := fmt.Sprintf("%v", fieldValue)
	
	for _, value := range listOptions.Values {
		valueStr := fmt.Sprintf("%v", value)
		
		if listOptions.MatchExact {
			if fieldStr == valueStr {
				return true, nil
			}
		} else {
			if strings.Contains(fieldStr, valueStr) {
				return true, nil
			}
		}
	}
	
	return false, nil
}

func (r *RuleEngineImpl) evaluateArrayContains(fieldValue interface{}, conditionValue interface{}) (bool, error) {
	// Handle string arrays (like tags)
	switch arr := fieldValue.(type) {
	case []string:
		searchValue := fmt.Sprintf("%v", conditionValue)
		for _, item := range arr {
			if item == searchValue {
				return true, nil
			}
		}
		return false, nil
		
	case []interface{}:
		searchValue := fmt.Sprintf("%v", conditionValue)
		for _, item := range arr {
			if fmt.Sprintf("%v", item) == searchValue {
				return true, nil
			}
		}
		return false, nil
		
	default:
		return false, fmt.Errorf("array_contains can only be used on array fields")
	}
}

// ValidateCondition validates a single condition
func (r *RuleEngineImpl) ValidateCondition(condition *SegmentCondition) error {
	if condition.Field == "" {
		return fmt.Errorf("field is required")
	}
	
	if condition.Operator == "" {
		return fmt.Errorf("operator is required")
	}
	
	// Validate operator-specific requirements
	switch condition.Operator {
	case "between":
		if condition.NumberRange == nil {
			return fmt.Errorf("number range is required for between operator")
		}
	case "date_between":
		if condition.DateRange == nil {
			return fmt.Errorf("date range is required for date_between operator")
		}
	case "in_list", "not_in_list":
		if condition.ListOptions == nil || len(condition.ListOptions.Values) == 0 {
			return fmt.Errorf("list options are required for list operators")
		}
	}
	
	return nil
}

// ValidateRules validates a complete set of rules
func (r *RuleEngineImpl) ValidateRules(rules *SegmentationRules) error {
	if rules == nil {
		return fmt.Errorf("rules cannot be nil")
	}
	
	if rules.Operator != LogicalOperatorAND && rules.Operator != LogicalOperatorOR {
		return fmt.Errorf("invalid logical operator: %s", rules.Operator)
	}
	
	// Validate conditions
	for _, condition := range rules.Conditions {
		if err := r.ValidateCondition(condition); err != nil {
			return err
		}
	}
	
	// Validate nested groups
	for _, group := range rules.Groups {
		if err := r.ValidateRules(group); err != nil {
			return err
		}
	}
	
	return nil
}

// GetSupportedFields returns the list of fields that can be used in segmentation
func (r *RuleEngineImpl) GetSupportedFields() []FieldDefinition {
	return []FieldDefinition{
		{Name: "name", DisplayName: "Name", Type: "string", Description: "Contact name"},
		{Name: "phone_number", DisplayName: "Phone Number", Type: "string", Description: "Contact phone number"},
		{Name: "email", DisplayName: "Email", Type: "string", Description: "Contact email address"},
		{Name: "created_at", DisplayName: "Created Date", Type: "date", Description: "When the contact was created"},
		{Name: "updated_at", DisplayName: "Updated Date", Type: "date", Description: "When the contact was last updated"},
		{Name: "last_message_at", DisplayName: "Last Message Date", Type: "date", Description: "When the contact last sent a message"},
		{Name: "is_active", DisplayName: "Is Active", Type: "boolean", Description: "Whether the contact is active"},
		{Name: "tags", DisplayName: "Tags", Type: "array", Description: "Contact tags"},
	}
}

// GetSupportedOperators returns the list of operators for a field type
func (r *RuleEngineImpl) GetSupportedOperators(fieldType string) []OperatorDefinition {
	switch fieldType {
	case "string":
		return []OperatorDefinition{
			{Name: "equals", DisplayName: "Equals", Description: "Field equals value", ValueType: "single"},
			{Name: "not_equals", DisplayName: "Not Equals", Description: "Field does not equal value", ValueType: "single"},
			{Name: "contains", DisplayName: "Contains", Description: "Field contains value", ValueType: "single"},
			{Name: "not_contains", DisplayName: "Does Not Contain", Description: "Field does not contain value", ValueType: "single"},
			{Name: "starts_with", DisplayName: "Starts With", Description: "Field starts with value", ValueType: "single"},
			{Name: "ends_with", DisplayName: "Ends With", Description: "Field ends with value", ValueType: "single"},
			{Name: "matches_regex", DisplayName: "Matches Regex", Description: "Field matches regex pattern", ValueType: "single"},
			{Name: "is_null", DisplayName: "Is Empty", Description: "Field is null or empty", ValueType: "none"},
			{Name: "is_not_null", DisplayName: "Is Not Empty", Description: "Field is not null or empty", ValueType: "none"},
			{Name: "in_list", DisplayName: "In List", Description: "Field is in list of values", ValueType: "list"},
		}
	case "number":
		return []OperatorDefinition{
			{Name: "equals", DisplayName: "Equals", Description: "Field equals value", ValueType: "single"},
			{Name: "not_equals", DisplayName: "Not Equals", Description: "Field does not equal value", ValueType: "single"},
			{Name: "greater_than", DisplayName: "Greater Than", Description: "Field is greater than value", ValueType: "single"},
			{Name: "greater_than_or_equal", DisplayName: "Greater Than or Equal", Description: "Field is >= value", ValueType: "single"},
			{Name: "less_than", DisplayName: "Less Than", Description: "Field is less than value", ValueType: "single"},
			{Name: "less_than_or_equal", DisplayName: "Less Than or Equal", Description: "Field is <= value", ValueType: "single"},
			{Name: "between", DisplayName: "Between", Description: "Field is between two values", ValueType: "range"},
		}
	case "date":
		return []OperatorDefinition{
			{Name: "date_equals", DisplayName: "On Date", Description: "Field equals date", ValueType: "single"},
			{Name: "date_before", DisplayName: "Before Date", Description: "Field is before date", ValueType: "single"},
			{Name: "date_after", DisplayName: "After Date", Description: "Field is after date", ValueType: "single"},
			{Name: "date_between", DisplayName: "Between Dates", Description: "Field is between two dates", ValueType: "range"},
			{Name: "within_days", DisplayName: "Within Days", Description: "Field is within X days", ValueType: "single"},
			{Name: "older_than_days", DisplayName: "Older Than Days", Description: "Field is older than X days", ValueType: "single"},
		}
	case "boolean":
		return []OperatorDefinition{
			{Name: "is_true", DisplayName: "Is True", Description: "Field is true", ValueType: "none"},
			{Name: "is_false", DisplayName: "Is False", Description: "Field is false", ValueType: "none"},
		}
	case "array":
		return []OperatorDefinition{
			{Name: "array_contains", DisplayName: "Contains", Description: "Array contains value", ValueType: "single"},
			{Name: "array_not_contains", DisplayName: "Does Not Contain", Description: "Array does not contain value", ValueType: "single"},
		}
	default:
		return []OperatorDefinition{}
	}
}

// Helper functions

func (r *RuleEngineImpl) toFloat64(value interface{}) (float64, error) {
	switch v := value.(type) {
	case float64:
		return v, nil
	case float32:
		return float64(v), nil
	case int:
		return float64(v), nil
	case int32:
		return float64(v), nil
	case int64:
		return float64(v), nil
	case string:
		return strconv.ParseFloat(v, 64)
	default:
		return 0, fmt.Errorf("cannot convert %T to float64", value)
	}
}

func (r *RuleEngineImpl) toTime(value interface{}) (time.Time, error) {
	switch v := value.(type) {
	case time.Time:
		return v, nil
	case string:
		// Try various time formats
		formats := []string{
			time.RFC3339,
			"2006-01-02T15:04:05Z",
			"2006-01-02 15:04:05",
			"2006-01-02",
		}
		
		for _, format := range formats {
			if t, err := time.Parse(format, v); err == nil {
				return t, nil
			}
		}
		
		return time.Time{}, fmt.Errorf("cannot parse time: %s", v)
	default:
		return time.Time{}, fmt.Errorf("cannot convert %T to time.Time", value)
	}
}