.DEFAULT_GOAL := all

BINARY := config-hub
CGO_ENABLED := 0

PORT ?= 1323
DB_PATH ?= config-hub.db

.PHONY: all build frontend backend dev clean test vet docker-build up down

all: frontend backend

build: all

frontend:
	cd web && pnpm run build

backend: frontend
	CGO_ENABLED=$(CGO_ENABLED) go build -o $(BINARY) .

dev: frontend
	PORT=$(PORT) DB_PATH=$(DB_PATH) CGO_ENABLED=$(CGO_ENABLED) go run .

clean:
	-rm -rf web/dist $(BINARY) config-hub.db*

test:
	@go test ./...

vet:
	@go vet ./...

docker-build:
	@docker compose build

up:
	@docker compose up -d

down:
	@docker compose down
