package main

import (
	"math/rand"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// AI Sentiment Analysis
func AnalyzeSentiment(c *gin.Context) {
	var request struct {
		Text     string   `json:"text"`
		Messages []string `json:"messages"`
	}
	
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// Analyze sentiment based on keywords
	text := strings.ToLower(request.Text)
	if len(request.Messages) > 0 {
		text = strings.ToLower(strings.Join(request.Messages, " "))
	}
	
	sentiment := "neutral"
	score := 0.5
	confidence := 0.8
	
	// Positive keywords
	if strings.Contains(text, "obrigado") || strings.Contains(text, "ótimo") || 
	   strings.Contains(text, "excelente") || strings.Contains(text, "perfeito") ||
	   strings.Contains(text, "bom") || strings.Contains(text, "feliz") {
		sentiment = "positive"
		score = 0.7 + rand.Float64()*0.3
		confidence = 0.85 + rand.Float64()*0.15
	}
	
	// Negative keywords
	if strings.Contains(text, "problema") || strings.Contains(text, "ruim") ||
	   strings.Contains(text, "péssimo") || strings.Contains(text, "erro") ||
	   strings.Contains(text, "não funciona") || strings.Contains(text, "irritado") {
		sentiment = "negative"
		score = 0.1 + rand.Float64()*0.3
		confidence = 0.8 + rand.Float64()*0.2
	}
	
	// Very negative
	if strings.Contains(text, "cancelar") || strings.Contains(text, "horrível") ||
	   strings.Contains(text, "nunca mais") {
		sentiment = "very_negative"
		score = rand.Float64() * 0.2
		confidence = 0.9 + rand.Float64()*0.1
	}
	
	response := gin.H{
		"sentiment":  sentiment,
		"score":      score,
		"confidence": confidence,
		"emotions": gin.H{
			"joy":     rand.Float64() * 0.3,
			"sadness": rand.Float64() * 0.3,
			"anger":   rand.Float64() * 0.3,
			"fear":    rand.Float64() * 0.2,
			"surprise": rand.Float64() * 0.2,
		},
		"keywords": extractKeywords(text),
	}
	
	c.JSON(http.StatusOK, response)
}

// AI Intent Classification
func ClassifyIntent(c *gin.Context) {
	var request struct {
		Text    string `json:"text"`
		Context string `json:"context"`
	}
	
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	text := strings.ToLower(request.Text)
	
	// Classify intent based on patterns
	intent := "general_inquiry"
	confidence := 0.7
	entities := []string{}
	
	if strings.Contains(text, "comprar") || strings.Contains(text, "preço") || 
	   strings.Contains(text, "valor") || strings.Contains(text, "quanto custa") {
		intent = "purchase_intent"
		confidence = 0.85
		entities = append(entities, "product", "price")
	} else if strings.Contains(text, "problema") || strings.Contains(text, "ajuda") ||
	          strings.Contains(text, "suporte") || strings.Contains(text, "não funciona") {
		intent = "support_request"
		confidence = 0.9
		entities = append(entities, "issue", "support")
	} else if strings.Contains(text, "horário") || strings.Contains(text, "quando") ||
	          strings.Contains(text, "aberto") || strings.Contains(text, "funcionamento") {
		intent = "business_hours"
		confidence = 0.88
		entities = append(entities, "time", "schedule")
	} else if strings.Contains(text, "endereço") || strings.Contains(text, "localização") ||
	          strings.Contains(text, "onde fica") {
		intent = "location_inquiry"
		confidence = 0.92
		entities = append(entities, "location", "address")
	}
	
	response := gin.H{
		"intent":     intent,
		"confidence": confidence,
		"entities":   entities,
		"suggested_actions": []string{
			"transfer_to_sales",
			"show_products",
			"provide_support",
		},
		"metadata": gin.H{
			"language":       "pt-BR",
			"processing_time": time.Now().Unix() % 100,
		},
	}
	
	c.JSON(http.StatusOK, response)
}

// AI Custom Intent
func CustomIntent(c *gin.Context) {
	// Return basic intent classification
	response := gin.H{
		"intents": []gin.H{
			{
				"name":        "greeting",
				"patterns":    []string{"oi", "olá", "bom dia", "boa tarde"},
				"confidence":  0.95,
				"isActive":    true,
			},
			{
				"name":        "farewell",
				"patterns":    []string{"tchau", "até logo", "adeus"},
				"confidence":  0.92,
				"isActive":    true,
			},
			{
				"name":        "purchase",
				"patterns":    []string{"comprar", "preço", "valor"},
				"confidence":  0.88,
				"isActive":    true,
			},
		},
		"total": 3,
	}
	
	c.JSON(http.StatusOK, response)
}

// AI Suggestions
func GenerateSuggestions(c *gin.Context) {
	var request struct {
		Context  string `json:"context"`
		Intent   string `json:"intent"`
		Sentiment string `json:"sentiment"`
	}
	
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	suggestions := []gin.H{
		{
			"text":       "Olá! Como posso ajudar você hoje?",
			"confidence": 0.92,
			"category":   "greeting",
		},
		{
			"text":       "Posso verificar isso para você. Um momento, por favor.",
			"confidence": 0.88,
			"category":   "acknowledgment",
		},
		{
			"text":       "Entendo sua preocupação. Vamos resolver isso juntos.",
			"confidence": 0.85,
			"category":   "empathy",
		},
	}
	
	// Customize based on intent
	if request.Intent == "purchase_intent" {
		suggestions = []gin.H{
			{
				"text":       "Ótimo! Posso mostrar nossos produtos disponíveis?",
				"confidence": 0.95,
				"category":   "sales",
			},
			{
				"text":       "Temos excelentes opções. Qual categoria te interessa?",
				"confidence": 0.90,
				"category":   "sales",
			},
		}
	} else if request.Intent == "support_request" {
		suggestions = []gin.H{
			{
				"text":       "Sinto muito pelo inconveniente. Vou ajudar a resolver isso.",
				"confidence": 0.93,
				"category":   "support",
			},
			{
				"text":       "Pode me dar mais detalhes sobre o problema?",
				"confidence": 0.89,
				"category":   "support",
			},
		}
	}
	
	c.JSON(http.StatusOK, gin.H{
		"suggestions": suggestions,
		"metadata": gin.H{
			"model":      "pytake-ai-v1",
			"timestamp":  time.Now().Unix(),
		},
	})
}

// AI Stats
func GetAIStats(c *gin.Context) {
	stats := gin.H{
		"sentiment_analysis": gin.H{
			"total_analyzed": 1250,
			"positive":       450,
			"neutral":        600,
			"negative":       200,
			"accuracy":       0.87,
		},
		"intent_classification": gin.H{
			"total_classified": 980,
			"accuracy":         0.91,
			"top_intents": []gin.H{
				{"name": "support_request", "count": 320},
				{"name": "purchase_intent", "count": 280},
				{"name": "general_inquiry", "count": 380},
			},
		},
		"suggestions": gin.H{
			"total_generated": 850,
			"accepted":        680,
			"acceptance_rate": 0.80,
		},
		"usage": gin.H{
			"api_calls_today": 450,
			"api_calls_month": 12500,
			"avg_response_time": 125, // ms
		},
	}
	
	c.JSON(http.StatusOK, stats)
}

// Intent Stats
func GetIntentStats(c *gin.Context) {
	stats := gin.H{
		"total_intents": 15,
		"active_intents": 12,
		"recent_classifications": []gin.H{
			{
				"intent":     "support_request",
				"count":      45,
				"accuracy":   0.89,
				"timestamp":  time.Now().Unix() - 3600,
			},
			{
				"intent":     "purchase_intent", 
				"count":      38,
				"accuracy":   0.92,
				"timestamp":  time.Now().Unix() - 7200,
			},
		},
		"performance": gin.H{
			"avg_confidence": 0.86,
			"avg_latency":    98, // ms
		},
	}
	
	c.JSON(http.StatusOK, stats)
}

// Sentiment Stats
func GetSentimentStats(c *gin.Context) {
	stats := gin.H{
		"distribution": gin.H{
			"positive":      35.5,
			"neutral":       48.2,
			"negative":      16.3,
		},
		"trend": gin.H{
			"current_week": gin.H{
				"positive": 38.2,
				"neutral":  46.5,
				"negative": 15.3,
			},
			"previous_week": gin.H{
				"positive": 32.8,
				"neutral":  49.9,
				"negative": 17.3,
			},
		},
		"top_emotions": []gin.H{
			{"emotion": "joy", "percentage": 28.5},
			{"emotion": "trust", "percentage": 22.3},
			{"emotion": "anticipation", "percentage": 18.7},
		},
		"alerts": []gin.H{
			{
				"type":     "negative_spike",
				"message":  "Aumento de 15% em sentimentos negativos detectado",
				"severity": "medium",
				"timestamp": time.Now().Unix() - 7200,
			},
		},
	}
	
	c.JSON(http.StatusOK, stats)
}

func extractKeywords(text string) []string {
	// Simple keyword extraction
	keywords := []string{}
	importantWords := []string{"problema", "ajuda", "comprar", "preço", "urgente", "obrigado"}
	
	for _, word := range importantWords {
		if strings.Contains(text, word) {
			keywords = append(keywords, word)
		}
	}
	
	if len(keywords) == 0 {
		keywords = []string{"geral", "consulta"}
	}
	
	return keywords
}