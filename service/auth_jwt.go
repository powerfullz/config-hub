package service

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var jwtSecret = []byte("change-me-in-production") // TODO: env var

// JWTClaims carries the authenticated user's identity inside the token.
type JWTClaims struct {
	UserID uint `json:"user_id"`
	jwt.RegisteredClaims
}

// ErrInvalidToken is returned when a JWT cannot be parsed or validated.
var ErrInvalidToken = errors.New("invalid or expired token")

// GenerateJWT creates a signed JWT for the given user ID, expires in 24h.
func GenerateJWT(userID uint) (string, error) {
	claims := JWTClaims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// ValidateJWT parses and validates a JWT string, returns the UserID.
func ValidateJWT(tokenString string) (uint, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return jwtSecret, nil
	})
	if err != nil {
		return 0, ErrInvalidToken
	}

	claims, ok := token.Claims.(*JWTClaims)
	if !ok || !token.Valid {
		return 0, ErrInvalidToken
	}

	return claims.UserID, nil
}
