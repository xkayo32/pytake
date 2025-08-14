package auth

// Swagger documentation for Auth endpoints

// LoginRequest represents the login request body
// @Description User login credentials
type LoginRequestDoc struct {
	// User email address
	// required: true
	// example: user@example.com
	Email string `json:"email" binding:"required" example:"user@example.com"`
	
	// User password
	// required: true
	// minLength: 8
	// example: MySecurePassword123
	Password string `json:"password" binding:"required" example:"MySecurePassword123"`
}

// LoginResponse represents the login response
// @Description Successful login response with tokens and user info
type LoginResponseDoc struct {
	// JWT access token
	// example: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
	Token string `json:"token" example:"eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."`
	
	// Refresh token for getting new access tokens
	// example: 550e8400-e29b-41d4-a716-446655440000
	RefreshToken string `json:"refresh_token" example:"550e8400-e29b-41d4-a716-446655440000"`
	
	// Token expiration time in seconds
	// example: 86400
	ExpiresIn int64 `json:"expires_in" example:"86400"`
	
	// User information
	User UserResponseDoc `json:"user"`
}

// UserResponse represents user information in responses
// @Description User account information
type UserResponseDoc struct {
	// User unique identifier
	// example: 550e8400-e29b-41d4-a716-446655440000
	ID string `json:"id" example:"550e8400-e29b-41d4-a716-446655440000"`
	
	// User email address
	// example: user@example.com
	Email string `json:"email" example:"user@example.com"`
	
	// User full name
	// example: John Doe
	Name string `json:"name" example:"John Doe"`
	
	// User phone number
	// example: +5511999999999
	Phone string `json:"phone,omitempty" example:"+5511999999999"`
	
	// User role in the system
	// example: admin
	Role string `json:"role" example:"admin"`
	
	// Tenant identifier
	// example: 550e8400-e29b-41d4-a716-446655440000
	TenantID string `json:"tenant_id" example:"550e8400-e29b-41d4-a716-446655440000"`
	
	// Account active status
	// example: true
	IsActive bool `json:"is_active" example:"true"`
	
	// Account creation timestamp
	// example: 2024-01-15T10:30:00Z
	CreatedAt string `json:"created_at" example:"2024-01-15T10:30:00Z"`
	
	// Last update timestamp
	// example: 2024-01-15T10:30:00Z
	UpdatedAt string `json:"updated_at" example:"2024-01-15T10:30:00Z"`
}

// RegisterRequest represents the registration request body
// @Description New user registration data
type RegisterRequestDoc struct {
	// User email address
	// required: true
	// example: newuser@example.com
	Email string `json:"email" binding:"required" example:"newuser@example.com"`
	
	// User password (minimum 8 characters)
	// required: true
	// minLength: 8
	// example: MySecurePassword123
	Password string `json:"password" binding:"required" example:"MySecurePassword123"`
	
	// User full name
	// required: true
	// example: Jane Smith
	Name string `json:"name" binding:"required" example:"Jane Smith"`
	
	// User phone number (optional)
	// example: +5511999999999
	Phone string `json:"phone,omitempty" example:"+5511999999999"`
	
	// Tenant ID to associate the user with
	// required: true
	// example: 550e8400-e29b-41d4-a716-446655440000
	TenantID string `json:"tenant_id" binding:"required" example:"550e8400-e29b-41d4-a716-446655440000"`
}

// UpdatePasswordRequest represents the password update request
// @Description Password change request
type UpdatePasswordRequestDoc struct {
	// Current password for verification
	// required: true
	// example: OldPassword123
	CurrentPassword string `json:"current_password" binding:"required" example:"OldPassword123"`
	
	// New password (minimum 8 characters)
	// required: true
	// minLength: 8
	// example: NewSecurePassword456
	NewPassword string `json:"new_password" binding:"required" example:"NewSecurePassword456"`
}

