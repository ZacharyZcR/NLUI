package config

import (
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Language string       `yaml:"language"`
	Proxy    string       `yaml:"proxy"`
	LLM      LLMConfig    `yaml:"llm"`
	Targets  []Target     `yaml:"targets"`
	Server   ServerConfig `yaml:"server"`
	MCP      MCPConfig    `yaml:"mcp"`
}

type LLMConfig struct {
	APIBase      string `yaml:"api_base"`
	APIKey       string `yaml:"api_key"`
	Model        string `yaml:"model"`
	MaxCtxTokens int    `yaml:"max_context_tokens"`
	Stream       *bool  `yaml:"stream,omitempty"`
}

func (c LLMConfig) IsStream() bool {
	if c.Stream == nil {
		return true
	}
	return *c.Stream
}

type Target struct {
	Name        string     `yaml:"name"`
	BaseURL     string     `yaml:"base_url"`
	Spec        string     `yaml:"spec"`
	Tools       string     `yaml:"tools"`
	Auth        AuthConfig `yaml:"auth"`
	Description string     `yaml:"description"`
}

type AuthConfig struct {
	Type       string `yaml:"type"`
	HeaderName string `yaml:"header_name"`
	Token      string `yaml:"token"`
}

type MCPConfig struct {
	Server  MCPServerConfig   `yaml:"server"`
	Clients []MCPClientConfig `yaml:"clients"`
}

type MCPServerConfig struct {
	SSEPort int `yaml:"sse_port"`
}

type MCPClientConfig struct {
	Name    string   `yaml:"name"`
	Command string   `yaml:"command"`
	Args    []string `yaml:"args"`
}

type ServerConfig struct {
	Port int `yaml:"port"`
}

// GlobalDir returns %APPDATA%/NLUI (or equivalent), creating it if needed.
func GlobalDir() (string, error) {
	base, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(base, "NLUI")
	return dir, os.MkdirAll(dir, 0755)
}

// GlobalConfigPath returns the path to the global nlui.yaml.
func GlobalConfigPath() (string, error) {
	dir, err := GlobalDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "nlui.yaml"), nil
}

// ToolSetPath returns the path for a target's toolset file: <GlobalDir>/toolsets/<name>.json.
func ToolSetPath(targetName string) (string, error) {
	dir, err := GlobalDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "toolsets", targetName+".json"), nil
}

func Load(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}
	if cfg.Server.Port == 0 {
		cfg.Server.Port = 9000
	}
	if cfg.Language == "" {
		cfg.Language = "en"
	}
	return &cfg, nil
}
