package main

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// GetContactGroups busca todos os grupos de contatos do tenant
func GetContactGroups(c *gin.Context) {
	db := getDB()
	tenantID := getTenantID(c)

	query := `
		SELECT 
			g.id, g.tenant_id, g.name, g.description, g.created_at, g.updated_at,
			COUNT(m.contact_id) as contacts_count
		FROM contact_groups g
		LEFT JOIN contact_group_members m ON g.id = m.group_id
		WHERE g.tenant_id = $1 
		GROUP BY g.id, g.tenant_id, g.name, g.description, g.created_at, g.updated_at
		ORDER BY g.name ASC
	`

	rows, err := db.Query(query, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch contact groups",
			"details": err.Error(),
		})
		return
	}
	defer rows.Close()

	var groups []ContactGroup
	for rows.Next() {
		var group ContactGroup
		err := rows.Scan(
			&group.ID, &group.TenantID, &group.Name, &group.Description,
			&group.CreatedAt, &group.UpdatedAt, &group.ContactsCount,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to scan contact group",
				"details": err.Error(),
			})
			return
		}

		// Buscar IDs dos contatos do grupo
		contactIDs, err := getGroupContactIDs(db, group.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to fetch group contacts",
				"details": err.Error(),
			})
			return
		}
		group.Contacts = contactIDs

		// Buscar detalhes dos contatos se solicitado
		if c.Query("include_contacts") == "true" {
			contactDetails, err := getContactsByIDs(db, contactIDs, tenantID)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"error":   "Failed to fetch contact details",
					"details": err.Error(),
				})
				return
			}
			group.ContactsDetails = contactDetails
		}

		groups = append(groups, group)
	}

	if err = rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Row iteration error",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, groups)
}

// CreateContactGroup cria um novo grupo de contatos
func CreateContactGroup(c *gin.Context) {
	db := getDB()
	tenantID := getTenantID(c)

	var req CreateContactGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verificar se os contatos existem
	if len(req.Contacts) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "At least one contact is required"})
		return
	}

	// Iniciar transação
	tx, err := db.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to start transaction",
			"details": err.Error(),
		})
		return
	}
	defer tx.Rollback()

	// Criar o grupo
	groupID := uuid.New().String()
	query := `
		INSERT INTO contact_groups (id, tenant_id, name, description, created_at, updated_at)
		VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
		RETURNING created_at, updated_at
	`

	var createdAt, updatedAt time.Time
	err = tx.QueryRow(query, groupID, tenantID, req.Name, req.Description).
		Scan(&createdAt, &updatedAt)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to create contact group",
			"details": err.Error(),
		})
		return
	}

	// Adicionar membros ao grupo
	for _, contactID := range req.Contacts {
		memberQuery := `
			INSERT INTO contact_group_members (tenant_id, group_id, contact_id, created_at)
			VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
			ON CONFLICT (group_id, contact_id) DO NOTHING
		`
		_, err = tx.Exec(memberQuery, tenantID, groupID, contactID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to add group members",
				"details": err.Error(),
			})
			return
		}
	}

	// Confirmar transação
	if err = tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to commit transaction",
			"details": err.Error(),
		})
		return
	}

	// Retornar o grupo criado
	group := ContactGroup{
		ID:            groupID,
		TenantID:      tenantID,
		Name:          req.Name,
		Description:   req.Description,
		CreatedAt:     createdAt,
		UpdatedAt:     updatedAt,
		ContactsCount: len(req.Contacts),
		Contacts:      req.Contacts,
	}

	c.JSON(http.StatusCreated, group)
}

// UpdateContactGroup atualiza um grupo de contatos
func UpdateContactGroup(c *gin.Context) {
	db := getDB()
	tenantID := getTenantID(c)
	groupID := c.Param("id")

	var req CreateContactGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Iniciar transação
	tx, err := db.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to start transaction",
			"details": err.Error(),
		})
		return
	}
	defer tx.Rollback()

	// Atualizar o grupo
	query := `
		UPDATE contact_groups 
		SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP
		WHERE id = $3 AND tenant_id = $4
		RETURNING updated_at
	`

	var updatedAt time.Time
	err = tx.QueryRow(query, req.Name, req.Description, groupID, tenantID).
		Scan(&updatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Contact group not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to update contact group",
			"details": err.Error(),
		})
		return
	}

	// Remover todos os membros existentes
	_, err = tx.Exec(`DELETE FROM contact_group_members WHERE group_id = $1`, groupID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to remove existing members",
			"details": err.Error(),
		})
		return
	}

	// Adicionar novos membros
	for _, contactID := range req.Contacts {
		memberQuery := `
			INSERT INTO contact_group_members (tenant_id, group_id, contact_id, created_at)
			VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
		`
		_, err = tx.Exec(memberQuery, tenantID, groupID, contactID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to add group members",
				"details": err.Error(),
			})
			return
		}
	}

	// Confirmar transação
	if err = tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to commit transaction",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Contact group updated successfully",
		"updated_at": updatedAt,
	})
}

