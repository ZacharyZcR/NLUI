FROM golang:1.25-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /nlui ./cmd/nlui

FROM alpine:3.21
RUN apk add --no-cache ca-certificates
COPY --from=build /nlui /usr/local/bin/nlui
COPY nlui.example.yaml /etc/nlui/nlui.example.yaml
EXPOSE 9000
ENTRYPOINT ["nlui"]
CMD ["/etc/nlui/nlui.yaml"]
