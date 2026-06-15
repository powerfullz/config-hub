package handler

import (
	"net/http"
	"strconv"

	"config-hub/db"
	"config-hub/model"
	"config-hub/seed"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

// ListProfiles GET /api/profiles
// Returns all profiles for the authenticated user.
func ListProfiles(c echo.Context) error {
	userID := c.Get("user_id").(uint)

	var profiles []model.Profile
	if err := db.DB.Where("user_id = ?", userID).Find(&profiles).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error(), "code": 500})
	}
	return c.JSON(http.StatusOK, profiles)
}

// createProfilePayload parses the JSON body for profile creation.
// Pointer fields distinguish "omitted" from explicit zero values,
// allowing safe application of defaults (Parse Don't Validate).
type createProfilePayload struct {
	Name             string  `json:"name"`
	Description      *string `json:"description"`
	GroupType        *int    `json:"group_type"`
	Landing          *bool   `json:"landing"`
	IPv6             *bool   `json:"ipv6"`
	TUN              *bool   `json:"tun"`
	KeepAlive        *bool   `json:"keep_alive"`
	FakeIP           *bool   `json:"fake_ip"`
	QUIC             *bool   `json:"quic"`
	RegexFilter      *string `json:"regex_filter"`
	CountryThreshold *int    `json:"country_threshold"`
}

// CreateProfile POST /api/profiles
// Creates a new profile and seeds default proxy groups and rules.
func CreateProfile(c echo.Context) error {
	var input createProfilePayload
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid request body", "code": 400})
	}
	if input.Name == "" {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Name is required", "code": 400})
	}

	// Build profile with explicit defaults for the 4 documented fields,
	// then override with any provided values.
	profile := model.Profile{
		UserID:      c.Get("user_id").(uint),
		Name:        input.Name,
		GroupType:   1,
		KeepAlive:   true,
		QUIC:        true,
		RegexFilter: "all",
	}

	if input.Description != nil {
		profile.Description = *input.Description
	}
	if input.GroupType != nil {
		profile.GroupType = *input.GroupType
	}
	if input.KeepAlive != nil {
		profile.KeepAlive = *input.KeepAlive
	}
	if input.QUIC != nil {
		profile.QUIC = *input.QUIC
	}
	if input.RegexFilter != nil {
		profile.RegexFilter = *input.RegexFilter
	}
	if input.Landing != nil {
		profile.Landing = *input.Landing
	}
	if input.IPv6 != nil {
		profile.IPv6 = *input.IPv6
	}
	if input.TUN != nil {
		profile.TUN = *input.TUN
	}
	if input.FakeIP != nil {
		profile.FakeIP = *input.FakeIP
	}
	if input.CountryThreshold != nil {
		profile.CountryThreshold = *input.CountryThreshold
	}

	tx := db.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	if err := tx.Create(&profile).Error; err != nil {
		tx.Rollback()
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error(), "code": 500})
	}

	groups := seed.DefaultProxyGroups(profile.ID)
	if err := tx.Create(&groups).Error; err != nil {
		tx.Rollback()
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error(), "code": 500})
	}

	rules := seed.DefaultRules(profile.ID)
	if err := tx.Create(&rules).Error; err != nil {
		tx.Rollback()
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error(), "code": 500})
	}

	if err := tx.Commit().Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error(), "code": 500})
	}

	return c.JSON(http.StatusCreated, profile)
}

// GetProfile GET /api/profiles/:id
// Returns profile with preloaded ProxyGroups and Rules (ordered by sort_order).
func GetProfile(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid ID", "code": 400})
	}

	var profile model.Profile
	if err := db.DB.
		Preload("ProxyGroups", func(tx *gorm.DB) *gorm.DB { return tx.Order("sort_order ASC") }).
		Preload("Rules", func(tx *gorm.DB) *gorm.DB { return tx.Order("sort_order ASC") }).
		First(&profile, id).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "Profile not found", "code": 404})
	}

	return c.JSON(http.StatusOK, profile)
}

// updateProfilePayload is a parse-once struct for UpdateProfile to distinguish
// omitted fields from zero values (Parse Don't Validate).
type updateProfilePayload struct {
	Name             *string `json:"name"`
	Description      *string `json:"description"`
	GroupType        *int    `json:"group_type"`
	Landing          *bool   `json:"landing"`
	IPv6             *bool   `json:"ipv6"`
	TUN              *bool   `json:"tun"`
	KeepAlive        *bool   `json:"keep_alive"`
	FakeIP           *bool   `json:"fake_ip"`
	QUIC             *bool   `json:"quic"`
	RegexFilter      *string `json:"regex_filter"`
	CountryThreshold *int    `json:"country_threshold"`
}

