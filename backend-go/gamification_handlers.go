package main

import (
	"database/sql"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// GamificationProfile representa o perfil de gamificação de um agente
type GamificationProfile struct {
	AgentID       string                `json:"agentId"`
	TotalScore    int                   `json:"totalScore"`
	Level         int                   `json:"level"`
	League        string                `json:"league"`
	Rank          int                   `json:"rank"`
	XpProgress    XpProgress           `json:"xpProgress"`
	ScoreBreakdown ScoreBreakdown      `json:"scoreBreakdown"`
	Achievements  []Achievement        `json:"achievements"`
	RecentAchievements []Achievement   `json:"recentAchievements"`
	Badges        []string             `json:"badges"`
	Streaks       Streaks              `json:"streaks"`
	SeasonStats   SeasonStats          `json:"seasonStats"`
}

type XpProgress struct {
	Current  int     `json:"current"`
	Needed   int     `json:"needed"`
	Progress float64 `json:"progress"`
}

type ScoreBreakdown struct {
	TotalScore     int                    `json:"totalScore"`
	CategoryScores map[string]float64     `json:"categoryScores"`
	Bonuses        map[string]float64     `json:"bonuses"`
	Multipliers    map[string]float64     `json:"multipliers"`
}

type Achievement struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Category    string    `json:"category"`
	Icon        string    `json:"icon"`
	Rarity      string    `json:"rarity"`
	Points      int       `json:"points"`
	Secret      bool      `json:"secret,omitempty"`
	UnlockedAt  *time.Time `json:"unlockedAt,omitempty"`
	Progress    float64   `json:"progress,omitempty"`
}

type Streaks struct {
	Current     int `json:"current"`
	Longest     int `json:"longest"`
	PerfectDays int `json:"perfectDays"`
}

type SeasonStats struct {
	Position         int `json:"position"`
	TotalPlayers     int `json:"totalPlayers"`
	Percentile       int `json:"percentile"`
	PointsThisSeason int `json:"pointsThisSeason"`
}

type LeaderboardEntry struct {
	AgentID        string  `json:"agentId"`
	Name           string  `json:"name"`
	Avatar         string  `json:"avatar,omitempty"`
	TotalScore     int     `json:"totalScore"`
	Level          int     `json:"level"`
	League         string  `json:"league"`
	Rank           int     `json:"rank"`
	Change         int     `json:"change"`
	TrendDirection string  `json:"trendDirection"`
	TodayPoints    int     `json:"todayPoints"`
	StreakDays     int     `json:"streakDays"`
}

type GameStats struct {
	TotalAgents          int `json:"totalAgents"`
	AverageScore         int `json:"averageScore"`
	TopScore             int `json:"topScore"`
	AverageLevel         int `json:"averageLevel"`
	AchievementsUnlocked int `json:"achievementsUnlocked"`
	TotalAchievements    int `json:"totalAchievements"`
}

// GetGamificationProfile retorna o perfil completo de gamificação de um agente
func GetGamificationProfile(c *gin.Context) {
	db := getDB()
	tenantID := getTenantID(c)
	agentID := c.Param("id")

	// Verificar se o agente existe e pertence ao tenant
	var exists bool
	checkQuery := `SELECT EXISTS(SELECT 1 FROM agents WHERE id = $1 AND tenant_id = $2)`
	err := db.QueryRow(checkQuery, agentID, tenantID).Scan(&exists)
	if err != nil || !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Agent not found"})
		return
	}

	// Gerar dados mock de gamificação
	profile := generateMockGamificationProfile(db, tenantID, agentID)
	
	c.JSON(http.StatusOK, profile)
}

