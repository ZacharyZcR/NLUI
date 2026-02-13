package gateway

import (
	"fmt"
	"hash/fnv"
	"regexp"
	"strings"

	"github.com/ZacharyZcR/NLUI/core/llm"
	"github.com/getkin/kin-openapi/openapi3"
)

var reInvalidChar = regexp.MustCompile(`[^a-zA-Z0-9_.\-:]`)

// sanitizeToolName ensures the name is valid for all LLM providers (Gemini is the strictest):
// [a-zA-Z0-9_.\-:], starts with letter or underscore, max 64 chars.
func sanitizeToolName(name string) string {
	name = reInvalidChar.ReplaceAllString(name, "_")
	if len(name) == 0 {
		return "_"
	}
	if c := name[0]; (c < 'a' || c > 'z') && (c < 'A' || c > 'Z') && c != '_' {
		name = "_" + name
	}
	if len(name) > 64 {
		h := fnv.New32a()
		h.Write([]byte(name))
		name = fmt.Sprintf("%s_%05x", name[:58], h.Sum32()&0xFFFFF)
	}
	return name
}

type AuthConfig struct {
	Type       string `json:"type"`
	HeaderName string `json:"header_name"`
	Token      string `json:"token"`
}

type Endpoint struct {
	TargetName        string // Sanitized name for tool execution
	TargetDisplayName string // Original name for display
	BaseURL           string
	Method            string
	Path              string
	Group             string // Module group: from OpenAPI tag > path prefix > "default"
	Auth              AuthConfig
	Params            []ParamInfo
	HasBody           bool
}

type ParamInfo struct {
	Name     string `json:"name"`
	In       string `json:"in"`
	Type     string `json:"type"`
	Required bool   `json:"required"`
}

func BuildTools(doc *openapi3.T, targetName, baseURL string, auth AuthConfig) ([]llm.Tool, map[string]*Endpoint) {
	var tools []llm.Tool
	endpoints := make(map[string]*Endpoint)

	if doc.Paths == nil {
		return tools, endpoints
	}

	for path, pathItem := range doc.Paths.Map() {
		for method, op := range pathItem.Operations() {
			if op == nil {
				continue
			}

			opID := op.OperationID
			if opID == "" {
				opID = generateOpID(method, path)
			}

			// Sanitize target name separately to avoid losing it entirely
			sanitizedTarget := sanitizeToolName(targetName)
			// If target name becomes all underscores (e.g., Chinese), use a fallback
			if strings.Trim(sanitizedTarget, "_") == "" {
				sanitizedTarget = "target"
			}

			toolName := sanitizeToolName(sanitizedTarget + "__" + opID)

			description := op.Summary
			if description == "" {
				description = op.Description
			}
			if description == "" {
				description = fmt.Sprintf("%s %s", strings.ToUpper(method), path)
			}

			params, paramInfos := buildParams(op)

			tool := llm.Tool{
				Type: "function",
				Function: llm.ToolFunction{
					Name:        toolName,
					Description: description,
					Parameters:  params,
				},
			}

			endpoint := &Endpoint{
				TargetName:        sanitizedTarget, // Sanitized for tool execution
				TargetDisplayName: targetName,      // Original name for display
				BaseURL:           baseURL,
				Method:            strings.ToUpper(method),
				Path:              path,
				Group:             deriveGroup(op, path),
				Auth:              auth,
				Params:            paramInfos,
				HasBody:           op.RequestBody != nil,
			}

			tools = append(tools, tool)
			endpoints[toolName] = endpoint
		}
	}

	tools = append(tools, buildSetAuthTool(targetName, auth))

	return tools, endpoints
}

// buildSetAuthTool creates the built-in set_auth tool for a target.
// When auth config is known, the description tells the LLM exactly what's needed so it only has to provide the token.
func buildSetAuthTool(targetName string, auth AuthConfig) llm.Tool {
	sanitized := sanitizeToolName(targetName)
	if strings.Trim(sanitized, "_") == "" {
		sanitized = "target"
	}

	desc := fmt.Sprintf("Set authentication credentials for %s. Call this before making authenticated API requests.", targetName)
	if auth.Type != "" {
		switch auth.Type {
		case "bearer":
			desc += " This API uses Bearer token authentication — just provide the token."
		case "header":
			desc += fmt.Sprintf(" This API uses custom header authentication (header: %s) — just provide the token, auth_type and header_name are already configured.", auth.HeaderName)
		case "query":
			desc += fmt.Sprintf(" This API uses query parameter authentication (param: %s) — just provide the token, auth_type and header_name are already configured.", auth.HeaderName)
		}
	}

	return llm.Tool{
		Type: "function",
		Function: llm.ToolFunction{
			Name:        sanitized + "__set_auth",
			Description: desc,
			Parameters: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"token": map[string]interface{}{
						"type":        "string",
						"description": "The authentication token or API key",
					},
					"auth_type": map[string]interface{}{
						"type":        "string",
						"enum":        []string{"bearer", "header", "query"},
						"description": "Authentication type. Usually already configured — only set this to override.",
					},
					"header_name": map[string]interface{}{
						"type":        "string",
						"description": "Header or query parameter name. Usually already configured — only set this to override.",
					},
				},
				"required": []string{"token"},
			},
		},
	}
}

