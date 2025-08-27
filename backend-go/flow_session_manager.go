package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/go-redis/redis/v8"
)

type FlowSession struct {
	ID             string                 `json:"id"`
	FlowID         string                 `json:"flow_id"`
	PhoneNumber    string                 `json:"phone_number"`
	StartedAt      time.Time              `json:"started_at"`
	LastActivityAt time.Time              `json:"last_activity_at"`
	WarnedAt       *time.Time             `json:"warned_at,omitempty"`
	ExpiredAt      *time.Time             `json:"expired_at,omitempty"`
	Status         string                 `json:"status"`
	CurrentNodeID  string                 `json:"current_node_id"`
	Context        map[string]interface{} `json:"context"`
}

type FlowSessionManager struct {
	db              *sql.DB
	redis           *redis.Client
	whatsappService *WhatsAppService
}

func NewFlowSessionManager(db *sql.DB, redis *redis.Client, whatsappService *WhatsAppService) *FlowSessionManager {
	return &FlowSessionManager{
		db:              db,
		redis:           redis,
		whatsappService: whatsappService,
	}
}

// StartSession inicia uma nova sessão de flow
func (m *FlowSessionManager) StartSession(flowID, phoneNumber string) (*FlowSession, error) {
	// Finalizar sessão ativa anterior se existir
	_, err := m.db.Exec(`
		UPDATE flow_sessions 
		SET status = 'completed', expired_at = NOW() 
		WHERE flow_id = $1 AND phone_number = $2 AND status = 'active'
	`, flowID, phoneNumber)
	if err != nil {
		log.Printf("Warning: Could not close previous session: %v", err)
	}

	// Criar nova sessão
	var sessionID string
	err = m.db.QueryRow(`
		INSERT INTO flow_sessions (flow_id, phone_number, status, context)
		VALUES ($1, $2, 'active', '{}')
		RETURNING id
	`, flowID, phoneNumber).Scan(&sessionID)

	if err != nil {
		return nil, fmt.Errorf("failed to create session: %v", err)
	}

	log.Printf("✅ Started flow session %s for %s", sessionID, phoneNumber)

	return &FlowSession{
		ID:             sessionID,
		FlowID:         flowID,
		PhoneNumber:    phoneNumber,
		StartedAt:      time.Now(),
		LastActivityAt: time.Now(),
		Status:         "active",
		Context:        make(map[string]interface{}),
	}, nil
}

