package gateway

import (
	"os"
	"testing"

	"github.com/getkin/kin-openapi/openapi3"
)

func loadTestSpec(t *testing.T) *openapi3.T {
	t.Helper()
	data, err := os.ReadFile("../testdata/petstore.json")
	if err != nil {
		t.Fatalf("read petstore.json: %v", err)
	}
	loader := openapi3.NewLoader()
	doc, err := loader.LoadFromData(data)
	if err != nil {
		t.Fatalf("parse spec: %v", err)
	}
	return doc
}

func TestBuildToolsCount(t *testing.T) {
	doc := loadTestSpec(t)
	tools, endpoints := BuildTools(doc, "petstore", "http://localhost:8080", AuthConfig{})
	// petstore.json has 4 operations: listPets, createPet, getPet, deletePet
	if len(tools) != 4 {
		t.Fatalf("expected 4 tools, got %d", len(tools))
	}
	if len(endpoints) != 4 {
		t.Fatalf("expected 4 endpoints, got %d", len(endpoints))
	}
}

func TestBuildToolsNaming(t *testing.T) {
	doc := loadTestSpec(t)
	tools, _ := BuildTools(doc, "petstore", "http://localhost:8080", AuthConfig{})

	names := map[string]bool{}
	for _, tool := range tools {
		names[tool.Function.Name] = true
	}

	expected := []string{
		"petstore__listPets",
		"petstore__createPet",
		"petstore__getPet",
		"petstore__deletePet",
	}
	for _, name := range expected {
		if !names[name] {
			t.Errorf("missing tool %q, have %v", name, names)
		}
	}
}

func TestBuildToolsEndpointFields(t *testing.T) {
	doc := loadTestSpec(t)
	_, endpoints := BuildTools(doc, "petstore", "http://localhost:8080", AuthConfig{Type: "bearer", Token: "tok"})

	ep := endpoints["petstore__getPet"]
	if ep == nil {
		t.Fatal("missing petstore__getPet endpoint")
	}
	if ep.Method != "GET" {
		t.Errorf("method = %q, want GET", ep.Method)
	}
	if ep.Path != "/api/pets/{id}" {
		t.Errorf("path = %q, want /api/pets/{id}", ep.Path)
	}
	if ep.Auth.Type != "bearer" || ep.Auth.Token != "tok" {
		t.Errorf("auth = %+v, want bearer/tok", ep.Auth)
	}
	if ep.HasBody {
		t.Error("getPet should not have body")
	}

	// Check params
	hasPathID := false
	for _, p := range ep.Params {
		if p.Name == "id" && p.In == "path" && p.Required {
			hasPathID = true
		}
	}
	if !hasPathID {
		t.Error("missing required path param 'id'")
	}
}

func TestBuildToolsRequestBody(t *testing.T) {
	doc := loadTestSpec(t)
	_, endpoints := BuildTools(doc, "petstore", "http://localhost:8080", AuthConfig{})

	ep := endpoints["petstore__createPet"]
	if ep == nil {
		t.Fatal("missing petstore__createPet endpoint")
	}
	if !ep.HasBody {
		t.Error("createPet should have body")
	}
}

func TestSanitizeToolName(t *testing.T) {
	cases := []struct {
		in, want string
	}{
		{"hello", "hello"},
		{"hello world", "hello_world"},
		{"123abc", "_123abc"},
		{"", "_"},
		{"a-b.c:d_e", "a-b.c:d_e"},
	}
	for _, c := range cases {
		got := sanitizeToolName(c.in)
		if got != c.want {
			t.Errorf("sanitize(%q) = %q, want %q", c.in, got, c.want)
		}
	}
}

func TestSanitizeToolNameMaxLength(t *testing.T) {
	long := ""
	for i := 0; i < 100; i++ {
		long += "a"
	}
	got := sanitizeToolName(long)
	if len(got) > 64 {
		t.Errorf("name too long: %d", len(got))
	}
}

func TestGenerateOpID(t *testing.T) {
	got := generateOpID("GET", "/api/pets/{id}")
	if got != "get_api_pets_id" {
		t.Errorf("got %q", got)
	}
}
