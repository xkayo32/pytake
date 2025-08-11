package templates

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"text/template"
	"time"

	"github.com/google/uuid"
	"github.com/pytake/pytake-go/internal/database/models"
	"gorm.io/gorm"
)

// EngineImpl implements the TemplateEngine interface
type EngineImpl struct {
	db     *gorm.DB
	logger Logger
}

// Logger interface for template engine logging
type Logger interface {
	Debug(msg string, fields ...interface{})
	Info(msg string, fields ...interface{})
	Warn(msg string, fields ...interface{})
	Error(msg string, fields ...interface{})
}

// NewEngine creates a new template engine
func NewEngine(db *gorm.DB, logger Logger) *EngineImpl {
	return &EngineImpl{
		db:     db,
		logger: logger,
	}
}

// Template Management Implementation

// CreateTemplate creates a new message template
func (e *EngineImpl) CreateTemplate(ctx context.Context, tenantID uuid.UUID, request *CreateTemplateRequest) (*MessageTemplate, error) {
	// Validate the request
	if err := e.validateCreateTemplateRequest(request); err != nil {
		return nil, fmt.Errorf("invalid request: %w", err)
	}

	// Extract variables from content
	variables, err := e.ExtractVariables(request.Content)
	if err != nil {
		return nil, fmt.Errorf("failed to extract variables: %w", err)
	}

	// Create database model
	dbTemplate := &models.MessageTemplate{
		TenantModel: models.TenantModel{
			TenantID: tenantID,
		},
		Name:                 request.Name,
		Description:          request.Description,
		Category:             request.Category,
		Type:                 string(request.Type),
		Content:              e.convertTemplateContentToJSON(request.Content),
		Variables:            variables,
		PreviewText:          request.PreviewText,
		WhatsAppTemplateName: request.WhatsAppTemplateName,
		WhatsAppLanguage:     request.WhatsAppLanguage,
		RequireApproval:      request.RequireApproval,
		IsActive:             request.IsActive,
		Tags:                 request.Tags,
		UsageCount:           0,
		// CreatedByID will be set from context in the handler
	}

	// Save to database
	if err := e.db.WithContext(ctx).Create(dbTemplate).Error; err != nil {
		return nil, fmt.Errorf("failed to create template: %w", err)
	}

	// Convert to domain model
	messageTemplate := e.convertToMessageTemplate(dbTemplate)

	e.logger.Info("Template created", "template_id", messageTemplate.ID, "name", messageTemplate.Name, "type", messageTemplate.Type)
	return messageTemplate, nil
}

// UpdateTemplate updates an existing template
func (e *EngineImpl) UpdateTemplate(ctx context.Context, tenantID, templateID uuid.UUID, request *UpdateTemplateRequest) (*MessageTemplate, error) {
	// Get existing template
	var dbTemplate models.MessageTemplate
	err := e.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", templateID, tenantID).
		First(&dbTemplate).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("template not found")
		}
		return nil, fmt.Errorf("failed to retrieve template: %w", err)
	}

	// Build update map
	updates := make(map[string]interface{})
	updates["updated_at"] = time.Now()

	if request.Name != nil {
		updates["name"] = *request.Name
	}
	if request.Description != nil {
		updates["description"] = *request.Description
	}
	if request.Category != nil {
		updates["category"] = *request.Category
	}
	if request.PreviewText != nil {
		updates["preview_text"] = *request.PreviewText
	}
	if request.RequireApproval != nil {
		updates["require_approval"] = *request.RequireApproval
	}
	if request.IsActive != nil {
		updates["is_active"] = *request.IsActive
	}
	if request.Tags != nil {
		updates["tags"] = request.Tags
	}

	// Update content and extract variables if provided
	if request.Content != nil {
		variables, err := e.ExtractVariables(request.Content)
		if err != nil {
			return nil, fmt.Errorf("failed to extract variables: %w", err)
		}
		updates["content"] = e.convertTemplateContentToJSON(request.Content)
		updates["variables"] = variables
	}

	// Update in database
	if err := e.db.WithContext(ctx).Model(&dbTemplate).Updates(updates).Error; err != nil {
		return nil, fmt.Errorf("failed to update template: %w", err)
	}

	// Retrieve updated template
	if err := e.db.WithContext(ctx).First(&dbTemplate, templateID).Error; err != nil {
		return nil, fmt.Errorf("failed to retrieve updated template: %w", err)
	}

	messageTemplate := e.convertToMessageTemplate(&dbTemplate)

	e.logger.Info("Template updated", "template_id", messageTemplate.ID, "name", messageTemplate.Name)
	return messageTemplate, nil
}

