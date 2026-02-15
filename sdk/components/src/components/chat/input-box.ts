import { LitElement, html } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import '../ui/button';
import '../ui/textarea';

@customElement('nlui-input-box')
export class NluiInputBox extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  @property({ type: Boolean }) disabled = false;
  @property({ type: String }) placeholder = 'Type a message...';
  @state() private value = '';
  @query('textarea') private textarea?: HTMLTextAreaElement;

  private handleSend() {
    const trimmed = this.value.trim();
    if (!trimmed || this.disabled) return;

    this.dispatchEvent(new CustomEvent('send', {
      detail: { message: trimmed },
      bubbles: true,
      composed: true
    }));

    this.value = '';
    if (this.textarea) {
      this.textarea.style.height = 'auto';
    }
    setTimeout(() => this.textarea?.focus(), 0);
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.handleSend();
    }
  }

  private handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    this.value = target.value;
    target.style.height = 'auto';
    target.style.height = Math.min(target.scrollHeight, 160) + 'px';
  }

  render() {
    return html`
      <div class="border-t bg-card/40 px-4 py-3 shrink-0">
        <div class="flex gap-2 items-end max-w-3xl mx-auto">
          <textarea
            class="border-input placeholder:text-muted-foreground focus-visible:border-ring flex-1 min-h-[40px] max-h-[160px] resize-none rounded-xl px-3.5 py-2.5 leading-relaxed w-full rounded-md border bg-transparent text-base shadow-sm transition-colors outline-none disabled:cursor-not-allowed disabled:opacity-50"
            .value="${this.value}"
            placeholder="${this.placeholder}"
            ?disabled="${this.disabled}"
            rows="1"
            @input="${this.handleInput}"
            @keydown="${this.handleKeyDown}"
          ></textarea>
          <nlui-button
            @click="${this.handleSend}"
            ?disabled="${this.disabled || !this.value.trim()}"
            size="sm"
            class="h-[40px] px-5 rounded-xl shrink-0"
          >
            ➤ Send
          </nlui-button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nlui-input-box': NluiInputBox;
  }
}
