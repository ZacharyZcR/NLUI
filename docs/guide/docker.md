# Docker Deployment

## Quick Start

```bash
# 1. Create config
cp nlui.example.yaml nlui.yaml
# Edit nlui.yaml with your LLM and target settings

# 2. Run
docker compose up -d
```

NLUI is available at `http://localhost:9000`.

## Dockerfile

The image uses a two-stage build:

```dockerfile
# Stage 1: Build static binary
FROM golang:1.25-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /nlui ./cmd/nlui

# Stage 2: Minimal runtime
FROM alpine:3.21
RUN apk add --no-cache ca-certificates
COPY --from=build /nlui /usr/local/bin/nlui
EXPOSE 9000
ENTRYPOINT ["nlui"]
CMD ["/etc/nlui/nlui.yaml"]
```

The final image is ~20MB with a statically-linked binary.

## docker-compose.yml

```yaml
services:
  nlui:
    build: .
    ports:
      - "9000:9000"
    volumes:
      - ./nlui.yaml:/etc/nlui/nlui.yaml:ro
    restart: unless-stopped
```

## Custom Config Path

Mount your config to `/etc/nlui/nlui.yaml` (the default CMD path), or override:

```yaml
services:
  nlui:
    build: .
    ports:
      - "9000:9000"
    volumes:
      - ./my-config.yaml:/app/config.yaml:ro
    command: ["/app/config.yaml"]
```

## Environment-Specific Compose

For production with a proxy:

```yaml
services:
  nlui:
    image: ghcr.io/zacharyzcr/nlui:latest
    ports:
      - "9000:9000"
    volumes:
      - ./nlui.yaml:/etc/nlui/nlui.yaml:ro
    environment:
      - HTTP_PROXY=http://proxy:7890
    restart: unless-stopped
```

## Building the Image

```bash
# Build locally
docker build -t nlui .

# Run directly
docker run -p 9000:9000 -v ./nlui.yaml:/etc/nlui/nlui.yaml:ro nlui
```

## Health Check

Once running, verify with:

```bash
curl http://localhost:9000/api/health
```