// DeleteTemplate deletes a template
func (e *EngineImpl) DeleteTemplate(ctx context.Context, tenantID, templateID uuid.UUID) error {
	result := e.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", templateID, tenantID).
		Delete(&models.MessageTemplate{})

	if result.Error != nil {
		return fmt.Errorf("failed to delete template: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("template not found")
	}

	e.logger.Info("Template deleted", "template_id", templateID)
	return nil
}

// GetTemplate retrieves a template by ID
func (e *EngineImpl) GetTemplate(ctx context.Context, tenantID, templateID uuid.UUID) (*MessageTemplate, error) {
	var dbTemplate models.MessageTemplate
	err := e.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", templateID, tenantID).
		First(&dbTemplate).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("template not found")
		}
		return nil, fmt.Errorf("failed to retrieve template: %w", err)
	}

	return e.convertToMessageTemplate(&dbTemplate), nil
}

// ListTemplates lists templates with filtering
func (e *EngineImpl) ListTemplates(ctx context.Context, tenantID uuid.UUID, filter *TemplateFilter) ([]*MessageTemplate, int64, error) {
	query := e.db.WithContext(ctx).Model(&models.MessageTemplate{}).
		Where("tenant_id = ?", tenantID)

	// Apply filters
	if filter != nil {
		if filter.Type != nil {
			query = query.Where("type = ?", string(*filter.Type))
		}

		if filter.Category != "" {
			query = query.Where("category = ?", filter.Category)
		}

		if filter.Search != "" {
			query = query.Where("name ILIKE ? OR description ILIKE ?",
				"%"+filter.Search+"%", "%"+filter.Search+"%")
		}

		if len(filter.Tags) > 0 {
			query = query.Where("tags && ?", filter.Tags)
		}

		if filter.IsActive != nil {
			query = query.Where("is_active = ?", *filter.IsActive)
		}

		if filter.RequireApproval != nil {
			query = query.Where("require_approval = ?", *filter.RequireApproval)
		}

		if filter.WhatsAppStatus != nil {
			query = query.Where("whatsapp_status = ?", *filter.WhatsAppStatus)
		}

		if filter.CreatedByID != nil {
			query = query.Where("created_by_id = ?", *filter.CreatedByID)
		}

		if filter.CreatedFrom != nil {
			query = query.Where("created_at >= ?", *filter.CreatedFrom)
		}

		if filter.CreatedTo != nil {
			query = query.Where("created_at <= ?", *filter.CreatedTo)
		}
	}

	// Get total count
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count templates: %w", err)
	}

	// Apply sorting and pagination
	if filter != nil {
		if filter.SortBy != "" {
			order := filter.SortBy
			if filter.SortDesc {
				order += " DESC"
			}
			query = query.Order(order)
		} else {
			query = query.Order("created_at DESC")
		}

		if filter.Limit > 0 {
			query = query.Limit(filter.Limit)
		}

		if filter.Offset > 0 {
			query = query.Offset(filter.Offset)
		}
	}

	var dbTemplates []*models.MessageTemplate
	if err := query.Find(&dbTemplates).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to retrieve templates: %w", err)
	}

	// Convert to domain models
	templates := make([]*MessageTemplate, len(dbTemplates))
	for i, dbTemplate := range dbTemplates {
		templates[i] = e.convertToMessageTemplate(dbTemplate)
	}

	return templates, total, nil
}

// Template Processing Implementation

