import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { cn } from '../../lib/utils';

@customElement('nlui-input')
export class NluiInput extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  @property({ type: String }) value = '';
  @property({ type: String }) placeholder = '';
  @property({ type: String }) type = 'text';
  @property({ type: Boolean }) disabled = false;

  private handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    this.value = target.value;
    this.dispatchEvent(new CustomEvent('input', { detail: { value: this.value }, bubbles: true, composed: true }));
  }

  render() {
    return html`
      <input
        type="${this.type}"
        class="${cn('placeholder:text-muted-foreground border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-sm transition-colors outline-none disabled:cursor-not-allowed disabled:opacity-50')}"
        .value="${this.value}"
        placeholder="${this.placeholder}"
        ?disabled="${this.disabled}"
        @input="${this.handleInput}"
      />
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nlui-input': NluiInput;
  }
}
