package handler

import (
	"fmt"
	"net/http"
	"strconv"

	"config-hub/service"

	"github.com/labstack/echo/v4"
)

// PreviewConfig GET /api/profiles/:id/preview
// Builds the mihomo config for the given profile and returns it as YAML (text/plain).
func PreviewConfig(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid ID", "code": 400})
	}

	config, err := service.BuildConfig(uint(id))
	if err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": err.Error(), "code": 404})
	}

	yamlData, err := config.Render()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error(), "code": 500})
	}

	return c.Blob(http.StatusOK, "text/plain; charset=utf-8", yamlData)
}

// ExportConfig GET /api/profiles/:id/export
// Same as preview but sets Content-Disposition: attachment header for download.
func ExportConfig(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid ID", "code": 400})
	}

	config, err := service.BuildConfig(uint(id))
	if err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": err.Error(), "code": 404})
	}

	yamlData, err := config.Render()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error(), "code": 500})
	}

	filename := sanitizeFilename(resolveFilename(uint(id)))
	c.Response().Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	return c.Blob(http.StatusOK, "text/plain; charset=utf-8", yamlData)
}
