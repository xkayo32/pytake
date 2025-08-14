package auth

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/pytake/pytake-go/internal/database/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// MockJWTManager is a mock implementation of JWTManager
type MockJWTManager struct {
	mock.Mock
}

func (m *MockJWTManager) GenerateToken(userID uuid.UUID, email string, tenantID uuid.UUID) (string, error) {
	args := m.Called(userID, email, tenantID)
	return args.String(0), args.Error(1)
}

func (m *MockJWTManager) ValidateToken(tokenString string) (*Claims, error) {
	args := m.Called(tokenString)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*Claims), args.Error(1)
}

func (m *MockJWTManager) GenerateRefreshToken(userID uuid.UUID) (string, error) {
	args := m.Called(userID)
	return args.String(0), args.Error(1)
}

func (m *MockJWTManager) ValidateRefreshToken(tokenString string) (uuid.UUID, error) {
	args := m.Called(tokenString)
	return args.Get(0).(uuid.UUID), args.Error(1)
}

// Setup test database
func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)

	// Auto migrate models
	err = db.AutoMigrate(&models.User{}, &models.Tenant{})
	assert.NoError(t, err)

	return db
}

// Test Login
func TestService_Login(t *testing.T) {
	db := setupTestDB(t)
	mockJWT := new(MockJWTManager)
	service := NewService(db, mockJWT)

	// Create test tenant
	tenant := &models.Tenant{
		Name:   "Test Tenant",
		Domain: "test.com",
	}
	tenant.ID = uuid.New()
	db.Create(tenant)

	// Create test user
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	user := &models.User{
		Email:        "test@test.com",
		PasswordHash: string(hashedPassword),
		Name:         "Test User",
		IsActive:     true,
		TenantID:     tenant.ID,
	}
	user.ID = uuid.New()
	db.Create(user)

	// Mock JWT generation
	mockJWT.On("GenerateToken", user.ID, user.Email, tenant.ID).Return("test-token", nil)
	mockJWT.On("GenerateRefreshToken", user.ID).Return("test-refresh-token", nil)

	// Test successful login
	t.Run("Successful Login", func(t *testing.T) {
		req := &LoginRequest{
			Email:    "test@test.com",
			Password: "password123",
		}

		resp, err := service.Login(context.Background(), req)
		assert.NoError(t, err)
		assert.NotNil(t, resp)
		assert.Equal(t, "test-token", resp.Token)
		assert.Equal(t, "test-refresh-token", resp.RefreshToken)
		assert.Equal(t, user.ID, resp.User.ID)
		assert.Equal(t, user.Email, resp.User.Email)
	})

	// Test invalid password
	t.Run("Invalid Password", func(t *testing.T) {
		req := &LoginRequest{
			Email:    "test@test.com",
			Password: "wrongpassword",
		}

		resp, err := service.Login(context.Background(), req)
		assert.Error(t, err)
		assert.Nil(t, resp)
		assert.Contains(t, err.Error(), "invalid credentials")
	})

	// Test non-existent user
	t.Run("Non-existent User", func(t *testing.T) {
		req := &LoginRequest{
			Email:    "nonexistent@test.com",
			Password: "password123",
		}

		resp, err := service.Login(context.Background(), req)
		assert.Error(t, err)
		assert.Nil(t, resp)
		assert.Contains(t, err.Error(), "invalid credentials")
	})

	// Test inactive user
	t.Run("Inactive User", func(t *testing.T) {
		// Deactivate user
		db.Model(&user).Update("is_active", false)

		req := &LoginRequest{
			Email:    "test@test.com",
			Password: "password123",
		}

		resp, err := service.Login(context.Background(), req)
		assert.Error(t, err)
		assert.Nil(t, resp)
		assert.Contains(t, err.Error(), "account is inactive")

		// Reactivate for other tests
		db.Model(&user).Update("is_active", true)
	})

	mockJWT.AssertExpectations(t)
}

