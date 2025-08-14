package integration

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/stretchr/testify/suite"
)

// HealthTestSuite tests health endpoints
type HealthTestSuite struct {
	TestSuite
}

func TestHealthSuite(t *testing.T) {
	suite.Run(t, new(HealthTestSuite))
}

func (suite *HealthTestSuite) TestHealthCheck() {
	// Make request
	w := suite.MakeRequest("GET", "/health", nil, nil)

	// Assert status
	suite.Equal(http.StatusOK, w.Code)

	// Parse response
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	suite.NoError(err)

	// Assert response
	suite.Equal("healthy", response["status"])
	suite.Equal(true, response["database"])
	suite.Equal(true, response["redis"])
	suite.NotEmpty(response["version"])
}

func (suite *HealthTestSuite) TestAPIVersion() {
	// Make request
	w := suite.MakeRequest("GET", "/api/v1/", nil, nil)

	// Assert status
	suite.Equal(http.StatusOK, w.Code)

	// Parse response
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	suite.NoError(err)

	// Assert response
	suite.Equal("PyTake API v1", response["message"])
	suite.NotEmpty(response["version"])
}

func (suite *HealthTestSuite) TestCORS() {
	// Make OPTIONS request
	headers := map[string]string{
		"Origin": "http://localhost:3000",
	}
	w := suite.MakeRequest("OPTIONS", "/api/v1/", nil, headers)

	// Assert CORS headers
	suite.Equal(http.StatusNoContent, w.Code)
	suite.NotEmpty(w.Header().Get("Access-Control-Allow-Origin"))
	suite.NotEmpty(w.Header().Get("Access-Control-Allow-Methods"))
	suite.NotEmpty(w.Header().Get("Access-Control-Allow-Headers"))
}

func (suite *HealthTestSuite) TestRateLimiting() {
	// Test basic functionality - just ensure we don't crash
	for i := 0; i < 5; i++ {
		w := suite.MakeRequest("GET", "/health", nil, nil)
		suite.Equal(http.StatusOK, w.Code)
	}
}

func (suite *HealthTestSuite) TestRequestID() {
	// Test auto-generated request ID
	w1 := suite.MakeRequest("GET", "/health", nil, nil)
	requestID1 := w1.Header().Get("X-Request-ID")
	suite.NotEmpty(requestID1)

	// Test custom request ID
	customID := "custom-request-id"
	headers := map[string]string{
		"X-Request-ID": customID,
	}
	w2 := suite.MakeRequest("GET", "/health", nil, headers)
	requestID2 := w2.Header().Get("X-Request-ID")
	suite.Equal(customID, requestID2)

	// Ensure different requests get different IDs
	w3 := suite.MakeRequest("GET", "/health", nil, nil)
	requestID3 := w3.Header().Get("X-Request-ID")
	suite.NotEqual(requestID1, requestID3)
}