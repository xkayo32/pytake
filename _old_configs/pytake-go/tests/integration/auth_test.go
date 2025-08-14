package integration

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/pytake/pytake-go/internal/auth"
	"github.com/stretchr/testify/suite"
)

// AuthTestSuite tests authentication endpoints
type AuthTestSuite struct {
	TestSuite
}

func TestAuthSuite(t *testing.T) {
	suite.Run(t, new(AuthTestSuite))
}

func (suite *AuthTestSuite) TestUserRegistration() {
	// Test valid registration
	registerReq := auth.RegisterRequest{
		Name:     "Test User",
		Email:    "test@example.com",
		Password: "password123",
	}

	w := suite.MakeRequest("POST", "/api/v1/auth/register", registerReq, nil)
	suite.Equal(http.StatusCreated, w.Code)

	var response auth.AuthResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	suite.NoError(err)

	// Validate response
	suite.Equal("Test User", response.User.Name)
	suite.Equal("test@example.com", response.User.Email)
	suite.Equal("user", response.User.Role)
	suite.True(response.User.IsActive)
	suite.NotEmpty(response.Tokens.AccessToken)
	suite.NotEmpty(response.Tokens.RefreshToken)
	suite.Equal("Bearer", response.Tokens.TokenType)
}

func (suite *AuthTestSuite) TestUserRegistrationValidation() {
	// Test invalid email
	registerReq := auth.RegisterRequest{
		Name:     "Test User",
		Email:    "invalid-email",
		Password: "password123",
	}

	w := suite.MakeRequest("POST", "/api/v1/auth/register", registerReq, nil)
	suite.Equal(http.StatusBadRequest, w.Code)

	// Test weak password
	registerReq = auth.RegisterRequest{
		Name:     "Test User",
		Email:    "test2@example.com",
		Password: "123",
	}

	w = suite.MakeRequest("POST", "/api/v1/auth/register", registerReq, nil)
	suite.Equal(http.StatusBadRequest, w.Code)

	// Test missing fields
	w = suite.MakeRequest("POST", "/api/v1/auth/register", map[string]string{}, nil)
	suite.Equal(http.StatusBadRequest, w.Code)
}

func (suite *AuthTestSuite) TestUserLogin() {
	// First, register a user
	registerReq := auth.RegisterRequest{
		Name:     "Login Test User",
		Email:    "login@example.com",
		Password: "password123",
	}

	suite.MakeRequest("POST", "/api/v1/auth/register", registerReq, nil)

	// Test login
	loginReq := auth.LoginRequest{
		Email:    "login@example.com",
		Password: "password123",
	}

	w := suite.MakeRequest("POST", "/api/v1/auth/login", loginReq, nil)
	suite.Equal(http.StatusOK, w.Code)

	var response auth.AuthResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	suite.NoError(err)

	// Validate response
	suite.Equal("Login Test User", response.User.Name)
	suite.Equal("login@example.com", response.User.Email)
	suite.NotEmpty(response.Tokens.AccessToken)
	suite.NotEmpty(response.Tokens.RefreshToken)
}

func (suite *AuthTestSuite) TestInvalidLogin() {
	// Test login with wrong password
	loginReq := auth.LoginRequest{
		Email:    "login@example.com",
		Password: "wrongpassword",
	}

	w := suite.MakeRequest("POST", "/api/v1/auth/login", loginReq, nil)
	suite.Equal(http.StatusUnauthorized, w.Code)

	// Test login with non-existent user
	loginReq = auth.LoginRequest{
		Email:    "nonexistent@example.com",
		Password: "password123",
	}

	w = suite.MakeRequest("POST", "/api/v1/auth/login", loginReq, nil)
	suite.Equal(http.StatusUnauthorized, w.Code)
}

func (suite *AuthTestSuite) TestTokenRefresh() {
	// Register and login to get tokens
	registerReq := auth.RegisterRequest{
		Name:     "Refresh Test User",
		Email:    "refresh@example.com",
		Password: "password123",
	}

	w := suite.MakeRequest("POST", "/api/v1/auth/register", registerReq, nil)
	var registerResponse auth.AuthResponse
	json.Unmarshal(w.Body.Bytes(), &registerResponse)

	// Test token refresh
	refreshReq := auth.RefreshRequest{
		RefreshToken: registerResponse.Tokens.RefreshToken,
	}

	w = suite.MakeRequest("POST", "/api/v1/auth/refresh", refreshReq, nil)
	suite.Equal(http.StatusOK, w.Code)

	var refreshResponse auth.TokenPair
	err := json.Unmarshal(w.Body.Bytes(), &refreshResponse)
	suite.NoError(err)

	suite.NotEmpty(refreshResponse.AccessToken)
	suite.NotEmpty(refreshResponse.RefreshToken)
	suite.NotEqual(registerResponse.Tokens.AccessToken, refreshResponse.AccessToken)
}

