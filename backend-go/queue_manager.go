package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/google/uuid"
)

type QueueManager struct {
	db    *sql.DB
	redis *redis.Client
}

type Queue struct {
	ID             string                 `json:"id"`
	TenantID       string                 `json:"tenant_id"`
	Name           string                 `json:"name"`
	Description    string                 `json:"description"`
	Department     string                 `json:"department"`
	Priority       int                    `json:"priority"`
	IsActive       bool                   `json:"is_active"`
	MaxWaitTime    int                    `json:"max_wait_time"`
	MaxQueueSize   int                    `json:"max_queue_size"`
	WorkingHours   map[string]interface{} `json:"working_hours"`
	WelcomeMessage string                 `json:"welcome_message"`
	WaitingMessage string                 `json:"waiting_message"`
	OfflineMessage string                 `json:"offline_message"`
	CreatedAt      time.Time              `json:"created_at"`
	UpdatedAt      time.Time              `json:"updated_at"`
	
	// Runtime stats
	CurrentSize    int                    `json:"current_size,omitempty"`
	AvgWaitTime    int                    `json:"avg_wait_time,omitempty"`
	AgentsOnline   int                    `json:"agents_online,omitempty"`
}

type Agent struct {
	ID                   string    `json:"id"`
	TenantID             string    `json:"tenant_id"`
	UserID               string    `json:"user_id"`
	Name                 string    `json:"name"`
	Email                string    `json:"email"`
	Phone                string    `json:"phone"`
	AvatarURL            string    `json:"avatar_url"`
	Status               string    `json:"status"`
	MaxSimultaneousChats int       `json:"max_simultaneous_chats"`
	CurrentChats         int       `json:"current_chats"`
	Skills               []string  `json:"skills"`
	Departments          []string  `json:"departments"`
	LastActivityAt       *time.Time `json:"last_activity_at"`
	CreatedAt            time.Time `json:"created_at"`
	UpdatedAt            time.Time `json:"updated_at"`
}

type QueueItem struct {
	ID                  string                 `json:"id"`
	QueueID             string                 `json:"queue_id"`
	ConversationID      string                 `json:"conversation_id"`
	ContactID           string                 `json:"contact_id"`
	PhoneNumber         string                 `json:"phone_number"`
	ContactName         string                 `json:"contact_name"`
	Position            int                    `json:"position"`
	Status              string                 `json:"status"`
	Priority            int                    `json:"priority"`
	WaitStartTime       time.Time              `json:"wait_start_time"`
	WaitEndTime         *time.Time             `json:"wait_end_time,omitempty"`
	AssignedAgentID     *string                `json:"assigned_agent_id,omitempty"`
	AssignedAt          *time.Time             `json:"assigned_at,omitempty"`
	CompletedAt         *time.Time             `json:"completed_at,omitempty"`
	AbandonedAt         *time.Time             `json:"abandoned_at,omitempty"`
	WaitTimeSeconds     int                    `json:"wait_time_seconds"`
	HandlingTimeSeconds int                    `json:"handling_time_seconds"`
	Metadata            map[string]interface{} `json:"metadata"`
	CreatedAt           time.Time              `json:"created_at"`
	UpdatedAt           time.Time              `json:"updated_at"`
}

func NewQueueManager(db *sql.DB, redis *redis.Client) *QueueManager {
	return &QueueManager{
		db:    db,
		redis: redis,
	}
}