// RenderTemplate renders a template with provided variables
func (e *EngineImpl) RenderTemplate(ctx context.Context, tenantID, templateID uuid.UUID, variables map[string]interface{}) (*RenderedTemplate, error) {
	// Get template
	messageTemplate, err := e.GetTemplate(ctx, tenantID, templateID)
	if err != nil {
		return nil, err
	}

	// Validate variables
	if err := e.ValidateVariables(messageTemplate.Content, variables); err != nil {
		return nil, fmt.Errorf("variable validation failed: %w", err)
	}

	// Render content based on template type
	var processedContent *ProcessedContent
	var estimatedSize int

	switch messageTemplate.Type {
	case TemplateTypeText:
		processedContent, estimatedSize, err = e.renderTextTemplate(messageTemplate.Content, variables)
	case TemplateTypeMedia:
		processedContent, estimatedSize, err = e.renderMediaTemplate(messageTemplate.Content, variables)
	case TemplateTypeInteractive:
		processedContent, estimatedSize, err = e.renderInteractiveTemplate(messageTemplate.Content, variables)
	case TemplateTypeWhatsApp:
		processedContent, estimatedSize, err = e.renderWhatsAppTemplate(messageTemplate.Content, variables)
	default:
		return nil, fmt.Errorf("unsupported template type: %s", messageTemplate.Type)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to render template: %w", err)
	}

	// Record usage
	if err := e.RecordTemplateUsage(ctx, tenantID, templateID, "render"); err != nil {
		e.logger.Warn("Failed to record template usage", "template_id", templateID, "error", err)
	}

	return &RenderedTemplate{
		TemplateID:    templateID,
		Content:       processedContent,
		Variables:     variables,
		RenderedAt:    time.Now(),
		EstimatedSize: estimatedSize,
	}, nil
}

// ValidateTemplate validates a template
func (e *EngineImpl) ValidateTemplate(ctx context.Context, messageTemplate *MessageTemplate) (*ValidationResult, error) {
	result := &ValidationResult{
		IsValid:  true,
		Errors:   []ValidationError{},
		Warnings: []ValidationWarning{},
	}

	// Validate basic fields
	if messageTemplate.Name == "" {
		result.Errors = append(result.Errors, ValidationError{
			Field:   "name",
			Code:    "required",
			Message: "Template name is required",
		})
		result.IsValid = false
	}

	if messageTemplate.Content == nil {
		result.Errors = append(result.Errors, ValidationError{
			Field:   "content",
			Code:    "required",
			Message: "Template content is required",
		})
		result.IsValid = false
		return result, nil
	}

	// Validate content based on type
	switch messageTemplate.Type {
	case TemplateTypeText:
		e.validateTextContent(messageTemplate.Content, result)
	case TemplateTypeMedia:
		e.validateMediaContent(messageTemplate.Content, result)
	case TemplateTypeInteractive:
		e.validateInteractiveContent(messageTemplate.Content, result)
	case TemplateTypeWhatsApp:
		e.validateWhatsAppContent(messageTemplate.Content, result)
	}

	// Extract and validate variables
	variables, err := e.ExtractVariables(messageTemplate.Content)
	if err != nil {
		result.Errors = append(result.Errors, ValidationError{
			Field:   "content",
			Code:    "invalid_variables",
			Message: fmt.Sprintf("Failed to extract variables: %s", err.Error()),
		})
		result.IsValid = false
	} else if len(variables) > 20 {
		result.Warnings = append(result.Warnings, ValidationWarning{
			Field:   "content",
			Code:    "too_many_variables",
			Message: "Template has more than 20 variables, which may impact performance",
		})
	}

	return result, nil
}

// PreviewTemplate generates a preview of the template
func (e *EngineImpl) PreviewTemplate(ctx context.Context, tenantID, templateID uuid.UUID, sampleData map[string]interface{}) (*TemplatePreview, error) {
	// Get template
	messageTemplate, err := e.GetTemplate(ctx, tenantID, templateID)
	if err != nil {
		return nil, err
	}

	// Generate sample data if not provided
	if len(sampleData) == 0 {
		sampleData = e.generateSampleData(messageTemplate.Variables)
	}

	// Render template
	rendered, err := e.RenderTemplate(ctx, tenantID, templateID, sampleData)
	if err != nil {
		return nil, err
	}

	// Generate preview text and HTML
	previewText := e.generatePreviewText(rendered.Content)
	previewHTML := e.generatePreviewHTML(rendered.Content, messageTemplate.Type)

	// Check for warnings
	var warnings []string
	if rendered.EstimatedSize > 4096 {
		warnings = append(warnings, "Message size exceeds recommended limit")
	}

	return &TemplatePreview{
		TemplateID:    templateID,
		PreviewHTML:   previewHTML,
		PreviewText:   previewText,
		Variables:     sampleData,
		Warnings:      warnings,
		EstimatedSize: rendered.EstimatedSize,
		GeneratedAt:   time.Now(),
	}, nil
}

// Variable Management Implementation

