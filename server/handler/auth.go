package handler

import (
	"net/http"
	"os"

	"config-hub/db"
	"config-hub/model"
	"config-hub/service"

	"github.com/labstack/echo/v4"
	"golang.org/x/crypto/bcrypt"
)

// loginPayload parses the JSON body for login requests.
type loginPayload struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// Login POST /api/auth/login
// Validates credentials and returns a JWT token on success.
func Login(c echo.Context) error {
	var input loginPayload
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid request body", "code": 400})
	}
	if input.Username == "" || input.Password == "" {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Username and password are required", "code": 400})
	}

	var user model.User
	if err := db.DB.Where("username = ?", input.Username).First(&user).Error; err != nil {
		return c.JSON(http.StatusUnauthorized, echo.Map{"error": "Invalid credentials", "code": 401})
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		return c.JSON(http.StatusUnauthorized, echo.Map{"error": "Invalid credentials", "code": 401})
	}

	token, err := service.GenerateJWT(user.ID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to generate token", "code": 500})
	}

	return c.JSON(http.StatusOK, echo.Map{"token": token})
}

// registerPayload parses the JSON body for registration requests.
type registerPayload struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// Register POST /api/auth/register
// Creates a new user account. Can be disabled via ENABLE_REGISTRATION=false
// environment variable.
func Register(c echo.Context) error {
	if os.Getenv("ENABLE_REGISTRATION") == "false" {
		return c.JSON(http.StatusForbidden, echo.Map{"error": "Registration is disabled", "code": 403})
	}

	var input registerPayload
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid request body", "code": 400})
	}
	if input.Username == "" || input.Password == "" {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Username and password are required", "code": 400})
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), 12)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to hash password", "code": 500})
	}

	user := model.User{
		Username:     input.Username,
		PasswordHash: string(hash),
	}

	if err := db.DB.Create(&user).Error; err != nil {
		return c.JSON(http.StatusConflict, echo.Map{"error": "Username already exists", "code": 409})
	}

	return c.JSON(http.StatusCreated, echo.Map{"id": user.ID, "username": user.Username})
}

// Me GET /api/auth/me
// Returns the current authenticated user's information.
// user_id must be set in the context by JWT middleware.
func Me(c echo.Context) error {
	rawID, ok := c.Get("user_id").(uint)
	if !ok {
		return c.JSON(http.StatusUnauthorized, echo.Map{"error": "Not authenticated", "code": 401})
	}

	var user model.User
	if err := db.DB.First(&user, rawID).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "User not found", "code": 404})
	}

	return c.JSON(http.StatusOK, user)
}

// changePasswordPayload parses the JSON body for password change requests.
type changePasswordPayload struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

// ChangePassword PUT /api/auth/password
// Changes the authenticated user's password. Requires current password verification.
func ChangePassword(c echo.Context) error {
	rawID, ok := c.Get("user_id").(uint)
	if !ok {
		return c.JSON(http.StatusUnauthorized, echo.Map{"error": "Not authenticated", "code": 401})
	}

	var input changePasswordPayload
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid request body", "code": 400})
	}
	if input.CurrentPassword == "" || input.NewPassword == "" {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Current password and new password are required", "code": 400})
	}
	if len(input.NewPassword) < 6 {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "New password must be at least 6 characters", "code": 400})
	}

	var user model.User
	if err := db.DB.First(&user, rawID).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "User not found", "code": 404})
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.CurrentPassword)); err != nil {
		return c.JSON(http.StatusUnauthorized, echo.Map{"error": "Current password is incorrect", "code": 401})
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.NewPassword), 12)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to hash password", "code": 500})
	}

	user.PasswordHash = string(hash)
	if err := db.DB.Save(&user).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to update password", "code": 500})
	}

	return c.JSON(http.StatusOK, echo.Map{"message": "Password changed successfully"})
}

// updateAccountPayload parses the JSON body for account update requests.
type updateAccountPayload struct {
	Username string `json:"username"`
}

// UpdateAccount PUT /api/auth/account
// Updates the authenticated user's account information (e.g., username).
func UpdateAccount(c echo.Context) error {
	rawID, ok := c.Get("user_id").(uint)
	if !ok {
		return c.JSON(http.StatusUnauthorized, echo.Map{"error": "Not authenticated", "code": 401})
	}

	var input updateAccountPayload
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid request body", "code": 400})
	}
	if input.Username == "" {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Username is required", "code": 400})
	}

	var user model.User
	if err := db.DB.First(&user, rawID).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "User not found", "code": 404})
	}

	// Check if username is already taken by another user
	var existing model.User
	if err := db.DB.Where("username = ? AND id != ?", input.Username, rawID).First(&existing).Error; err == nil {
		return c.JSON(http.StatusConflict, echo.Map{"error": "Username already exists", "code": 409})
	}

	user.Username = input.Username
	if err := db.DB.Save(&user).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to update account", "code": 500})
	}

	return c.JSON(http.StatusOK, user)
}
