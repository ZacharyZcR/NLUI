import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { splitRenderBlocks } from '../../lib/render-blocks';
import '../renderers/rich-result';

// Simple markdown to HTML converter (basic implementation)
function markdownToHTML(text: string): string {
  return text
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/```([a-z]*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/\n/g, '<br>');
}

@customElement('nlui-assistant-message')
export class NluiAssistantMessage extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  @property({ type: String }) content = '';
  @property({ type: Boolean }) isLast = false;
  @property({ type: Boolean }) retryable = false;
  @property({ type: Boolean }) deletable = false;

  private handleRetry() {
    this.dispatchEvent(new CustomEvent('retry', { bubbles: true, composed: true }));
  }

  private handleDelete() {
    this.dispatchEvent(new CustomEvent('delete', { bubbles: true, composed: true }));
  }

  private handleCopy() {
    navigator.clipboard.writeText(this.content);
  }

  render() {
    const blocks = splitRenderBlocks(this.content);
    const hasRenderBlocks = blocks.length > 1 || blocks[0]?.type === 'render';

    return html`
      <div class="flex justify-start group/assistant">
        <div class="max-w-[85%] md:max-w-[75%] rounded-2xl rounded-bl-md bg-muted/80 px-4 py-2.5 shadow-sm overflow-hidden relative ${hasRenderBlocks ? 'space-y-2' : ''}">
          ${hasRenderBlocks ? html`
            ${blocks.map((block) =>
              block.type === 'markdown'
                ? html`<div class="nlui-md prose prose-sm max-w-none">${unsafeHTML(markdownToHTML(block.content))}</div>`
                : html`<nlui-rich-result raw="${block.data}" forceType="${block.hint}"></nlui-rich-result>`
            )}
          ` : html`
            <div class="nlui-md prose prose-sm max-w-none">${unsafeHTML(markdownToHTML(this.content))}</div>
          `}
          <div class="absolute top-1.5 right-1.5 opacity-0 group-hover/assistant:opacity-100 transition-opacity flex gap-1">
            ${this.isLast && this.retryable ? html`
              <button
                @click="${this.handleRetry}"
                class="w-7 h-7 flex items-center justify-center rounded bg-background/60 backdrop-blur-sm hover:bg-background/80 text-muted-foreground hover:text-foreground"
                title="Retry"
              >
                ↻
              </button>
            ` : ''}
            ${this.deletable ? html`
              <button
                @click="${this.handleDelete}"
                class="w-7 h-7 flex items-center justify-center rounded bg-background/60 backdrop-blur-sm hover:bg-destructive/80 text-muted-foreground hover:text-foreground"
                title="Delete"
              >
                🗑
              </button>
            ` : ''}
            <button
              @click="${this.handleCopy}"
              class="w-7 h-7 flex items-center justify-center rounded bg-background/60 backdrop-blur-sm hover:bg-background/80 text-muted-foreground hover:text-foreground"
              title="Copy"
            >
              📋
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nlui-assistant-message': NluiAssistantMessage;
  }
}