// ExtractVariables extracts variable names from template content
func (e *EngineImpl) ExtractVariables(content *TemplateContent) ([]string, error) {
	variableSet := make(map[string]bool)

	// Extract from text content
	if content.Text != nil {
		vars := e.extractVariablesFromText(*content.Text)
		for _, v := range vars {
			variableSet[v] = true
		}
	}

	// Extract from caption
	if content.Caption != nil {
		vars := e.extractVariablesFromText(*content.Caption)
		for _, v := range vars {
			variableSet[v] = true
		}
	}

	// Extract from WhatsApp template components
	if content.Body != nil && content.Body.Text != "" {
		vars := e.extractVariablesFromText(content.Body.Text)
		for _, v := range vars {
			variableSet[v] = true
		}
	}

	if content.Header != nil && content.Header.Text != nil {
		vars := e.extractVariablesFromText(*content.Header.Text)
		for _, v := range vars {
			variableSet[v] = true
		}
	}

	// Extract from interactive content
	if content.Interactive != nil {
		vars := e.extractVariablesFromText(content.Interactive.Body.Text)
		for _, v := range vars {
			variableSet[v] = true
		}

		if content.Interactive.Header != nil && content.Interactive.Header.Text != nil {
			vars := e.extractVariablesFromText(*content.Interactive.Header.Text)
			for _, v := range vars {
				variableSet[v] = true
			}
		}

		if content.Interactive.Footer != nil {
			vars := e.extractVariablesFromText(content.Interactive.Footer.Text)
			for _, v := range vars {
				variableSet[v] = true
			}
		}
	}

	// Convert set to slice
	variables := make([]string, 0, len(variableSet))
	for variable := range variableSet {
		variables = append(variables, variable)
	}

	return variables, nil
}

// ValidateVariables validates that all required variables are provided
func (e *EngineImpl) ValidateVariables(content *TemplateContent, variables map[string]interface{}) error {
	requiredVars, err := e.ExtractVariables(content)
	if err != nil {
		return err
	}

	for _, required := range requiredVars {
		if _, exists := variables[required]; !exists {
			return fmt.Errorf("required variable '%s' is missing", required)
		}
	}

	return nil
}

// GetRequiredVariables gets the required variables for a template
func (e *EngineImpl) GetRequiredVariables(ctx context.Context, tenantID, templateID uuid.UUID) ([]VariableDefinition, error) {
	messageTemplate, err := e.GetTemplate(ctx, tenantID, templateID)
	if err != nil {
		return nil, err
	}

	// If template has defined variables in content, use those
	if messageTemplate.Content != nil && len(messageTemplate.Content.Variables) > 0 {
		return messageTemplate.Content.Variables, nil
	}

	// Otherwise, generate basic definitions from extracted variable names
	variables := make([]VariableDefinition, len(messageTemplate.Variables))
	for i, varName := range messageTemplate.Variables {
		variables[i] = VariableDefinition{
			Name:        varName,
			Type:        "text",
			Required:    true,
			Description: fmt.Sprintf("Variable: %s", varName),
		}
	}

	return variables, nil
}

// Usage Statistics Implementation

// RecordTemplateUsage records template usage
func (e *EngineImpl) RecordTemplateUsage(ctx context.Context, tenantID, templateID uuid.UUID, context string) error {
	// Update usage count and last used timestamp
	now := time.Now()
	updates := map[string]interface{}{
		"usage_count":  gorm.Expr("usage_count + 1"),
		"last_used_at": &now,
		"updated_at":   now,
	}

	if err := e.db.WithContext(ctx).
		Model(&models.MessageTemplate{}).
		Where("id = ? AND tenant_id = ?", templateID, tenantID).
		Updates(updates).Error; err != nil {
		return fmt.Errorf("failed to record template usage: %w", err)
	}

	return nil
}

// GetTemplateStatistics gets template usage statistics
func (e *EngineImpl) GetTemplateStatistics(ctx context.Context, tenantID, templateID uuid.UUID, dateRange *DateRange) (*TemplateStatistics, error) {
	// Get template
	messageTemplate, err := e.GetTemplate(ctx, tenantID, templateID)
	if err != nil {
		return nil, err
	}

	// For now, return basic statistics from the template itself
	// In a full implementation, you would query detailed usage logs
	stats := &TemplateStatistics{
		TemplateID:      templateID,
		DateRange:       *dateRange,
		TotalUsage:      messageTemplate.UsageCount,
		UniqueUsers:     0, // Would be calculated from usage logs
		UniqueCampaigns: 0, // Would be calculated from usage logs
		UsageByDay:      []DailyUsage{},
		UsageByChannel:  make(map[string]int),
		UsageByContext:  make(map[string]int),
		LastUpdated:     time.Now(),
	}

	return stats, nil
}