// AddToQueue adiciona um contato à fila
func (m *QueueManager) AddToQueue(queueID, phoneNumber, contactName string, priority int) (*QueueItem, error) {
	// Verificar se já está na fila
	var exists bool
	err := m.db.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM queue_items 
			WHERE queue_id = $1 
			AND phone_number = $2 
			AND status IN ('waiting', 'assigned', 'in_progress')
		)
	`, queueID, phoneNumber).Scan(&exists)
	
	if err != nil {
		return nil, err
	}
	
	if exists {
		return nil, fmt.Errorf("contact already in queue")
	}
	
	// Obter próxima posição
	var position int
	err = m.db.QueryRow(`
		SELECT COALESCE(MAX(position), 0) + 1
		FROM queue_items
		WHERE queue_id = $1 AND status = 'waiting'
	`, queueID).Scan(&position)
	
	if err != nil {
		return nil, err
	}
	
	// Inserir na fila
	itemID := uuid.New().String()
	_, err = m.db.Exec(`
		INSERT INTO queue_items (
			id, queue_id, phone_number, contact_name, 
			position, status, priority, wait_start_time
		) VALUES ($1, $2, $3, $4, $5, 'waiting', $6, NOW())
	`, itemID, queueID, phoneNumber, contactName, position, priority)
	
	if err != nil {
		return nil, err
	}
	
	// Buscar item criado
	item, err := m.GetQueueItem(itemID)
	if err != nil {
		return nil, err
	}
	
	// Notificar agentes disponíveis
	m.notifyAvailableAgents(queueID)
	
	// Tentar atribuição automática
	go m.tryAutoAssign(queueID)
	
	// Publicar evento no Redis
	m.publishQueueEvent("item_added", map[string]interface{}{
		"queue_id": queueID,
		"item_id":  itemID,
		"position": position,
	})
	
	log.Printf("✅ Added %s to queue at position %d", phoneNumber, position)
	
	return item, nil
}

// AssignToAgent atribui um item da fila a um agente
func (m *QueueManager) AssignToAgent(itemID, agentID string) error {
	// Verificar disponibilidade do agente
	var currentChats, maxChats int
	var agentStatus string
	err := m.db.QueryRow(`
		SELECT status, current_chats, max_simultaneous_chats
		FROM agents WHERE id = $1
	`, agentID).Scan(&agentStatus, &currentChats, &maxChats)
	
	if err != nil {
		return fmt.Errorf("agent not found: %v", err)
	}
	
	if agentStatus != "online" {
		return fmt.Errorf("agent is not online")
	}
	
	if currentChats >= maxChats {
		return fmt.Errorf("agent has reached maximum simultaneous chats")
	}
	
	// Atribuir item ao agente
	now := time.Now()
	result, err := m.db.Exec(`
		UPDATE queue_items 
		SET status = 'assigned',
		    assigned_agent_id = $2,
		    assigned_at = $3,
		    wait_end_time = $3,
		    wait_time_seconds = EXTRACT(EPOCH FROM ($3 - wait_start_time))
		WHERE id = $1 AND status = 'waiting'
	`, itemID, agentID, now)
	
	if err != nil {
		return err
	}
	
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("item not available for assignment")
	}
	
	// Atualizar contador de chats do agente
	_, err = m.db.Exec(`
		UPDATE agents 
		SET current_chats = current_chats + 1,
		    last_activity_at = NOW()
		WHERE id = $1
	`, agentID)
	
	if err != nil {
		return err
	}
	
	// Registrar no histórico
	m.recordHistory(itemID, agentID, "assigned")
	
	// Publicar evento
	m.publishQueueEvent("item_assigned", map[string]interface{}{
		"item_id":  itemID,
		"agent_id": agentID,
	})
	
	log.Printf("✅ Assigned queue item %s to agent %s", itemID, agentID)
	
	return nil
}

// CompleteItem marca um item como concluído
func (m *QueueManager) CompleteItem(itemID string, rating int, feedback string) error {
	now := time.Now()
	
	// Buscar informações do item
	var agentID sql.NullString
	var assignedAt sql.NullTime
	err := m.db.QueryRow(`
		SELECT assigned_agent_id, assigned_at
		FROM queue_items
		WHERE id = $1
	`, itemID).Scan(&agentID, &assignedAt)
	
	if err != nil {
		return err
	}
	
	// Calcular tempo de atendimento
	var handlingTime int
	if assignedAt.Valid {
		handlingTime = int(now.Sub(assignedAt.Time).Seconds())
	}
	
	// Atualizar item
	_, err = m.db.Exec(`
		UPDATE queue_items 
		SET status = 'completed',
		    completed_at = $2,
		    handling_time_seconds = $3
		WHERE id = $1
	`, itemID, now, handlingTime)
	
	if err != nil {
		return err
	}
	
	// Reduzir contador de chats do agente
	if agentID.Valid {
		_, err = m.db.Exec(`
			UPDATE agents 
			SET current_chats = GREATEST(current_chats - 1, 0)
			WHERE id = $1
		`, agentID.String)
		
		if err != nil {
			log.Printf("Warning: could not update agent chat count: %v", err)
		}
		
		// Registrar no histórico com rating
		m.recordHistoryWithRating(itemID, agentID.String, "completed", rating, feedback)
	}
	
	// Publicar evento
	m.publishQueueEvent("item_completed", map[string]interface{}{
		"item_id": itemID,
		"rating":  rating,
	})
	
	log.Printf("✅ Completed queue item %s", itemID)
	
	return nil
}

// GetQueueItem busca um item específico da fila
func (m *QueueManager) GetQueueItem(itemID string) (*QueueItem, error) {
	var item QueueItem
	var metadataJSON string
	var assignedAgentID, conversationID, contactID sql.NullString
	var waitEndTime, assignedAt, completedAt, abandonedAt sql.NullTime
	
	err := m.db.QueryRow(`
		SELECT id, queue_id, conversation_id, contact_id, phone_number, 
		       contact_name, position, status, priority, wait_start_time,
		       wait_end_time, assigned_agent_id, assigned_at, completed_at,
		       abandoned_at, wait_time_seconds, handling_time_seconds, metadata,
		       created_at, updated_at
		FROM queue_items
		WHERE id = $1
	`, itemID).Scan(
		&item.ID, &item.QueueID, &conversationID, &contactID,
		&item.PhoneNumber, &item.ContactName, &item.Position, &item.Status,
		&item.Priority, &item.WaitStartTime, &waitEndTime, &assignedAgentID,
		&assignedAt, &completedAt, &abandonedAt, &item.WaitTimeSeconds,
		&item.HandlingTimeSeconds, &metadataJSON, &item.CreatedAt, &item.UpdatedAt,
	)
	
	if err != nil {
		return nil, err
	}
	
	// Handle nullable fields
	if conversationID.Valid {
		item.ConversationID = conversationID.String
	}
	if contactID.Valid {
		item.ContactID = contactID.String
	}
	if waitEndTime.Valid {
		item.WaitEndTime = &waitEndTime.Time
	}
	if assignedAgentID.Valid {
		item.AssignedAgentID = &assignedAgentID.String
	}
	if assignedAt.Valid {
		item.AssignedAt = &assignedAt.Time
	}
	if completedAt.Valid {
		item.CompletedAt = &completedAt.Time
	}
	if abandonedAt.Valid {
		item.AbandonedAt = &abandonedAt.Time
	}
	
	// Parse metadata
	if metadataJSON != "" {
		json.Unmarshal([]byte(metadataJSON), &item.Metadata)
	}
	
	return &item, nil
}

// GetQueueItems retorna todos os itens de uma fila
func (m *QueueManager) GetQueueItems(queueID string, status string) ([]QueueItem, error) {
	query := `
		SELECT id, queue_id, phone_number, contact_name, position, 
		       status, priority, wait_start_time, wait_time_seconds
		FROM queue_items
		WHERE queue_id = $1
	`
	args := []interface{}{queueID}
	
	if status != "" {
		query += " AND status = $2"
		args = append(args, status)
	}
	
	query += " ORDER BY priority DESC, position ASC"
	
	rows, err := m.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var items []QueueItem
	for rows.Next() {
		var item QueueItem
		err := rows.Scan(
			&item.ID, &item.QueueID, &item.PhoneNumber, &item.ContactName,
			&item.Position, &item.Status, &item.Priority, &item.WaitStartTime,
			&item.WaitTimeSeconds,
		)
		if err != nil {
			continue
		}
		items = append(items, item)
	}
	
	return items, nil
}

// GetAvailableAgent busca o próximo agente disponível
func (m *QueueManager) GetAvailableAgent(queueID string) (*Agent, error) {
	query := `
		SELECT a.id, a.name, a.status, a.current_chats, a.max_simultaneous_chats
		FROM agents a
		JOIN agent_queues aq ON a.id = aq.agent_id
		WHERE aq.queue_id = $1
		  AND aq.is_active = true
		  AND a.status = 'online'
		  AND a.current_chats < a.max_simultaneous_chats
		ORDER BY a.current_chats ASC, aq.priority DESC
		LIMIT 1
	`
	
	var agent Agent
	err := m.db.QueryRow(query, queueID).Scan(
		&agent.ID, &agent.Name, &agent.Status,
		&agent.CurrentChats, &agent.MaxSimultaneousChats,
	)
	
	if err == sql.ErrNoRows {
		return nil, nil
	}
	
	if err != nil {
		return nil, err
	}
	
	return &agent, nil
}

// UpdateAgentStatus atualiza o status de um agente
func (m *QueueManager) UpdateAgentStatus(agentID string, status string) error {
	validStatuses := map[string]bool{
		"online":  true,
		"offline": true,
		"busy":    true,
		"away":    true,
		"break":   true,
	}
	
	if !validStatuses[status] {
		return fmt.Errorf("invalid status: %s", status)
	}
	
	_, err := m.db.Exec(`
		UPDATE agents 
		SET status = $2, 
		    last_activity_at = NOW(),
		    updated_at = NOW()
		WHERE id = $1
	`, agentID, status)
	
	if err != nil {
		return err
	}
	
	// Se ficou offline, reatribuir seus itens
	if status == "offline" {
		m.reassignAgentItems(agentID)
	}
	
	// Publicar evento
	m.publishQueueEvent("agent_status_changed", map[string]interface{}{
		"agent_id": agentID,
		"status":   status,
	})
	
	log.Printf("✅ Updated agent %s status to %s", agentID, status)
	
	return nil
}

// reassignAgentItems reatribui itens de um agente que saiu
func (m *QueueManager) reassignAgentItems(agentID string) {
	// Buscar itens atribuídos ao agente
	rows, err := m.db.Query(`
		SELECT id, queue_id 
		FROM queue_items 
		WHERE assigned_agent_id = $1 
		AND status IN ('assigned', 'in_progress')
	`, agentID)
	
	if err != nil {
		log.Printf("Error finding agent items: %v", err)
		return
	}
	defer rows.Close()
	
	for rows.Next() {
		var itemID, queueID string
		if err := rows.Scan(&itemID, &queueID); err != nil {
			continue
		}
		
		// Voltar item para a fila
		_, err = m.db.Exec(`
			UPDATE queue_items 
			SET status = 'waiting',
			    assigned_agent_id = NULL,
			    assigned_at = NULL,
			    position = (
			        SELECT COALESCE(MAX(position), 0) + 1 
			        FROM queue_items 
			        WHERE queue_id = $2 AND status = 'waiting'
			    )
			WHERE id = $1
		`, itemID, queueID)
		
		if err != nil {
			log.Printf("Error reassigning item %s: %v", itemID, err)
			continue
		}
		
		log.Printf("♻️ Reassigned item %s back to queue", itemID)
		
		// Tentar atribuir a outro agente
		m.autoAssignNextInQueue(queueID)
	}
}

// autoAssignNextInQueue tenta atribuir o próximo item da fila
func (m *QueueManager) autoAssignNextInQueue(queueID string) {
	// Buscar próximo item na fila
	var itemID string
	err := m.db.QueryRow(`
		SELECT id 
		FROM queue_items
		WHERE queue_id = $1 AND status = 'waiting'
		ORDER BY priority DESC, position ASC
		LIMIT 1
	`, queueID).Scan(&itemID)
	
	if err != nil {
		return // Fila vazia
	}
	
	// Buscar agente disponível
	agent, err := m.GetAvailableAgent(queueID)
	if err != nil || agent == nil {
		return // Sem agentes disponíveis
	}
	
	// Atribuir
	err = m.AssignToAgent(itemID, agent.ID)
	if err != nil {
		log.Printf("Error auto-assigning item: %v", err)
	}
}

// notifyAvailableAgents notifica agentes sobre novo item na fila
func (m *QueueManager) notifyAvailableAgents(queueID string) {
	// Esta função seria integrada com WebSocket ou notificações push
	m.publishQueueEvent("queue_updated", map[string]interface{}{
		"queue_id": queueID,
		"action":   "new_item",
	})
}

// recordHistory registra ação no histórico
func (m *QueueManager) recordHistory(itemID, agentID, action string) {
	_, err := m.db.Exec(`
		INSERT INTO queue_history (queue_item_id, agent_id, action)
		VALUES ($1, $2, $3)
	`, itemID, agentID, action)
	
	if err != nil {
		log.Printf("Error recording history: %v", err)
	}
}

// recordHistoryWithRating registra histórico com avaliação
func (m *QueueManager) recordHistoryWithRating(itemID, agentID, action string, rating int, feedback string) {
	_, err := m.db.Exec(`
		INSERT INTO queue_history (queue_item_id, agent_id, action, rating, feedback)
		VALUES ($1, $2, $3, $4, $5)
	`, itemID, agentID, action, rating, feedback)
	
	if err != nil {
		log.Printf("Error recording history: %v", err)
	}
}

// publishQueueEvent publica evento no Redis
func (m *QueueManager) publishQueueEvent(eventType string, data map[string]interface{}) {
	event := map[string]interface{}{
		"type":      eventType,
		"data":      data,
		"timestamp": time.Now().Unix(),
	}
	
	eventJSON, _ := json.Marshal(event)
	ctx := m.redis.Context()
	m.redis.Publish(ctx, "queue:events", eventJSON)
}

// tryAutoAssign tenta atribuir automaticamente itens da fila
func (m *QueueManager) tryAutoAssign(queueID string) {
	log.Printf("🤖 Iniciando distribuição automática para fila %s", queueID)
	
	// Buscar itens aguardando por prioridade
	rows, err := m.db.Query(`
		SELECT id, priority, wait_start_time
		FROM queue_items
		WHERE queue_id = $1 AND status = 'waiting'
		ORDER BY priority DESC, position ASC
	`, queueID)
	
	if err != nil {
		log.Printf("Error fetching queue items for auto-assign: %v", err)
		return
	}
	defer rows.Close()
	
	itemsToAssign := []struct {
		id               string
		priority         int
		waitStartTime    time.Time
	}{}
	
	for rows.Next() {
		var item struct {
			id               string
			priority         int
			waitStartTime    time.Time
		}
		
		err := rows.Scan(&item.id, &item.priority, &item.waitStartTime)
		if err != nil {
			continue
		}
		
		itemsToAssign = append(itemsToAssign, item)
	}
	
	// Processar cada item
	for _, item := range itemsToAssign {
		agent := m.getBestAvailableAgent(queueID, item.priority)
		if agent != nil {
			err := m.AssignToAgent(item.id, agent.ID)
			if err != nil {
				log.Printf("Error auto-assigning item %s: %v", item.id, err)
				continue
			}
			
			log.Printf("🎯 Auto-assigned item %s to agent %s", item.id, agent.Name)
			
			// Pequena pausa para evitar sobrecarga
			time.Sleep(100 * time.Millisecond)
		} else {
			log.Printf("⏳ No available agent for item %s", item.id)
			break // Se não há agente para este item, não há para os próximos
		}
	}
}

// getBestAvailableAgent encontra o melhor agente disponível usando algoritmo inteligente
func (m *QueueManager) getBestAvailableAgent(queueID string, itemPriority int) *Agent {
	query := `
		SELECT 
			a.id, a.name, a.status, a.current_chats, a.max_simultaneous_chats,
			a.skills, a.last_activity_at, aq.priority as queue_priority
		FROM agents a
		JOIN agent_queues aq ON a.id = aq.agent_id
		WHERE aq.queue_id = $1
		  AND aq.is_active = true
		  AND a.status = 'online'
		  AND a.current_chats < a.max_simultaneous_chats
		ORDER BY 
		  CASE WHEN $2 = 2 THEN aq.priority END DESC, -- Prioridade alta para itens urgentes
		  a.current_chats ASC, -- Menos ocupado primeiro
		  a.last_activity_at DESC -- Mais recentemente ativo
		LIMIT 1
	`
	
	var agent Agent
	var skillsJSON, lastActivity sql.NullString
	var queuePriority sql.NullInt64
	
	err := m.db.QueryRow(query, queueID, itemPriority).Scan(
		&agent.ID, &agent.Name, &agent.Status, &agent.CurrentChats,
		&agent.MaxSimultaneousChats, &skillsJSON, &lastActivity, &queuePriority,
	)
	
	if err == sql.ErrNoRows {
		return nil
	}
	
	if err != nil {
		log.Printf("Error finding best agent: %v", err)
		return nil
	}
	
	// Parse skills se disponível
	if skillsJSON.Valid && skillsJSON.String != "" {
		json.Unmarshal([]byte(skillsJSON.String), &agent.Skills)
	}
	
	if lastActivity.Valid {
		if t, err := time.Parse(time.RFC3339, lastActivity.String); err == nil {
			agent.LastActivityAt = &t
		}
	}
	
	return &agent
}

// StartAutoDistribution inicia o processo de distribuição automática
func (m *QueueManager) StartAutoDistribution() {
	log.Println("🚀 Starting automatic queue distribution")
	
	ticker := time.NewTicker(15 * time.Second) // Verificar a cada 15 segundos
	go func() {
		for range ticker.C {
			m.processAutoDistribution()
		}
	}()
}

// processAutoDistribution processa distribuição automática para todas as filas ativas
func (m *QueueManager) processAutoDistribution() {
	// Buscar filas ativas com itens aguardando
	rows, err := m.db.Query(`
		SELECT DISTINCT q.id
		FROM queues q
		JOIN queue_items qi ON q.id = qi.queue_id
		WHERE q.is_active = true 
		  AND qi.status = 'waiting'
		  AND qi.wait_start_time < NOW() - INTERVAL '30 seconds'
	`)
	
	if err != nil {
		log.Printf("Error fetching queues for auto-distribution: %v", err)
		return
	}
	defer rows.Close()
	
	var queuesToProcess []string
	for rows.Next() {
		var queueID string
		if err := rows.Scan(&queueID); err != nil {
			continue
		}
		queuesToProcess = append(queuesToProcess, queueID)
	}
	
	// Processar cada fila
	for _, queueID := range queuesToProcess {
		go m.tryAutoAssign(queueID)
	}
	
	if len(queuesToProcess) > 0 {
		log.Printf("🔄 Processed auto-distribution for %d queues", len(queuesToProcess))
	}
}

// BalanceWorkload redistribui carga de trabalho entre agentes
func (m *QueueManager) BalanceWorkload(queueID string) error {
	log.Printf("⚖️ Balancing workload for queue %s", queueID)
	
	// Encontrar agentes sobrecarregados (>80% da capacidade)
	overloadedAgents, err := m.db.Query(`
		SELECT a.id, a.name, a.current_chats, a.max_simultaneous_chats
		FROM agents a
		JOIN agent_queues aq ON a.id = aq.agent_id
		WHERE aq.queue_id = $1 
		  AND aq.is_active = true
		  AND a.status = 'online'
		  AND (a.current_chats::float / a.max_simultaneous_chats) > 0.8
		ORDER BY (a.current_chats::float / a.max_simultaneous_chats) DESC
	`, queueID)
	
	if err != nil {
		return err
	}
	defer overloadedAgents.Close()
	
	// Encontrar agentes com menor carga (<50% da capacidade)
	availableAgents, err := m.db.Query(`
		SELECT a.id, a.name, a.current_chats, a.max_simultaneous_chats
		FROM agents a
		JOIN agent_queues aq ON a.id = aq.agent_id
		WHERE aq.queue_id = $1 
		  AND aq.is_active = true
		  AND a.status = 'online'
		  AND (a.current_chats::float / a.max_simultaneous_chats) < 0.5
		ORDER BY (a.current_chats::float / a.max_simultaneous_chats) ASC
	`, queueID)
	
	if err != nil {
		return err
	}
	defer availableAgents.Close()
	
	// Implementar lógica de redistribuição aqui
	// Por agora, apenas loggar as informações
	log.Printf("📊 Workload analysis completed for queue %s", queueID)
	
	return nil
}

// GetQueueMetrics retorna métricas da fila
func (m *QueueManager) GetQueueMetrics(queueID string) (map[string]interface{}, error) {
	metrics := make(map[string]interface{})
	
	// Total na fila
	var waitingCount int
	m.db.QueryRow(`
		SELECT COUNT(*) FROM queue_items 
		WHERE queue_id = $1 AND status = 'waiting'
	`, queueID).Scan(&waitingCount)
	metrics["waiting_count"] = waitingCount
	
	// Tempo médio de espera
	var avgWaitTime sql.NullFloat64
	m.db.QueryRow(`
		SELECT AVG(wait_time_seconds) 
		FROM queue_items 
		WHERE queue_id = $1 
		AND wait_time_seconds IS NOT NULL
		AND created_at > NOW() - INTERVAL '1 hour'
	`, queueID).Scan(&avgWaitTime)
	
	if avgWaitTime.Valid {
		metrics["avg_wait_time"] = int(avgWaitTime.Float64)
	} else {
		metrics["avg_wait_time"] = 0
	}
	
	// Agentes online
	var agentsOnline int
	m.db.QueryRow(`
		SELECT COUNT(*) 
		FROM agents a
		JOIN agent_queues aq ON a.id = aq.agent_id
		WHERE aq.queue_id = $1 
		AND aq.is_active = true
		AND a.status = 'online'
	`, queueID).Scan(&agentsOnline)
	metrics["agents_online"] = agentsOnline
	
	// Atendimentos hoje
	var todayCount int
	m.db.QueryRow(`
		SELECT COUNT(*) 
		FROM queue_items 
		WHERE queue_id = $1 
		AND created_at::date = CURRENT_DATE
	`, queueID).Scan(&todayCount)
	metrics["today_count"] = todayCount
	
	return metrics, nil
}