package handler

import (
	"net/http"
	"strconv"

	"config-hub/service"

	"github.com/labstack/echo/v4"
)

func ValidateConfig(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid ID", "code": 400})
	}

	result, err := service.ValidateConfig(uint(id))
	if err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": err.Error(), "code": 404})
	}

	return c.JSON(http.StatusOK, result)
}

func TestRule(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid profile ID", "code": 400})
	}

	var input struct {
		Input string `json:"input"`
	}
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid request body", "code": 400})
	}

	result, err := service.TestRule(uint(id), input.Input)
	if err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": err.Error(), "code": 404})
	}

	return c.JSON(http.StatusOK, result)
}