// Helper methods

func (e *EngineImpl) validateCreateTemplateRequest(request *CreateTemplateRequest) error {
	if request.Name == "" {
		return fmt.Errorf("name is required")
	}

	if request.Content == nil {
		return fmt.Errorf("content is required")
	}

	return nil
}

func (e *EngineImpl) convertTemplateContentToJSON(content *TemplateContent) models.JSON {
	// This is a simplified conversion - in a real implementation,
	// you would use proper JSON marshaling
	result := make(models.JSON)

	if content.Text != nil {
		result["text"] = *content.Text
	}
	if content.MediaType != nil {
		result["media_type"] = *content.MediaType
	}
	if content.MediaURL != nil {
		result["media_url"] = *content.MediaURL
	}
	if content.Caption != nil {
		result["caption"] = *content.Caption
	}
	if content.Language != "" {
		result["language"] = content.Language
	}

	// Add more content conversion logic here

	return result
}

func (e *EngineImpl) convertToMessageTemplate(dbTemplate *models.MessageTemplate) *MessageTemplate {
	return &MessageTemplate{
		ID:                   dbTemplate.ID,
		TenantID:             dbTemplate.TenantID,
		Name:                 dbTemplate.Name,
		Description:          dbTemplate.Description,
		Category:             dbTemplate.Category,
		Type:                 TemplateType(dbTemplate.Type),
		Content:              e.convertJSONToTemplateContent(dbTemplate.Content),
		Variables:            dbTemplate.Variables,
		PreviewText:          dbTemplate.PreviewText,
		WhatsAppTemplateID:   dbTemplate.WhatsAppTemplateID,
		WhatsAppTemplateName: dbTemplate.WhatsAppTemplateName,
		WhatsAppLanguage:     dbTemplate.WhatsAppLanguage,
		RequireApproval:      dbTemplate.RequireApproval,
		IsActive:             dbTemplate.IsActive,
		Tags:                 dbTemplate.Tags,
		UsageCount:           dbTemplate.UsageCount,
		LastUsedAt:           dbTemplate.LastUsedAt,
		CreatedAt:            dbTemplate.CreatedAt,
		UpdatedAt:            dbTemplate.UpdatedAt,
		CreatedByID:          dbTemplate.CreatedByID,
	}
}

func (e *EngineImpl) convertJSONToTemplateContent(jsonData models.JSON) *TemplateContent {
	content := &TemplateContent{}

	if text, ok := jsonData["text"].(string); ok {
		content.Text = &text
	}
	if mediaType, ok := jsonData["media_type"].(string); ok {
		content.MediaType = &mediaType
	}
	if mediaURL, ok := jsonData["media_url"].(string); ok {
		content.MediaURL = &mediaURL
	}
	if caption, ok := jsonData["caption"].(string); ok {
		content.Caption = &caption
	}
	if language, ok := jsonData["language"].(string); ok {
		content.Language = language
	}

	return content
}

func (e *EngineImpl) extractVariablesFromText(text string) []string {
	// Extract variables in the format {{variable_name}}
	re := regexp.MustCompile(`\{\{([^}]+)\}\}`)
	matches := re.FindAllStringSubmatch(text, -1)

	variables := make([]string, 0, len(matches))
	for _, match := range matches {
		if len(match) > 1 {
			variable := strings.TrimSpace(match[1])
			variables = append(variables, variable)
		}
	}

	return variables
}

func (e *EngineImpl) renderTextTemplate(content *TemplateContent, variables map[string]interface{}) (*ProcessedContent, int, error) {
	if content.Text == nil {
		return nil, 0, fmt.Errorf("text content is required")
	}

	// Render text using Go's text/template
	tmpl, err := template.New("text").Parse(*content.Text)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to parse template: %w", err)
	}

	var result strings.Builder
	if err := tmpl.Execute(&result, variables); err != nil {
		return nil, 0, fmt.Errorf("failed to execute template: %w", err)
	}

	renderedText := result.String()
	processedContent := &ProcessedContent{
		Text: &renderedText,
	}

	// Render caption if present
	if content.Caption != nil {
		captionTmpl, err := template.New("caption").Parse(*content.Caption)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to parse caption template: %w", err)
		}

		var captionResult strings.Builder
		if err := captionTmpl.Execute(&captionResult, variables); err != nil {
			return nil, 0, fmt.Errorf("failed to execute caption template: %w", err)
		}

		renderedCaption := captionResult.String()
		processedContent.Caption = &renderedCaption
	}

	estimatedSize := len(renderedText)
	if processedContent.Caption != nil {
		estimatedSize += len(*processedContent.Caption)
	}

	return processedContent, estimatedSize, nil
}

