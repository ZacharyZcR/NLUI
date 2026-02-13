import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '../ui/card';

@customElement('nlui-kv-card')
export class NluiKVCard extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  @property({ type: Array }) entries: [string, unknown][] = [];

  private renderValue(value: unknown) {
    if (value === null || value === undefined) {
      return html`<span class="text-muted-foreground/40 italic">null</span>`;
    }
    if (typeof value === 'boolean') {
      return html`<span class="${value ? 'text-emerald-500' : 'text-red-400'}">${String(value)}</span>`;
    }
    if (typeof value === 'number') {
      return html`<span class="text-blue-500 dark:text-blue-400">${value}</span>`;
    }
    if (typeof value === 'object') {
      const s = JSON.stringify(value, null, 2);
      return html`
        <pre class="whitespace-pre-wrap text-muted-foreground/70 bg-muted/50 rounded px-1.5 py-0.5 text-[10px]">
${s.length > 200 ? s.slice(0, 200) + '\u2026' : s}</pre>
      `;
    }
    return html`${String(value)}`;
  }

  render() {
    return html`
      <nlui-card class="py-3 gap-0">
        <div class="px-3">
          <div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            ${this.entries.map(([key, value]) => html`
              <span class="font-mono text-[11px] text-muted-foreground whitespace-nowrap">${key}</span>
              <span class="text-[11px] font-mono break-all">
                ${this.renderValue(value)}
              </span>
            `)}
          </div>
        </div>
      </nlui-card>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nlui-kv-card': NluiKVCard;
  }
}
