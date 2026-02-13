package gateway

import (
	"net/url"
	"strings"

	"github.com/getkin/kin-openapi/openapi3"
)

func LoadSpec(specPath string) (*openapi3.T, error) {
	loader := openapi3.NewLoader()
	loader.IsExternalRefsAllowed = true

	if strings.HasPrefix(specPath, "http://") || strings.HasPrefix(specPath, "https://") {
		uri, err := url.Parse(specPath)
		if err != nil {
			return nil, err
		}
		return loader.LoadFromURI(uri)
	}
	return loader.LoadFromFile(specPath)
}