// Test Register
func TestService_Register(t *testing.T) {
	db := setupTestDB(t)
	mockJWT := new(MockJWTManager)
	service := NewService(db, mockJWT)

	// Create test tenant
	tenant := &models.Tenant{
		Name:   "Test Tenant",
		Domain: "test.com",
	}
	tenant.ID = uuid.New()
	db.Create(tenant)

	// Test successful registration
	t.Run("Successful Registration", func(t *testing.T) {
		req := &RegisterRequest{
			Email:    "newuser@test.com",
			Password: "password123",
			Name:     "New User",
			Phone:    "+5511999999999",
			TenantID: tenant.ID,
		}

		// Mock JWT generation
		mockJWT.On("GenerateToken", mock.AnythingOfType("uuid.UUID"), req.Email, tenant.ID).Return("test-token", nil)
		mockJWT.On("GenerateRefreshToken", mock.AnythingOfType("uuid.UUID")).Return("test-refresh-token", nil)

		resp, err := service.Register(context.Background(), req)
		assert.NoError(t, err)
		assert.NotNil(t, resp)
		assert.Equal(t, "test-token", resp.Token)
		assert.Equal(t, req.Email, resp.User.Email)
		assert.Equal(t, req.Name, resp.User.Name)

		// Verify user was created in database
		var user models.User
		err = db.Where("email = ?", req.Email).First(&user).Error
		assert.NoError(t, err)
		assert.Equal(t, req.Email, user.Email)
	})

	// Test duplicate email
	t.Run("Duplicate Email", func(t *testing.T) {
		req := &RegisterRequest{
			Email:    "newuser@test.com", // Same email as before
			Password: "password123",
			Name:     "Another User",
			Phone:    "+5511888888888",
			TenantID: tenant.ID,
		}

		resp, err := service.Register(context.Background(), req)
		assert.Error(t, err)
		assert.Nil(t, resp)
		assert.Contains(t, err.Error(), "email already exists")
	})

	// Test weak password
	t.Run("Weak Password", func(t *testing.T) {
		req := &RegisterRequest{
			Email:    "weakpass@test.com",
			Password: "123", // Too short
			Name:     "Weak Pass User",
			Phone:    "+5511777777777",
			TenantID: tenant.ID,
		}

		resp, err := service.Register(context.Background(), req)
		assert.Error(t, err)
		assert.Nil(t, resp)
		assert.Contains(t, err.Error(), "password must be at least")
	})

	// Test invalid tenant
	t.Run("Invalid Tenant", func(t *testing.T) {
		req := &RegisterRequest{
			Email:    "invalidtenant@test.com",
			Password: "password123",
			Name:     "Invalid Tenant User",
			Phone:    "+5511666666666",
			TenantID: uuid.New(), // Non-existent tenant
		}

		resp, err := service.Register(context.Background(), req)
		assert.Error(t, err)
		assert.Nil(t, resp)
		assert.Contains(t, err.Error(), "tenant not found")
	})

	mockJWT.AssertExpectations(t)
}

// Test GetCurrentUser
func TestService_GetCurrentUser(t *testing.T) {
	db := setupTestDB(t)
	mockJWT := new(MockJWTManager)
	service := NewService(db, mockJWT)

	// Create test tenant
	tenant := &models.Tenant{
		Name:   "Test Tenant",
		Domain: "test.com",
	}
	tenant.ID = uuid.New()
	db.Create(tenant)

	// Create test user
	user := &models.User{
		Email:    "current@test.com",
		Name:     "Current User",
		IsActive: true,
		TenantID: tenant.ID,
	}
	user.ID = uuid.New()
	db.Create(user)

	// Test successful get
	t.Run("Successful Get", func(t *testing.T) {
		resp, err := service.GetCurrentUser(context.Background(), user.ID)
		assert.NoError(t, err)
		assert.NotNil(t, resp)
		assert.Equal(t, user.ID, resp.ID)
		assert.Equal(t, user.Email, resp.Email)
		assert.Equal(t, tenant.ID, resp.TenantID)
	})

	// Test non-existent user
	t.Run("Non-existent User", func(t *testing.T) {
		resp, err := service.GetCurrentUser(context.Background(), uuid.New())
		assert.Error(t, err)
		assert.Nil(t, resp)
		assert.Contains(t, err.Error(), "user not found")
	})
}

// Test UpdatePassword
func TestService_UpdatePassword(t *testing.T) {
	db := setupTestDB(t)
	mockJWT := new(MockJWTManager)
	service := NewService(db, mockJWT)

	// Create test user
	oldPassword := "oldpassword123"
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(oldPassword), bcrypt.DefaultCost)
	user := &models.User{
		Email:        "updatepass@test.com",
		PasswordHash: string(hashedPassword),
		Name:         "Update Pass User",
		IsActive:     true,
		TenantID:     uuid.New(),
	}
	user.ID = uuid.New()
	db.Create(user)

	// Test successful password update
	t.Run("Successful Update", func(t *testing.T) {
		req := &UpdatePasswordRequest{
			CurrentPassword: oldPassword,
			NewPassword:     "newpassword123",
		}

		err := service.UpdatePassword(context.Background(), user.ID, req)
		assert.NoError(t, err)

		// Verify password was updated
		var updatedUser models.User
		db.First(&updatedUser, user.ID)
		err = bcrypt.CompareHashAndPassword([]byte(updatedUser.PasswordHash), []byte("newpassword123"))
		assert.NoError(t, err)
	})

	// Test wrong current password
	t.Run("Wrong Current Password", func(t *testing.T) {
		req := &UpdatePasswordRequest{
			CurrentPassword: "wrongpassword",
			NewPassword:     "anotherpassword123",
		}

		err := service.UpdatePassword(context.Background(), user.ID, req)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "current password is incorrect")
	})

	// Test weak new password
	t.Run("Weak New Password", func(t *testing.T) {
		req := &UpdatePasswordRequest{
			CurrentPassword: "newpassword123", // Updated in first test
			NewPassword:     "weak",
		}

		err := service.UpdatePassword(context.Background(), user.ID, req)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "password must be at least")
	})
}

