//go:build ignore

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	nluisdk "github.com/ZacharyZcR/NLUI/sdk/go"
)

func main() {
	// 创建客户端
	client := nluisdk.NewClient("http://localhost:9000")

	ctx := context.Background()

	// 1. 健康检查
	health, err := client.Health(ctx)
	if err != nil {
		log.Fatalf("Health check failed: %v", err)
	}
	fmt.Printf("✓ NLUI is healthy, %d tools available\n\n", health.Tools)

	// 2. 获取服务信息
	info, err := client.Info(ctx)
	if err != nil {
		log.Fatalf("Info request failed: %v", err)
	}
	fmt.Printf("Language: %s, Tools: %d\n\n", info.Language, info.Tools)

	// 3. 创建新对话
	conv, err := client.CreateConversation(ctx, "Go SDK 测试对话")
	if err != nil {
		log.Fatalf("Create conversation failed: %v", err)
	}
	fmt.Printf("Created conversation: %s\n\n", conv.ID)

	// 4. 发送聊天消息（SSE 流式）
	fmt.Println("Sending message...")
	fmt.Print("Assistant: ")

	err = client.Chat(ctx, "你好，介绍一下自己", nluisdk.ChatOptions{
		ConversationID: conv.ID,
		OnEvent: func(event nluisdk.ChatEvent) {
			// 解析不同类型的事件
			switch event.Type {
			case "content_delta":
				var data struct {
					Delta string `json:"delta"`
				}
				if err := json.Unmarshal(event.Data, &data); err == nil {
					fmt.Print(data.Delta)
				}
			case "tool_call":
				var data struct {
					Name      string `json:"name"`
					Arguments string `json:"arguments"`
				}
				if err := json.Unmarshal(event.Data, &data); err == nil {
					fmt.Printf("\n[Tool Call: %s]\n", data.Name)
				}
			case "tool_result":
				var data struct {
					Name   string `json:"name"`
					Result string `json:"result"`
				}
				if err := json.Unmarshal(event.Data, &data); err == nil {
					fmt.Printf("[Tool Result: %s]\n", data.Name)
				}
			}
		},
		OnDone: func(conversationID string) {
			fmt.Printf("\n\n✓ Conversation completed: %s\n", conversationID)
		},
	})

	if err != nil {
		log.Fatalf("Chat failed: %v", err)
	}

	// 5. 列出所有对话
	conversations, err := client.ListConversations(ctx)
	if err != nil {
		log.Fatalf("List conversations failed: %v", err)
	}
	fmt.Printf("\nTotal conversations: %d\n", len(conversations))
	for _, c := range conversations {
		fmt.Printf("  - %s: %s (%d messages)\n", c.ID, c.Title, len(c.Messages))
	}

	// 6. 获取对话详情
	fullConv, err := client.GetConversation(ctx, conv.ID)
	if err != nil {
		log.Fatalf("Get conversation failed: %v", err)
	}
	fmt.Printf("\nConversation '%s' has %d messages\n", fullConv.Title, len(fullConv.Messages))

	// 7. 删除对话（可选）
	// err = client.DeleteConversation(ctx, conv.ID)
	// if err != nil {
	// 	log.Fatalf("Delete conversation failed: %v", err)
	// }
	// fmt.Println("Conversation deleted")
}
