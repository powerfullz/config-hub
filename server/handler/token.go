package handler

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"strconv"

	"config-hub/db"
	"config-hub/model"

	"github.com/labstack/echo/v4"
)

// createTokenPayload parses the JSON body for token creation.
type createTokenPayload struct {
	Name string `json:"name"`
}

// CreateToken POST /api/profiles/:id/tokens
// Generates a 32-byte random token (crypto/rand), hex-encodes to 64 chars.
// Stores SHA-256 hash of the token string in the DB.
// Returns the raw token ONCE — it cannot be retrieved again.
func CreateToken(c echo.Context) error {
	profileID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid profile ID", "code": 400})
	}

	var profile model.Profile
	if err := db.DB.First(&profile, profileID).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "Profile not found", "code": 404})
	}

	var input createTokenPayload
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid request body", "code": 400})
	}
	if input.Name == "" {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Name is required", "code": 400})
	}

	// Generate 32 random bytes, hex-encode to 64-char string.
	rawBytes := make([]byte, 32)
	if _, err := rand.Read(rawBytes); err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to generate token", "code": 500})
	}
	rawToken := hex.EncodeToString(rawBytes)

	// Store only the SHA-256 hash — the raw token is returned once.
	hash := sha256.Sum256([]byte(rawToken))

	token := model.Token{
		ProfileID: uint(profileID),
		TokenHash: hex.EncodeToString(hash[:]),
		Name:      input.Name,
	}

	if err := db.DB.Create(&token).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error(), "code": 500})
	}

	return c.JSON(http.StatusCreated, echo.Map{
		"id":         token.ID,
		"token":      rawToken,
		"name":       token.Name,
		"created_at": token.CreatedAt,
	})
}

// ListTokens GET /api/profiles/:id/tokens
// Lists all tokens for a profile. Never returns the raw token (only metadata).
func ListTokens(c echo.Context) error {
	profileID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid profile ID", "code": 400})
	}

	// Ensure profile exists before listing its tokens.
	var profile model.Profile
	if err := db.DB.First(&profile, profileID).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "Profile not found", "code": 404})
	}

	var tokens []model.Token
	if err := db.DB.Where("profile_id = ?", profileID).Find(&tokens).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error(), "code": 500})
	}

	return c.JSON(http.StatusOK, tokens)
}

// RevokeToken DELETE /api/profiles/:id/tokens/:tokenId
// Soft-deletes (sets revoked=true) a token so it can no longer be used.
func RevokeToken(c echo.Context) error {
	profileID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid profile ID", "code": 400})
	}

	tokenID, err := strconv.ParseUint(c.Param("tokenId"), 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid token ID", "code": 400})
	}

	// Look up the token scoped to this profile — prevents cross-profile revocation.
	var token model.Token
	if err := db.DB.Where("id = ? AND profile_id = ?", tokenID, profileID).First(&token).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "Token not found", "code": 404})
	}

	if token.Revoked {
		return c.JSON(http.StatusOK, echo.Map{"message": "Token already revoked"})
	}

	token.Revoked = true
	if err := db.DB.Save(&token).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error(), "code": 500})
	}

	return c.JSON(http.StatusOK, echo.Map{"message": "Token revoked"})
}
