package auth

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/pytake/pytake-go/internal/config"
	"github.com/pytake/pytake-go/internal/logger"
	"github.com/pytake/pytake-go/internal/redis"
	"gorm.io/gorm"
)

// Handler handles authentication HTTP requests
type Handler struct {
	service   *Service
	validator *validator.Validate
	logger    *logger.Logger
}

// NewHandler creates a new authentication handler
func NewHandler(db *gorm.DB, rdb *redis.Client, cfg *config.Config, log *logger.Logger) *Handler {
	return &Handler{
		service:   NewService(db, rdb, cfg),
		validator: validator.New(),
		logger:    log,
	}
}

// Register handles user registration
func (h *Handler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.errorResponse(c, http.StatusBadRequest, "Invalid request format", err)
		return
	}

	// Validate request
	if err := h.validator.Struct(&req); err != nil {
		h.validationErrorResponse(c, err)
		return
	}

	// Register user
	response, err := h.service.Register(&req)
	if err != nil {
		if strings.Contains(err.Error(), "already exists") {
			h.errorResponse(c, http.StatusConflict, "User already exists", err)
			return
		}
		if strings.Contains(err.Error(), "password") {
			h.errorResponse(c, http.StatusBadRequest, "Password validation failed", err)
			return
		}
		h.logger.Errorw("Registration failed", "error", err, "email", req.Email)
		h.errorResponse(c, http.StatusInternalServerError, "Registration failed", err)
		return
	}

	h.logger.Infow("User registered successfully", "user_id", response.User.ID, "email", response.User.Email)
	c.JSON(http.StatusCreated, response)
}

// Login handles user authentication
func (h *Handler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.errorResponse(c, http.StatusBadRequest, "Invalid request format", err)
		return
	}

	// Validate request
	if err := h.validator.Struct(&req); err != nil {
		h.validationErrorResponse(c, err)
		return
	}

	// Login user
	response, err := h.service.Login(&req)
	if err != nil {
		if strings.Contains(err.Error(), "invalid credentials") {
			h.errorResponse(c, http.StatusUnauthorized, "Invalid credentials", nil)
			return
		}
		h.logger.Errorw("Login failed", "error", err, "email", req.Email)
		h.errorResponse(c, http.StatusInternalServerError, "Login failed", err)
		return
	}

	h.logger.Infow("User logged in successfully", "user_id", response.User.ID, "email", response.User.Email)
	c.JSON(http.StatusOK, response)
}

// RefreshToken handles token refresh
func (h *Handler) RefreshToken(c *gin.Context) {
	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.errorResponse(c, http.StatusBadRequest, "Invalid request format", err)
		return
	}

	// Validate request
	if err := h.validator.Struct(&req); err != nil {
		h.validationErrorResponse(c, err)
		return
	}

	// Refresh tokens
	tokens, err := h.service.RefreshTokens(&req)
	if err != nil {
		if strings.Contains(err.Error(), "invalid") || strings.Contains(err.Error(), "expired") {
			h.errorResponse(c, http.StatusUnauthorized, "Invalid or expired refresh token", nil)
			return
		}
		h.logger.Errorw("Token refresh failed", "error", err)
		h.errorResponse(c, http.StatusInternalServerError, "Token refresh failed", err)
		return
	}

	c.JSON(http.StatusOK, tokens)
}

// Logout handles user logout
func (h *Handler) Logout(c *gin.Context) {
	// Get user claims from context (set by auth middleware)
	userClaims, exists := c.Get("user")
	if !exists {
		h.errorResponse(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	claims := userClaims.(*Claims)

	// Logout user
	if err := h.service.Logout(claims.UserID); err != nil {
		h.logger.Errorw("Logout failed", "error", err, "user_id", claims.UserID)
		h.errorResponse(c, http.StatusInternalServerError, "Logout failed", err)
		return
	}

	h.logger.Infow("User logged out successfully", "user_id", claims.UserID)
	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

// Me returns current user information
func (h *Handler) Me(c *gin.Context) {
	// Get user claims from context
	userClaims, exists := c.Get("user")
	if !exists {
		h.errorResponse(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	claims := userClaims.(*Claims)
	user, err := h.service.GetUserByID(claims.UserID)
	if err != nil {
		h.logger.Errorw("Failed to get user info", "error", err, "user_id", claims.UserID)
		h.errorResponse(c, http.StatusInternalServerError, "Failed to get user info", err)
		return
	}

	c.JSON(http.StatusOK, user)
}

// errorResponse sends error response
func (h *Handler) errorResponse(c *gin.Context, statusCode int, message string, err error) {
	response := ErrorResponse{
		Error:   message,
	}

	if err != nil {
		response.Message = err.Error()
	}

	c.JSON(statusCode, response)
}

// validationErrorResponse handles validation errors
func (h *Handler) validationErrorResponse(c *gin.Context, err error) {
	details := make(map[string]interface{})

	if validationErrors, ok := err.(validator.ValidationErrors); ok {
		for _, fieldError := range validationErrors {
			field := strings.ToLower(fieldError.Field())
			switch fieldError.Tag() {
			case "required":
				details[field] = "This field is required"
			case "email":
				details[field] = "Invalid email format"
			case "min":
				details[field] = "This field is too short"
			case "max":
				details[field] = "This field is too long"
			default:
				details[field] = "Invalid value"
			}
		}
	}

	response := ErrorResponse{
		Error:   "Validation failed",
		Details: details,
	}

	c.JSON(http.StatusBadRequest, response)
}