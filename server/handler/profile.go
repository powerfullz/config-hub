package handler

import (
	"net/http"
	"strconv"
	"strings"

	"config-hub/db"
	"config-hub/model"
	"config-hub/seed"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

// resolveFilename loads a profile and returns the export filename.
// It checks profile.FileName first, then falls back to profile.Name + ".yaml",
// and finally to "config.yaml" if the profile cannot be loaded.
func resolveFilename(profileID uint) string {
	defaultName := "config.yaml"
	var profile model.Profile
	if err := db.DB.First(&profile, profileID).Error; err != nil {
		return defaultName
	}
	if profile.FileName != "" {
		return profile.FileName
	}
	if profile.Name != "" {
		return profile.Name + ".yaml"
	}
	return defaultName
}

// sanitizeFilename removes characters that could break the Content-Disposition header.
func sanitizeFilename(name string) string {
	var b strings.Builder
	for _, r := range name {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_' || r == '-' || r == '.' || r == ' ' || (r >= 0x4e00 && r <= 0x9fff) {
			b.WriteRune(r)
		}
	}
	return b.String()
}

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
	Name      string `json:"name"`
	GroupType *int   `json:"group_type"`
	Landing   *bool  `json:"landing"`
	IPv6      *bool  `json:"ipv6"`
	TUN       *bool  `json:"tun"`
	Full      *bool  `json:"full"`
	KeepAlive *bool  `json:"keep_alive"`
	FakeIP    *bool  `json:"fake_ip"`
	QUIC      *bool  `json:"quic"`
	Regex     *bool   `json:"regex"`
	Threshold *int    `json:"threshold"`
	FileName  *string `json:"file_name"`
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

	// Build profile with explicit defaults, then override with any provided values.
	profile := model.Profile{
		UserID: c.Get("user_id").(uint),
		Name:   input.Name,
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
	if input.Full != nil {
		profile.Full = *input.Full
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
	if input.Regex != nil {
		profile.Regex = *input.Regex
	}
	if input.Threshold != nil {
		profile.Threshold = *input.Threshold
	}
	if input.FileName != nil {
		profile.FileName = *input.FileName
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
		Preload("SubscriptionGroups").
		First(&profile, id).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "Profile not found", "code": 404})
	}

	return c.JSON(http.StatusOK, profile)
}

// updateProfilePayload is a parse-once struct for UpdateProfile to distinguish
// omitted fields from zero values (Parse Don't Validate).
type updateProfilePayload struct {
	Name      *string `json:"name"`
	GroupType *int    `json:"group_type"`
	Landing   *bool   `json:"landing"`
	IPv6      *bool   `json:"ipv6"`
	TUN       *bool   `json:"tun"`
	Full      *bool   `json:"full"`
	KeepAlive *bool   `json:"keep_alive"`
	FakeIP    *bool   `json:"fake_ip"`
	QUIC      *bool   `json:"quic"`
	Regex     *bool   `json:"regex"`
	Threshold *int    `json:"threshold"`
	FileName  *string `json:"file_name"`
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
	if input.Full != nil {
		profile.Full = *input.Full
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
	if input.Regex != nil {
		profile.Regex = *input.Regex
	}
	if input.Threshold != nil {
		profile.Threshold = *input.Threshold
	}
	if input.FileName != nil {
		profile.FileName = *input.FileName
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
	if err := tx.Model(&profile).Association("SubscriptionGroups").Clear(); err != nil {
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

// AddSubscriptionGroupToProfile POST /api/profiles/:id/subscription-groups
// Adds a subscription group to the profile's many2many relation.
func AddSubscriptionGroupToProfile(c echo.Context) error {
	userID := c.Get("user_id").(uint)
	profileID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid profile ID", "code": 400})
	}

	var profile model.Profile
	if err := db.DB.Where("id = ? AND user_id = ?", profileID, userID).First(&profile).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "Profile not found", "code": 404})
	}

	var input struct {
		SubscriptionGroupID uint `json:"subscription_group_id"`
	}
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid request body", "code": 400})
	}

	var group model.SubscriptionGroup
	if err := db.DB.Where("id = ? AND user_id = ?", input.SubscriptionGroupID, userID).First(&group).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "Subscription group not found", "code": 404})
	}

	if err := db.DB.Model(&profile).Association("SubscriptionGroups").Append(&group); err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error(), "code": 500})
	}
	return c.JSON(http.StatusOK, echo.Map{"message": "Subscription group added to profile"})
}

// RemoveSubscriptionGroupFromProfile DELETE /api/profiles/:id/subscription-groups/:groupId
// Removes a subscription group from the profile's many2many relation.
func RemoveSubscriptionGroupFromProfile(c echo.Context) error {
	userID := c.Get("user_id").(uint)
	profileID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid profile ID", "code": 400})
	}
	groupID, err := strconv.ParseUint(c.Param("groupId"), 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid group ID", "code": 400})
	}

	var profile model.Profile
	if err := db.DB.Where("id = ? AND user_id = ?", profileID, userID).First(&profile).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "Profile not found", "code": 404})
	}

	var group model.SubscriptionGroup
	if err := db.DB.Where("id = ? AND user_id = ?", groupID, userID).First(&group).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "Subscription group not found", "code": 404})
	}

	if err := db.DB.Model(&profile).Association("SubscriptionGroups").Delete(&group); err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error(), "code": 500})
	}
	return c.JSON(http.StatusOK, echo.Map{"message": "Subscription group removed from profile"})
}

// ListProfileSubscriptionGroups GET /api/profiles/:id/subscription-groups
// Returns all subscription groups associated with the profile.
func ListProfileSubscriptionGroups(c echo.Context) error {
	userID := c.Get("user_id").(uint)
	profileID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid profile ID", "code": 400})
	}

	var profile model.Profile
	if err := db.DB.Preload("SubscriptionGroups").Where("id = ? AND user_id = ?", profileID, userID).First(&profile).Error; err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "Profile not found", "code": 404})
	}
	return c.JSON(http.StatusOK, profile.SubscriptionGroups)
}
