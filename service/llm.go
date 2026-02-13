package service

import "github.com/ZacharyZcR/NLUI/config"

type ProviderInfo struct {
	Name    string   `json:"name"`
	APIBase string   `json:"api_base"`
	Models  []string `json:"models"`
}

func (s *Service) SaveLLMConfig(apiBase, apiKey, model string) error {
	return s.ModifyConfig(func(cfg *config.Config) error {
		cfg.LLM.APIBase = apiBase
		cfg.LLM.APIKey = apiKey
		cfg.LLM.Model = model
		return nil
	})
}

func (s *Service) SaveLanguage(lang string) error {
	return s.ModifyConfig(func(cfg *config.Config) error {
		cfg.Language = lang
		return nil
	})
}

func (s *Service) SaveStream(stream bool) error {
	return s.ModifyConfig(func(cfg *config.Config) error {
		cfg.LLM.Stream = &stream
		return nil
	})
}

func (s *Service) SaveProxy(proxy string) error {
	return s.ModifyConfig(func(cfg *config.Config) error {
		cfg.Proxy = proxy
		return nil
	})
}

func MaskKey(key string) string {
	if len(key) <= 8 {
		return key
	}
	return key[:4] + "..." + key[len(key)-4:]
}

func ProviderPresets() []ProviderInfo {
	return []ProviderInfo{
		{Name: "OpenAI", APIBase: "https://api.openai.com/v1", Models: []string{}},
		{Name: "Gemini", APIBase: "https://generativelanguage.googleapis.com/v1beta/openai", Models: []string{}},
		{Name: "DeepSeek", APIBase: "https://api.deepseek.com/v1", Models: []string{}},
		{Name: "Claude", APIBase: "https://api.anthropic.com/v1", Models: []string{}},
	}
}
