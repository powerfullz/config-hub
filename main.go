package main

import (
	"context"
	"io/fs"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"time"

	"config-hub/db"
	"config-hub/seed"
	"config-hub/server"
	"config-hub/service"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

func main() {
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelInfo})))

	// Initialize database
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "config-hub.db"
	}
	if err := db.Init(dbPath); err != nil {
		slog.Error("Failed to initialize database", "error", err)
		os.Exit(1)
	}

	// Run seed data
	if err := seed.Run(); err != nil {
		slog.Error("Failed to seed database", "error", err)
		os.Exit(1)
	}

	// Insert sample test data (idempotent — skips if already present)
	if err := seed.InsertSampleData(); err != nil {
		slog.Error("Failed to insert sample test data", "error", err)
		os.Exit(1)
	}

	// Initialize SSRF-safe HTTP client for subscription fetches
	service.InitSafeHTTPClient()

	// Initialize cron scheduler for periodic subscription refresh
	service.InitCron()

	// Create Echo instance
	e := echo.New()
	e.HideBanner = true
	e.HidePort = true

	// Middleware
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"http://localhost:5173"},
		AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete, http.MethodOptions},
		AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization},
	}))
	e.Use(middleware.Recover())
	e.Use(middleware.RequestID())
	e.Use(middleware.RequestLoggerWithConfig(middleware.RequestLoggerConfig{
		LogStatus:   true,
		LogURI:      true,
		LogError:    true,
		HandleError: true,
		LogValuesFunc: func(c echo.Context, v middleware.RequestLoggerValues) error {
			if v.Error != nil {
				slog.Error("Request error", "uri", v.URI, "status", v.Status, "error", v.Error)
			} else {
				slog.Info("Request", "method", v.Method, "uri", v.URI, "status", v.Status)
			}
			return nil
		},
	}))

	// Health check
	e.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
	})

	// Server setup
	server.RegisterRoutes(e)

	// Serve embedded frontend SPA
	// The go:embed directive in embed.go reads web/dist/* at compile time.
	// Echo's StaticFS serves files from the embedded filesystem.
	// We strip "web/dist" prefix so files at web/dist/index.html become /index.html
	// SPA fallback: any route not matched by API handlers serves index.html
	webFS, err := fs.Sub(webAssets, "web/dist")
	if err != nil {
		slog.Error("Failed to load embedded web assets", "error", err)
	} else {
		// Serve static assets (JS, CSS, etc.)
		e.Use(middleware.StaticWithConfig(middleware.StaticConfig{
			Root:       ".",
			Filesystem: http.FS(webFS),
			HTML5:      true, // SPA fallback: serve index.html for any unmatched route
			Index:      "index.html",
		}))
	}

	// Graceful shutdown
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	go func() {
		port := os.Getenv("PORT")
		if port == "" {
			port = "1323"
		}
		addr := ":" + port
		slog.Info("Starting server", "addr", addr)
		if err := e.Start(addr); err != nil && err != http.ErrServerClosed {
			slog.Error("Server error", "error", err)
			os.Exit(1)
		}
	}()

	<-ctx.Done()
	slog.Info("Shutting down server...")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := e.Shutdown(shutdownCtx); err != nil {
		slog.Error("Server forced to shutdown", "error", err)
	}
	slog.Info("Server stopped")
}
