package service

import (
	"errors"
	"os"

	"github.com/ZacharyZcR/NLUI/config"
	"github.com/ZacharyZcR/NLUI/gateway"
)

var (
	ErrInvalidTarget   = errors.New("name and (base_url, spec, or tools) are required")
	ErrDuplicateTarget = errors.New("target name already exists")
	ErrTargetNotFound  = errors.New("target not found")
)

type TargetInfo struct {
	Name        string `json:"name"`
	BaseURL     string `json:"base_url"`
	Spec        string `json:"spec"`
	AuthType    string `json:"auth_type"`
	Description string `json:"description"`
	ToolCount   int    `json:"tools"`
}

type ProbeResult struct {
	Found     bool     `json:"found"`
	SpecURL   string   `json:"spec_url,omitempty"`
	ToolsPath string   `json:"tools_path,omitempty"`
	ToolCount int      `json:"tools"`
	Endpoints []string `json:"endpoints"`
	Error     string   `json:"error,omitempty"`
}

func (s *Service) AddTarget(name, baseURL, spec, tools, authType, authToken, desc string) error {
	if name == "" || (baseURL == "" && spec == "" && tools == "") {
		return ErrInvalidTarget
	}
	return s.ModifyConfig(func(cfg *config.Config) error {
		for _, t := range cfg.Targets {
			if t.Name == name {
				return ErrDuplicateTarget
			}
		}
		cfg.Targets = append(cfg.Targets, config.Target{
			Name:        name,
			BaseURL:     baseURL,
			Spec:        spec,
			Tools:       tools,
			Auth:        config.AuthConfig{Type: authType, Token: authToken},
			Description: desc,
		})
		return nil
	})
}

func (s *Service) RemoveTarget(name string) error {
	err := s.ModifyConfig(func(cfg *config.Config) error {
		filtered := cfg.Targets[:0]
		found := false
		for _, t := range cfg.Targets {
			if t.Name == name {
				found = true
			} else {
				filtered = append(filtered, t)
			}
		}
		if !found {
			return ErrTargetNotFound
		}
		cfg.Targets = filtered
		return nil
	})
	if err != nil {
		return err
	}
	// Clean up cached toolset
	if tsPath, err := config.ToolSetPath(name); err == nil {
		os.Remove(tsPath)
	}
	return nil
}

func (s *Service) ListTargets() ([]TargetInfo, error) {
	cfg, err := s.LoadConfig()
	if err != nil {
		return []TargetInfo{}, err
	}

	result := make([]TargetInfo, 0, len(cfg.Targets))
	for _, tgt := range cfg.Targets {
		toolCount := 0
		source := tgt.Spec

		if ts := LoadTargetToolSet(tgt); ts != nil {
			toolCount = len(ts.Endpoints)
			if source == "" {
				source = tgt.Tools
			}
		}

		result = append(result, TargetInfo{
			Name:        tgt.Name,
			BaseURL:     tgt.BaseURL,
			Spec:        source,
			AuthType:    tgt.Auth.Type,
			Description: tgt.Description,
			ToolCount:   toolCount,
		})
	}
	return result, nil
}

// LoadTargetToolSet tries to load toolset from explicit path or cache.
func LoadTargetToolSet(tgt config.Target) *gateway.ToolSet {
	if tgt.Tools != "" {
		if ts, err := gateway.LoadToolSet(tgt.Tools); err == nil {
			return ts
		}
	}
	if tsPath, err := config.ToolSetPath(tgt.Name); err == nil {
		if ts, err := gateway.LoadToolSet(tsPath); err == nil {
			return ts
		}
	}
	return nil
}

// ProbeTarget discovers an OpenAPI spec from a base URL. Pure function.
func ProbeTarget(baseURL string) *ProbeResult {
	doc, specURL, err := gateway.DiscoverSpec(baseURL)
	if err != nil {
		return &ProbeResult{Found: false, Error: err.Error(), Endpoints: []string{}}
	}

	tools, _ := gateway.BuildTools(doc, "_probe", baseURL, gateway.AuthConfig{})
	endpoints := make([]string, 0, len(tools))
	for _, t := range tools {
		endpoints = append(endpoints, t.Function.Name+": "+t.Function.Description)
	}

	return &ProbeResult{
		Found:     true,
		SpecURL:   specURL,
		ToolCount: len(tools),
		Endpoints: endpoints,
	}
}

// ValidateSpec parses an OpenAPI spec file and returns preview info. Pure function.
func ValidateSpec(path string) *ProbeResult {
	doc, err := gateway.LoadSpec(path)
	if err != nil {
		return &ProbeResult{Found: false, Error: err.Error(), Endpoints: []string{}}
	}

	tools, _ := gateway.BuildTools(doc, "_upload", "", gateway.AuthConfig{})
	endpoints := make([]string, 0, len(tools))
	for _, t := range tools {
		endpoints = append(endpoints, t.Function.Name+": "+t.Function.Description)
	}

	return &ProbeResult{
		Found:     true,
		SpecURL:   path,
		ToolCount: len(tools),
		Endpoints: endpoints,
	}
}

// ValidateToolSet parses a ToolSet JSON file and returns preview info. Pure function.
func ValidateToolSet(path string) *ProbeResult {
	ts, err := gateway.LoadToolSet(path)
	if err != nil {
		return &ProbeResult{Found: false, Error: err.Error(), Endpoints: []string{}}
	}

	endpoints := make([]string, 0, len(ts.Endpoints))
	for _, ep := range ts.Endpoints {
		endpoints = append(endpoints, ep.Name+": "+ep.Description)
	}

	return &ProbeResult{
		Found:     true,
		ToolsPath: path,
		ToolCount: len(ts.Endpoints),
		Endpoints: endpoints,
	}
}
