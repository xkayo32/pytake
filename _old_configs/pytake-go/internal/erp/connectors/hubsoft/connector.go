package hubsoft

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/pytake/pytake-go/internal/erp"
)

// HubSoftConnector implements the ERPConnector interface for HubSoft ERP
type HubSoftConnector struct {
	config     *erp.ConnectionConfig
	httpClient *http.Client
	baseURL    string
	apiKey     string
	logger     Logger
	
	// Rate limiting
	rateLimiter *RateLimiter
}

// Logger interface for connector logging
type Logger interface {
	Debug(msg string, fields ...interface{})
	Info(msg string, fields ...interface{})
	Warn(msg string, fields ...interface{})
	Error(msg string, fields ...interface{})
}

// RateLimiter interface for rate limiting
type RateLimiter interface {
	Allow() bool
	Wait(ctx context.Context) error
}

// NewHubSoftConnector creates a new HubSoft connector
func NewHubSoftConnector(config *erp.ConnectionConfig, logger Logger, rateLimiter *RateLimiter) *HubSoftConnector {
	httpClient := &http.Client{
		Timeout: time.Duration(config.ConnectionSettings.Timeout) * time.Second,
	}

	// Configure TLS if needed
	if !config.ConnectionSettings.UseSSL || config.ConnectionSettings.SkipSSLVerify {
		// Would configure TLS settings here
	}

	return &HubSoftConnector{
		config:      config,
		httpClient:  httpClient,
		baseURL:     strings.TrimSuffix(config.BaseURL, "/"),
		apiKey:      *config.AuthConfig.APIKey,
		logger:      logger,
		rateLimiter: rateLimiter,
	}
}

// Connection Operations

// Connect establishes connection to HubSoft
func (h *HubSoftConnector) Connect(ctx context.Context, config *erp.ConnectionConfig) error {
	h.config = config
	h.baseURL = strings.TrimSuffix(config.BaseURL, "/")
	
	if config.AuthConfig.APIKey != nil {
		h.apiKey = *config.AuthConfig.APIKey
	} else {
		return fmt.Errorf("API key is required for HubSoft connection")
	}

	// Test the connection
	testResult, err := h.TestConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to connect to HubSoft: %w", err)
	}

	if !testResult.Success {
		return fmt.Errorf("HubSoft connection test failed: %s", testResult.Message)
	}

	h.logger.Info("Successfully connected to HubSoft", "base_url", h.baseURL)
	return nil
}

// Disconnect closes connection to HubSoft
func (h *HubSoftConnector) Disconnect(ctx context.Context) error {
	// HubSoft is stateless, so no special disconnect needed
	h.logger.Info("Disconnected from HubSoft")
	return nil
}

// IsConnected checks if connected to HubSoft
func (h *HubSoftConnector) IsConnected(ctx context.Context) bool {
	testResult, err := h.TestConnection(ctx)
	return err == nil && testResult.Success
}

// TestConnection tests the HubSoft connection
func (h *HubSoftConnector) TestConnection(ctx context.Context) (*erp.TestResult, error) {
	startTime := time.Now()

	// Try to get system info or a simple endpoint
	req, err := h.createRequest(ctx, "GET", "/api/v1/system/info", nil)
	if err != nil {
		return &erp.TestResult{
			Success:      false,
			ResponseTime: time.Since(startTime),
			Message:      fmt.Sprintf("Failed to create test request: %s", err.Error()),
			TestedAt:     time.Now(),
		}, nil
	}

	resp, err := h.httpClient.Do(req)
	if err != nil {
		return &erp.TestResult{
			Success:      false,
			ResponseTime: time.Since(startTime),
			Message:      fmt.Sprintf("Connection failed: %s", err.Error()),
			TestedAt:     time.Now(),
		}, nil
	}
	defer resp.Body.Close()

	responseTime := time.Since(startTime)

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return &erp.TestResult{
			Success:      true,
			ResponseTime: responseTime,
			StatusCode:   resp.StatusCode,
			Message:      "Connection successful",
			Details:      map[string]interface{}{"status_code": resp.StatusCode},
			TestedAt:     time.Now(),
		}, nil
	}

	body, _ := io.ReadAll(resp.Body)
	return &erp.TestResult{
		Success:      false,
		ResponseTime: responseTime,
		StatusCode:   resp.StatusCode,
		Message:      fmt.Sprintf("HTTP %d: %s", resp.StatusCode, string(body)),
		Details:      map[string]interface{}{"status_code": resp.StatusCode, "response": string(body)},
		TestedAt:     time.Now(),
	}, nil
}

