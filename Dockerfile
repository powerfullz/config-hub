# Stage 1: Frontend build
FROM node:24-alpine AS frontend
RUN npm install -g pnpm
WORKDIR /app/web
COPY web/package.json web/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY web/ .
RUN pnpm run build

# Stage 2: Go build
FROM golang:1.26-alpine AS backend
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=frontend /app/web/dist ./web/dist
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o config-hub .

# Stage 3: Runtime
FROM alpine:3.24
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=backend /app/config-hub .
RUN mkdir -p /data
VOLUME /data
EXPOSE 1323
ENV DB_PATH=/data/config-hub.db
ENV PORT=1323
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://localhost:1323/health || exit 1
ENTRYPOINT ["./config-hub"]
