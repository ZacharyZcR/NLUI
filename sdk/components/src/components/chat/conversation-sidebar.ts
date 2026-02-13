import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import type { Conversation } from '../../lib/types';
import '../ui/button';

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

@customElement('nlui-conversation-sidebar')
export class NluiConversationSidebar extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  @property({ type: Array }) conversations: Conversation[] = [];
  @property({ type: String }) activeId: string | null = null;

  private handleSelect(id: string) {
    this.dispatchEvent(new CustomEvent('select', {
      detail: { id },
      bubbles: true,
      composed: true
    }));
  }

  private handleNew() {
    this.dispatchEvent(new CustomEvent('new', { bubbles: true, composed: true }));
  }

  private handleDelete(e: Event, id: string) {
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent('delete', {
      detail: { id },
      bubbles: true,
      composed: true
    }));
  }

  render() {
    return html`
      <div class="flex flex-col h-full w-56 shrink-0 border-r bg-card/80">
        <div class="p-3 pb-2">
          <nlui-button
            @click="${this.handleNew}"
            class="w-full justify-center"
            variant="outline"
            size="sm"
          >
            + New Chat
          </nlui-button>
        </div>
        <div class="flex-1 min-h-0 overflow-y-auto">
          <div class="px-2 pb-2 space-y-0.5">
            ${this.conversations.length === 0 ? html`
              <p class="text-xs text-muted-foreground text-center py-10 opacity-50">
                No conversations yet
              </p>
            ` : ''}
            ${repeat(
              this.conversations,
              (conv) => conv.id,
              (conv) => {
                const active = this.activeId === conv.id;
                return html`
                  <div
                    class="group relative flex items-center rounded-lg px-3 py-2 text-[13px] cursor-pointer transition-colors ${
                      active
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                    }"
                    @click="${() => this.handleSelect(conv.id)}"
                  >
                    <span class="flex-1 truncate">
                      ${conv.title || 'Untitled'}
                    </span>
                    <span class="text-[10px] opacity-40 ml-2 shrink-0 group-hover:hidden">
                      ${relativeTime(conv.updatedAt)}
                    </span>
                    <nlui-button
                      variant="ghost"
                      size="sm"
                      @click="${(e: Event) => this.handleDelete(e, conv.id)}"
                      class="hidden group-hover:flex w-5 h-5 shrink-0 ml-1 p-0 hover:text-destructive hover:bg-destructive/10"
                    >
                      ✕
                    </nlui-button>
                  </div>
                `;
              }
            )}
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nlui-conversation-sidebar': NluiConversationSidebar;
  }
}
