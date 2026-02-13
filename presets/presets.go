package presets

import (
	"embed"
	"encoding/json"
	"strings"

	"github.com/ZacharyZcR/NLUI/gateway"
)

//go:embed *.toolset.json
var fs embed.FS

// Info describes a built-in preset for display.
type Info struct {
	Name        string `json:"name"`
	Target      string `json:"target"`
	BaseURL     string `json:"base_url"`
	Description string `json:"description"`
	Tools       int    `json:"tools"`
	NeedsAuth   bool   `json:"needs_auth"`
}

var catalog []entry

type entry struct {
	info Info
}

func init() {
	desc := map[string]string{
		"jsonplaceholder": "Mock REST API — Posts, Comments, Users, Todos, Albums, Photos. No auth required.",
		"petstore":        "Swagger PetStore — Pets, Store orders, Users. The classic OpenAPI example.",
		"openweathermap":  "Current weather, 5-day forecast, air quality. Requires free API key.",
	}

	files, _ := fs.ReadDir(".")
	for _, f := range files {
		if !strings.HasSuffix(f.Name(), ".toolset.json") {
			continue
		}
		data, err := fs.ReadFile(f.Name())
		if err != nil {
			continue
		}
		var ts gateway.ToolSet
		if err := json.Unmarshal(data, &ts); err != nil {
			continue
		}
		name := strings.TrimSuffix(f.Name(), ".toolset.json")
		catalog = append(catalog, entry{
			info: Info{
				Name:        name,
				Target:      ts.Target,
				BaseURL:     ts.BaseURL,
				Description: desc[name],
				Tools:       len(ts.Endpoints),
				NeedsAuth:   ts.Auth.Type != "",
			},
		})
	}
}

// List returns info about all available presets.
func List() []Info {
	result := make([]Info, len(catalog))
	for i, e := range catalog {
		result[i] = e.info
	}
	return result
}

// LoadRaw returns the raw JSON bytes for a preset by name.
func LoadRaw(name string) ([]byte, error) {
	return fs.ReadFile(name + ".toolset.json")
}
