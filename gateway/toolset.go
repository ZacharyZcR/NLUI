package gateway

import (
	"encoding/json"
	"os"
	"path/filepath"

	"github.com/ZacharyZcR/NLUI/core/llm"
)

const ToolSetVersion = 1

type ToolSet struct {
	Version   int               `json:"version"`
	Target    string            `json:"target"`
	BaseURL   string            `json:"base_url"`
	Auth      AuthConfig        `json:"auth"`
	Endpoints []ToolSetEndpoint `json:"endpoints"`
}

type ToolSetEndpoint struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Method      string                 `json:"method"`
	Path        string                 `json:"path"`
	Params      []ParamInfo            `json:"params"`
	HasBody     bool                   `json:"has_body"`
	Parameters  map[string]interface{} `json:"parameters"`
}

func SaveToolSet(path string, ts *ToolSet) error {
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(ts, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

func LoadToolSet(path string) (*ToolSet, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var ts ToolSet
	if err := json.Unmarshal(data, &ts); err != nil {
		return nil, err
	}
	return &ts, nil
}

func (ts *ToolSet) Build() ([]llm.Tool, map[string]*Endpoint) {
	tools := make([]llm.Tool, 0, len(ts.Endpoints))
	endpoints := make(map[string]*Endpoint, len(ts.Endpoints))

	for _, ep := range ts.Endpoints {
		tool := llm.Tool{
			Type: "function",
			Function: llm.ToolFunction{
				Name:        ep.Name,
				Description: ep.Description,
				Parameters:  ep.Parameters,
			},
		}

		endpoint := &Endpoint{
			TargetName:        ts.Target,
			TargetDisplayName: ts.Target,
			BaseURL:           ts.BaseURL,
			Method:            ep.Method,
			Path:              ep.Path,
			Auth:              ts.Auth,
			Params:            ep.Params,
			HasBody:           ep.HasBody,
		}

		tools = append(tools, tool)
		endpoints[ep.Name] = endpoint
	}

	return tools, endpoints
}