// UpdateActivity atualiza o timestamp de última atividade
func (m *FlowSessionManager) UpdateActivity(flowID, phoneNumber, currentNodeID string) error {
	result, err := m.db.Exec(`
		UPDATE flow_sessions 
		SET last_activity_at = NOW(), 
		    current_node_id = $3
		WHERE flow_id = $1 
		  AND phone_number = $2 
		  AND status = 'active'
	`, flowID, phoneNumber, currentNodeID)

	if err != nil {
		return fmt.Errorf("failed to update activity: %v", err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		// Criar nova sessão se não existir uma ativa
		_, err = m.StartSession(flowID, phoneNumber)
		if err != nil {
			return err
		}
		// Tentar atualizar novamente
		_, err = m.db.Exec(`
			UPDATE flow_sessions 
			SET current_node_id = $3 
			WHERE flow_id = $1 AND phone_number = $2 AND status = 'active'
		`, flowID, phoneNumber, currentNodeID)
	}

	return err
}

// CheckExpirations verifica e processa sessões expiradas
func (m *FlowSessionManager) CheckExpirations() error {
	// Buscar flows com suas configurações de expiração
	rows, err := m.db.Query(`
		SELECT 
			fs.id,
			fs.flow_id,
			fs.phone_number,
			fs.last_activity_at,
			fs.warned_at,
			f.expiration_minutes,
			f.send_warning_after_minutes,
			f.inactivity_warning_message,
			f.expiration_message,
			f.redirect_flow_id
		FROM flow_sessions fs
		JOIN flows f ON fs.flow_id = f.id
		WHERE fs.status = 'active'
		  AND fs.last_activity_at < NOW() - INTERVAL '1 minute'
	`)
	if err != nil {
		return fmt.Errorf("failed to query sessions: %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var sessionID, flowID, phoneNumber string
		var lastActivity time.Time
		var warnedAt *time.Time
		var expirationMinutes, warningMinutes int
		var warningMsg, expirationMsg string
		var redirectFlowID *string

		err := rows.Scan(
			&sessionID,
			&flowID,
			&phoneNumber,
			&lastActivity,
			&warnedAt,
			&expirationMinutes,
			&warningMinutes,
			&warningMsg,
			&expirationMsg,
			&redirectFlowID,
		)
		if err != nil {
			log.Printf("Error scanning session: %v", err)
			continue
		}

		timeSinceActivity := time.Since(lastActivity).Minutes()

		// Verificar se deve expirar
		if timeSinceActivity >= float64(expirationMinutes) {
			m.ExpireSession(sessionID, phoneNumber, expirationMsg, redirectFlowID)
		} else if warnedAt == nil && timeSinceActivity >= float64(warningMinutes) {
			// Enviar aviso de inatividade
			m.SendInactivityWarning(sessionID, phoneNumber, warningMsg)
		}
	}

	return nil
}

// SendInactivityWarning envia aviso de inatividade
func (m *FlowSessionManager) SendInactivityWarning(sessionID, phoneNumber, message string) error {
	// Marcar como avisado
	_, err := m.db.Exec(`
		UPDATE flow_sessions 
		SET warned_at = NOW() 
		WHERE id = $1
	`, sessionID)
	if err != nil {
		return err
	}

	// Enviar mensagem via WhatsApp
	log.Printf("⚠️ Sending inactivity warning to %s: %s", phoneNumber, message)
	
	// Enviar mensagem de texto simples
	err = m.sendMessage(phoneNumber, message)
	if err != nil {
		log.Printf("Error sending warning message: %v", err)
	}

	return nil
}

// ExpireSession expira uma sessão por inatividade
func (m *FlowSessionManager) ExpireSession(sessionID, phoneNumber, message string, redirectFlowID *string) error {
	// Marcar sessão como expirada
	_, err := m.db.Exec(`
		UPDATE flow_sessions 
		SET status = 'expired', 
		    expired_at = NOW() 
		WHERE id = $1
	`, sessionID)
	if err != nil {
		return err
	}

	log.Printf("⏰ Session %s expired for %s", sessionID, phoneNumber)

	// Enviar mensagem de expiração
	if message != "" {
		log.Printf("📤 Sending expiration message to %s: %s", phoneNumber, message)
		err = m.sendMessage(phoneNumber, message)
		if err != nil {
			log.Printf("Error sending expiration message: %v", err)
		}
	}

	// Redirecionar para outro flow se configurado
	if redirectFlowID != nil && *redirectFlowID != "" {
		log.Printf("↪️ Redirecting %s to flow %s", phoneNumber, *redirectFlowID)
		// Iniciar novo flow criando uma nova sessão
		_, err = m.StartSession(*redirectFlowID, phoneNumber)
		if err != nil {
			log.Printf("Error starting redirect flow: %v", err)
		}
	}

	return nil
}

// GetActiveSession busca sessão ativa para um número
func (m *FlowSessionManager) GetActiveSession(phoneNumber string) (*FlowSession, error) {
	var session FlowSession
	var contextJSON string

	err := m.db.QueryRow(`
		SELECT 
			id, flow_id, phone_number, 
			started_at, last_activity_at, 
			status, current_node_id, context
		FROM flow_sessions
		WHERE phone_number = $1 
		  AND status = 'active'
		ORDER BY last_activity_at DESC
		LIMIT 1
	`, phoneNumber).Scan(
		&session.ID,
		&session.FlowID,
		&session.PhoneNumber,
		&session.StartedAt,
		&session.LastActivityAt,
		&session.Status,
		&session.CurrentNodeID,
		&contextJSON,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	// Parse context JSON
	if contextJSON != "" {
		json.Unmarshal([]byte(contextJSON), &session.Context)
	}

	return &session, nil
}

// UpdateContext atualiza o contexto da sessão
func (m *FlowSessionManager) UpdateContext(sessionID string, context map[string]interface{}) error {
	contextJSON, err := json.Marshal(context)
	if err != nil {
		return err
	}

	_, err = m.db.Exec(`
		UPDATE flow_sessions 
		SET context = $2,
		    last_activity_at = NOW()
		WHERE id = $1
	`, sessionID, contextJSON)

	return err
}

// sendMessage envia mensagem via WhatsApp
func (m *FlowSessionManager) sendMessage(phoneNumber, message string) error {
	// Buscar número de WhatsApp ativo
	var numberID, accessToken string
	err := m.db.QueryRow(`
		SELECT phone_number_id, access_token 
		FROM whatsapp_numbers 
		WHERE status = 'active' 
		LIMIT 1
	`).Scan(&numberID, &accessToken)
	
	if err != nil {
		return fmt.Errorf("no active WhatsApp number found: %v", err)
	}

	// Enviar mensagem usando o serviço WhatsApp
	return m.whatsappService.SendTextMessage(numberID, accessToken, phoneNumber, message)
}

// StartExpirationMonitor inicia o monitor de expiração
func (m *FlowSessionManager) StartExpirationMonitor() {
	ticker := time.NewTicker(30 * time.Second) // Verificar a cada 30 segundos
	go func() {
		for range ticker.C {
			if err := m.CheckExpirations(); err != nil {
				log.Printf("Error checking expirations: %v", err)
			}
		}
	}()
	log.Println("✅ Flow expiration monitor started")
}