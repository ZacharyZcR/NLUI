# Docker 部署

## 快速开始

```bash
# 1. 创建配置
cp nlui.example.yaml nlui.yaml
# 编辑 nlui.yaml，填入 LLM 和目标设置

# 2. 启动
docker compose up -d
```

NLUI 将在 `http://localhost:9000` 上运行。

## Dockerfile

镜像使用两阶段构建：

```dockerfile
# 阶段 1: 构建静态二进制
FROM golang:1.25-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /nlui ./cmd/nlui

# 阶段 2: 最小运行时
FROM alpine:3.21
RUN apk add --no-cache ca-certificates
COPY --from=build /nlui /usr/local/bin/nlui
EXPOSE 9000
ENTRYPOINT ["nlui"]
CMD ["/etc/nlui/nlui.yaml"]
```

最终镜像约 20MB，包含一个静态链接的二进制文件。

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

## 自定义配置路径

将配置挂载到 `/etc/nlui/nlui.yaml`（默认 CMD 路径），或覆盖：

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

## 带代理的生产配置

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

## 手动构建

```bash
# 本地构建
docker build -t nlui .

# 直接运行
docker run -p 9000:9000 -v ./nlui.yaml:/etc/nlui/nlui.yaml:ro nlui
```

## 健康检查

启动后验证：

```bash
curl http://localhost:9000/api/health
```
