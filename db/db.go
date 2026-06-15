package db

import (
	"log/slog"

	"config-hub/model"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// DB is the package-level database handle, initialized by Init.
var DB *gorm.DB

// Init opens the SQLite database at dbPath, applies PRAGMAs for WAL mode
// and foreign keys, runs auto-migration for all registered models, and
// stores the connection in the package-level DB variable.
func Init(dbPath string) error {
	var err error
	DB, err = gorm.Open(sqlite.Open(dbPath), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		return err
	}

	if err := DB.Exec("PRAGMA journal_mode=WAL").Error; err != nil {
		return err
	}

	if err := DB.Exec("PRAGMA foreign_keys=ON").Error; err != nil {
		return err
	}

	if err := DB.AutoMigrate(model.Models...); err != nil {
		return err
	}

	slog.Info("Database initialized", "path", dbPath)
	return nil
}
