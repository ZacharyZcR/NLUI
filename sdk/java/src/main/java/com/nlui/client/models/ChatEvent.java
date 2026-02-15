package com.nlui.client.models;

import java.util.Map;

/**
 * Represents a Server-Sent Event from the chat endpoint.
 */
public class ChatEvent {
    private String type;
    private Map<String, Object> data;

    public ChatEvent() {}

    public ChatEvent(String type, Map<String, Object> data) {
        this.type = type;
        this.data = data;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Map<String, Object> getData() {
        return data;
    }

    public void setData(Map<String, Object> data) {
        this.data = data;
    }

    @Override
    public String toString() {
        return "ChatEvent{type='" + type + "', data=" + data + '}';
    }
}
