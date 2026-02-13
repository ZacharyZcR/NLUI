import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '../renderers/rich-result';

@customElement('nlui-tool-result-message')
export class NluiToolResultMessage extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  @property({ type: String }) name = '';
  @property({ type: String }) content = '';
  @state() private open = false;
  @state() private copied = false;

  private get preview() {
    return this.content.length > 100 ? this.content.slice(0, 100) + '\u2026' : this.content;
  }

  private get size() {
    return this.content.length > 1024
      ? `${(this.content.length / 1024).toFixed(1)}KB`
      : `${this.content.length}B`;
  }

  private get lines() {
    return this.content.split('\n').length;
  }

  private handleCopy(e: Event) {
    e.stopPropagation();
    navigator.clipboard.writeText(this.content);
    this.copied = true;
    setTimeout(() => this.copied = false, 1500);
  }

  render() {
    return html`
      <div class="pl-2">
        <div
          class="border-l-2 border-emerald-400/60 dark:border-emerald-500/40 pl-3 py-1 cursor-pointer group/tool"
          @click="${() => this.open = !this.open}"
        >
          <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
            ${this.open ? html`<span class="text-emerald-500 dark:text-emerald-400">▼</span>` : html`<span class="text-emerald-500 dark:text-emerald-400">✓</span>`}
            <span class="font-mono font-medium text-foreground/70">${this.name}</span>
            <span class="text-muted-foreground/30 text-[10px]">${this.size}</span>
            ${!this.open ? html`
              <span class="text-muted-foreground/40 truncate flex-1 font-mono text-[11px]">
                ${this.preview.replace(/\n/g, ' ')}
              </span>
            ` : ''}
          </div>
          ${this.open ? html`
            <div class="mt-1.5 relative group" @click="${(e: Event) => e.stopPropagation()}">
              <nlui-rich-result raw="${this.content}"></nlui-rich-result>
              <button
                @click="${this.handleCopy}"
                class="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded bg-background/60 backdrop-blur-sm text-muted-foreground hover:text-foreground"
                title="Copy"
              >
                ${this.copied ? '✓' : '📋'}
              </button>
              ${this.lines > 5 ? html`
                <span class="absolute bottom-1.5 right-1.5 text-[9px] text-muted-foreground/30 font-mono">
                  ${this.lines} lines
                </span>
              ` : ''}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nlui-tool-result-message': NluiToolResultMessage;
  }
}