// GetLeaderboard retorna o ranking de agentes
func GetLeaderboard(c *gin.Context) {
	db := getDB()
	tenantID := getTenantID(c)
	
	limitParam := c.Query("limit")
	limit := 50
	if limitParam != "" {
		if parsedLimit, err := strconv.Atoi(limitParam); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	// Gerar leaderboard mock
	leaderboard := generateMockLeaderboard(db, tenantID, limit)
	
	c.JSON(http.StatusOK, leaderboard)
}

// GetGameStats retorna estatísticas gerais do jogo
func GetGameStats(c *gin.Context) {
	db := getDB()
	tenantID := getTenantID(c)

	// Gerar estatísticas mock
	stats := generateMockGameStats(db, tenantID)
	
	c.JSON(http.StatusOK, stats)
}

// AwardAchievement concede um achievement a um agente
func AwardAchievement(c *gin.Context) {
	db := getDB()
	tenantID := getTenantID(c)

	var req struct {
		AgentID       string `json:"agentId" binding:"required"`
		AchievementID string `json:"achievementId" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verificar se o agente existe
	var exists bool
	checkQuery := `SELECT EXISTS(SELECT 1 FROM agents WHERE id = $1 AND tenant_id = $2)`
	err := db.QueryRow(checkQuery, req.AgentID, tenantID).Scan(&exists)
	if err != nil || !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Agent not found"})
		return
	}

	// Em uma implementação real, registraria o achievement no banco
	// Por enquanto, apenas simulamos o sucesso
	
	c.JSON(http.StatusOK, gin.H{
		"message": "Achievement awarded successfully",
		"agentId": req.AgentID,
		"achievementId": req.AchievementID,
		"awardedAt": time.Now(),
	})
}

// UpdateAgentScore atualiza a pontuação de um agente
func UpdateAgentScore(c *gin.Context) {
	db := getDB()
	tenantID := getTenantID(c)
	agentID := c.Param("id")

	var req struct {
		Points int    `json:"points" binding:"required"`
		Reason string `json:"reason"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verificar se o agente existe
	var exists bool
	checkQuery := `SELECT EXISTS(SELECT 1 FROM agents WHERE id = $1 AND tenant_id = $2)`
	err := db.QueryRow(checkQuery, agentID, tenantID).Scan(&exists)
	if err != nil || !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Agent not found"})
		return
	}

	// Em uma implementação real, atualizaria no banco
	// Por enquanto, apenas simulamos o sucesso
	
	c.JSON(http.StatusOK, gin.H{
		"message": "Score updated successfully",
		"agentId": agentID,
		"pointsAdded": req.Points,
		"reason": req.Reason,
		"updatedAt": time.Now(),
	})
}

// Funções auxiliares para gerar dados mock

func generateMockGamificationProfile(db *sql.DB, tenantID, agentID string) GamificationProfile {
	// Simular pontuações e métricas baseadas no ID do agente
	baseScore := 8000 + (len(agentID) * 123) % 5000 // Gerar score pseudo-aleatório baseado no ID
	level := calculateLevel(baseScore)
	league := calculateLeague(level)
	
	// Simular progresso XP
	xpCurrent := baseScore % 1000
	xpNeeded := level * level * 100
	xpProgress := float64(xpCurrent) / float64(xpNeeded) * 100

	// Simular achievements
	achievements := generateMockAchievements(agentID)
	recentAchievements := []Achievement{}
	if len(achievements) > 0 {
		// Pegar alguns achievements "recentes"
		for i, achievement := range achievements {
			if i < 3 && achievement.UnlockedAt != nil {
				recentAchievements = append(recentAchievements, achievement)
			}
		}
	}

	return GamificationProfile{
		AgentID:    agentID,
		TotalScore: baseScore,
		Level:      level,
		League:     league,
		Rank:       (len(agentID) % 20) + 1, // Simular rank entre 1-20
		XpProgress: XpProgress{
			Current:  xpCurrent,
			Needed:   xpNeeded,
			Progress: xpProgress,
		},
		ScoreBreakdown: ScoreBreakdown{
			TotalScore: baseScore,
			CategoryScores: map[string]float64{
				"conversations": float64(baseScore) * 0.20,
				"satisfaction":  float64(baseScore) * 0.25,
				"responseTime":  float64(baseScore) * 0.15,
				"resolution":    float64(baseScore) * 0.15,
				"slaCompliance": float64(baseScore) * 0.10,
				"quality":       float64(baseScore) * 0.10,
				"efficiency":    float64(baseScore) * 0.03,
				"consistency":   float64(baseScore) * 0.02,
			},
			Bonuses: map[string]float64{
				"streak":      150.0,
				"perfectDay":  300.0,
				"overtime":    100.0,
				"achievement": 250.0,
			},
			Multipliers: map[string]float64{
				"peak":        1.1,
				"consistency": 1.15,
				"teamwork":    1.0,
			},
		},
		Achievements:       achievements,
		RecentAchievements: recentAchievements,
		Badges:            []string{"speed_demon", "customer_favorite", "reliable_agent"},
		Streaks: Streaks{
			Current:     (len(agentID) % 30) + 1,
			Longest:     (len(agentID) % 50) + 10,
			PerfectDays: (len(agentID) % 15) + 2,
		},
		SeasonStats: SeasonStats{
			Position:         (len(agentID) % 20) + 1,
			TotalPlayers:     45,
			Percentile:       85 - (len(agentID)%30),
			PointsThisSeason: baseScore,
		},
	}
}

func generateMockLeaderboard(db *sql.DB, tenantID string, limit int) []LeaderboardEntry {
	mockAgents := []struct {
		ID   string
		Name string
	}{
		{"1", "Maria Silva"},
		{"2", "João Santos"},
		{"3", "Ana Costa"},
		{"4", "Pedro Oliveira"},
		{"5", "Carlos Lima"},
		{"6", "Fernanda Souza"},
		{"7", "Roberto Alves"},
		{"8", "Juliana Pereira"},
		{"9", "Diego Ferreira"},
		{"10", "Larissa Mendes"},
		{"11", "Ricardo Santos"},
		{"12", "Camila Rodrigues"},
		{"13", "Felipe Costa"},
		{"14", "Gabriela Lima"},
		{"15", "André Sousa"},
	}

	leaderboard := make([]LeaderboardEntry, 0, limit)
	
	for i, agent := range mockAgents {
		if i >= limit {
			break
		}
		
		baseScore := 15000 - (i * 800) + (len(agent.ID) * 100)
		level := calculateLevel(baseScore)
		league := calculateLeague(level)
		
		leaderboard = append(leaderboard, LeaderboardEntry{
			AgentID:        agent.ID,
			Name:           agent.Name,
			Avatar:         "",
			TotalScore:     baseScore,
			Level:          level,
			League:         league,
			Rank:           i + 1,
			Change:         (i % 5) - 2, // -2 a +2
			TrendDirection: getTrendDirection(i),
			TodayPoints:    200 + (i%8)*100,
			StreakDays:     (len(agent.ID) % 30) + 1,
		})
	}

	return leaderboard
}

func generateMockGameStats(db *sql.DB, tenantID string) GameStats {
	return GameStats{
		TotalAgents:          15,
		AverageScore:         8500,
		TopScore:             15000,
		AverageLevel:         25,
		AchievementsUnlocked: 142,
		TotalAchievements:    30, // Total de achievements disponíveis
	}
}

func generateMockAchievements(agentID string) []Achievement {
	allAchievements := []Achievement{
		{ID: "lightning_response", Title: "Resposta Relâmpago", Description: "Responda em menos de 15 segundos", Category: "speed", Icon: "⚡", Rarity: "common", Points: 100, Progress: 85},
		{ID: "speed_demon", Title: "Demônio da Velocidade", Description: "Mantenha tempo médio abaixo de 30s por uma semana", Category: "speed", Icon: "🏃‍♂️", Rarity: "rare", Points: 300, Progress: 100},
		{ID: "customer_favorite", Title: "Queridinho dos Clientes", Description: "Mantenha satisfação acima de 4.5", Category: "satisfaction", Icon: "😍", Rarity: "common", Points: 150, Progress: 92},
		{ID: "perfect_service", Title: "Atendimento Perfeito", Description: "Alcance satisfação de 5.0", Category: "satisfaction", Icon: "🌟", Rarity: "rare", Points: 250, Progress: 78},
		{ID: "busy_bee", Title: "Abelha Ocupada", Description: "Atenda 25 conversas em um dia", Category: "volume", Icon: "🐝", Rarity: "common", Points: 100, Progress: 100},
		{ID: "reliable_agent", Title: "Agente Confiável", Description: "Mantenha performance consistente por 7 dias", Category: "consistency", Icon: "🛡️", Rarity: "common", Points: 200, Progress: 100},
		{ID: "problem_solver", Title: "Solucionador", Description: "Mantenha taxa de resolução acima de 95%", Category: "quality", Icon: "🔧", Rarity: "common", Points: 150, Progress: 65},
		{ID: "first_day", Title: "Primeiro Dia", Description: "Complete seu primeiro dia de trabalho", Category: "special", Icon: "🎉", Rarity: "common", Points: 50, Progress: 100},
		{ID: "iron_will", Title: "Vontade de Ferro", Description: "Mantenha streak de 30 dias", Category: "consistency", Icon: "🔥", Rarity: "epic", Points: 750, Progress: 43},
		{ID: "unstoppable", Title: "Imparável", Description: "Achievement secreto", Category: "consistency", Icon: "💎", Rarity: "legendary", Points: 2000, Secret: true, Progress: 12},
	}

	// Simular alguns achievements desbloqueados baseado no agentID
	agentHash := len(agentID)
	unlockedTime := time.Now().AddDate(0, 0, -agentHash%30) // Alguns dias atrás
	
	for i := range allAchievements {
		// Simular se está desbloqueado baseado no hash do agentID
		if (agentHash+i)%3 == 0 && allAchievements[i].Progress >= 100 {
			allAchievements[i].UnlockedAt = &unlockedTime
			allAchievements[i].Progress = 100
		}
	}

	return allAchievements
}

func calculateLevel(totalScore int) int {
	// Fórmula similar ao frontend: sqrt(score/1000) + 1
	level := 1
	requiredXP := 1000
	currentXP := totalScore
	
	for currentXP >= requiredXP {
		currentXP -= requiredXP
		level++
		requiredXP = level * level * 100 // Progressão exponencial
	}
	
	return level
}

func calculateLeague(level int) string {
	if level >= 50 {
		return "Diamante"
	} else if level >= 40 {
		return "Platina"
	} else if level >= 30 {
		return "Ouro"
	} else if level >= 20 {
		return "Prata"
	} else if level >= 10 {
		return "Bronze"
	}
	return "Iniciante"
}

func getTrendDirection(rank int) string {
	switch rank % 3 {
	case 0:
		return "up"
	case 1:
		return "down"
	default:
		return "stable"
	}
}