func (e *EngineImpl) renderMediaTemplate(content *TemplateContent, variables map[string]interface{}) (*ProcessedContent, int, error) {
	processedContent := &ProcessedContent{
		MediaType: content.MediaType,
		MediaURL:  content.MediaURL,
	}

	estimatedSize := 0
	if content.MediaURL != nil {
		estimatedSize = 1024 // Estimate for media URL
	}

	// Render caption if present
	if content.Caption != nil {
		captionTmpl, err := template.New("caption").Parse(*content.Caption)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to parse caption template: %w", err)
		}

		var captionResult strings.Builder
		if err := captionTmpl.Execute(&captionResult, variables); err != nil {
			return nil, 0, fmt.Errorf("failed to execute caption template: %w", err)
		}

		renderedCaption := captionResult.String()
		processedContent.Caption = &renderedCaption
		estimatedSize += len(renderedCaption)
	}

	return processedContent, estimatedSize, nil
}

func (e *EngineImpl) renderInteractiveTemplate(content *TemplateContent, variables map[string]interface{}) (*ProcessedContent, int, error) {
	if content.Interactive == nil {
		return nil, 0, fmt.Errorf("interactive content is required")
	}

	// Render interactive body text
	bodyTmpl, err := template.New("body").Parse(content.Interactive.Body.Text)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to parse body template: %w", err)
	}

	var bodyResult strings.Builder
	if err := bodyTmpl.Execute(&bodyResult, variables); err != nil {
		return nil, 0, fmt.Errorf("failed to execute body template: %w", err)
	}

	processedInteractive := &ProcessedInteractive{
		Type: content.Interactive.Type,
		Body: bodyResult.String(),
	}

	estimatedSize := len(bodyResult.String())

	// Render header if present
	if content.Interactive.Header != nil && content.Interactive.Header.Text != nil {
		headerTmpl, err := template.New("header").Parse(*content.Interactive.Header.Text)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to parse header template: %w", err)
		}

		var headerResult strings.Builder
		if err := headerTmpl.Execute(&headerResult, variables); err != nil {
			return nil, 0, fmt.Errorf("failed to execute header template: %w", err)
		}

		renderedHeader := headerResult.String()
		processedInteractive.Header = &ProcessedHeader{
			Type: content.Interactive.Header.Type,
			Text: &renderedHeader,
		}
		estimatedSize += len(renderedHeader)
	}

	// Render footer if present
	if content.Interactive.Footer != nil {
		footerTmpl, err := template.New("footer").Parse(content.Interactive.Footer.Text)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to parse footer template: %w", err)
		}

		var footerResult strings.Builder
		if err := footerTmpl.Execute(&footerResult, variables); err != nil {
			return nil, 0, fmt.Errorf("failed to execute footer template: %w", err)
		}

		renderedFooter := footerResult.String()
		processedInteractive.Footer = &renderedFooter
		estimatedSize += len(renderedFooter)
	}

	processedContent := &ProcessedContent{
		Interactive: processedInteractive,
	}

	return processedContent, estimatedSize, nil
}

func (e *EngineImpl) renderWhatsAppTemplate(content *TemplateContent, variables map[string]interface{}) (*ProcessedContent, int, error) {
	// This is a simplified implementation for WhatsApp template rendering
	// In a full implementation, you would handle all WhatsApp template components
	processedContent := &ProcessedContent{
		WhatsApp: &ProcessedWhatsApp{
			Language:   content.Language,
			Components: []ProcessedWhatsAppComponent{},
		},
	}

	estimatedSize := 100 // Base estimate for WhatsApp template

	return processedContent, estimatedSize, nil
}

func (e *EngineImpl) validateTextContent(content *TemplateContent, result *ValidationResult) {
	if content.Text == nil || *content.Text == "" {
		result.Errors = append(result.Errors, ValidationError{
			Field:   "content.text",
			Code:    "required",
			Message: "Text content is required for text templates",
		})
		result.IsValid = false
	}
}

