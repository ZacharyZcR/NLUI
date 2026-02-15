import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { cn } from '../../lib/utils';

@customElement('nlui-textarea')
export class NluiTextarea extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  @property({ type: String }) value = '';
  @property({ type: String }) placeholder = '';
  @property({ type: Boolean }) disabled = false;
  @property({ type: Number }) rows = 3;

  private handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    this.value = target.value;
    this.dispatchEvent(new CustomEvent('input', { detail: { value: this.value }, bubbles: true, composed: true }));
  }

  render() {
    return html`
      <textarea
        class="${cn('border-input placeholder:text-muted-foreground focus-visible:border-ring flex min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-sm transition-colors outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-none')}"
        .value="${this.value}"
        placeholder="${this.placeholder}"
        ?disabled="${this.disabled}"
        rows="${this.rows}"
        @input="${this.handleInput}"
      ></textarea>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nlui-textarea': NluiTextarea;
  }
}