func buildParams(op *openapi3.Operation) (map[string]interface{}, []ParamInfo) {
	properties := map[string]interface{}{}
	var required []string
	var paramInfos []ParamInfo

	for _, paramRef := range op.Parameters {
		if paramRef == nil || paramRef.Value == nil {
			continue
		}
		p := paramRef.Value
		prop := map[string]interface{}{"type": "string"}
		if p.Schema != nil && p.Schema.Value != nil {
			prop = schemaToMap(p.Schema.Value)
		}
		if p.Description != "" {
			prop["description"] = fmt.Sprintf("%s (%s)", p.Description, p.In)
		}
		properties[p.Name] = prop
		if p.Required {
			required = append(required, p.Name)
		}
		paramType := "string"
		if p.Schema != nil && p.Schema.Value != nil && p.Schema.Value.Type != nil {
			if types := p.Schema.Value.Type.Slice(); len(types) == 1 {
				paramType = types[0]
			}
		}
		paramInfos = append(paramInfos, ParamInfo{Name: p.Name, In: p.In, Type: paramType, Required: p.Required})
	}

	if op.RequestBody != nil && op.RequestBody.Value != nil {
		for _, mediaType := range op.RequestBody.Value.Content {
			if mediaType.Schema != nil && mediaType.Schema.Value != nil {
				properties["body"] = schemaToMap(mediaType.Schema.Value)
				if op.RequestBody.Value.Required {
					required = append(required, "body")
				}
			}
			break
		}
	}

	schema := map[string]interface{}{
		"type":       "object",
		"properties": properties,
	}
	if len(required) > 0 {
		schema["required"] = required
	}

	return schema, paramInfos
}

func schemaToMap(s *openapi3.Schema) map[string]interface{} {
	if s == nil {
		return map[string]interface{}{"type": "string"}
	}

	m := map[string]interface{}{}

	if s.Type != nil {
		types := s.Type.Slice()
		if len(types) == 1 {
			m["type"] = types[0]
		} else if len(types) > 1 {
			m["type"] = types
		}
	}
	if s.Description != "" {
		m["description"] = s.Description
	}
	if len(s.Enum) > 0 {
		m["enum"] = s.Enum
	}
	if len(s.Properties) > 0 {
		props := map[string]interface{}{}
		for name, ref := range s.Properties {
			if ref != nil && ref.Value != nil {
				props[name] = schemaToMap(ref.Value)
			}
		}
		m["properties"] = props
	}
	if len(s.Required) > 0 {
		m["required"] = s.Required
	}
	if s.Items != nil && s.Items.Value != nil {
		m["items"] = schemaToMap(s.Items.Value)
	}

	return m
}

func generateOpID(method, path string) string {
	path = strings.ReplaceAll(path, "{", "")
	path = strings.ReplaceAll(path, "}", "")
	path = strings.ReplaceAll(path, "/", "_")
	path = strings.Trim(path, "_")
	return strings.ToLower(method) + "_" + path
}

// deriveGroup extracts a module group name for an operation.
// Priority: OpenAPI tag > first path segment > "default".
func deriveGroup(op *openapi3.Operation, path string) string {
	// 1. OpenAPI tags
	if len(op.Tags) > 0 && op.Tags[0] != "" {
		return op.Tags[0]
	}
	// 2. First path segment: "/sheets/v3/..." → "sheets"
	trimmed := strings.TrimLeft(path, "/")
	if idx := strings.Index(trimmed, "/"); idx > 0 {
		return trimmed[:idx]
	}
	if trimmed != "" {
		return trimmed
	}
	return "default"
}

func BuildToolSet(targetName, baseURL string, auth AuthConfig, tools []llm.Tool, endpoints map[string]*Endpoint) *ToolSet {
	tsEndpoints := make([]ToolSetEndpoint, 0, len(tools))
	for _, tool := range tools {
		ep := endpoints[tool.Function.Name]
		if ep == nil {
			continue
		}
		params := ep.Params
		if params == nil {
			params = []ParamInfo{}
		}
		var parameters map[string]interface{}
		if m, ok := tool.Function.Parameters.(map[string]interface{}); ok {
			parameters = m
		}
		tsEndpoints = append(tsEndpoints, ToolSetEndpoint{
			Name:        tool.Function.Name,
			Description: tool.Function.Description,
			Method:      ep.Method,
			Path:        ep.Path,
			Group:       ep.Group,
			Params:      params,
			HasBody:     ep.HasBody,
			Parameters:  parameters,
		})
	}
	return &ToolSet{
		Version:   ToolSetVersion,
		Target:    targetName,
		BaseURL:   baseURL,
		Auth:      auth,
		Endpoints: tsEndpoints,
	}
}

// DetectAuth extracts the primary authentication scheme from an OpenAPI spec.
// Returns auth type ("bearer", "header", "query", "") and the key/header name.
func DetectAuth(doc *openapi3.T) (authType, authName string) {
	if doc.Components == nil || doc.Components.SecuritySchemes == nil {
		return "", ""
	}
	for _, ref := range doc.Components.SecuritySchemes {
		scheme := ref.Value
		if scheme == nil {
			continue
		}
		switch scheme.Type {
		case "apiKey":
			if scheme.In == "header" {
				return "header", scheme.Name
			}
			if scheme.In == "query" {
				return "query", scheme.Name
			}
		case "http":
			if strings.EqualFold(scheme.Scheme, "bearer") {
				return "bearer", ""
			}
		}
	}
	return "", ""
}
