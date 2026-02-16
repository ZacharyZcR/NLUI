GO_PKGS = ./bootstrap/... ./cmd/... ./config/... ./core/... ./engine/... ./gateway/... ./mcp/... ./server/... ./service/...
BIN     = build/nlui

.PHONY: all build test lint fmt clean desktop sdk-test

## Default: lint, test, then build
all: lint test build

## Build server binary
build:
	go build -o $(BIN) ./cmd/nlui

## Run Go tests
test:
	go test $(GO_PKGS)

## Run golangci-lint
lint:
	golangci-lint run $(GO_PKGS)

## Format Go source
fmt:
	gofmt -w .

## Remove build artifacts
clean:
	rm -rf build/ desktop/build/

## Build desktop app (requires Wails)
desktop:
	cd desktop && wails build

## Run TypeScript SDK tests (requires pnpm)
sdk-test:
	cd sdk/engine && pnpm test
