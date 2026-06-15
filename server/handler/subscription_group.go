package handler

import (
	"net/http"
	"strconv"

	"config-hub/db"
	"config-hub/model"

	"github.com/labstack/echo/v4"
)

// ListSubscriptionGroups GET /api/subscription-groups
func ListSubscriptionGroups(c echo.Context) error {
	userID := c.Get("user_id").(uint)
	var groups []model.SubscriptionGroup
	if err := db.DB.Where("user_id = ?", userID).Find(&groups).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error(), "code": 500})
	}
	return c.JSON(http.StatusOK, groups)
}

// CreateSubscriptionGroup POST /api/subscription-groups
func CreateSubscriptionGroup(c echo.Context) error {
	userID := c.Get("user_id").(uint)
	var input struct {
		Name string `json:"name"`
	}
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid request body", "code": 400})
	}
	if input.Name == "" {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Name is required", "code": 400})
	}

	group := model.SubscriptionGroup{
		UserID: userID,
		Name:   input.Name,
	}
	if err := db.DB.Create(&group).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error(), "code": 500})
	}
	return c.JSON(http.StatusCreated, group)
}

// GetSubscriptionGroup GET /api/subscription-groups/:id
func GetSubscriptionGroup(c echo.Context) error {
	userID := c.Get("user_id").(uint)
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid ID", "code": 400})
	}
	var group model.SubscriptionGroup
	if err := db.DB.Preload("Subscriptions").Where("id = ? AND user_id = ?", id, userID).First(&group).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "Subscription group not found", "code": 404})
	}
	return c.JSON(http.StatusOK, group)
}

// UpdateSubscriptionGroup PUT /api/subscription-groups/:id
func UpdateSubscriptionGroup(c echo.Context) error {
	userID := c.Get("user_id").(uint)
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid ID", "code": 400})
	}
	var group model.SubscriptionGroup
	if err := db.DB.Where("id = ? AND user_id = ?", id, userID).First(&group).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "Subscription group not found", "code": 404})
	}

	var input struct {
		Name *string `json:"name"`
	}
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid request body", "code": 400})
	}
	if input.Name != nil {
		group.Name = *input.Name
	}
	if err := db.DB.Save(&group).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error(), "code": 500})
	}
	return c.JSON(http.StatusOK, group)
}

// DeleteSubscriptionGroup DELETE /api/subscription-groups/:id
func DeleteSubscriptionGroup(c echo.Context) error {
	userID := c.Get("user_id").(uint)
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid ID", "code": 400})
	}
	var group model.SubscriptionGroup
	if err := db.DB.Where("id = ? AND user_id = ?", id, userID).First(&group).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "Subscription group not found", "code": 404})
	}
	// Clear associations then delete
	db.DB.Model(&group).Association("Subscriptions").Clear()
	if err := db.DB.Delete(&group).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error(), "code": 500})
	}
	return c.JSON(http.StatusOK, echo.Map{"message": "Subscription group deleted"})
}

// AddSubToGroup POST /api/subscription-groups/:id/subscriptions/:subId
func AddSubToGroup(c echo.Context) error {
	userID := c.Get("user_id").(uint)
	gid, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	sid, _ := strconv.ParseUint(c.Param("subId"), 10, 32)

	var group model.SubscriptionGroup
	if err := db.DB.Where("id = ? AND user_id = ?", gid, userID).First(&group).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "Subscription group not found", "code": 404})
	}
	var sub model.Subscription
	if err := db.DB.Where("id = ? AND user_id = ?", sid, userID).First(&sub).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "Subscription not found", "code": 404})
	}
	if err := db.DB.Model(&group).Association("Subscriptions").Append(&sub); err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error(), "code": 500})
	}
	return c.JSON(http.StatusOK, echo.Map{"message": "Subscription added to group"})
}

// RemoveSubFromGroup DELETE /api/subscription-groups/:id/subscriptions/:subId
func RemoveSubFromGroup(c echo.Context) error {
	userID := c.Get("user_id").(uint)
	gid, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	sid, _ := strconv.ParseUint(c.Param("subId"), 10, 32)

	var group model.SubscriptionGroup
	if err := db.DB.Where("id = ? AND user_id = ?", gid, userID).First(&group).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "Subscription group not found", "code": 404})
	}
	var sub model.Subscription
	if err := db.DB.Where("id = ? AND user_id = ?", sid, userID).First(&sub).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "Subscription not found", "code": 404})
	}
	if err := db.DB.Model(&group).Association("Subscriptions").Delete(&sub); err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error(), "code": 500})
	}
	return c.JSON(http.StatusOK, echo.Map{"message": "Subscription removed from group"})
}
