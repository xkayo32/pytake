package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
)

type QueueService struct {
	db      *sql.DB
	redis   *redis.Client
	manager *QueueManager
}

func NewQueueService(db *sql.DB, redis *redis.Client) *QueueService {
	return &QueueService{
		db:      db,
		redis:   redis,
		manager: NewQueueManager(db, redis),
	}
}

// GetQueues retorna todas as filas
func (s *QueueService) GetQueues(c *gin.Context) {
	query := `
		SELECT 
			q.id, q.name, q.description, q.department, q.priority, 
			q.is_active, q.max_wait_time, q.max_queue_size,
			q.working_hours, q.welcome_message, q.waiting_message,
			q.offline_message, q.created_at, q.updated_at,
			COUNT(DISTINCT qi.id) FILTER (WHERE qi.status = 'waiting') as current_size,
			AVG(qi.wait_time_seconds) FILTER (WHERE qi.created_at > NOW() - INTERVAL '1 hour') as avg_wait_time,
			COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'online') as agents_online
		FROM queues q
		LEFT JOIN queue_items qi ON q.id = qi.queue_id
		LEFT JOIN agent_queues aq ON q.id = aq.queue_id AND aq.is_active = true
		LEFT JOIN agents a ON aq.agent_id = a.id
		GROUP BY q.id
		ORDER BY q.priority DESC, q.name
	`

	rows, err := s.db.Query(query)
	if err != nil {
		log.Printf("Error fetching queues: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch queues"})
		return
	}
	defer rows.Close()

	var queues []Queue
	for rows.Next() {
		var q Queue
		var workingHoursJSON string
		var currentSize, agentsOnline sql.NullInt64
		var avgWaitTime sql.NullFloat64

		err := rows.Scan(
			&q.ID, &q.Name, &q.Description, &q.Department, &q.Priority,
			&q.IsActive, &q.MaxWaitTime, &q.MaxQueueSize,
			&workingHoursJSON, &q.WelcomeMessage, &q.WaitingMessage,
			&q.OfflineMessage, &q.CreatedAt, &q.UpdatedAt,
			&currentSize, &avgWaitTime, &agentsOnline,
		)
		if err != nil {
			log.Printf("Error scanning queue: %v", err)
			continue
		}

		// Parse working hours
		if workingHoursJSON != "" {
			json.Unmarshal([]byte(workingHoursJSON), &q.WorkingHours)
		}

		// Add runtime stats
		if currentSize.Valid {
			q.CurrentSize = int(currentSize.Int64)
		}
		if avgWaitTime.Valid {
			q.AvgWaitTime = int(avgWaitTime.Float64)
		}
		if agentsOnline.Valid {
			q.AgentsOnline = int(agentsOnline.Int64)
		}

		queues = append(queues, q)
	}

	c.JSON(http.StatusOK, queues)
}