// RefreshTokenRequest represents the token refresh request
// @Description Request new access token using refresh token
type RefreshTokenRequestDoc struct {
	// Valid refresh token
	// required: true
	// example: 550e8400-e29b-41d4-a716-446655440000
	RefreshToken string `json:"refresh_token" binding:"required" example:"550e8400-e29b-41d4-a716-446655440000"`
}

// ErrorResponse represents an error response
// @Description Standard error response format
type ErrorResponseDoc struct {
	// Error code
	// example: UNAUTHORIZED
	Code string `json:"code" example:"UNAUTHORIZED"`
	
	// Error message
	// example: Invalid credentials
	Message string `json:"message" example:"Invalid credentials"`
	
	// Additional error details
	Details map[string]interface{} `json:"details,omitempty"`
}

// Login godoc
// @Summary User login
// @Description Authenticate user and receive JWT tokens
// @Tags Authentication
// @Accept json
// @Produce json
// @Param request body LoginRequestDoc true "Login credentials"
// @Success 200 {object} LoginResponseDoc "Successful login"
// @Failure 400 {object} ErrorResponseDoc "Invalid request"
// @Failure 401 {object} ErrorResponseDoc "Invalid credentials"
// @Failure 500 {object} ErrorResponseDoc "Internal server error"
// @Router /auth/login [post]
func LoginDoc() {}

// Register godoc
// @Summary Register new user
// @Description Create a new user account
// @Tags Authentication
// @Accept json
// @Produce json
// @Param request body RegisterRequestDoc true "Registration data"
// @Success 201 {object} LoginResponseDoc "Successful registration"
// @Failure 400 {object} ErrorResponseDoc "Invalid request or email already exists"
// @Failure 404 {object} ErrorResponseDoc "Tenant not found"
// @Failure 500 {object} ErrorResponseDoc "Internal server error"
// @Router /auth/register [post]
func RegisterDoc() {}

// GetCurrentUser godoc
// @Summary Get current user
// @Description Get authenticated user information
// @Tags Authentication
// @Accept json
// @Produce json
// @Security Bearer
// @Success 200 {object} UserResponseDoc "User information"
// @Failure 401 {object} ErrorResponseDoc "Unauthorized"
// @Failure 404 {object} ErrorResponseDoc "User not found"
// @Failure 500 {object} ErrorResponseDoc "Internal server error"
// @Router /auth/me [get]
func GetCurrentUserDoc() {}

// UpdatePassword godoc
// @Summary Update password
// @Description Change user password
// @Tags Authentication
// @Accept json
// @Produce json
// @Security Bearer
// @Param request body UpdatePasswordRequestDoc true "Password update data"
// @Success 200 {object} map[string]string "Password updated successfully"
// @Failure 400 {object} ErrorResponseDoc "Invalid request or weak password"
// @Failure 401 {object} ErrorResponseDoc "Unauthorized or incorrect current password"
// @Failure 500 {object} ErrorResponseDoc "Internal server error"
// @Router /auth/password [put]
func UpdatePasswordDoc() {}

// RefreshToken godoc
// @Summary Refresh access token
// @Description Get new access token using refresh token
// @Tags Authentication
// @Accept json
// @Produce json
// @Param request body RefreshTokenRequestDoc true "Refresh token"
// @Success 200 {object} LoginResponseDoc "New tokens"
// @Failure 400 {object} ErrorResponseDoc "Invalid request"
// @Failure 401 {object} ErrorResponseDoc "Invalid refresh token"
// @Failure 500 {object} ErrorResponseDoc "Internal server error"
// @Router /auth/refresh [post]
func RefreshTokenDoc() {}

// Logout godoc
// @Summary Logout user
// @Description Invalidate user session
// @Tags Authentication
// @Accept json
// @Produce json
// @Security Bearer
// @Success 200 {object} map[string]string "Logout successful"
// @Failure 401 {object} ErrorResponseDoc "Unauthorized"
// @Failure 500 {object} ErrorResponseDoc "Internal server error"
// @Router /auth/logout [post]
func LogoutDoc() {}