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
	hash, err := bcrypt.GenerateFromPassword([]byte("admin123"), 12)
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
		UserID:           adminUser.ID,
		Name:             "Default",
		Description:      "默认配置档案",
		GroupType:        1,
		Landing:          false,
		IPv6:             false,
		TUN:              false,
		KeepAlive:        true,
		FakeIP:           false,
		QUIC:             true,
		RegexFilter:      "all",
		CountryThreshold: 0,
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

	slog.Info("Seed data created",
		"user", adminUser.Username,
		"profile", profile.Name,
		"groups", len(groups),
		"rules", len(rules),
	)
	return nil
}
