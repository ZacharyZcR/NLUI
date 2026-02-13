import com.nlui.client.NLUIClient;
import com.nlui.client.models.*;
import java.util.*;

/**
 * Complete example of NLUI Java SDK usage.
 * Demonstrates all Phase 1-5 features.
 */
public class JavaExample {
    public static void main(String[] args) throws Exception {
        // Create client
        NLUIClient client = new NLUIClient("http://localhost:9000");

        System.out.println("=== NLUI Java SDK Example ===\n");

        // ==================== Phase 1: Target Management ====================
        System.out.println("Phase 1: Target Management");

        // Add a GitHub API target
        Target github = new Target();
        github.setName("github");
        github.setBaseUrl("https://api.github.com");
        github.setSpec("https://api.github.com/openapi.json");
        github.setAuthType("bearer");
        github.setToken("ghp_your_token_here");
        github.setDescription("GitHub REST API");

        client.addTarget(github);
        System.out.println("✓ Added GitHub target");

        // List all targets
        List<Map<String, Object>> targets = client.listTargets();
        System.out.println("✓ Total targets: " + targets.size());

        // Probe a target
        Map<String, Object> probeResult = client.probeTarget("https://api.github.com");
        System.out.println("✓ Probe result: " + probeResult.get("found"));

        // ==================== Phase 2: Tool Management ====================
        System.out.println("\nPhase 2: Tool Management");

        // List all tools
        List<Tool> tools = client.listTools();
        System.out.println("✓ Available tools: " + tools.size());

        // List tool sources
        List<Map<String, Object>> sources = client.listToolSources();
        System.out.println("✓ Tool sources: " + sources.size());

        // ==================== Phase 3: Chat & Messaging ====================
        System.out.println("\nPhase 3: Chat & Messaging");

        // Send a message with streaming
        System.out.print("Assistant: ");
        String conversationId = client.chat(
            "你好，介绍一下自己",
            event -> {
                // Handle different event types
                switch (event.getType()) {
                    case "content_delta":
                        System.out.print(event.getData().get("delta"));
                        break;
                    case "tool_call":
                        System.out.println("\n[Tool Call: " + event.getData().get("name") + "]");
                        break;
                    case "tool_result":
                        System.out.println("[Tool Result: " + event.getData().get("result") + "]");
                        break;
                }
            },
            convId -> {
                System.out.println("\n✓ Conversation ID: " + convId);
            },
            error -> {
                System.err.println("✗ Error: " + error);
            }
        );

        // Wait a bit for the conversation to complete
        Thread.sleep(1000);

        // Update conversation tools (only enable specific sources)
        if (conversationId != null) {
            client.updateConversationTools(
                conversationId,
                Arrays.asList("github"),  // Only enable github
                Arrays.asList()  // No disabled tools
            );
            System.out.println("✓ Updated conversation tools");
        }

        // ==================== Phase 4: Message Editing ====================
        System.out.println("\nPhase 4: Message Editing");

        if (conversationId != null) {
            // Edit a message and regenerate
            System.out.print("Regenerated: ");
            client.editMessage(
                conversationId,
                0,
                "再详细介绍一下你的功能",
                event -> {
                    if ("content_delta".equals(event.getType())) {
                        System.out.print(event.getData().get("delta"));
                    }
                }
            );
            System.out.println("\n✓ Message edited and regenerated");

            // Regenerate from a specific index
            client.regenerateFrom(conversationId, 0, event -> {
                // Handle events
            });
            System.out.println("✓ Regenerated from index 0");

            // Delete a message
            // client.deleteMessage(conversationId, 2);
            // System.out.println("✓ Message deleted");
        }

        // ==================== Phase 5: LLM Configuration ====================
        System.out.println("\nPhase 5: LLM Configuration");

        // Get current LLM config
        LLMConfig currentConfig = client.getLLMConfig();
        System.out.println("✓ Current model: " + currentConfig.getModel());

        // Update LLM config
        LLMConfig newConfig = new LLMConfig(
            "https://api.openai.com/v1",
            "sk-xxx",
            "gpt-4"
        );
        client.updateLLMConfig(newConfig);
        System.out.println("✓ LLM config updated");

        // Probe local providers
        List<Map<String, Object>> providers = client.probeLLMProviders();
        System.out.println("✓ Found " + providers.size() + " local providers");

        // Fetch models
        List<String> models = client.fetchModels(
            "https://api.openai.com/v1",
            "sk-xxx"
        );
        System.out.println("✓ Available models: " + models.size());

        // ==================== Phase 6: Proxy Configuration ====================
        System.out.println("\nPhase 6: Proxy Configuration");

        // Update proxy
        client.updateProxyConfig("http://127.0.0.1:7890");
        System.out.println("✓ Proxy updated");

        // Test proxy
        Map<String, Object> proxyTest = client.testProxy("http://127.0.0.1:7890");
        System.out.println("✓ Proxy test: " + proxyTest.get("success"));

        // ==================== Conversation Management ====================
        System.out.println("\nConversation Management");

        // List conversations
        List<Conversation> conversations = client.listConversations();
        System.out.println("✓ Total conversations: " + conversations.size());

        // Get conversation details
        if (conversationId != null) {
            Conversation conv = client.getConversation(conversationId);
            System.out.println("✓ Conversation title: " + conv.getTitle());
            System.out.println("✓ Messages: " + conv.getMessages().size());
        }

        // Clean up (optional)
        // client.removeTarget("github");
        // if (conversationId != null) {
        //     client.deleteConversation(conversationId);
        // }

        System.out.println("\n=== Example Complete ===");
    }
}
