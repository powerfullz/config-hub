package seed

import (
	"log/slog"

	"config-hub/db"
	"config-hub/model"

	"golang.org/x/crypto/bcrypt"
)

// Run seeds the database with default data: an admin user, a default profile,
// proxy groups, and rules. The operation is idempotent — if any user already
// exists, seeding is skipped.
func Run() error {
	tx := db.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	var count int64
	if err := tx.Model(&model.User{}).Count(&count).Error; err != nil {
		tx.Rollback()
		return err
	}
	if count > 0 {
		slog.Info("Seed data already exists, skipping")
		tx.Rollback()
		return nil
	}

	// Create admin user.
	password := "admin123"
	hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		tx.Rollback()
		return err
	}
	adminUser := model.User{
		Username:     "admin",
		PasswordHash: string(hash),
	}
	if err := tx.Create(&adminUser).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Create default profile.
	profile := model.Profile{
		UserID:    adminUser.ID,
		Name:      "Default",
		GroupType: 0,
	}
	if err := tx.Create(&profile).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Create proxy groups.
	groups := DefaultProxyGroups(profile.ID)
	if err := tx.Create(&groups).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Create rules.
	rules := DefaultRules(profile.ID)
	if err := tx.Create(&rules).Error; err != nil {
		tx.Rollback()
		return err
	}

	if err := tx.Commit().Error; err != nil {
		return err
	}

	slog.Info("=== Server Initialised, Credentials: ===")
	slog.Info("=== " + "account: " + adminUser.Username + "  password: " + password + " ===")
	slog.Info("Seed data created",
		"user", adminUser.Username,
		"password", password,
		"profile", profile.Name,
		"groups", len(groups),
		"rules", len(rules),
	)
	return nil
}

// BackfillGroupIcons updates existing ProxyGroup records that have empty
// icon fields, filling them from GroupIcons where a name match exists.
// This is idempotent — safe to run on every startup.
func BackfillGroupIcons() {
	// Build a map of icon URL → list of group names that should have that icon.
	iconGroups := make(map[string][]string)
	for name, icon := range GroupIcons {
		if icon != "" {
			iconGroups[icon] = append(iconGroups[icon], name)
		}
	}

	// For each unique icon URL, batch-update all groups with that name and empty icon.
	for icon, names := range iconGroups {
		db.DB.Where("icon = '' OR icon IS NULL").Where("name IN ?", names).Model(&model.ProxyGroup{}).Update("icon", icon)
	}
}
