package middleware

import (
	"net/http"
	"strings"

	"config-hub/db"
	"config-hub/model"
	"config-hub/service"

	"github.com/labstack/echo/v4"
)

// JWTAuth is Echo middleware: extracts Bearer token from the Authorization
// header, validates the JWT, and sets "user_id" in the echo.Context.
// Returns 401 on any failure.
func JWTAuth() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			authHeader := c.Request().Header.Get("Authorization")
			if authHeader == "" {
				return c.JSON(http.StatusUnauthorized, echo.Map{"error": "Missing Authorization header", "code": 401})
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
				return c.JSON(http.StatusUnauthorized, echo.Map{"error": "Invalid Authorization header format", "code": 401})
			}

			userID, err := service.ValidateJWT(parts[1])
			if err != nil {
				return c.JSON(http.StatusUnauthorized, echo.Map{"error": "Invalid or expired token", "code": 401})
			}

			c.Set("user_id", userID)
			return next(c)
		}
	}
}

// SubTokenAuth is Echo middleware for the /sub/:profileId endpoint.
// It extracts the token from the ?token= query parameter, looks up the
// SHA-256 hash in the Token table, validates it belongs to the requested
// profile, and sets "profile_id" in the context. Returns 401 on failure.
func SubTokenAuth() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			rawToken := c.QueryParam("token")
			if rawToken == "" {
				return c.JSON(http.StatusUnauthorized, echo.Map{"error": "Missing token parameter", "code": 401})
			}

			tokenHash := service.HashToken(rawToken)

			var token model.Token
			if err := db.DB.Where("token_hash = ? AND revoked = ?", tokenHash, false).First(&token).Error; err != nil {
				return c.JSON(http.StatusUnauthorized, echo.Map{"error": "Invalid or revoked token", "code": 401})
			}

			c.Set("profile_id", token.ProfileID)
			return next(c)
		}
	}
}