// UpdateProfile PUT /api/profiles/:id
// Partial update of profile settings.
func UpdateProfile(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid ID", "code": 400})
	}

	var profile model.Profile
	if err := db.DB.First(&profile, id).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "Profile not found", "code": 404})
	}

	var input updateProfilePayload
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid request body", "code": 400})
	}

	if input.Name != nil {
		profile.Name = *input.Name
	}
	if input.Description != nil {
		profile.Description = *input.Description
	}
	if input.GroupType != nil {
		profile.GroupType = *input.GroupType
	}
	if input.Landing != nil {
		profile.Landing = *input.Landing
	}
	if input.IPv6 != nil {
		profile.IPv6 = *input.IPv6
	}
	if input.TUN != nil {
		profile.TUN = *input.TUN
	}
	if input.KeepAlive != nil {
		profile.KeepAlive = *input.KeepAlive
	}
	if input.FakeIP != nil {
		profile.FakeIP = *input.FakeIP
	}
	if input.QUIC != nil {
		profile.QUIC = *input.QUIC
	}
	if input.RegexFilter != nil {
		profile.RegexFilter = *input.RegexFilter
	}
	if input.CountryThreshold != nil {
		profile.CountryThreshold = *input.CountryThreshold
	}

	if err := db.DB.Save(&profile).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error(), "code": 500})
	}

	return c.JSON(http.StatusOK, profile)
}

// DeleteProfile DELETE /api/profiles/:id
// Cascading delete of profile + its proxy groups + rules + tokens.
func DeleteProfile(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid ID", "code": 400})
	}

	var profile model.Profile
	if err := db.DB.First(&profile, id).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "Profile not found", "code": 404})
	}

	tx := db.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Clear many-to-many associations before deleting related records.
	if err := tx.Model(&profile).Association("Subscriptions").Clear(); err != nil {
		tx.Rollback()
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error(), "code": 500})
	}

	if err := tx.Where("profile_id = ?", id).Delete(&model.Token{}).Error; err != nil {
		tx.Rollback()
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error(), "code": 500})
	}
	if err := tx.Where("profile_id = ?", id).Delete(&model.RuleEntry{}).Error; err != nil {
		tx.Rollback()
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error(), "code": 500})
	}
	if err := tx.Where("profile_id = ?", id).Delete(&model.ProxyGroup{}).Error; err != nil {
		tx.Rollback()
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error(), "code": 500})
	}
	if err := tx.Delete(&profile).Error; err != nil {
		tx.Rollback()
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error(), "code": 500})
	}

	if err := tx.Commit().Error; err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error(), "code": 500})
	}

	return c.JSON(http.StatusOK, echo.Map{"message": "Profile deleted"})
}

// addSubPayload parses the subscription_id from the request body
// for AddSubscriptionToProfile.
type addSubPayload struct {
	SubscriptionID uint `json:"subscription_id"`
}

// AddSubscriptionToProfile POST /api/profiles/:id/subscriptions
// Adds a subscription to the profile's many2many relation.
func AddSubscriptionToProfile(c echo.Context) error {
	profileID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid profile ID", "code": 400})
	}

	var profile model.Profile
	if err := db.DB.First(&profile, profileID).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "Profile not found", "code": 404})
	}

	var input addSubPayload
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid request body", "code": 400})
	}

	var sub model.Subscription
	if err := db.DB.First(&sub, input.SubscriptionID).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "Subscription not found", "code": 404})
	}

	if err := db.DB.Model(&profile).Association("Subscriptions").Append(&sub); err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error(), "code": 500})
	}

	return c.JSON(http.StatusOK, echo.Map{"message": "Subscription added to profile"})
}

// RemoveSubscriptionFromProfile DELETE /api/profiles/:id/subscriptions/:subId
// Removes a subscription from the profile's many2many relation.
func RemoveSubscriptionFromProfile(c echo.Context) error {
	profileID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid profile ID", "code": 400})
	}

	var profile model.Profile
	if err := db.DB.First(&profile, profileID).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "Profile not found", "code": 404})
	}

	subID, err := strconv.ParseUint(c.Param("subId"), 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid subscription ID", "code": 400})
	}

	var sub model.Subscription
	if err := db.DB.First(&sub, subID).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "Subscription not found", "code": 404})
	}

	if err := db.DB.Model(&profile).Association("Subscriptions").Delete(&sub); err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error(), "code": 500})
	}

	return c.JSON(http.StatusOK, echo.Map{"message": "Subscription removed from profile"})
}