func (e *EngineImpl) validateMediaContent(content *TemplateContent, result *ValidationResult) {
	if content.MediaURL == nil || *content.MediaURL == "" {
		result.Errors = append(result.Errors, ValidationError{
			Field:   "content.media_url",
			Code:    "required",
			Message: "Media URL is required for media templates",
		})
		result.IsValid = false
	}

	if content.MediaType == nil || *content.MediaType == "" {
		result.Errors = append(result.Errors, ValidationError{
			Field:   "content.media_type",
			Code:    "required",
			Message: "Media type is required for media templates",
		})
		result.IsValid = false
	}
}

func (e *EngineImpl) validateInteractiveContent(content *TemplateContent, result *ValidationResult) {
	if content.Interactive == nil {
		result.Errors = append(result.Errors, ValidationError{
			Field:   "content.interactive",
			Code:    "required",
			Message: "Interactive content is required for interactive templates",
		})
		result.IsValid = false
		return
	}

	if content.Interactive.Body.Text == "" {
		result.Errors = append(result.Errors, ValidationError{
			Field:   "content.interactive.body.text",
			Code:    "required",
			Message: "Interactive body text is required",
		})
		result.IsValid = false
	}
}

func (e *EngineImpl) validateWhatsAppContent(content *TemplateContent, result *ValidationResult) {
	if content.Language == "" {
		result.Errors = append(result.Errors, ValidationError{
			Field:   "content.language",
			Code:    "required",
			Message: "Language is required for WhatsApp templates",
		})
		result.IsValid = false
	}
}

func (e *EngineImpl) generateSampleData(variables []string) map[string]interface{} {
	sampleData := make(map[string]interface{})

	for _, variable := range variables {
		switch variable {
		case "name", "first_name":
			sampleData[variable] = "João Silva"
		case "company_name", "business_name":
			sampleData[variable] = "Minha Empresa"
		case "date":
			sampleData[variable] = time.Now().Format("02/01/2006")
		case "time":
			sampleData[variable] = time.Now().Format("15:04")
		case "phone", "phone_number":
			sampleData[variable] = "(11) 99999-9999"
		case "email":
			sampleData[variable] = "exemplo@email.com"
		default:
			sampleData[variable] = fmt.Sprintf("[%s]", variable)
		}
	}

	return sampleData
}

func (e *EngineImpl) generatePreviewText(content *ProcessedContent) string {
	if content.Text != nil {
		return *content.Text
	}

	if content.Interactive != nil {
		return content.Interactive.Body
	}

	if content.Caption != nil {
		return *content.Caption
	}

	return "Prévia da mensagem"
}

func (e *EngineImpl) generatePreviewHTML(content *ProcessedContent, templateType TemplateType) string {
	// This is a simplified HTML generation
	// In a full implementation, you would create proper HTML templates
	if content.Text != nil {
		return fmt.Sprintf(`<div class="message text-message">%s</div>`, *content.Text)
	}

	if content.Interactive != nil {
		return fmt.Sprintf(`<div class="message interactive-message"><p>%s</p></div>`, content.Interactive.Body)
	}

	return `<div class="message">Prévia da mensagem</div>`
}

// Stub implementations for WhatsApp integration methods

func (e *EngineImpl) SyncWhatsAppTemplates(ctx context.Context, tenantID uuid.UUID) error {
	// Implementation for syncing WhatsApp templates
	e.logger.Info("Syncing WhatsApp templates", "tenant_id", tenantID)
	return nil
}

func (e *EngineImpl) SubmitWhatsAppTemplate(ctx context.Context, tenantID, templateID uuid.UUID) error {
	// Implementation for submitting template for WhatsApp approval
	e.logger.Info("Submitting WhatsApp template", "tenant_id", tenantID, "template_id", templateID)
	return nil
}

func (e *EngineImpl) CheckWhatsAppTemplateStatus(ctx context.Context, tenantID, templateID uuid.UUID) (*WhatsAppTemplateStatus, error) {
	// Implementation for checking WhatsApp template status
	return &WhatsAppTemplateStatus{
		Status:    "approved",
		UpdatedAt: time.Now(),
		Quality:   stringPtr("high"),
		Category:  "utility",
		Language:  "pt_BR",
	}, nil
}