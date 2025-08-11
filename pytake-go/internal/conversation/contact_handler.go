package conversation

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/pytake/pytake-go/internal/auth"
	"github.com/pytake/pytake-go/internal/database/models"
)

// CreateContact creates a new contact
func (h *Handler) CreateContact(c *gin.Context) {
	// Get tenant ID from context
	tenantID, exists := c.Get("tenant_id")
	if !exists {
		h.errorResponse(c, http.StatusBadRequest, "Tenant context required", nil)
		return
	}

	var req CreateContactRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.errorResponse(c, http.StatusBadRequest, "Invalid request format", err)
		return
	}

	// Validate request
	if err := h.validator.Struct(&req); err != nil {
		h.validationErrorResponse(c, err)
		return
	}

	// Create contact
	contact, err := h.contactService.CreateContact(tenantID.(uuid.UUID), &req)
	if err != nil {
		h.logger.Errorw("Failed to create contact",
			"error", err,
			"tenant_id", tenantID,
		)
		h.errorResponse(c, http.StatusInternalServerError, "Failed to create contact", err)
		return
	}

	h.logger.Infow("Contact created",
		"contact_id", contact.ID,
		"tenant_id", tenantID,
	)

	c.JSON(http.StatusCreated, h.buildContactResponse(contact))
}

// GetContact gets a contact
func (h *Handler) GetContact(c *gin.Context) {
	// Get tenant ID from context
	tenantID, exists := c.Get("tenant_id")
	if !exists {
		h.errorResponse(c, http.StatusBadRequest, "Tenant context required", nil)
		return
	}

	// Parse contact ID
	contactID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		h.errorResponse(c, http.StatusBadRequest, "Invalid contact ID", err)
		return
	}

	// Get contact
	contact, err := h.contactService.GetContact(contactID, tenantID.(uuid.UUID))
	if err != nil {
		h.errorResponse(c, http.StatusNotFound, "Contact not found", err)
		return
	}

	c.JSON(http.StatusOK, h.buildContactResponse(contact))
}

// GetContacts lists contacts
func (h *Handler) GetContacts(c *gin.Context) {
	// Get tenant ID from context
	tenantID, exists := c.Get("tenant_id")
	if !exists {
		h.errorResponse(c, http.StatusBadRequest, "Tenant context required", nil)
		return
	}

	// Parse query parameters
	filter := &models.ContactFilter{
		TenantID: tenantID.(uuid.UUID),
	}

	// Status filter
	if status := c.Query("status"); status != "" {
		s := models.ContactStatus(status)
		filter.Status = &s
	}

	// Source filter
	if source := c.Query("source"); source != "" {
		filter.Source = &source
	}

	// Search term
	filter.SearchTerm = c.Query("search")

	// Tags filter
	if tags := c.QueryArray("tags"); len(tags) > 0 {
		filter.Tags = tags
	}

	// Has conversations filter
	if hasConv := c.Query("has_conversations"); hasConv != "" {
		hasConversations := hasConv == "true"
		filter.HasConversations = &hasConversations
	}

	// Marketing opt-in filter
	if optIn := c.Query("opt_in_marketing"); optIn != "" {
		optInMarketing := optIn == "true"
		filter.OptInMarketing = &optInMarketing
	}

	// Lead score filters
	if minScore := c.Query("min_lead_score"); minScore != "" {
		if score, err := strconv.Atoi(minScore); err == nil {
			filter.MinLeadScore = &score
		}
	}
	if maxScore := c.Query("max_lead_score"); maxScore != "" {
		if score, err := strconv.Atoi(maxScore); err == nil {
			filter.MaxLeadScore = &score
		}
	}

	// Pagination
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	filter.Limit = pageSize
	filter.Offset = (page - 1) * pageSize

	// Ordering
	filter.OrderBy = c.DefaultQuery("order_by", "created_at")
	filter.OrderDesc = c.Query("order") != "asc"

	// Get contacts
	contacts, total, err := h.contactService.GetContacts(filter)
	if err != nil {
		h.logger.Errorw("Failed to get contacts",
			"error", err,
			"tenant_id", tenantID,
		)
		h.errorResponse(c, http.StatusInternalServerError, "Failed to get contacts", err)
		return
	}

	// Build response
	response := ContactListResponse{
		Contacts: make([]ContactResponse, 0, len(contacts)),
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}

	for _, contact := range contacts {
		response.Contacts = append(response.Contacts, *h.buildContactResponse(&contact))
	}

	c.JSON(http.StatusOK, response)
}

// UpdateContact updates a contact
func (h *Handler) UpdateContact(c *gin.Context) {
	// Get tenant ID from context
	tenantID, exists := c.Get("tenant_id")
	if !exists {
		h.errorResponse(c, http.StatusBadRequest, "Tenant context required", nil)
		return
	}

	// Parse contact ID
	contactID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		h.errorResponse(c, http.StatusBadRequest, "Invalid contact ID", err)
		return
	}

	var req UpdateContactRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.errorResponse(c, http.StatusBadRequest, "Invalid request format", err)
		return
	}

	// Validate request
	if err := h.validator.Struct(&req); err != nil {
		h.validationErrorResponse(c, err)
		return
	}

	// Update contact
	contact, err := h.contactService.UpdateContact(contactID, tenantID.(uuid.UUID), &req)
	if err != nil {
		h.logger.Errorw("Failed to update contact",
			"error", err,
			"contact_id", contactID,
			"tenant_id", tenantID,
		)
		h.errorResponse(c, http.StatusInternalServerError, "Failed to update contact", err)
		return
	}

	h.logger.Infow("Contact updated",
		"contact_id", contactID,
		"tenant_id", tenantID,
	)

	c.JSON(http.StatusOK, h.buildContactResponse(contact))
}

