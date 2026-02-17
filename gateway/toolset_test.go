package gateway

import (
	"os"
	"path/filepath"
	"testing"
)

func TestToolSetRoundTrip(t *testing.T) {
	doc := loadTestSpec(t)
	auth := AuthConfig{Type: "bearer", Token: "secret"}
	origTools, origEndpoints := BuildTools(doc, "petstore", "http://localhost:8080", auth)

	// BuildToolSet from original results
	ts := BuildToolSet("petstore", "http://localhost:8080", auth, origTools, origEndpoints)

	if ts.Version != ToolSetVersion {
		t.Errorf("version = %d, want %d", ts.Version, ToolSetVersion)
	}
	if ts.Target != "petstore" {
		t.Errorf("target = %q, want petstore", ts.Target)
	}
	// set_auth tool has no endpoint entry, so toolset has one less than origTools
	if len(ts.Endpoints) != len(origEndpoints) {
		t.Fatalf("endpoints = %d, want %d", len(ts.Endpoints), len(origEndpoints))
	}

	// Save → Load
	dir := t.TempDir()
	path := filepath.Join(dir, "petstore.json")

	if err := SaveToolSet(path, ts); err != nil {
		t.Fatalf("SaveToolSet: %v", err)
	}

	if _, err := os.Stat(path); err != nil {
		t.Fatalf("file not created: %v", err)
	}

	loaded, err := LoadToolSet(path)
	if err != nil {
		t.Fatalf("LoadToolSet: %v", err)
	}

	// Build from loaded toolset
	tools, endpoints := loaded.Build()

	// Build injects set_auth, so tools = endpoints + 1
	if len(tools) != len(ts.Endpoints)+1 {
		t.Fatalf("round-trip tools = %d, want %d", len(tools), len(ts.Endpoints)+1)
	}
	if len(endpoints) != len(origEndpoints) {
		t.Fatalf("round-trip endpoints = %d, want %d", len(endpoints), len(origEndpoints))
	}

	// Verify each round-tripped tool exists in origTools
	for _, tool := range tools {
		found := false
		for _, orig := range origTools {
			if tool.Function.Name == orig.Function.Name {
				found = true
				if tool.Function.Description != orig.Function.Description {
					t.Errorf("tool %q desc mismatch", tool.Function.Name)
				}
				break
			}
		}
		if !found {
			t.Errorf("unexpected tool %q after round-trip", tool.Function.Name)
		}
	}

	// Verify endpoint routing info preserved
	for name, orig := range origEndpoints {
		ep := endpoints[name]
		if ep == nil {
			t.Errorf("missing endpoint %q after round-trip", name)
			continue
		}
		if ep.Method != orig.Method {
			t.Errorf("%s method = %q, want %q", name, ep.Method, orig.Method)
		}
		if ep.Path != orig.Path {
			t.Errorf("%s path = %q, want %q", name, ep.Path, orig.Path)
		}
		if ep.HasBody != orig.HasBody {
			t.Errorf("%s hasBody = %v, want %v", name, ep.HasBody, orig.HasBody)
		}
		if ep.Auth.Type != orig.Auth.Type || ep.Auth.Token != orig.Auth.Token {
			t.Errorf("%s auth = %+v, want %+v", name, ep.Auth, orig.Auth)
		}
		if len(ep.Params) != len(orig.Params) {
			t.Errorf("%s params = %d, want %d", name, len(ep.Params), len(orig.Params))
			continue
		}
		for j, p := range ep.Params {
			o := orig.Params[j]
			if p.Name != o.Name || p.In != o.In || p.Required != o.Required {
				t.Errorf("%s param[%d] = %+v, want %+v", name, j, p, o)
			}
		}
	}
}

func TestLoadToolSetNotFound(t *testing.T) {
	_, err := LoadToolSet("/nonexistent/path.json")
	if err == nil {
		t.Error("expected error for nonexistent file")
	}
}

func TestLoadToolSetInvalidJSON(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "bad.json")
	if err := os.WriteFile(path, []byte("{invalid"), 0644); err != nil {
		t.Fatalf("write test file: %v", err)
	}

	_, err := LoadToolSet(path)
	if err == nil {
		t.Error("expected error for invalid JSON")
	}
}

func TestBuildToolSetEmptyEndpoints(t *testing.T) {
	ts := BuildToolSet("empty", "http://x", AuthConfig{}, nil, nil)
	if len(ts.Endpoints) != 0 {
		t.Errorf("expected 0 endpoints, got %d", len(ts.Endpoints))
	}

	tools, endpoints := ts.Build()
	// Build injects set_auth for the target, so 1 tool even with 0 endpoints
	if len(tools) != 1 {
		t.Errorf("expected 1 tool (set_auth), got %d", len(tools))
	}
	if len(endpoints) != 0 {
		t.Errorf("expected 0 endpoints, got %d", len(endpoints))
	}
}

func TestSaveToolSetCreatesDir(t *testing.T) {
	dir := t.TempDir()
	nested := filepath.Join(dir, "a", "b", "c", "test.json")

	ts := &ToolSet{Version: 1, Target: "x"}
	if err := SaveToolSet(nested, ts); err != nil {
		t.Fatalf("SaveToolSet with nested dir: %v", err)
	}

	if _, err := os.Stat(nested); err != nil {
		t.Errorf("file not created at nested path: %v", err)
	}
}
