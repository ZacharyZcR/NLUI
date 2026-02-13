package config

import (
	"os"

	"gopkg.in/yaml.v3"
)

type Config struct {
	LLM     LLMConfig    `yaml:"llm"`
	Targets []Target     `yaml:"targets"`
	Server  ServerConfig `yaml:"server"`
}

type LLMConfig struct {
	APIBase string `yaml:"api_base"`
	APIKey  string `yaml:"api_key"`
	Model   string `yaml:"model"`
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
}

type ServerConfig struct {
	Port int `yaml:"port"`
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
	return &cfg, nil
}
