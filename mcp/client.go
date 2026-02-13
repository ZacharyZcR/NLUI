package mcp

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os/exec"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

type Client struct {
	name   string
	cmd    *exec.Cmd
	stdin  io.WriteCloser
	mu     sync.Mutex
	nextID int64
	pending sync.Map
	tools  []MCPTool
	done   chan struct{}
}

func NewStdioClient(name, command string, args []string) (*Client, error) {
	cmd := exec.Command(command, args...)
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, fmt.Errorf("stdin pipe: %w", err)
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, fmt.Errorf("stdout pipe: %w", err)
	}

	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("start process: %w", err)
	}

	c := &Client{
		name:  name,
		cmd:   cmd,
		stdin: stdin,
		done:  make(chan struct{}),
	}

	go c.readLoop(bufio.NewReader(stdout))

	if err := c.initialize(); err != nil {
		c.Close()
		return nil, fmt.Errorf("initialize: %w", err)
	}

	tools, err := c.listTools()
	if err != nil {
		c.Close()
		return nil, fmt.Errorf("list tools: %w", err)
	}
	c.tools = tools

	return c, nil
}

func (c *Client) readLoop(reader *bufio.Reader) {
	defer close(c.done)
	scanner := bufio.NewScanner(reader)
	scanner.Buffer(make([]byte, 1024*1024), 1024*1024)

	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			continue
		}

		var envelope struct {
			ID     *json.RawMessage `json:"id"`
			Result json.RawMessage  `json:"result"`
			Error  *RPCError        `json:"error"`
		}
		if err := json.Unmarshal([]byte(line), &envelope); err != nil {
			continue
		}
		if envelope.ID == nil {
			continue
		}

		var id int64
		if err := json.Unmarshal(*envelope.ID, &id); err != nil {
			continue
		}

		if ch, ok := c.pending.LoadAndDelete(id); ok {
			ch.(chan *RPCResponse) <- &RPCResponse{
				Result: envelope.Result,
				Error:  envelope.Error,
			}
		}
	}
}

func (c *Client) send(method string, params interface{}) (json.RawMessage, error) {
	id := atomic.AddInt64(&c.nextID, 1)

	ch := make(chan *RPCResponse, 1)
	c.pending.Store(id, ch)
	defer c.pending.Delete(id)

	rawID, _ := json.Marshal(id)
	var rawParams json.RawMessage
	if params != nil {
		rawParams, _ = json.Marshal(params)
	}

	req := RPCRequest{
		JSONRPC: "2.0",
		ID:      (*json.RawMessage)(&rawID),
		Method:  method,
		Params:  rawParams,
	}

	c.mu.Lock()
	data, _ := json.Marshal(req)
	_, err := fmt.Fprintf(c.stdin, "%s\n", string(data))
	c.mu.Unlock()

	if err != nil {
		return nil, fmt.Errorf("write: %w", err)
	}

	select {
	case resp := <-ch:
		if resp.Error != nil {
			return nil, fmt.Errorf("RPC error %d: %s", resp.Error.Code, resp.Error.Message)
		}
		return resp.Result, nil
	case <-time.After(30 * time.Second):
		return nil, fmt.Errorf("timeout")
	case <-c.done:
		return nil, fmt.Errorf("connection closed")
	}
}

func (c *Client) notify(method string) error {
	req := RPCRequest{
		JSONRPC: "2.0",
		Method:  method,
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	data, _ := json.Marshal(req)
	_, err := fmt.Fprintf(c.stdin, "%s\n", string(data))
	return err
}

func (c *Client) initialize() error {
	params := InitializeParams{
		ProtocolVersion: "2024-11-05",
		ClientInfo:      EntityInfo{Name: "kelper", Version: "0.1.0"},
	}
	if _, err := c.send("initialize", params); err != nil {
		return err
	}
	return c.notify("notifications/initialized")
}

func (c *Client) listTools() ([]MCPTool, error) {
	result, err := c.send("tools/list", struct{}{})
	if err != nil {
		return nil, err
	}
	var toolsResult ToolsListResult
	if err := json.Unmarshal(result, &toolsResult); err != nil {
		return nil, err
	}
	return toolsResult.Tools, nil
}

func (c *Client) Tools() []MCPTool {
	return c.tools
}

func (c *Client) Name() string {
	return c.name
}

func (c *Client) CallTool(ctx context.Context, name, argsJSON string) (string, error) {
	var args map[string]interface{}
	if argsJSON != "" {
		json.Unmarshal([]byte(argsJSON), &args)
	}

	result, err := c.send("tools/call", ToolCallParams{Name: name, Arguments: args})
	if err != nil {
		return "", err
	}

	var callResult ToolCallResult
	if err := json.Unmarshal(result, &callResult); err != nil {
		return "", err
	}

	var texts []string
	for _, block := range callResult.Content {
		if block.Type == "text" {
			texts = append(texts, block.Text)
		}
	}
	return strings.Join(texts, "\n"), nil
}

func (c *Client) Close() error {
	c.stdin.Close()
	return c.cmd.Wait()
}
