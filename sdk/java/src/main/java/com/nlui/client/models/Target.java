package com.nlui.client.models;

/**
 * Represents an OpenAPI target configuration.
 */
public class Target {
    private String name;
    private String baseUrl;
    private String spec;
    private String authType;
    private String token;
    private String description;

    public Target() {}

    public Target(String name, String baseUrl) {
        this.name = name;
        this.baseUrl = baseUrl;
    }

    // Getters and Setters
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getBaseUrl() { return baseUrl; }
    public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }

    public String getSpec() { return spec; }
    public void setSpec(String spec) { this.spec = spec; }

    public String getAuthType() { return authType; }
    public void setAuthType(String authType) { this.authType = authType; }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
