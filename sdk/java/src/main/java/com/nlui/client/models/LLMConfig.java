package com.nlui.client.models;

/**
 * Represents LLM configuration.
 */
public class LLMConfig {
    private String apiBase;
    private String apiKey;
    private String model;

    public LLMConfig() {}

    public LLMConfig(String apiBase, String apiKey, String model) {
        this.apiBase = apiBase;
        this.apiKey = apiKey;
        this.model = model;
    }

    // Getters and Setters
    public String getApiBase() { return apiBase; }
    public void setApiBase(String apiBase) { this.apiBase = apiBase; }

    public String getApiKey() { return apiKey; }
    public void setApiKey(String apiKey) { this.apiKey = apiKey; }

    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }
}
