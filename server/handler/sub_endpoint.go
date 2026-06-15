package handler

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"config-hub/db"
	"config-hub/model"
	"config-hub/service"

	"github.com/labstack/echo/v4"
)

// SubEndpoint GET /sub/:profileId?token=xxx
// Public endpoint: uses token-based auth instead of JWT.
// Validates the token hash, builds the mihomo config, and returns YAML.
func SubEndpoint(c echo.Context) error {
	profileID, err := strconv.ParseUint(c.Param("profileId"), 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid profile ID", "code": 400})
	}

	// Extract and validate the token from query param.
	rawToken := c.QueryParam("token")
	if rawToken == "" {
		return c.JSON(http.StatusUnauthorized, echo.Map{"error": "Token required", "code": 401})
	}

	// Hash the incoming token to match against stored TokenHash.
	hash := sha256.Sum256([]byte(rawToken))
	hashStr := hex.EncodeToString(hash[:])

	// Look up the token scoped to this profile.
	var token model.Token
	if err := db.DB.Where("token_hash = ? AND profile_id = ?", hashStr, profileID).First(&token).Error; err != nil {
		return c.JSON(http.StatusUnauthorized, echo.Map{"error": "Invalid token", "code": 401})
	}

	if token.Revoked {
		return c.JSON(http.StatusForbidden, echo.Map{"error": "Token has been revoked", "code": 403})
	}

	// Build the mihomo-compatible config.
	config, err := service.BuildConfig(uint(profileID))
	if err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": err.Error(), "code": 404})
	}

	yamlData, err := config.Render()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error(), "code": 500})
	}

	// Update LastUsedAt asynchronously — failure here should not break the response.
	now := time.Now()
	token.LastUsedAt = &now
	db.DB.Save(&token)

	c.Response().Header().Set("Content-Type", "text/plain; charset=utf-8")

	filename := sanitizeFilename(resolveFilename(uint(profileID)))
	c.Response().Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	return c.Blob(http.StatusOK, "text/plain; charset=utf-8", yamlData)
}
