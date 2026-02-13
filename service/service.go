package service

import (
	"os"
	"sync"

	"github.com/ZacharyZcR/NLUI/config"
	"gopkg.in/yaml.v3"
)

// Service encapsulates shared business logic for config-driven operations.
// Both desktop and server hosts delegate to Service for target/LLM/proxy management.
type Service struct {
	configPath string
	mu         sync.Mutex
}

func New(configPath string) *Service {
	return &Service{configPath: configPath}
}

func (s *Service) LoadConfig() (*config.Config, error) {
	return config.Load(s.configPath)
}

// ModifyConfig atomically loads config, applies fn, fills defaults, and writes back.
// If fn returns an error the file is NOT written.
func (s *Service) ModifyConfig(fn func(cfg *config.Config) error) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	cfg := &config.Config{}
	if existing, err := config.Load(s.configPath); err == nil {
		cfg = existing
	}

	if err := fn(cfg); err != nil {
		return err
	}

	if cfg.Language == "" {
		cfg.Language = "en"
	}
	if cfg.Server.Port == 0 {
		cfg.Server.Port = 9000
	}

	data, err := yaml.Marshal(cfg)
	if err != nil {
		return err
	}
	return os.WriteFile(s.configPath, data, 0600)
}
