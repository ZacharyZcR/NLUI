import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import type { Message } from '../../lib/types';
import './message';

@customElement('nlui-message-list')
export class NluiMessageList extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  @property({ type: Array }) messages: Message[] = [];
  @property({ type: Boolean }) isLoading = false;

  updated() {
    // Auto-scroll to bottom
    setTimeout(() => {
      const scrollTarget = this.querySelector('.scroll-anchor');
      scrollTarget?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }

  render() {
    return html`
      <div class="flex-1 min-h-0 overflow-y-auto px-4 py-6">
        <div class="max-w-3xl mx-auto space-y-4">
          ${this.messages.length === 0 ? html`
            <div class="flex items-center justify-center h-full text-muted-foreground text-sm">
              Start a conversation by typing a message below
            </div>
          ` : ''}
          ${repeat(
            this.messages,
            (msg) => msg.id,
            (msg, index) => html`
              <nlui-message
                .message="${msg}"
                ?isLast="${index === this.messages.length - 1}"
                ?retryable="${index === this.messages.length - 1 && msg.role === 'assistant'}"
                @retry="${() => this.dispatchEvent(new CustomEvent('retry', { bubbles: true, composed: true }))}"
              ></nlui-message>
            `
          )}
          ${this.isLoading ? html`
            <div class="flex justify-start">
              <div class="max-w-[85%] md:max-w-[75%] rounded-2xl rounded-bl-md bg-muted/80 px-4 py-2.5 shadow-sm">
                <div class="flex gap-1.5 items-center">
                  <div class="typing-dot"></div>
                  <div class="typing-dot"></div>
                  <div class="typing-dot"></div>
                </div>
              </div>
            </div>
          ` : ''}
          <div class="scroll-anchor"></div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nlui-message-list': NluiMessageList;
  }
}
