package com.nlui.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nlui.client.models.*;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import java.util.function.Consumer;

/**
 * NLUI Java SDK - HTTP Client for NLUI Server
 * <p>
 * Supports all Phase 1-5 features:
 * - Phase 1: Target Management
 * - Phase 2: Tool Management
 * - Phase 3: Message Editing & Regeneration
 * - Phase 4: LLM Configuration
 * - Phase 5: Proxy Configuration
 */
public class NLUIClient {
    private final String baseURL;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    /**
     * Create a new NLUI client instance.
     *
     * @param baseURL The base URL of the NLUI server (e.g., "http://localhost:9000")
     */
    public NLUIClient(String baseURL) {
        this.baseURL = baseURL.endsWith("/") ? baseURL.substring(0, baseURL.length() - 1) : baseURL;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        this.objectMapper = new ObjectMapper();
    }

    // ==================== Core Chat API ====================

    /**
     * Send a chat message with streaming response.
     *
     * @param message    The message to send
     * @param onEvent    Event handler for SSE events
     * @param onDone     Called when the conversation is complete
     * @param onError    Error handler
     * @return The conversation ID
     */
    public String chat(String message, Consumer<ChatEvent> onEvent, Consumer<String> onDone, Consumer<String> onError) {
        return chat(null, message, onEvent, onDone, onError);
    }

