package service

import (
	"crypto/sha256"
	"encoding/hex"
)

// HashToken returns the SHA-256 hex digest of a raw token string.
// Used to look up stored token hashes without exposing raw tokens.
func HashToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}
