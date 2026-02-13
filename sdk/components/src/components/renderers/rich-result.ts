import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { detectShape } from '../../lib/detect-shape';
import type { RenderHint } from '../../lib/render-blocks';
import './data-table';
import './kv-card';
import './badge-list';

@customElement('nlui-rich-result')
export class NluiRichResult extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  @property({ type: String }) raw = '';
  @property({ type: String }) forceType?: RenderHint;
  @state() private showRaw = false;

  private get shape() {
    return detectShape(this.raw);
  }

  private get hasRich() {
    return this.shape.type !== 'raw';
  }

  private renderRawView() {
    let formatted: string;
    try {
      formatted = JSON.stringify(JSON.parse(this.raw), null, 2);
    } catch {
      formatted = this.raw;
    }
    return html`
      <pre class="text-[11px] text-muted-foreground/80 font-mono bg-muted/50 rounded-md px-3 py-2 overflow-x-auto whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed">
${formatted}</pre>
    `;
  }

  private renderShape() {
    if (this.forceType) {
      const forced = detectShape(this.raw);
      if (this.forceType === 'table' && (forced.type === 'table' || forced.type === 'wrapped-table')) {
        return html`
          <nlui-data-table
            .columns="${forced.columns}"
            .rows="${forced.rows}"
            .meta="${forced.type === 'wrapped-table' ? forced.meta : undefined}"
          ></nlui-data-table>
        `;
      }
      if (this.forceType === 'kv' && forced.type === 'kv') {
        return html`<nlui-kv-card .entries="${forced.entries}"></nlui-kv-card>`;
      }
      if (this.forceType === 'badges' && forced.type === 'list') {
        return html`<nlui-badge-list .items="${forced.items}"></nlui-badge-list>`;
      }
    }

    const shape = this.shape;
    switch (shape.type) {
      case 'table':
        return html`<nlui-data-table .columns="${shape.columns}" .rows="${shape.rows}"></nlui-data-table>`;
      case 'wrapped-table':
        return html`<nlui-data-table .columns="${shape.columns}" .rows="${shape.rows}" .meta="${shape.meta}"></nlui-data-table>`;
      case 'kv':
        return html`<nlui-kv-card .entries="${shape.entries}"></nlui-kv-card>`;
      case 'list':
        return html`<nlui-badge-list .items="${shape.items}"></nlui-badge-list>`;
      default:
        return this.renderRawView();
    }
  }

  render() {
    if (!this.hasRich && !this.forceType) {
      return this.renderRawView();
    }

    return html`
      <div class="relative">
        ${this.hasRich ? html`
          <button
            @click="${(e: Event) => { e.stopPropagation(); this.showRaw = !this.showRaw; }}"
            class="absolute top-0 right-0 z-10 p-1 rounded text-muted-foreground hover:text-foreground bg-muted/70 hover:bg-muted transition-colors"
            title="${this.showRaw ? 'Rich view' : 'Raw JSON'}"
          >
            ${this.showRaw ? '◫' : '{ }'}
          </button>
        ` : ''}
        ${this.showRaw ? this.renderRawView() : this.renderShape()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nlui-rich-result': NluiRichResult;
  }
}
