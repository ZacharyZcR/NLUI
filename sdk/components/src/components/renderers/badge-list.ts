import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '../ui/badge';

const MAX_ITEMS = 50;

@customElement('nlui-badge-list')
export class NluiBadgeList extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  @property({ type: Array }) items: (string | number | boolean)[] = [];

  render() {
    const visible = this.items.slice(0, MAX_ITEMS);
    const overflow = this.items.length - MAX_ITEMS;

    return html`
      <div class="flex flex-wrap gap-1">
        ${visible.map((item) => html`
          <nlui-badge variant="secondary" class="text-[11px] font-mono">
            ${String(item)}
          </nlui-badge>
        `)}
        ${overflow > 0 ? html`
          <nlui-badge variant="outline" class="text-[10px] text-muted-foreground">
            +${overflow} more
          </nlui-badge>
        ` : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nlui-badge-list': NluiBadgeList;
  }
}
