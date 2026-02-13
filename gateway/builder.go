package gateway

import (
	"fmt"
	"strings"

	"github.com/ZacharyZcR/Kelper/core/llm"
	"github.com/getkin/kin-openapi/openapi3"
)

type AuthConfig struct {
	Type       string
	HeaderName string
}

type Endpoint struct {
	TargetName string
	BaseURL    string
	Method     string
	Path       string
	Auth       AuthConfig
	Params     []ParamInfo
	HasBody    bool
}

type ParamInfo struct {
	Name     string
	In       string // path, query, header
	Required bool
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
			toolName := targetName + "__" + opID

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
				TargetName: targetName,
				BaseURL:    baseURL,
				Method:     strings.ToUpper(method),
				Path:       path,
				Auth:       auth,
				Params:     paramInfos,
				HasBody:    op.RequestBody != nil,
			}

			tools = append(tools, tool)
			endpoints[toolName] = endpoint
		}
	}

	return tools, endpoints
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
		paramInfos = append(paramInfos, ParamInfo{Name: p.Name, In: p.In, Required: p.Required})
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
