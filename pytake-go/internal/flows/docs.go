package flows

// Swagger documentation for Flows endpoints

// FlowDoc represents an automation flow
// @Description Automated conversation flow
type FlowDoc struct {
	// Flow ID
	// example: 550e8400-e29b-41d4-a716-446655440000
	ID string `json:"id" example:"550e8400-e29b-41d4-a716-446655440000"`
	
	// Flow name
	// required: true
	// example: Welcome Flow
	Name string `json:"name" binding:"required" example:"Welcome Flow"`
	
	// Flow description
	// example: Initial customer greeting and routing flow
	Description string `json:"description" example:"Initial customer greeting and routing flow"`
	
	// Flow type
	// enum: welcome,menu,form,quiz,survey,routing
	// example: welcome
	Type string `json:"type" example:"welcome"`
	
	// Trigger type
	// enum: message,keyword,event,schedule,api
	// example: message
	TriggerType string `json:"trigger_type" example:"message"`
	
	// Trigger conditions
	TriggerConditions TriggerConditionsDoc `json:"trigger_conditions"`
	
	// Flow nodes
	Nodes []FlowNodeDoc `json:"nodes"`
	
	// Flow edges (connections)
	Edges []FlowEdgeDoc `json:"edges"`
	
	// Start node ID
	// example: node_1
	StartNodeID string `json:"start_node_id" example:"node_1"`
	
	// Flow variables
	Variables []FlowVariableDoc `json:"variables"`
	
	// Flow settings
	Settings FlowSettingsDoc `json:"settings"`
	
	// Active status
	// example: true
	IsActive bool `json:"is_active" example:"true"`
	
	// Test mode
	// example: false
	IsTestMode bool `json:"is_test_mode" example:"false"`
	
	// Version
	// example: 1.0.0
	Version string `json:"version" example:"1.0.0"`
	
	// Published status
	// example: true
	IsPublished bool `json:"is_published" example:"true"`
	
	// Tags
	// example: ["customer_service", "automation"]
	Tags []string `json:"tags" example:"[\"customer_service\", \"automation\"]"`
	
	// Usage statistics
	Stats FlowStatsDoc `json:"stats"`
	
	// Creation timestamp
	// example: 2024-01-15T10:00:00Z
	CreatedAt string `json:"created_at" example:"2024-01-15T10:00:00Z"`
	
	// Last update timestamp
	// example: 2024-01-15T10:30:00Z
	UpdatedAt string `json:"updated_at" example:"2024-01-15T10:30:00Z"`
	
	// Created by user ID
	// example: 550e8400-e29b-41d4-a716-446655440000
	CreatedBy string `json:"created_by" example:"550e8400-e29b-41d4-a716-446655440000"`
	
	// Metadata
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// TriggerConditionsDoc represents flow trigger conditions
// @Description Conditions that trigger the flow
type TriggerConditionsDoc struct {
	// Keywords to trigger the flow
	// example: ["hello", "hi", "start"]
	Keywords []string `json:"keywords,omitempty" example:"[\"hello\", \"hi\", \"start\"]"`
	
	// Event type
	// example: new_conversation
	Event string `json:"event,omitempty" example:"new_conversation"`
	
	// Schedule (cron expression)
	// example: 0 9 * * MON-FRI
	Schedule string `json:"schedule,omitempty" example:"0 9 * * MON-FRI"`
	
	// Customer segments
	// example: ["vip", "new_customer"]
	Segments []string `json:"segments,omitempty" example:"[\"vip\", \"new_customer\"]"`
	
	// Time restrictions
	TimeRestrictions TimeRestrictionsDoc `json:"time_restrictions,omitempty"`
	
	// Custom conditions
	CustomConditions map[string]interface{} `json:"custom_conditions,omitempty"`
}

// TimeRestrictionsDoc represents time-based restrictions
// @Description Time restrictions for flow execution
type TimeRestrictionsDoc struct {
	// Days of week
	// example: ["MON", "TUE", "WED", "THU", "FRI"]
	DaysOfWeek []string `json:"days_of_week,omitempty" example:"[\"MON\", \"TUE\", \"WED\", \"THU\", \"FRI\"]"`
	
	// Start time (HH:MM)
	// example: 09:00
	StartTime string `json:"start_time,omitempty" example:"09:00"`
	
	// End time (HH:MM)
	// example: 18:00
	EndTime string `json:"end_time,omitempty" example:"18:00"`
	
	// Timezone
	// example: America/Sao_Paulo
	Timezone string `json:"timezone,omitempty" example:"America/Sao_Paulo"`
}

// FlowNodeDoc represents a flow node
// @Description Node in the flow graph
type FlowNodeDoc struct {
	// Node ID
	// example: node_1
	ID string `json:"id" example:"node_1"`
	
	// Node type
	// enum: message,question,condition,action,delay,goto,end
	// example: message
	Type string `json:"type" example:"message"`
	
	// Node name
	// example: Welcome Message
	Name string `json:"name" example:"Welcome Message"`
	
	// Node data/configuration
	Data NodeDataDoc `json:"data"`
	
	// Position in visual editor
	Position NodePositionDoc `json:"position"`
	
	// Node metadata
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// NodeDataDoc represents node data
// @Description Node configuration data
type NodeDataDoc struct {
	// Message content (for message nodes)
	// example: Welcome! How can I help you today?
	Message string `json:"message,omitempty" example:"Welcome! How can I help you today?"`
	
	// Media URL
	// example: https://example.com/welcome.jpg
	MediaURL string `json:"media_url,omitempty" example:"https://example.com/welcome.jpg"`
	
	// Media type
	// example: image
	MediaType string `json:"media_type,omitempty" example:"image"`
	
	// Question text (for question nodes)
	// example: What would you like to do?
	Question string `json:"question,omitempty" example:"What would you like to do?"`
	
	// Options (for question nodes)
	Options []OptionDoc `json:"options,omitempty"`
	
	// Variable to store answer
	// example: user_choice
	Variable string `json:"variable,omitempty" example:"user_choice"`
	
	// Condition expression (for condition nodes)
	// example: ${user_choice} == "support"
	Condition string `json:"condition,omitempty" example:"${user_choice} == \"support\""`
	
	// Action type (for action nodes)
	// enum: assign_agent,add_tag,send_email,webhook,integration
	// example: assign_agent
	ActionType string `json:"action_type,omitempty" example:"assign_agent"`
	
	// Action parameters
	ActionParams map[string]interface{} `json:"action_params,omitempty"`
	
	// Delay in seconds (for delay nodes)
	// example: 5
	Delay int `json:"delay,omitempty" example:"5"`
	
	// Target node ID (for goto nodes)
	// example: node_5
	TargetNodeID string `json:"target_node_id,omitempty" example:"node_5"`
	
	// AI prompt (for AI nodes)
	// example: Analyze the customer's sentiment and respond appropriately
	AIPrompt string `json:"ai_prompt,omitempty" example:"Analyze the customer's sentiment and respond appropriately"`
	
	// AI model
	// example: gpt-3.5-turbo
	AIModel string `json:"ai_model,omitempty" example:"gpt-3.5-turbo"`
}

// OptionDoc represents an option in a question node
// @Description Option for user selection
type OptionDoc struct {
	// Option ID
	// example: opt_1
	ID string `json:"id" example:"opt_1"`
	
	// Display text
	// example: Talk to Support
	Text string `json:"text" example:"Talk to Support"`
	
	// Option value
	// example: support
	Value string `json:"value" example:"support"`
	
	// Description
	// example: Connect with our support team
	Description string `json:"description,omitempty" example:"Connect with our support team"`
}

// NodePositionDoc represents node position in visual editor
// @Description Node position coordinates
type NodePositionDoc struct {
	// X coordinate
	// example: 100
	X float64 `json:"x" example:"100"`
	
	// Y coordinate
	// example: 50
	Y float64 `json:"y" example:"50"`
}

// FlowEdgeDoc represents connection between nodes
// @Description Edge connecting two nodes
type FlowEdgeDoc struct {
	// Edge ID
	// example: edge_1
	ID string `json:"id" example:"edge_1"`
	
	// Source node ID
	// example: node_1
	Source string `json:"source" example:"node_1"`
	
	// Target node ID
	// example: node_2
	Target string `json:"target" example:"node_2"`
	
	// Edge label
	// example: Default
	Label string `json:"label,omitempty" example:"Default"`
	
	// Condition for this edge
	// example: true
	Condition string `json:"condition,omitempty" example:"true"`
	
	// Edge type
	// enum: default,conditional,error
	// example: default
	Type string `json:"type" example:"default"`
}

// FlowVariableDoc represents a flow variable
// @Description Variable used in the flow
type FlowVariableDoc struct {
	// Variable name
	// example: customer_name
	Name string `json:"name" example:"customer_name"`
	
	// Variable type
	// enum: string,number,boolean,date,array,object
	// example: string
	Type string `json:"type" example:"string"`
	
	// Default value
	// example: Guest
	DefaultValue interface{} `json:"default_value,omitempty" example:"Guest"`
	
	// Description
	// example: Customer's display name
	Description string `json:"description,omitempty" example:"Customer's display name"`
	
	// Required flag
	// example: false
	Required bool `json:"required" example:"false"`
}

// FlowSettingsDoc represents flow settings
// @Description Flow configuration settings
type FlowSettingsDoc struct {
	// Timeout in seconds
	// example: 300
	Timeout int `json:"timeout" example:"300"`
	
	// Max loops allowed
	// example: 5
	MaxLoops int `json:"max_loops" example:"5"`
	
	// Error handling
	// enum: retry,skip,end
	// example: retry
	ErrorHandling string `json:"error_handling" example:"retry"`
	
	// Enable AI fallback
	// example: true
	EnableAIFallback bool `json:"enable_ai_fallback" example:"true"`
	
	// Save conversation context
	// example: true
	SaveContext bool `json:"save_context" example:"true"`
	
	// Language
	// example: pt-BR
	Language string `json:"language" example:"pt-BR"`
	
	// Custom settings
	Custom map[string]interface{} `json:"custom,omitempty"`
}

// FlowStatsDoc represents flow usage statistics
// @Description Flow execution statistics
type FlowStatsDoc struct {
	// Total executions
	// example: 1523
	TotalExecutions int64 `json:"total_executions" example:"1523"`
	
	// Successful completions
	// example: 1420
	SuccessfulCompletions int64 `json:"successful_completions" example:"1420"`
	
	// Failed executions
	// example: 103
	FailedExecutions int64 `json:"failed_executions" example:"103"`
	
	// Average duration in seconds
	// example: 45.5
	AverageDuration float64 `json:"average_duration" example:"45.5"`
	
	// Completion rate
	// example: 93.2
	CompletionRate float64 `json:"completion_rate" example:"93.2"`
	
	// Last execution time
	// example: 2024-01-15T10:30:00Z
	LastExecutionAt string `json:"last_execution_at" example:"2024-01-15T10:30:00Z"`
}

// FlowExecutionDoc represents a flow execution instance
// @Description Flow execution details
type FlowExecutionDoc struct {
	// Execution ID
	// example: 550e8400-e29b-41d4-a716-446655440000
	ID string `json:"id" example:"550e8400-e29b-41d4-a716-446655440000"`
	
	// Flow ID
	// example: 550e8400-e29b-41d4-a716-446655440000
	FlowID string `json:"flow_id" example:"550e8400-e29b-41d4-a716-446655440000"`
	
	// Conversation ID
	// example: 550e8400-e29b-41d4-a716-446655440000
	ConversationID string `json:"conversation_id" example:"550e8400-e29b-41d4-a716-446655440000"`
	
	// Current node ID
	// example: node_3
	CurrentNodeID string `json:"current_node_id" example:"node_3"`
	
	// Execution status
	// enum: running,paused,completed,failed,cancelled
	// example: running
	Status string `json:"status" example:"running"`
	
	// Context variables
	Context map[string]interface{} `json:"context"`
	
	// Execution path (visited nodes)
	// example: ["node_1", "node_2", "node_3"]
	Path []string `json:"path" example:"[\"node_1\", \"node_2\", \"node_3\"]"`
	
	// Error message
	// example: 
	Error string `json:"error,omitempty"`
	
	// Started at
	// example: 2024-01-15T10:30:00Z
	StartedAt string `json:"started_at" example:"2024-01-15T10:30:00Z"`
	
	// Completed at
	// example: 2024-01-15T10:31:30Z
	CompletedAt string `json:"completed_at,omitempty" example:"2024-01-15T10:31:30Z"`
	
	// Duration in seconds
	// example: 90
	Duration int `json:"duration,omitempty" example:"90"`
}

// CreateFlowRequestDoc represents flow creation request
// @Description Create new flow request
type CreateFlowRequestDoc struct {
	// Flow name
	// required: true
	// example: Customer Support Flow
	Name string `json:"name" binding:"required" example:"Customer Support Flow"`
	
	// Description
	// example: Automated customer support workflow
	Description string `json:"description,omitempty" example:"Automated customer support workflow"`
	
	// Flow type
	// enum: welcome,menu,form,quiz,survey,routing
	// example: menu
	Type string `json:"type" example:"menu"`
	
	// Trigger type
	// enum: message,keyword,event,schedule,api
	// example: keyword
	TriggerType string `json:"trigger_type" example:"keyword"`
	
	// Trigger conditions
	TriggerConditions TriggerConditionsDoc `json:"trigger_conditions"`
	
	// Flow nodes
	Nodes []FlowNodeDoc `json:"nodes"`
	
	// Flow edges
	Edges []FlowEdgeDoc `json:"edges"`
	
	// Start node ID
	// example: node_1
	StartNodeID string `json:"start_node_id" example:"node_1"`
	
	// Variables
	Variables []FlowVariableDoc `json:"variables,omitempty"`
	
	// Settings
	Settings FlowSettingsDoc `json:"settings,omitempty"`
	
	// Tags
	// example: ["support", "automation"]
	Tags []string `json:"tags,omitempty" example:"[\"support\", \"automation\"]"`
	
	// Metadata
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// UpdateFlowRequestDoc represents flow update request
// @Description Update flow request
type UpdateFlowRequestDoc struct {
	// Flow name
	// example: Updated Flow Name
	Name string `json:"name,omitempty" example:"Updated Flow Name"`
	
	// Description
	// example: Updated description
	Description string `json:"description,omitempty" example:"Updated description"`
	
	// Trigger conditions
	TriggerConditions *TriggerConditionsDoc `json:"trigger_conditions,omitempty"`
	
	// Flow nodes
	Nodes []FlowNodeDoc `json:"nodes,omitempty"`
	
	// Flow edges
	Edges []FlowEdgeDoc `json:"edges,omitempty"`
	
	// Variables
	Variables []FlowVariableDoc `json:"variables,omitempty"`
	
	// Settings
	Settings *FlowSettingsDoc `json:"settings,omitempty"`
	
	// Active status
	// example: true
	IsActive *bool `json:"is_active,omitempty" example:"true"`
	
	// Tags
	// example: ["updated", "v2"]
	Tags []string `json:"tags,omitempty" example:"[\"updated\", \"v2\"]"`
	
	// Metadata
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// GetFlows godoc
// @Summary List flows
// @Description Get list of automation flows
// @Tags Flows
// @Accept json
// @Produce json
// @Security Bearer
// @Param type query string false "Filter by type" Enums(welcome,menu,form,quiz,survey,routing)
// @Param trigger_type query string false "Filter by trigger type" Enums(message,keyword,event,schedule,api)
// @Param is_active query bool false "Filter by active status"
// @Param is_published query bool false "Filter by published status"
// @Param tag query string false "Filter by tag"
// @Param search query string false "Search in name and description"
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(20) maximum(100)
// @Success 200 {array} FlowDoc "List of flows"
// @Failure 401 {object} ErrorResponseDoc "Unauthorized"
// @Failure 500 {object} ErrorResponseDoc "Internal server error"
// @Router /flows [get]
func GetFlowsDoc() {}

// GetFlow godoc
// @Summary Get flow
// @Description Get a specific flow
// @Tags Flows
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Flow ID" format(uuid)
// @Success 200 {object} FlowDoc "Flow details"
// @Failure 401 {object} ErrorResponseDoc "Unauthorized"
// @Failure 404 {object} ErrorResponseDoc "Flow not found"
// @Failure 500 {object} ErrorResponseDoc "Internal server error"
// @Router /flows/{id} [get]
func GetFlowDoc() {}

// CreateFlow godoc
// @Summary Create flow
// @Description Create a new automation flow
// @Tags Flows
// @Accept json
// @Produce json
// @Security Bearer
// @Param flow body CreateFlowRequestDoc true "Flow data"
// @Success 201 {object} FlowDoc "Created flow"
// @Failure 400 {object} ErrorResponseDoc "Invalid request"
// @Failure 401 {object} ErrorResponseDoc "Unauthorized"
// @Failure 500 {object} ErrorResponseDoc "Internal server error"
// @Router /flows [post]
func CreateFlowDoc() {}

// UpdateFlow godoc
// @Summary Update flow
// @Description Update an existing flow
// @Tags Flows
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Flow ID" format(uuid)
// @Param flow body UpdateFlowRequestDoc true "Update data"
// @Success 200 {object} FlowDoc "Updated flow"
// @Failure 400 {object} ErrorResponseDoc "Invalid request"
// @Failure 401 {object} ErrorResponseDoc "Unauthorized"
// @Failure 404 {object} ErrorResponseDoc "Flow not found"
// @Failure 500 {object} ErrorResponseDoc "Internal server error"
// @Router /flows/{id} [put]
func UpdateFlowDoc() {}

// DeleteFlow godoc
// @Summary Delete flow
// @Description Delete an automation flow
// @Tags Flows
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Flow ID" format(uuid)
// @Success 204 "Flow deleted"
// @Failure 401 {object} ErrorResponseDoc "Unauthorized"
// @Failure 404 {object} ErrorResponseDoc "Flow not found"
// @Failure 500 {object} ErrorResponseDoc "Internal server error"
// @Router /flows/{id} [delete]
func DeleteFlowDoc() {}

// PublishFlow godoc
// @Summary Publish flow
// @Description Publish a flow to make it available for execution
// @Tags Flows
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Flow ID" format(uuid)
// @Success 200 {object} FlowDoc "Published flow"
// @Failure 400 {object} ErrorResponseDoc "Flow validation failed"
// @Failure 401 {object} ErrorResponseDoc "Unauthorized"
// @Failure 404 {object} ErrorResponseDoc "Flow not found"
// @Failure 500 {object} ErrorResponseDoc "Internal server error"
// @Router /flows/{id}/publish [post]
func PublishFlowDoc() {}

// UnpublishFlow godoc
// @Summary Unpublish flow
// @Description Unpublish a flow to prevent execution
// @Tags Flows
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Flow ID" format(uuid)
// @Success 200 {object} FlowDoc "Unpublished flow"
// @Failure 401 {object} ErrorResponseDoc "Unauthorized"
// @Failure 404 {object} ErrorResponseDoc "Flow not found"
// @Failure 500 {object} ErrorResponseDoc "Internal server error"
// @Router /flows/{id}/unpublish [post]
func UnpublishFlowDoc() {}

// DuplicateFlow godoc
// @Summary Duplicate flow
// @Description Create a copy of an existing flow
// @Tags Flows
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Flow ID" format(uuid)
// @Param request body map[string]string false "Duplicate options" example({"name":"Copy of Flow"})
// @Success 201 {object} FlowDoc "Duplicated flow"
// @Failure 401 {object} ErrorResponseDoc "Unauthorized"
// @Failure 404 {object} ErrorResponseDoc "Flow not found"
// @Failure 500 {object} ErrorResponseDoc "Internal server error"
// @Router /flows/{id}/duplicate [post]
func DuplicateFlowDoc() {}

// TestFlow godoc
// @Summary Test flow
// @Description Test a flow with sample data
// @Tags Flows
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Flow ID" format(uuid)
// @Param request body map[string]interface{} true "Test data" example({"phone":"+5511999999999","message":"test"})
// @Success 200 {object} FlowExecutionDoc "Test execution result"
// @Failure 400 {object} ErrorResponseDoc "Invalid test data"
// @Failure 401 {object} ErrorResponseDoc "Unauthorized"
// @Failure 404 {object} ErrorResponseDoc "Flow not found"
// @Failure 500 {object} ErrorResponseDoc "Test failed"
// @Router /flows/{id}/test [post]
func TestFlowDoc() {}

// GetFlowExecutions godoc
// @Summary Get flow executions
// @Description Get execution history for a flow
// @Tags Flows
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Flow ID" format(uuid)
// @Param status query string false "Filter by status" Enums(running,paused,completed,failed,cancelled)
// @Param from_date query string false "Start date" format(date-time)
// @Param to_date query string false "End date" format(date-time)
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(20) maximum(100)
// @Success 200 {array} FlowExecutionDoc "List of executions"
// @Failure 401 {object} ErrorResponseDoc "Unauthorized"
// @Failure 404 {object} ErrorResponseDoc "Flow not found"
// @Failure 500 {object} ErrorResponseDoc "Internal server error"
// @Router /flows/{id}/executions [get]
func GetFlowExecutionsDoc() {}

// GetFlowStats godoc
// @Summary Get flow statistics
// @Description Get usage statistics for a flow
// @Tags Flows
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Flow ID" format(uuid)
// @Param from_date query string false "Start date" format(date)
// @Param to_date query string false "End date" format(date)
// @Success 200 {object} FlowStatsDoc "Flow statistics"
// @Failure 401 {object} ErrorResponseDoc "Unauthorized"
// @Failure 404 {object} ErrorResponseDoc "Flow not found"
// @Failure 500 {object} ErrorResponseDoc "Internal server error"
// @Router /flows/{id}/stats [get]
func GetFlowStatsDoc() {}

// ExportFlow godoc
// @Summary Export flow
// @Description Export flow as JSON
// @Tags Flows
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Flow ID" format(uuid)
// @Success 200 {object} map[string]interface{} "Flow export data"
// @Failure 401 {object} ErrorResponseDoc "Unauthorized"
// @Failure 404 {object} ErrorResponseDoc "Flow not found"
// @Failure 500 {object} ErrorResponseDoc "Internal server error"
// @Router /flows/{id}/export [get]
func ExportFlowDoc() {}

// ImportFlow godoc
// @Summary Import flow
// @Description Import flow from JSON
// @Tags Flows
// @Accept json
// @Produce json
// @Security Bearer
// @Param flow body map[string]interface{} true "Flow import data"
// @Success 201 {object} FlowDoc "Imported flow"
// @Failure 400 {object} ErrorResponseDoc "Invalid import data"
// @Failure 401 {object} ErrorResponseDoc "Unauthorized"
// @Failure 500 {object} ErrorResponseDoc "Import failed"
// @Router /flows/import [post]
func ImportFlowDoc() {}

// ErrorResponseDoc represents an error response
// @Description Standard error response format
type ErrorResponseDoc struct {
	// Error code
	// example: VALIDATION_ERROR
	Code string `json:"code" example:"VALIDATION_ERROR"`
	
	// Error message
	// example: Flow validation failed
	Message string `json:"message" example:"Flow validation failed"`
	
	// Additional error details
	Details map[string]interface{} `json:"details,omitempty"`
}