    /**
     * Send a chat message with streaming response.
     *
     * @param conversationId Existing conversation ID (null for new conversation)
     * @param message        The message to send
     * @param onEvent        Event handler for SSE events
     * @param onDone         Called when the conversation is complete
     * @param onError        Error handler
     * @return The conversation ID
     */
    public String chat(String conversationId, String message, Consumer<ChatEvent> onEvent, Consumer<String> onDone, Consumer<String> onError) {
        try {
            Map<String, String> body = new HashMap<>();
            body.put("message", message);
            if (conversationId != null) {
                body.put("conversation_id", conversationId);
            }

            String jsonBody = objectMapper.writeValueAsString(body);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseURL + "/api/chat"))
                    .header("Content-Type", "application/json")
                    .header("Accept", "text/event-stream")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                if (onError != null) onError.accept("HTTP " + response.statusCode());
                return null;
            }

            // Parse SSE events
            String[] finalConvId = {null};
            parseSSEEvents(response.body(), event -> {
                if ("done".equals(event.getType())) {
                    Map<String, Object> data = event.getData();
                    if (data != null && data.containsKey("conversation_id")) {
                        finalConvId[0] = data.get("conversation_id").toString();
                    }
                    if (onDone != null) onDone.accept(finalConvId[0]);
                }
                if (onEvent != null) onEvent.accept(event);
            });

            return finalConvId[0];
        } catch (Exception e) {
            if (onError != null) onError.accept(e.getMessage());
            return null;
        }
    }

    // ==================== Phase 1: Target Management ====================

    /**
     * Add a new OpenAPI target.
     */
    public void addTarget(Target target) throws IOException, InterruptedException {
        String jsonBody = objectMapper.writeValueAsString(target);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseURL + "/api/targets"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();
        httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    }

    /**
     * List all targets.
     */
    public List<Map<String, Object>> listTargets() throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseURL + "/api/targets"))
                .GET()
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        return objectMapper.readValue(response.body(), List.class);
    }

    /**
     * Remove a target by name.
     */
    public void removeTarget(String name) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseURL + "/api/targets/" + name))
                .DELETE()
                .build();
        httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    }

    /**
     * Probe an OpenAPI specification URL.
     */
    public Map<String, Object> probeTarget(String url) throws IOException, InterruptedException {
        Map<String, String> body = Collections.singletonMap("url", url);
        String jsonBody = objectMapper.writeValueAsString(body);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseURL + "/api/targets/probe"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        return objectMapper.readValue(response.body(), Map.class);
    }

    // ==================== Phase 2: Tool Management ====================

    /**
     * List all available tools.
     */
    public List<Tool> listTools() throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseURL + "/api/tools"))
                .GET()
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        return Arrays.asList(objectMapper.readValue(response.body(), Tool[].class));
    }

    /**
     * List all tool sources.
     */
    public List<Map<String, Object>> listToolSources() throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseURL + "/api/tools/sources"))
                .GET()
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        return objectMapper.readValue(response.body(), List.class);
    }

    /**
     * Update conversation tool configuration.
     */
    public void updateConversationTools(String conversationId, List<String> enabledSources, List<String> disabledTools) throws IOException, InterruptedException {
        Map<String, Object> body = new HashMap<>();
        body.put("enabled_sources", enabledSources != null ? enabledSources : Collections.emptyList());
        body.put("disabled_tools", disabledTools != null ? disabledTools : Collections.emptyList());
        String jsonBody = objectMapper.writeValueAsString(body);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseURL + "/api/conversations/" + conversationId + "/tools"))
                .header("Content-Type", "application/json")
                .PUT(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();
        httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    }

    // ==================== Phase 3: Message Editing ====================

    /**
     * Edit a message and regenerate from that point.
     */
    public void editMessage(String conversationId, int messageIndex, String newContent, Consumer<ChatEvent> onEvent) throws IOException, InterruptedException {
        Map<String, Object> body = new HashMap<>();
        body.put("content", newContent);
        String jsonBody = objectMapper.writeValueAsString(body);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseURL + "/api/conversations/" + conversationId + "/messages/" + messageIndex))
                .header("Content-Type", "application/json")
                .header("Accept", "text/event-stream")
                .PUT(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        parseSSEEvents(response.body(), onEvent);
    }

    /**
     * Regenerate conversation from a specific message index.
     */
    public void regenerateFrom(String conversationId, int fromIndex, Consumer<ChatEvent> onEvent) throws IOException, InterruptedException {
        Map<String, Object> body = Collections.singletonMap("from_index", fromIndex);
        String jsonBody = objectMapper.writeValueAsString(body);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseURL + "/api/conversations/" + conversationId + "/regenerate"))
                .header("Content-Type", "application/json")
                .header("Accept", "text/event-stream")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        parseSSEEvents(response.body(), onEvent);
    }

    /**
     * Delete a single message.
     */
    public void deleteMessage(String conversationId, int messageIndex) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseURL + "/api/conversations/" + conversationId + "/messages/" + messageIndex))
                .DELETE()
                .build();
        httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    }

    /**
     * Delete messages from a specific index onwards.
     */
    public void deleteMessagesFrom(String conversationId, int fromIndex) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseURL + "/api/conversations/" + conversationId + "/messages/" + fromIndex + "/from"))
                .DELETE()
                .build();
        httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    }

    // ==================== Phase 4: LLM Configuration ====================

    /**
     * Get current LLM configuration.
     */
    public LLMConfig getLLMConfig() throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseURL + "/api/config/llm"))
                .GET()
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        return objectMapper.readValue(response.body(), LLMConfig.class);
    }

    /**
     * Update LLM configuration.
     */
    public void updateLLMConfig(LLMConfig config) throws IOException, InterruptedException {
        String jsonBody = objectMapper.writeValueAsString(config);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseURL + "/api/config/llm"))
                .header("Content-Type", "application/json")
                .PUT(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();
        httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    }

    /**
     * Probe for local LLM providers.
     */
    public List<Map<String, Object>> probeLLMProviders() throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseURL + "/api/config/llm/providers"))
                .GET()
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        return objectMapper.readValue(response.body(), List.class);
    }

    /**
     * Fetch available models from an LLM provider.
     */
    public List<String> fetchModels(String apiBase, String apiKey) throws IOException, InterruptedException {
        Map<String, String> body = new HashMap<>();
        body.put("api_base", apiBase);
        if (apiKey != null) body.put("api_key", apiKey);
        String jsonBody = objectMapper.writeValueAsString(body);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseURL + "/api/config/llm/models"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        return objectMapper.readValue(response.body(), List.class);
    }

    // ==================== Phase 5: Proxy Configuration ====================

    /**
     * Get current proxy configuration.
     */
    public Map<String, String> getProxyConfig() throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseURL + "/api/config/proxy"))
                .GET()
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        return objectMapper.readValue(response.body(), Map.class);
    }

    /**
     * Update proxy configuration.
     */
    public void updateProxyConfig(String proxyURL) throws IOException, InterruptedException {
        Map<String, String> body = Collections.singletonMap("url", proxyURL != null ? proxyURL : "");
        String jsonBody = objectMapper.writeValueAsString(body);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseURL + "/api/config/proxy"))
                .header("Content-Type", "application/json")
                .PUT(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();
        httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    }

    /**
     * Test proxy connectivity.
     */
    public Map<String, Object> testProxy(String proxyURL) throws IOException, InterruptedException {
        Map<String, String> body = Collections.singletonMap("url", proxyURL);
        String jsonBody = objectMapper.writeValueAsString(body);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseURL + "/api/config/proxy/test"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        return objectMapper.readValue(response.body(), Map.class);
    }

    // ==================== Conversation Management ====================

    /**
     * List all conversations.
     */
    public List<Conversation> listConversations() throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseURL + "/api/conversations"))
                .GET()
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        return Arrays.asList(objectMapper.readValue(response.body(), Conversation[].class));
    }

    /**
     * Get a conversation by ID.
     */
    public Conversation getConversation(String id) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseURL + "/api/conversations/" + id))
                .GET()
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        return objectMapper.readValue(response.body(), Conversation.class);
    }

    /**
     * Delete a conversation.
     */
    public void deleteConversation(String id) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseURL + "/api/conversations/" + id))
                .DELETE()
                .build();
        httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    }

    // ==================== Helper Methods ====================

    private void parseSSEEvents(String sseData, Consumer<ChatEvent> onEvent) {
        if (onEvent == null) return;

        String[] lines = sseData.split("\n");
        String currentEvent = null;
        StringBuilder currentData = new StringBuilder();

        for (String line : lines) {
            if (line.startsWith("event:")) {
                currentEvent = line.substring(6).trim();
            } else if (line.startsWith("data:")) {
                currentData.append(line.substring(5).trim());
            } else if (line.isEmpty() && currentEvent != null) {
                try {
                    Map<String, Object> data = objectMapper.readValue(currentData.toString(), Map.class);
                    onEvent.accept(new ChatEvent(currentEvent, data));
                } catch (Exception e) {
                    // Ignore parse errors
                }
                currentEvent = null;
                currentData = new StringBuilder();
            }
        }
    }
}