// Test RefreshToken
func TestService_RefreshToken(t *testing.T) {
	db := setupTestDB(t)
	mockJWT := new(MockJWTManager)
	service := NewService(db, mockJWT)

	// Create test tenant
	tenant := &models.Tenant{
		Name:   "Test Tenant",
		Domain: "test.com",
	}
	tenant.ID = uuid.New()
	db.Create(tenant)

	// Create test user
	user := &models.User{
		Email:    "refresh@test.com",
		Name:     "Refresh User",
		IsActive: true,
		TenantID: tenant.ID,
	}
	user.ID = uuid.New()
	db.Create(user)

	// Test successful refresh
	t.Run("Successful Refresh", func(t *testing.T) {
		refreshToken := "valid-refresh-token"
		
		// Mock JWT validation and generation
		mockJWT.On("ValidateRefreshToken", refreshToken).Return(user.ID, nil)
		mockJWT.On("GenerateToken", user.ID, user.Email, tenant.ID).Return("new-access-token", nil)
		mockJWT.On("GenerateRefreshToken", user.ID).Return("new-refresh-token", nil)

		req := &RefreshTokenRequest{
			RefreshToken: refreshToken,
		}

		resp, err := service.RefreshToken(context.Background(), req)
		assert.NoError(t, err)
		assert.NotNil(t, resp)
		assert.Equal(t, "new-access-token", resp.Token)
		assert.Equal(t, "new-refresh-token", resp.RefreshToken)
	})

	// Test invalid refresh token
	t.Run("Invalid Refresh Token", func(t *testing.T) {
		invalidToken := "invalid-refresh-token"
		
		// Mock JWT validation failure
		mockJWT.On("ValidateRefreshToken", invalidToken).Return(uuid.Nil, ErrInvalidToken)

		req := &RefreshTokenRequest{
			RefreshToken: invalidToken,
		}

		resp, err := service.RefreshToken(context.Background(), req)
		assert.Error(t, err)
		assert.Nil(t, resp)
		assert.Contains(t, err.Error(), "invalid refresh token")
	})

	mockJWT.AssertExpectations(t)
}

// Test ValidatePassword
func TestValidatePassword(t *testing.T) {
	tests := []struct {
		name     string
		password string
		wantErr  bool
		errMsg   string
	}{
		{
			name:     "Valid password",
			password: "ValidPass123",
			wantErr:  false,
		},
		{
			name:     "Too short",
			password: "short",
			wantErr:  true,
			errMsg:   "password must be at least",
		},
		{
			name:     "Empty password",
			password: "",
			wantErr:  true,
			errMsg:   "password must be at least",
		},
		{
			name:     "Minimum length",
			password: "12345678",
			wantErr:  false,
		},
		{
			name:     "With special characters",
			password: "Pass@word123!",
			wantErr:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validatePassword(tt.password)
			if tt.wantErr {
				assert.Error(t, err)
				if tt.errMsg != "" {
					assert.Contains(t, err.Error(), tt.errMsg)
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

// Test HashPassword and ComparePassword
func TestPasswordHashing(t *testing.T) {
	password := "TestPassword123"

	// Test hashing
	hash, err := hashPassword(password)
	assert.NoError(t, err)
	assert.NotEmpty(t, hash)
	assert.NotEqual(t, password, hash)

	// Test comparison with correct password
	err = bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	assert.NoError(t, err)

	// Test comparison with wrong password
	err = bcrypt.CompareHashAndPassword([]byte(hash), []byte("WrongPassword"))
	assert.Error(t, err)

	// Test that hashing same password twice gives different results
	hash2, err := hashPassword(password)
	assert.NoError(t, err)
	assert.NotEqual(t, hash, hash2)
}

// Benchmark Login
func BenchmarkService_Login(b *testing.B) {
	db := setupTestDB(&testing.T{})
	mockJWT := new(MockJWTManager)
	service := NewService(db, mockJWT)

	// Create test data
	tenant := &models.Tenant{Name: "Bench Tenant"}
	tenant.ID = uuid.New()
	db.Create(tenant)

	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	user := &models.User{
		Email:        "bench@test.com",
		PasswordHash: string(hashedPassword),
		Name:         "Bench User",
		IsActive:     true,
		TenantID:     tenant.ID,
	}
	user.ID = uuid.New()
	db.Create(user)

	mockJWT.On("GenerateToken", mock.Anything, mock.Anything, mock.Anything).Return("token", nil)
	mockJWT.On("GenerateRefreshToken", mock.Anything).Return("refresh", nil)

	req := &LoginRequest{
		Email:    "bench@test.com",
		Password: "password123",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		service.Login(context.Background(), req)
	}
}