// Data Operations

// GetEntity retrieves a single entity from HubSoft
func (h *HubSoftConnector) GetEntity(ctx context.Context, entityType string, entityID string) (map[string]interface{}, error) {
	endpoint := h.getEntityEndpoint(entityType, entityID)
	
	req, err := h.createRequest(ctx, "GET", endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := h.executeRequest(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}

	if resp.StatusCode == 404 {
		return nil, fmt.Errorf("entity not found: %s/%s", entityType, entityID)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, resp.Message)
	}

	// HubSoft typically returns data in a "data" field
	if data, ok := resp.Data["data"].(map[string]interface{}); ok {
		return data, nil
	}

	return resp.Data, nil
}

// CreateEntity creates a new entity in HubSoft
func (h *HubSoftConnector) CreateEntity(ctx context.Context, entityType string, data map[string]interface{}) (string, error) {
	endpoint := h.getEntityEndpoint(entityType, "")
	
	req, err := h.createRequest(ctx, "POST", endpoint, data)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := h.executeRequest(req)
	if err != nil {
		return "", fmt.Errorf("failed to execute request: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("HTTP %d: %s", resp.StatusCode, resp.Message)
	}

	// Extract entity ID from response
	if entityID := h.extractEntityID(resp.Data, entityType); entityID != "" {
		h.logger.Debug("Entity created in HubSoft", "entity_type", entityType, "entity_id", entityID)
		return entityID, nil
	}

	return "", fmt.Errorf("failed to extract entity ID from response")
}

// UpdateEntity updates an existing entity in HubSoft
func (h *HubSoftConnector) UpdateEntity(ctx context.Context, entityType string, entityID string, data map[string]interface{}) error {
	endpoint := h.getEntityEndpoint(entityType, entityID)
	
	req, err := h.createRequest(ctx, "PUT", endpoint, data)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := h.executeRequest(req)
	if err != nil {
		return fmt.Errorf("failed to execute request: %w", err)
	}

	if resp.StatusCode == 404 {
		return fmt.Errorf("entity not found: %s/%s", entityType, entityID)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("HTTP %d: %s", resp.StatusCode, resp.Message)
	}

	h.logger.Debug("Entity updated in HubSoft", "entity_type", entityType, "entity_id", entityID)
	return nil
}

// DeleteEntity deletes an entity from HubSoft
func (h *HubSoftConnector) DeleteEntity(ctx context.Context, entityType string, entityID string) error {
	endpoint := h.getEntityEndpoint(entityType, entityID)
	
	req, err := h.createRequest(ctx, "DELETE", endpoint, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := h.executeRequest(req)
	if err != nil {
		return fmt.Errorf("failed to execute request: %w", err)
	}

	if resp.StatusCode == 404 {
		return fmt.Errorf("entity not found: %s/%s", entityType, entityID)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("HTTP %d: %s", resp.StatusCode, resp.Message)
	}

	h.logger.Debug("Entity deleted from HubSoft", "entity_type", entityType, "entity_id", entityID)
	return nil
}

// ListEntities retrieves multiple entities from HubSoft
func (h *HubSoftConnector) ListEntities(ctx context.Context, entityType string, filters map[string]interface{}) ([]map[string]interface{}, error) {
	endpoint := h.getEntityEndpoint(entityType, "")
	
	// Add query parameters for filtering
	if len(filters) > 0 {
		params := h.buildQueryParams(filters)
		endpoint += "?" + params.Encode()
	}

	req, err := h.createRequest(ctx, "GET", endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := h.executeRequest(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, resp.Message)
	}

	// HubSoft typically returns data in a "data" or "items" field
	if data, ok := resp.Data["data"].([]interface{}); ok {
		return h.convertInterfaceSliceToMapSlice(data), nil
	}

	if items, ok := resp.Data["items"].([]interface{}); ok {
		return h.convertInterfaceSliceToMapSlice(items), nil
	}

	// If the root is already an array
	if data, ok := resp.Data["data"]; ok {
		if slice, ok := data.([]interface{}); ok {
			return h.convertInterfaceSliceToMapSlice(slice), nil
		}
	}

	return []map[string]interface{}{}, nil
}

// Batch Operations

// BulkCreate creates multiple entities in HubSoft
func (h *HubSoftConnector) BulkCreate(ctx context.Context, entityType string, entities []map[string]interface{}) (*erp.BulkResult, error) {
	startTime := time.Now()
	result := &erp.BulkResult{
		TotalRecords: len(entities),
		Errors:       []erp.BulkError{},
	}

	// HubSoft may support bulk operations, but we'll implement individual calls for now
	for i, entity := range entities {
		_, err := h.CreateEntity(ctx, entityType, entity)
		if err != nil {
			result.FailedRecords++
			result.Errors = append(result.Errors, erp.BulkError{
				Index:        i,
				ErrorMessage: err.Error(),
			})
		} else {
			result.SuccessfulRecords++
		}
	}

	result.ProcessingTime = time.Since(startTime)
	return result, nil
}

// BulkUpdate updates multiple entities in HubSoft
func (h *HubSoftConnector) BulkUpdate(ctx context.Context, entityType string, entities []map[string]interface{}) (*erp.BulkResult, error) {
	startTime := time.Now()
	result := &erp.BulkResult{
		TotalRecords: len(entities),
		Errors:       []erp.BulkError{},
	}

	for i, entity := range entities {
		// Extract entity ID
		entityID := h.extractEntityID(entity, entityType)
		if entityID == "" {
			result.FailedRecords++
			result.Errors = append(result.Errors, erp.BulkError{
				Index:        i,
				ErrorMessage: "entity ID not found",
			})
			continue
		}

		err := h.UpdateEntity(ctx, entityType, entityID, entity)
		if err != nil {
			result.FailedRecords++
			result.Errors = append(result.Errors, erp.BulkError{
				Index:        i,
				EntityID:     entityID,
				ErrorMessage: err.Error(),
			})
		} else {
			result.SuccessfulRecords++
		}
	}

	result.ProcessingTime = time.Since(startTime)
	return result, nil
}

// BulkDelete deletes multiple entities from HubSoft
func (h *HubSoftConnector) BulkDelete(ctx context.Context, entityType string, entityIDs []string) (*erp.BulkResult, error) {
	startTime := time.Now()
	result := &erp.BulkResult{
		TotalRecords: len(entityIDs),
		Errors:       []erp.BulkError{},
	}

	for i, entityID := range entityIDs {
		err := h.DeleteEntity(ctx, entityType, entityID)
		if err != nil {
			result.FailedRecords++
			result.Errors = append(result.Errors, erp.BulkError{
				Index:        i,
				EntityID:     entityID,
				ErrorMessage: err.Error(),
			})
		} else {
			result.SuccessfulRecords++
		}
	}

	result.ProcessingTime = time.Since(startTime)
	return result, nil
}

// Schema and Metadata

// GetEntitySchema retrieves schema information for an entity type
func (h *HubSoftConnector) GetEntitySchema(ctx context.Context, entityType string) (*erp.EntitySchema, error) {
	// Return predefined schema for HubSoft entities
	switch entityType {
	case "customers":
		return &erp.EntitySchema{
			EntityType: "customers",
			Fields: map[string]erp.FieldSchema{
				"id":       {Type: "string", Nullable: false, Description: "Customer ID"},
				"name":     {Type: "string", MaxLength: intPtr(255), Nullable: false, Description: "Customer name"},
				"email":    {Type: "string", MaxLength: intPtr(255), Nullable: true, Description: "Customer email"},
				"phone":    {Type: "string", MaxLength: intPtr(50), Nullable: true, Description: "Customer phone"},
				"document": {Type: "string", MaxLength: intPtr(20), Nullable: true, Description: "CPF/CNPJ"},
				"address":  {Type: "string", MaxLength: intPtr(500), Nullable: true, Description: "Customer address"},
				"city":     {Type: "string", MaxLength: intPtr(100), Nullable: true, Description: "City"},
				"state":    {Type: "string", MaxLength: intPtr(2), Nullable: true, Description: "State"},
				"zipcode":  {Type: "string", MaxLength: intPtr(10), Nullable: true, Description: "ZIP code"},
				"status":   {Type: "string", Options: []string{"active", "inactive", "blocked"}, Default: "active", Description: "Customer status"},
				"created_at": {Type: "datetime", Nullable: false, Description: "Creation timestamp"},
				"updated_at": {Type: "datetime", Nullable: false, Description: "Last update timestamp"},
			},
			Required:   []string{"id", "name"},
			PrimaryKey: "id",
			Indexes:    []string{"email", "document", "phone"},
		}, nil

	case "contracts":
		return &erp.EntitySchema{
			EntityType: "contracts",
			Fields: map[string]erp.FieldSchema{
				"id":          {Type: "string", Nullable: false, Description: "Contract ID"},
				"customer_id": {Type: "string", Nullable: false, Description: "Customer ID"},
				"product_id":  {Type: "string", Nullable: false, Description: "Product ID"},
				"plan_id":     {Type: "string", Nullable: false, Description: "Plan ID"},
				"status":      {Type: "string", Options: []string{"active", "suspended", "cancelled"}, Description: "Contract status"},
				"monthly_fee": {Type: "decimal", Nullable: false, Description: "Monthly fee"},
				"install_fee": {Type: "decimal", Nullable: true, Description: "Installation fee"},
				"start_date":  {Type: "date", Nullable: false, Description: "Contract start date"},
				"end_date":    {Type: "date", Nullable: true, Description: "Contract end date"},
				"created_at":  {Type: "datetime", Nullable: false, Description: "Creation timestamp"},
				"updated_at":  {Type: "datetime", Nullable: false, Description: "Last update timestamp"},
			},
			Required:   []string{"id", "customer_id", "product_id", "plan_id", "monthly_fee", "start_date"},
			PrimaryKey: "id",
			Relations: []erp.RelationSchema{
				{Type: "belongs_to", TargetEntity: "customers", ForeignKey: "customer_id", Required: true},
				{Type: "belongs_to", TargetEntity: "products", ForeignKey: "product_id", Required: true},
				{Type: "belongs_to", TargetEntity: "plans", ForeignKey: "plan_id", Required: true},
			},
		}, nil

	case "invoices":
		return &erp.EntitySchema{
			EntityType: "invoices",
			Fields: map[string]erp.FieldSchema{
				"id":           {Type: "string", Nullable: false, Description: "Invoice ID"},
				"customer_id":  {Type: "string", Nullable: false, Description: "Customer ID"},
				"contract_id":  {Type: "string", Nullable: true, Description: "Contract ID"},
				"invoice_number": {Type: "string", Nullable: false, Description: "Invoice number"},
				"amount":       {Type: "decimal", Nullable: false, Description: "Invoice amount"},
				"tax_amount":   {Type: "decimal", Nullable: true, Description: "Tax amount"},
				"discount":     {Type: "decimal", Nullable: true, Description: "Discount amount"},
				"due_date":     {Type: "date", Nullable: false, Description: "Due date"},
				"issue_date":   {Type: "date", Nullable: false, Description: "Issue date"},
				"status":       {Type: "string", Options: []string{"pending", "paid", "overdue", "cancelled"}, Description: "Invoice status"},
				"payment_date": {Type: "date", Nullable: true, Description: "Payment date"},
				"created_at":   {Type: "datetime", Nullable: false, Description: "Creation timestamp"},
				"updated_at":   {Type: "datetime", Nullable: false, Description: "Last update timestamp"},
			},
			Required:   []string{"id", "customer_id", "invoice_number", "amount", "due_date", "issue_date"},
			PrimaryKey: "id",
			Relations: []erp.RelationSchema{
				{Type: "belongs_to", TargetEntity: "customers", ForeignKey: "customer_id", Required: true},
				{Type: "belongs_to", TargetEntity: "contracts", ForeignKey: "contract_id", Required: false},
			},
		}, nil

	default:
		return nil, fmt.Errorf("unknown entity type: %s", entityType)
	}
}

// GetSupportedEntities returns list of supported entity types
func (h *HubSoftConnector) GetSupportedEntities(ctx context.Context) ([]string, error) {
	return []string{
		"customers",
		"contracts",
		"invoices",
		"payments",
		"products",
		"plans",
		"tickets",
		"services",
	}, nil
}

// GetCapabilities returns connector capabilities
func (h *HubSoftConnector) GetCapabilities(ctx context.Context) (*erp.ConnectorCapabilities, error) {
	return &erp.ConnectorCapabilities{
		SupportedOperations: []string{"create", "read", "update", "delete", "list"},
		SupportedEntities:   []string{"customers", "contracts", "invoices", "payments", "products", "plans", "tickets", "services"},
		MaxBatchSize:        100,
		RateLimit:           60, // requests per minute
		SupportsWebhooks:    true,
		SupportsRealTime:    false,
		Features: map[string]bool{
			"pagination":     true,
			"filtering":      true,
			"sorting":        true,
			"bulk_operations": false,
			"transactions":   false,
		},
		Limitations: []string{
			"No native bulk operations",
			"Rate limited to 60 requests/minute",
			"Some endpoints may require specific permissions",
		},
	}, nil
}

// Webhook Support

// SupportsWebhooks returns true if webhooks are supported
func (h *HubSoftConnector) SupportsWebhooks() bool {
	return true
}

// RegisterWebhook registers a webhook with HubSoft
func (h *HubSoftConnector) RegisterWebhook(ctx context.Context, config *erp.WebhookConfig) error {
	endpoint := "/api/v1/webhooks"
	
	webhookData := map[string]interface{}{
		"url":        config.TargetURL,
		"events":     []string{config.EventType},
		"active":     config.IsActive,
		"secret":     config.Secret,
	}

	req, err := h.createRequest(ctx, "POST", endpoint, webhookData)
	if err != nil {
		return fmt.Errorf("failed to create webhook request: %w", err)
	}

	resp, err := h.executeRequest(req)
	if err != nil {
		return fmt.Errorf("failed to register webhook: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("webhook registration failed: HTTP %d: %s", resp.StatusCode, resp.Message)
	}

	h.logger.Info("Webhook registered with HubSoft", "event_type", config.EventType, "url", *config.TargetURL)
	return nil
}

// UnregisterWebhook unregisters a webhook from HubSoft
func (h *HubSoftConnector) UnregisterWebhook(ctx context.Context, webhookID string) error {
	endpoint := fmt.Sprintf("/api/v1/webhooks/%s", webhookID)
	
	req, err := h.createRequest(ctx, "DELETE", endpoint, nil)
	if err != nil {
		return fmt.Errorf("failed to create webhook deletion request: %w", err)
	}

	resp, err := h.executeRequest(req)
	if err != nil {
		return fmt.Errorf("failed to unregister webhook: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("webhook deletion failed: HTTP %d: %s", resp.StatusCode, resp.Message)
	}

	h.logger.Info("Webhook unregistered from HubSoft", "webhook_id", webhookID)
	return nil
}

// Authentication

// RefreshAuth refreshes authentication credentials
func (h *HubSoftConnector) RefreshAuth(ctx context.Context) error {
	// HubSoft uses API keys which don't typically need refreshing
	// For OAuth2 implementations, this would handle token refresh
	return nil
}

// GetAuthInfo returns authentication information
func (h *HubSoftConnector) GetAuthInfo(ctx context.Context) (*erp.AuthInfo, error) {
	return &erp.AuthInfo{
		Type:  erp.AuthTypeAPIKey,
		Valid: true,
	}, nil
}

// Helper Methods

// createRequest creates an HTTP request with proper headers and authentication
func (h *HubSoftConnector) createRequest(ctx context.Context, method, endpoint string, data interface{}) (*http.Request, error) {
	if h.rateLimiter != nil && !h.rateLimiter.Allow() {
		if err := h.rateLimiter.Wait(ctx); err != nil {
			return nil, fmt.Errorf("rate limit wait failed: %w", err)
		}
	}

	url := h.baseURL + endpoint
	
	var body io.Reader
	if data != nil {
		jsonData, err := json.Marshal(data)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request data: %w", err)
		}
		body = bytes.NewBuffer(jsonData)
	}

	req, err := http.NewRequestWithContext(ctx, method, url, body)
	if err != nil {
		return nil, fmt.Errorf("failed to create HTTP request: %w", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "PyTake-ERP-Connector/1.0")
	
	// Set API key authentication
	req.Header.Set("X-API-Key", h.apiKey)
	
	// Add custom headers from auth config
	if h.config.AuthConfig.Headers != nil {
		for key, value := range h.config.AuthConfig.Headers {
			req.Header.Set(key, value)
		}
	}

	return req, nil
}

// executeRequest executes an HTTP request and returns a structured response
func (h *HubSoftConnector) executeRequest(req *http.Request) (*APIResponse, error) {
	resp, err := h.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	apiResp := &APIResponse{
		StatusCode: resp.StatusCode,
		Headers:    resp.Header,
		Data:       make(map[string]interface{}),
	}

	if len(body) > 0 {
		if err := json.Unmarshal(body, &apiResp.Data); err != nil {
			// If JSON parsing fails, store raw body as message
			apiResp.Message = string(body)
		} else {
			// Extract message from response if available
			if msg, ok := apiResp.Data["message"].(string); ok {
				apiResp.Message = msg
			} else if msg, ok := apiResp.Data["error"].(string); ok {
				apiResp.Message = msg
			}
		}
	}

	return apiResp, nil
}

// getEntityEndpoint returns the API endpoint for a given entity type
func (h *HubSoftConnector) getEntityEndpoint(entityType, entityID string) string {
	baseEndpoint := "/api/v1/"
	
	switch entityType {
	case "customers":
		if entityID != "" {
			return baseEndpoint + "customers/" + entityID
		}
		return baseEndpoint + "customers"
	case "contracts":
		if entityID != "" {
			return baseEndpoint + "contracts/" + entityID
		}
		return baseEndpoint + "contracts"
	case "invoices":
		if entityID != "" {
			return baseEndpoint + "invoices/" + entityID
		}
		return baseEndpoint + "invoices"
	case "payments":
		if entityID != "" {
			return baseEndpoint + "payments/" + entityID
		}
		return baseEndpoint + "payments"
	case "products":
		if entityID != "" {
			return baseEndpoint + "products/" + entityID
		}
		return baseEndpoint + "products"
	case "plans":
		if entityID != "" {
			return baseEndpoint + "plans/" + entityID
		}
		return baseEndpoint + "plans"
	case "tickets":
		if entityID != "" {
			return baseEndpoint + "tickets/" + entityID
		}
		return baseEndpoint + "tickets"
	case "services":
		if entityID != "" {
			return baseEndpoint + "services/" + entityID
		}
		return baseEndpoint + "services"
	default:
		if entityID != "" {
			return baseEndpoint + entityType + "/" + entityID
		}
		return baseEndpoint + entityType
	}
}

// extractEntityID extracts entity ID from response data
func (h *HubSoftConnector) extractEntityID(data map[string]interface{}, entityType string) string {
	// Try common ID fields
	if id, ok := data["id"]; ok {
		return fmt.Sprintf("%v", id)
	}
	
	if data, ok := data["data"].(map[string]interface{}); ok {
		if id, ok := data["id"]; ok {
			return fmt.Sprintf("%v", id)
		}
	}
	
	// Try entity-specific ID fields
	switch entityType {
	case "customers":
		if id, ok := data["customer_id"]; ok {
			return fmt.Sprintf("%v", id)
		}
	case "contracts":
		if id, ok := data["contract_id"]; ok {
			return fmt.Sprintf("%v", id)
		}
	case "invoices":
		if id, ok := data["invoice_id"]; ok {
			return fmt.Sprintf("%v", id)
		}
	}
	
	return ""
}

// buildQueryParams builds URL query parameters from filters
func (h *HubSoftConnector) buildQueryParams(filters map[string]interface{}) url.Values {
	params := url.Values{}
	
	for key, value := range filters {
		switch v := value.(type) {
		case string:
			params.Set(key, v)
		case int:
			params.Set(key, strconv.Itoa(v))
		case float64:
			params.Set(key, strconv.FormatFloat(v, 'f', -1, 64))
		case bool:
			params.Set(key, strconv.FormatBool(v))
		case []string:
			for _, val := range v {
				params.Add(key, val)
			}
		default:
			params.Set(key, fmt.Sprintf("%v", v))
		}
	}
	
	return params
}

// convertInterfaceSliceToMapSlice converts []interface{} to []map[string]interface{}
func (h *HubSoftConnector) convertInterfaceSliceToMapSlice(data []interface{}) []map[string]interface{} {
	result := make([]map[string]interface{}, 0, len(data))
	
	for _, item := range data {
		if m, ok := item.(map[string]interface{}); ok {
			result = append(result, m)
		}
	}
	
	return result
}

// APIResponse represents an API response from HubSoft
type APIResponse struct {
	StatusCode int                    `json:"status_code"`
	Headers    http.Header            `json:"headers"`
	Data       map[string]interface{} `json:"data"`
	Message    string                 `json:"message"`
}

// Helper function to create int pointer
func intPtr(i int) *int {
	return &i
}