import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type NLUIClient from '@nlui/client';
import type { Message, Conversation } from '../../lib/types';
import './message-list';
import './input-box';
import './conversation-sidebar';

@customElement('nlui-chat-interface')
export class NluiChatInterface extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  @property({ type: Object }) client!: NLUIClient;
  @property({ type: String }) conversationId: string | null = null;
  @property({ type: Array }) conversations: Conversation[] = [];
  @property({ type: Boolean }) showSidebar = false;
  @property({ type: String }) theme: 'light' | 'dark' = 'light';

  @state() private messages: Message[] = [];
  @state() private isLoading = false;
  @state() private error: Error | null = null;
  private msgCounter = 0;

  private nextId() {
    return `msg-${++this.msgCounter}-${Date.now()}`;
  }

  async connectedCallback() {
    super.connectedCallback();
    if (this.conversationId) {
      await this.loadConversation(this.conversationId);
    }
  }

  async updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('conversationId')) {
      if (this.conversationId) {
        await this.loadConversation(this.conversationId);
      } else {
        this.messages = [];
      }
    }
  }

  private async loadConversation(id: string) {
    try {
      const conv = await this.client.getConversation(id);
      this.messages = (conv.messages || []).map((m: any, idx: number) => ({
        id: `${id}-${idx}`,
        role: m.role,
        content: m.content || '',
        toolName: m.tool_name,
        toolArgs: m.tool_arguments,
        timestamp: new Date(),
      }));
    } catch (err) {
      console.error('Failed to load conversation:', err);
    }
  }

  private async handleSend(e: CustomEvent) {
    const text = e.detail.message;
    if (this.isLoading) return;

    // Add user message
    this.messages = [
      ...this.messages,
      {
        id: this.nextId(),
        role: 'user',
        content: text,
        timestamp: new Date(),
      },
    ];
    this.isLoading = true;
    this.error = null;

    let streamId = '';
    let assistantContent = '';

    try {
      await this.client.chat(text, {
        conversationId: this.conversationId || undefined,
        onEvent: (event: any) => {
          if (event.type === 'content_delta') {
            const delta = event.data.delta;
            if (!streamId) {
              streamId = this.nextId();
              assistantContent = delta;
              this.messages = [
                ...this.messages,
                {
                  id: streamId,
                  role: 'assistant',
                  content: assistantContent,
                  timestamp: new Date(),
                },
              ];
            } else {
              assistantContent += delta;
              const msgs = [...this.messages];
              const last = msgs[msgs.length - 1];
              if (last && last.id === streamId) {
                last.content = assistantContent;
                this.messages = msgs;
              }
            }
          } else if (event.type === 'tool_call') {
            streamId = '';
            const { name, arguments: args } = event.data;
            this.messages = [
              ...this.messages,
              {
                id: this.nextId(),
                role: 'tool_call',
                content: '',
                toolName: name,
                toolArgs: args,
                timestamp: new Date(),
              },
            ];
          } else if (event.type === 'tool_result') {
            const { name, result } = event.data;
            this.messages = [
              ...this.messages,
              {
                id: this.nextId(),
                role: 'tool_result',
                content: result,
                toolName: name,
                timestamp: new Date(),
              },
            ];
          } else if (event.type === 'content') {
            streamId = '';
          }
        },
        onDone: (convId: string) => {
          if (!this.conversationId && convId) {
            this.dispatchEvent(new CustomEvent('conversation-change', {
              detail: { id: convId },
              bubbles: true,
              composed: true
            }));
          }
          this.isLoading = false;
        },
        onError: (err: Error) => {
          this.error = err;
          this.isLoading = false;
        },
      });
    } catch (err) {
      this.error = err as Error;
      this.isLoading = false;
    }
  }

  private async handleRetry() {
    const lastUserMsg = this.messages.findLast((m) => m.role === 'user');
    if (lastUserMsg) {
      await this.handleSend(new CustomEvent('send', {
        detail: { message: lastUserMsg.content }
      }));
    }
  }

  private handleConversationSelect(e: CustomEvent) {
    this.dispatchEvent(new CustomEvent('conversation-change', {
      detail: { id: e.detail.id },
      bubbles: true,
      composed: true
    }));
  }

  private handleNewConversation() {
    this.dispatchEvent(new CustomEvent('conversation-change', {
      detail: { id: '' },
      bubbles: true,
      composed: true
    }));
  }

  private async handleDeleteConversation(e: CustomEvent) {
    this.dispatchEvent(new CustomEvent('conversation-delete', {
      detail: { id: e.detail.id },
      bubbles: true,
      composed: true
    }));
  }

  render() {
    return html`
      <div class="flex h-full ${this.theme}">
        ${this.showSidebar ? html`
          <nlui-conversation-sidebar
            .conversations="${this.conversations}"
            activeId="${this.conversationId}"
            @select="${this.handleConversationSelect}"
            @new="${this.handleNewConversation}"
            @delete="${this.handleDeleteConversation}"
          ></nlui-conversation-sidebar>
        ` : ''}
        <div class="flex flex-col flex-1 min-w-0 bg-background text-foreground">
          ${this.error ? html`
            <div class="bg-destructive/10 text-destructive px-4 py-2 text-sm border-b border-destructive/20">
              Error: ${this.error.message}
            </div>
          ` : ''}
          <nlui-message-list
            .messages="${this.messages}"
            ?isLoading="${this.isLoading}"
            @retry="${this.handleRetry}"
          ></nlui-message-list>
          <nlui-input-box
            ?disabled="${this.isLoading}"
            @send="${this.handleSend}"
          ></nlui-input-box>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nlui-chat-interface': NluiChatInterface;
  }
}
