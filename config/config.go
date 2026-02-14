package config

import (
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Language string       `yaml:"language"`
	LLM     LLMConfig    `yaml:"llm"`
	Targets []Target     `yaml:"targets"`
	Server  ServerConfig `yaml:"server"`
	MCP     MCPConfig    `yaml:"mcp"`
}

type LLMConfig struct {
	APIBase      string `yaml:"api_base"`
	APIKey       string `yaml:"api_key"`
	Model        string `yaml:"model"`
	MaxCtxTokens int    `yaml:"max_context_tokens"`
}

type Target struct {
	Name        string     `yaml:"name"`
	BaseURL     string     `yaml:"base_url"`
	Spec        string     `yaml:"spec"`
	Auth        AuthConfig `yaml:"auth"`
	Description string     `yaml:"description"`
}

type AuthConfig struct {
	Type       string `yaml:"type"`
	HeaderName string `yaml:"header_name"`
	Token      string `yaml:"token"`
}

type MCPConfig struct {
	Server  MCPServerConfig  `yaml:"server"`
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

// GlobalDir returns %APPDATA%/Kelper (or equivalent), creating it if needed.
func GlobalDir() (string, error) {
	base, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(base, "Kelper")
	return dir, os.MkdirAll(dir, 0755)
}

// GlobalConfigPath returns the path to the global kelper.yaml.
func GlobalConfigPath() (string, error) {
	dir, err := GlobalDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "kelper.yaml"), nil
}

// SaveToolCache writes tool JSON to <GlobalDir>/tools/<targetName>.json.
func SaveToolCache(targetName string, data []byte) error {
	dir, err := GlobalDir()
	if err != nil {
		return err
	}
	toolsDir := filepath.Join(dir, "tools")
	if err := os.MkdirAll(toolsDir, 0755); err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(toolsDir, targetName+".json"), data, 0644)
}

// LoadToolCache reads cached tool JSON for a target.
func LoadToolCache(targetName string) ([]byte, error) {
	dir, err := GlobalDir()
	if err != nil {
		return nil, err
	}
	return os.ReadFile(filepath.Join(dir, "tools", targetName+".json"))
}

// RemoveToolCache deletes the tool cache for a target.
func RemoveToolCache(targetName string) error {
	dir, err := GlobalDir()
	if err != nil {
		return err
	}
	path := filepath.Join(dir, "tools", targetName+".json")
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
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
