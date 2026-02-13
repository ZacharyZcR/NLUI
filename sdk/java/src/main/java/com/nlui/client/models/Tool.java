package com.nlui.client.models;

import java.util.Map;

/**
 * Represents a tool definition.
 */
public class Tool {
    private String targetName;
    private String name;
    private String description;
    private Map<String, Object> parameters;

    public Tool() {}

    // Getters and Setters
    public String getTargetName() { return targetName; }
    public void setTargetName(String targetName) { this.targetName = targetName; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Map<String, Object> getParameters() { return parameters; }
    public void setParameters(Map<String, Object> parameters) { this.parameters = parameters; }
}
