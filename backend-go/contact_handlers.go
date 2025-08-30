package main

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// GetContacts busca todos os contatos do tenant
func GetContacts(c *gin.Context) {
	db := getDB()
	tenantID := getTenantID(c)

	query := `
		SELECT 
			id, tenant_id, phone, name, avatar_url, is_blocked, is_favorite, 
			tags, custom_fields, last_message_at, created_at, updated_at
		FROM contacts 
		WHERE tenant_id = $1 
		ORDER BY name ASC, created_at DESC
	`

	rows, err := db.Query(query, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch contacts",
			"details": err.Error(),
		})
		return
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
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to scan contact",
				"details": err.Error(),
			})
			return
		}

		// Extrair email do custom_fields se existir
		if contact.CustomFields != nil && *contact.CustomFields != "" {
			contact.Email = extractEmailFromCustomFields(*contact.CustomFields)
		}

		// Assumir que todos têm WhatsApp por padrão
		contact.HasWhatsApp = true

		contacts = append(contacts, contact)
	}

	if err = rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Row iteration error",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"contacts": contacts,
	})
}

// CreateContact cria um novo contato
func CreateContact(c *gin.Context) {
	db := getDB()
	tenantID := getTenantID(c)

	var req struct {
		Name  string `json:"name" binding:"required"`
		Phone string `json:"phone" binding:"required"`
		Email string `json:"email"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	contactID := uuid.New().String()
	customFields := "{}"
	if req.Email != "" {
		customFields = `{"email": "` + req.Email + `"}`
	}

	query := `
		INSERT INTO contacts (id, tenant_id, phone, name, custom_fields, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
		RETURNING id, created_at, updated_at
	`

	var contact Contact
	err := db.QueryRow(query, contactID, tenantID, req.Phone, req.Name, customFields).
		Scan(&contact.ID, &contact.CreatedAt, &contact.UpdatedAt)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to create contact",
			"details": err.Error(),
		})
		return
	}

	contact.Name = req.Name
	contact.Phone = req.Phone
	contact.TenantID = tenantID
	if req.Email != "" {
		contact.Email = req.Email
	}

	c.JSON(http.StatusCreated, contact)
}

// UpdateContact atualiza um contato
func UpdateContact(c *gin.Context) {
	db := getDB()
	tenantID := getTenantID(c)
	contactID := c.Param("id")

	var req struct {
		Name  string `json:"name" binding:"required"`
		Phone string `json:"phone" binding:"required"`
		Email string `json:"email"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	customFields := "{}"
	if req.Email != "" {
		customFields = `{"email": "` + req.Email + `"}`
	}

	query := `
		UPDATE contacts 
		SET name = $1, phone = $2, custom_fields = $3, updated_at = CURRENT_TIMESTAMP
		WHERE id = $4 AND tenant_id = $5
		RETURNING updated_at
	`

	var updatedAt time.Time
	err := db.QueryRow(query, req.Name, req.Phone, customFields, contactID, tenantID).
		Scan(&updatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Contact not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to update contact",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Contact updated successfully",
		"updated_at": updatedAt,
	})
}

// DeleteContact exclui um contato
func DeleteContact(c *gin.Context) {
	db := getDB()
	tenantID := getTenantID(c)
	contactID := c.Param("id")

	query := `DELETE FROM contacts WHERE id = $1 AND tenant_id = $2`

	result, err := db.Exec(query, contactID, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to delete contact",
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
		c.JSON(http.StatusNotFound, gin.H{"error": "Contact not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Contact deleted successfully"})
}

