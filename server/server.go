package server

import (
	"config-hub/server/handler"
	"config-hub/server/middleware"

	"github.com/labstack/echo/v4"
)

// RegisterRoutes sets up all API route groups on the provided Echo instance.
func RegisterRoutes(e *echo.Echo) {
	api := e.Group("/api")

	// Public auth routes
	auth := api.Group("/auth")
	auth.POST("/login", handler.Login)
	auth.POST("/register", handler.Register)

	// Auth routes requiring JWT
	authMe := auth.Group("")
	authMe.Use(middleware.JWTAuth())
	authMe.GET("/me", handler.Me)

	// Protected routes (all /api/* except /api/auth/*)
	protected := api.Group("")
	protected.Use(middleware.JWTAuth())

	// Subscription routes
	subs := protected.Group("/subscriptions")
	subs.GET("", handler.ListSubscriptions)
	subs.POST("", handler.CreateSubscription)
	subs.PUT("/:id", handler.UpdateSubscription)
	subs.DELETE("/:id", handler.DeleteSubscription)
	subs.POST("/:id/refresh", handler.RefreshSubscription)

	// Node routes
	nodes := protected.Group("/nodes")
	nodes.GET("", handler.ListNodes)
	nodes.GET("/stats", handler.GetNodeStatistics)

	// Profile routes
	profiles := protected.Group("/profiles")
	profiles.GET("", handler.ListProfiles)
	profiles.POST("", handler.CreateProfile)
	profiles.GET("/:id", handler.GetProfile)
	profiles.PUT("/:id", handler.UpdateProfile)
	profiles.DELETE("/:id", handler.DeleteProfile)
	profiles.POST("/:id/subscriptions", handler.AddSubscriptionToProfile)
	profiles.DELETE("/:id/subscriptions/:subId", handler.RemoveSubscriptionFromProfile)
	profiles.POST("/:id/subscription-groups", handler.AddSubscriptionGroupToProfile)
	profiles.GET("/:id/subscription-groups", handler.ListProfileSubscriptionGroups)
	profiles.DELETE("/:id/subscription-groups/:groupId", handler.RemoveSubscriptionGroupFromProfile)
	profiles.POST("/:id/tokens", handler.CreateToken)
	profiles.GET("/:id/tokens", handler.ListTokens)
	profiles.DELETE("/:id/tokens/:tokenId", handler.RevokeToken)
	profiles.GET("/:id/preview", handler.PreviewConfig)
	profiles.GET("/:id/export", handler.ExportConfig)

	// Subscription Group routes
	subGroups := protected.Group("/subscription-groups")
	subGroups.GET("", handler.ListSubscriptionGroups)
	subGroups.POST("", handler.CreateSubscriptionGroup)
	subGroups.GET("/:id", handler.GetSubscriptionGroup)
	subGroups.PUT("/:id", handler.UpdateSubscriptionGroup)
	subGroups.DELETE("/:id", handler.DeleteSubscriptionGroup)
	subGroups.POST("/:id/subscriptions/:subId", handler.AddSubToGroup)
	subGroups.DELETE("/:id/subscriptions/:subId", handler.RemoveSubFromGroup)

	// Sub endpoint (public — uses SubTokenAuth)
	sub := e.Group("/sub")
	sub.Use(middleware.SubTokenAuth())
	sub.GET("/:profileId", handler.SubEndpoint)
}