func (suite *AuthTestSuite) TestInvalidTokenRefresh() {
	// Test with invalid refresh token
	refreshReq := auth.RefreshRequest{
		RefreshToken: "invalid.token.here",
	}

	w := suite.MakeRequest("POST", "/api/v1/auth/refresh", refreshReq, nil)
	suite.Equal(http.StatusUnauthorized, w.Code)
}

func (suite *AuthTestSuite) TestAuthenticatedEndpoint() {
	// Register user to get token
	registerReq := auth.RegisterRequest{
		Name:     "Auth Test User",
		Email:    "authtest@example.com",
		Password: "password123",
	}

	w := suite.MakeRequest("POST", "/api/v1/auth/register", registerReq, nil)
	var response auth.AuthResponse
	json.Unmarshal(w.Body.Bytes(), &response)

	// Test authenticated endpoint with token
	headers := map[string]string{
		"Authorization": "Bearer " + response.Tokens.AccessToken,
	}

	w = suite.MakeRequest("GET", "/api/v1/auth/me", nil, headers)
	suite.Equal(http.StatusOK, w.Code)

	var userResponse auth.UserResponse
	err := json.Unmarshal(w.Body.Bytes(), &userResponse)
	suite.NoError(err)

	suite.Equal("Auth Test User", userResponse.Name)
	suite.Equal("authtest@example.com", userResponse.Email)
}

func (suite *AuthTestSuite) TestUnauthorizedAccess() {
	// Test without token
	w := suite.MakeRequest("GET", "/api/v1/auth/me", nil, nil)
	suite.Equal(http.StatusUnauthorized, w.Code)

	// Test with invalid token
	headers := map[string]string{
		"Authorization": "Bearer invalid.token.here",
	}

	w = suite.MakeRequest("GET", "/api/v1/auth/me", nil, headers)
	suite.Equal(http.StatusUnauthorized, w.Code)

	// Test with malformed header
	headers = map[string]string{
		"Authorization": "InvalidFormat token",
	}

	w = suite.MakeRequest("GET", "/api/v1/auth/me", nil, headers)
	suite.Equal(http.StatusUnauthorized, w.Code)
}

func (suite *AuthTestSuite) TestLogout() {
	// Register user to get token
	registerReq := auth.RegisterRequest{
		Name:     "Logout Test User",
		Email:    "logout@example.com",
		Password: "password123",
	}

	w := suite.MakeRequest("POST", "/api/v1/auth/register", registerReq, nil)
	var response auth.AuthResponse
	json.Unmarshal(w.Body.Bytes(), &response)

	// Test logout
	headers := map[string]string{
		"Authorization": "Bearer " + response.Tokens.AccessToken,
	}

	w = suite.MakeRequest("POST", "/api/v1/auth/logout", nil, headers)
	suite.Equal(http.StatusOK, w.Code)

	var logoutResponse map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &logoutResponse)
	suite.NoError(err)
	suite.Equal("Logged out successfully", logoutResponse["message"])
}

func (suite *AuthTestSuite) TestOptionalAuth() {
	// Test without authentication
	w := suite.MakeRequest("GET", "/api/v1/test-auth", nil, nil)
	suite.Equal(http.StatusOK, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	suite.Equal(false, response["authenticated"])

	// Register user to get token
	registerReq := auth.RegisterRequest{
		Name:     "Optional Auth User",
		Email:    "optional@example.com",
		Password: "password123",
	}

	w = suite.MakeRequest("POST", "/api/v1/auth/register", registerReq, nil)
	var authResponse auth.AuthResponse
	json.Unmarshal(w.Body.Bytes(), &authResponse)

	// Test with authentication
	headers := map[string]string{
		"Authorization": "Bearer " + authResponse.Tokens.AccessToken,
	}

	w = suite.MakeRequest("GET", "/api/v1/test-auth", nil, headers)
	suite.Equal(http.StatusOK, w.Code)

	json.Unmarshal(w.Body.Bytes(), &response)
	suite.Equal(true, response["authenticated"])
	suite.Equal("optional@example.com", response["email"])
}