// DeleteContact deletes a contact
func (h *Handler) DeleteContact(c *gin.Context) {
	// Get tenant ID from context
	tenantID, exists := c.Get("tenant_id")
	if !exists {
		h.errorResponse(c, http.StatusBadRequest, "Tenant context required", nil)
		return
	}

	// Parse contact ID
	contactID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		h.errorResponse(c, http.StatusBadRequest, "Invalid contact ID", err)
		return
	}

	// Delete contact
	if err := h.contactService.DeleteContact(contactID, tenantID.(uuid.UUID)); err != nil {
		h.logger.Errorw("Failed to delete contact",
			"error", err,
			"contact_id", contactID,
			"tenant_id", tenantID,
		)
		h.errorResponse(c, http.StatusInternalServerError, "Failed to delete contact", err)
		return
	}

	h.logger.Infow("Contact deleted",
		"contact_id", contactID,
		"tenant_id", tenantID,
	)

	c.JSON(http.StatusOK, gin.H{"message": "Contact deleted successfully"})
}

// AddContactTag adds a tag to a contact
func (h *Handler) AddContactTag(c *gin.Context) {
	// Get tenant ID and user from context
	tenantID, exists := c.Get("tenant_id")
	if !exists {
		h.errorResponse(c, http.StatusBadRequest, "Tenant context required", nil)
		return
	}

	user, _ := c.Get("user")
	claims := user.(*auth.Claims)

	// Parse contact ID
	contactID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		h.errorResponse(c, http.StatusBadRequest, "Invalid contact ID", err)
		return
	}

	var req AddTagRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.errorResponse(c, http.StatusBadRequest, "Invalid request format", err)
		return
	}

	// Validate request
	if err := h.validator.Struct(&req); err != nil {
		h.validationErrorResponse(c, err)
		return
	}

	// Add tag
	if err := h.contactService.AddContactTag(contactID, tenantID.(uuid.UUID), &req, claims.UserID); err != nil {
		h.logger.Errorw("Failed to add tag",
			"error", err,
			"contact_id", contactID,
			"tag", req.Tag,
		)
		h.errorResponse(c, http.StatusInternalServerError, "Failed to add tag", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tag added successfully"})
}

// RemoveContactTag removes a tag from a contact
func (h *Handler) RemoveContactTag(c *gin.Context) {
	// Get tenant ID from context
	tenantID, exists := c.Get("tenant_id")
	if !exists {
		h.errorResponse(c, http.StatusBadRequest, "Tenant context required", nil)
		return
	}

	// Parse contact ID
	contactID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		h.errorResponse(c, http.StatusBadRequest, "Invalid contact ID", err)
		return
	}

	tag := c.Param("tag")
	if tag == "" {
		h.errorResponse(c, http.StatusBadRequest, "Tag is required", nil)
		return
	}

	// Remove tag
	if err := h.contactService.RemoveContactTag(contactID, tenantID.(uuid.UUID), tag); err != nil {
		h.logger.Errorw("Failed to remove tag",
			"error", err,
			"contact_id", contactID,
			"tag", tag,
		)
		h.errorResponse(c, http.StatusInternalServerError, "Failed to remove tag", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tag removed successfully"})
}

// AddContactNote adds a note to a contact
func (h *Handler) AddContactNote(c *gin.Context) {
	// Get tenant ID and user from context
	tenantID, exists := c.Get("tenant_id")
	if !exists {
		h.errorResponse(c, http.StatusBadRequest, "Tenant context required", nil)
		return
	}

	user, _ := c.Get("user")
	claims := user.(*auth.Claims)

	// Parse contact ID
	contactID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		h.errorResponse(c, http.StatusBadRequest, "Invalid contact ID", err)
		return
	}

	var req struct {
		Note      string `json:"note" validate:"required"`
		IsPrivate bool   `json:"is_private"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		h.errorResponse(c, http.StatusBadRequest, "Invalid request format", err)
		return
	}

	// Add note
	note, err := h.contactService.AddContactNote(
		contactID, 
		tenantID.(uuid.UUID), 
		req.Note, 
		claims.UserID,
		req.IsPrivate,
	)
	if err != nil {
		h.logger.Errorw("Failed to add note",
			"error", err,
			"contact_id", contactID,
		)
		h.errorResponse(c, http.StatusInternalServerError, "Failed to add note", err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":         note.ID,
		"note":       note.Note,
		"is_private": note.IsPrivate,
		"created_at": note.CreatedAt,
	})
}

// GetContactStats gets contact statistics
func (h *Handler) GetContactStats(c *gin.Context) {
	// Get tenant ID from context
	tenantID, exists := c.Get("tenant_id")
	if !exists {
		h.errorResponse(c, http.StatusBadRequest, "Tenant context required", nil)
		return
	}

	// Get stats
	stats, err := h.contactService.GetContactStats(tenantID.(uuid.UUID))
	if err != nil {
		h.logger.Errorw("Failed to get contact stats",
			"error", err,
			"tenant_id", tenantID,
		)
		h.errorResponse(c, http.StatusInternalServerError, "Failed to get statistics", err)
		return
	}

	c.JSON(http.StatusOK, stats)
}