// DeleteContactGroup exclui um grupo de contatos
func DeleteContactGroup(c *gin.Context) {
	db := getDB()
	tenantID := getTenantID(c)
	groupID := c.Param("id")

	query := `DELETE FROM contact_groups WHERE id = $1 AND tenant_id = $2`

	result, err := db.Exec(query, groupID, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to delete contact group",
			"details": err.Error(),
		})
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get rows affected"})
		return
	}

	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Contact group not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Contact group deleted successfully"})
}

// GetContactGroup busca um grupo específico com detalhes dos contatos
func GetContactGroup(c *gin.Context) {
	db := getDB()
	tenantID := getTenantID(c)
	groupID := c.Param("id")

	query := `
		SELECT 
			g.id, g.tenant_id, g.name, g.description, g.created_at, g.updated_at,
			COUNT(m.contact_id) as contacts_count
		FROM contact_groups g
		LEFT JOIN contact_group_members m ON g.id = m.group_id
		WHERE g.id = $1 AND g.tenant_id = $2
		GROUP BY g.id, g.tenant_id, g.name, g.description, g.created_at, g.updated_at
	`

	var group ContactGroup
	err := db.QueryRow(query, groupID, tenantID).Scan(
		&group.ID, &group.TenantID, &group.Name, &group.Description,
		&group.CreatedAt, &group.UpdatedAt, &group.ContactsCount,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Contact group not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch contact group",
			"details": err.Error(),
		})
		return
	}

	// Buscar IDs dos contatos do grupo
	contactIDs, err := getGroupContactIDs(db, group.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch group contacts",
			"details": err.Error(),
		})
		return
	}
	group.Contacts = contactIDs

	// Buscar detalhes dos contatos
	contactDetails, err := getContactsByIDs(db, contactIDs, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch contact details",
			"details": err.Error(),
		})
		return
	}
	group.ContactsDetails = contactDetails

	c.JSON(http.StatusOK, group)
}

// Funções auxiliares

func getGroupContactIDs(db *sql.DB, groupID string) ([]string, error) {
	query := `SELECT contact_id FROM contact_group_members WHERE group_id = $1`
	rows, err := db.Query(query, groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var contactIDs []string
	for rows.Next() {
		var contactID string
		if err := rows.Scan(&contactID); err != nil {
			return nil, err
		}
		contactIDs = append(contactIDs, contactID)
	}

	return contactIDs, rows.Err()
}

func getContactsByIDs(db *sql.DB, contactIDs []string, tenantID string) ([]Contact, error) {
	if len(contactIDs) == 0 {
		return []Contact{}, nil
	}

	// Construir query com placeholders IN
	placeholders := ""
	args := []interface{}{tenantID}
	for i, id := range contactIDs {
		if i > 0 {
			placeholders += ", "
		}
		placeholders += "$" + string(rune(i+2+'0'))
		args = append(args, id)
	}

	query := `
		SELECT 
			id, tenant_id, phone, name, avatar_url, is_blocked, is_favorite,
			tags, custom_fields, last_message_at, created_at, updated_at
		FROM contacts 
		WHERE tenant_id = $1 AND id IN (` + placeholders + `)
		ORDER BY name ASC
	`

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var contacts []Contact
	for rows.Next() {
		var contact Contact
		err := rows.Scan(
			&contact.ID, &contact.TenantID, &contact.Phone, &contact.Name,
			&contact.AvatarURL, &contact.IsBlocked, &contact.IsFavorite,
			&contact.Tags, &contact.CustomFields, &contact.LastMessageAt,
			&contact.CreatedAt, &contact.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		// Extrair email do custom_fields se existir
		if contact.CustomFields != nil && *contact.CustomFields != "" {
			contact.Email = extractEmailFromCustomFields(*contact.CustomFields)
		}

		// Assumir que todos têm WhatsApp por padrão
		contact.HasWhatsApp = true

		contacts = append(contacts, contact)
	}

	return contacts, rows.Err()
}