// CreateQueue cria uma nova fila
func (s *QueueService) CreateQueue(c *gin.Context) {
	var req struct {
		Name           string                 `json:"name" binding:"required"`
		Description    string                 `json:"description"`
		Department     string                 `json:"department"`
		Priority       int                    `json:"priority"`
		MaxWaitTime    int                    `json:"max_wait_time"`
		MaxQueueSize   int                    `json:"max_queue_size"`
		WorkingHours   map[string]interface{} `json:"working_hours"`
		WelcomeMessage string                 `json:"welcome_message"`
		WaitingMessage string                 `json:"waiting_message"`
		OfflineMessage string                 `json:"offline_message"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Set defaults
	if req.MaxWaitTime == 0 {
		req.MaxWaitTime = 30
	}
	if req.MaxQueueSize == 0 {
		req.MaxQueueSize = 100
	}
	if req.WorkingHours == nil {
		req.WorkingHours = map[string]interface{}{
			"start": "09:00",
			"end":   "18:00",
			"days":  []int{1, 2, 3, 4, 5},
		}
	}

	workingHoursJSON, _ := json.Marshal(req.WorkingHours)

	var queueID string
	err := s.db.QueryRow(`
		INSERT INTO queues (
			name, description, department, priority, max_wait_time, 
			max_queue_size, working_hours, welcome_message, 
			waiting_message, offline_message
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id
	`, req.Name, req.Description, req.Department, req.Priority,
		req.MaxWaitTime, req.MaxQueueSize, workingHoursJSON,
		req.WelcomeMessage, req.WaitingMessage, req.OfflineMessage,
	).Scan(&queueID)

	if err != nil {
		log.Printf("Error creating queue: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create queue"})
		return
	}

	log.Printf("✅ Created queue: %s (%s)", req.Name, queueID)
	c.JSON(http.StatusCreated, gin.H{"id": queueID, "name": req.Name})
}

// GetQueueItems retorna itens de uma fila
func (s *QueueService) GetQueueItems(c *gin.Context) {
	queueID := c.Param("id")
	status := c.Query("status")

	items, err := s.manager.GetQueueItems(queueID, status)
	if err != nil {
		log.Printf("Error fetching queue items: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch queue items"})
		return
	}

	// Calcular tempo de espera atual para cada item
	now := time.Now()
	for i := range items {
		if items[i].Status == "waiting" {
			items[i].WaitTimeSeconds = int(now.Sub(items[i].WaitStartTime).Seconds())
		}
	}

	c.JSON(http.StatusOK, items)
}

// AddToQueue adiciona um contato à fila
func (s *QueueService) AddToQueue(c *gin.Context) {
	queueID := c.Param("id")

	var req struct {
		PhoneNumber string `json:"phone_number" binding:"required"`
		ContactName string `json:"contact_name"`
		Priority    int    `json:"priority"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	item, err := s.manager.AddToQueue(queueID, req.PhoneNumber, req.ContactName, req.Priority)
	if err != nil {
		if err.Error() == "contact already in queue" {
			c.JSON(http.StatusConflict, gin.H{"error": "Contact already in queue"})
			return
		}
		log.Printf("Error adding to queue: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add to queue"})
		return
	}

	c.JSON(http.StatusCreated, item)
}

// AssignItem atribui um item a um agente
func (s *QueueService) AssignItem(c *gin.Context) {
	itemID := c.Param("itemId")

	var req struct {
		AgentID string `json:"agent_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := s.manager.AssignToAgent(itemID, req.AgentID)
	if err != nil {
		log.Printf("Error assigning item: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// CompleteItem marca um item como concluído
func (s *QueueService) CompleteItem(c *gin.Context) {
	itemID := c.Param("itemId")

	var req struct {
		Rating   int    `json:"rating"`
		Feedback string `json:"feedback"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := s.manager.CompleteItem(itemID, req.Rating, req.Feedback)
	if err != nil {
		log.Printf("Error completing item: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete item"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// GetAgents retorna agentes de uma fila
func (s *QueueService) GetAgents(c *gin.Context) {
	queueID := c.Query("queue_id")

	query := `
		SELECT DISTINCT
			a.id, a.name, a.email, a.status, a.avatar_url,
			a.current_chats, a.max_simultaneous_chats,
			a.last_activity_at
		FROM agents a
	`

	args := []interface{}{}
	if queueID != "" {
		query += `
			JOIN agent_queues aq ON a.id = aq.agent_id
			WHERE aq.queue_id = $1 AND aq.is_active = true
		`
		args = append(args, queueID)
	}

	query += " ORDER BY a.status DESC, a.name"

	rows, err := s.db.Query(query, args...)
	if err != nil {
		log.Printf("Error fetching agents: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch agents"})
		return
	}
	defer rows.Close()

	var agents []map[string]interface{}
	for rows.Next() {
		var id, name, email, status, avatarURL string
		var currentChats, maxChats int
		var lastActivity sql.NullTime

		err := rows.Scan(&id, &name, &email, &status, &avatarURL,
			&currentChats, &maxChats, &lastActivity)
		if err != nil {
			continue
		}

		agent := map[string]interface{}{
			"id":                     id,
			"name":                   name,
			"email":                  email,
			"status":                 status,
			"avatar_url":             avatarURL,
			"current_chats":          currentChats,
			"max_simultaneous_chats": maxChats,
			"capacity_percentage":    float64(currentChats) / float64(maxChats) * 100,
		}

		if lastActivity.Valid {
			agent["last_activity_at"] = lastActivity.Time
		}

		agents = append(agents, agent)
	}

	c.JSON(http.StatusOK, agents)
}

// UpdateAgentStatus atualiza status de um agente
func (s *QueueService) UpdateAgentStatus(c *gin.Context) {
	agentID := c.Param("id")

	var req struct {
		Status string `json:"status" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := s.manager.UpdateAgentStatus(agentID, req.Status)
	if err != nil {
		log.Printf("Error updating agent status: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// GetQueueMetrics retorna métricas de uma fila
func (s *QueueService) GetQueueMetrics(c *gin.Context) {
	queueID := c.Param("id")

	metrics, err := s.manager.GetQueueMetrics(queueID)
	if err != nil {
		log.Printf("Error fetching queue metrics: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch metrics"})
		return
	}

	c.JSON(http.StatusOK, metrics)
}

// GetQueueHistory retorna histórico de atendimentos
func (s *QueueService) GetQueueHistory(c *gin.Context) {
	queueID := c.Query("queue_id")
	agentID := c.Query("agent_id")
	dateFrom := c.Query("date_from")
	dateTo := c.Query("date_to")
	limit := c.DefaultQuery("limit", "100")

	query := `
		SELECT 
			h.id, h.queue_item_id, h.agent_id, h.phone_number,
			h.action, h.wait_time_seconds, h.handling_time_seconds,
			h.rating, h.feedback, h.created_at,
			a.name as agent_name, q.name as queue_name
		FROM queue_history h
		LEFT JOIN agents a ON h.agent_id = a.id
		LEFT JOIN queues q ON h.queue_id = q.id
		WHERE 1=1
	`

	args := []interface{}{}
	argCount := 1

	if queueID != "" {
		query += " AND h.queue_id = $" + strconv.Itoa(argCount)
		args = append(args, queueID)
		argCount++
	}

	if agentID != "" {
		query += " AND h.agent_id = $" + strconv.Itoa(argCount)
		args = append(args, agentID)
		argCount++
	}

	if dateFrom != "" {
		query += " AND h.created_at >= $" + strconv.Itoa(argCount)
		args = append(args, dateFrom)
		argCount++
	}

	if dateTo != "" {
		query += " AND h.created_at <= $" + strconv.Itoa(argCount)
		args = append(args, dateTo)
		argCount++
	}

	query += " ORDER BY h.created_at DESC LIMIT $" + strconv.Itoa(argCount)
	limitInt, _ := strconv.Atoi(limit)
	args = append(args, limitInt)

	rows, err := s.db.Query(query, args...)
	if err != nil {
		log.Printf("Error fetching queue history: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch history"})
		return
	}
	defer rows.Close()

	var history []map[string]interface{}
	for rows.Next() {
		var id, itemID, action, phoneNumber string
		var agentID, agentName, queueName, feedback sql.NullString
		var waitTime, handlingTime, rating sql.NullInt64
		var createdAt time.Time

		err := rows.Scan(&id, &itemID, &agentID, &phoneNumber,
			&action, &waitTime, &handlingTime, &rating,
			&feedback, &createdAt, &agentName, &queueName)
		if err != nil {
			continue
		}

		item := map[string]interface{}{
			"id":             id,
			"queue_item_id":  itemID,
			"phone_number":   phoneNumber,
			"action":         action,
			"created_at":     createdAt,
		}

		if agentID.Valid {
			item["agent_id"] = agentID.String
		}
		if agentName.Valid {
			item["agent_name"] = agentName.String
		}
		if queueName.Valid {
			item["queue_name"] = queueName.String
		}
		if waitTime.Valid {
			item["wait_time_seconds"] = waitTime.Int64
		}
		if handlingTime.Valid {
			item["handling_time_seconds"] = handlingTime.Int64
		}
		if rating.Valid {
			item["rating"] = rating.Int64
		}
		if feedback.Valid {
			item["feedback"] = feedback.String
		}

		history = append(history, item)
	}

	c.JSON(http.StatusOK, history)
}

// GetDashboardStats retorna estatísticas para o dashboard
func (s *QueueService) GetDashboardStats(c *gin.Context) {
	stats := make(map[string]interface{})

	// Total de filas ativas
	var activeQueues int
	s.db.QueryRow("SELECT COUNT(*) FROM queues WHERE is_active = true").Scan(&activeQueues)
	stats["active_queues"] = activeQueues

	// Total na fila agora
	var totalWaiting int
	s.db.QueryRow("SELECT COUNT(*) FROM queue_items WHERE status = 'waiting'").Scan(&totalWaiting)
	stats["total_waiting"] = totalWaiting

	// Total de agentes online
	var agentsOnline int
	s.db.QueryRow("SELECT COUNT(*) FROM agents WHERE status = 'online'").Scan(&agentsOnline)
	stats["agents_online"] = agentsOnline

	// Atendimentos hoje
	var todayTotal, todayCompleted int
	s.db.QueryRow(`
		SELECT COUNT(*) FROM queue_items 
		WHERE created_at::date = CURRENT_DATE
	`).Scan(&todayTotal)
	s.db.QueryRow(`
		SELECT COUNT(*) FROM queue_items 
		WHERE created_at::date = CURRENT_DATE 
		AND status = 'completed'
	`).Scan(&todayCompleted)
	stats["today_total"] = todayTotal
	stats["today_completed"] = todayCompleted

	// Tempo médio de espera hoje
	var avgWaitTime sql.NullFloat64
	s.db.QueryRow(`
		SELECT AVG(wait_time_seconds) 
		FROM queue_items 
		WHERE created_at::date = CURRENT_DATE 
		AND wait_time_seconds IS NOT NULL
	`).Scan(&avgWaitTime)
	if avgWaitTime.Valid {
		stats["avg_wait_time_today"] = int(avgWaitTime.Float64)
	} else {
		stats["avg_wait_time_today"] = 0
	}

	// Taxa de abandono hoje
	var abandonedToday int
	s.db.QueryRow(`
		SELECT COUNT(*) FROM queue_items 
		WHERE created_at::date = CURRENT_DATE 
		AND status = 'abandoned'
	`).Scan(&abandonedToday)
	
	abandonmentRate := float64(0)
	if todayTotal > 0 {
		abandonmentRate = float64(abandonedToday) / float64(todayTotal) * 100
	}
	stats["abandonment_rate"] = abandonmentRate

	// Satisfação média (baseada em ratings)
	var avgRating sql.NullFloat64
	s.db.QueryRow(`
		SELECT AVG(rating) 
		FROM queue_history 
		WHERE created_at::date = CURRENT_DATE 
		AND rating IS NOT NULL
	`).Scan(&avgRating)
	if avgRating.Valid {
		stats["avg_rating"] = avgRating.Float64
	} else {
		stats["avg_rating"] = 0
	}

	c.JSON(http.StatusOK, stats)
}