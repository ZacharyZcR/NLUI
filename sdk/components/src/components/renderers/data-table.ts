import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '../ui/table';
import '../ui/badge';

@customElement('nlui-data-table')
export class NluiDataTable extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  @property({ type: Array }) columns: string[] = [];
  @property({ type: Array }) rows: Record<string, unknown>[] = [];
  @property({ type: Object }) meta?: Record<string, unknown>;

  private renderCellValue(value: unknown) {
    if (value === null || value === undefined) {
      return html`<span class="text-muted-foreground/40 italic">null</span>`;
    }
    if (typeof value === 'boolean') {
      return html`
        <nlui-badge variant="${value ? 'default' : 'secondary'}" class="text-[10px]">
          ${String(value)}
        </nlui-badge>
      `;
    }
    if (typeof value === 'object') {
      const s = JSON.stringify(value);
      return html`
        <span class="text-muted-foreground/60" title="${s}">
          ${s.length > 40 ? s.slice(0, 40) + '\u2026' : s}
        </span>
      `;
    }
    return html`${String(value)}`;
  }

  render() {
    return html`
      <div class="space-y-1.5">
        ${this.meta && Object.keys(this.meta).length > 0 ? html`
          <div class="flex flex-wrap gap-1">
            ${Object.entries(this.meta).map(([k, v]) => html`
              <nlui-badge variant="outline" class="text-[10px] font-mono">
                ${k}: ${String(v)}
              </nlui-badge>
            `)}
          </div>
        ` : ''}
        <div class="max-h-72 overflow-y-auto overflow-x-auto rounded-md border">
          <nlui-table>
            <nlui-table-header>
              <nlui-table-row>
                ${this.columns.map((col) => html`
                  <nlui-table-head class="font-mono text-[11px] whitespace-nowrap">
                    ${col}
                  </nlui-table-head>
                `)}
              </nlui-table-row>
            </nlui-table-header>
            <nlui-table-body>
              ${this.rows.map((row) => html`
                <nlui-table-row>
                  ${this.columns.map((col) => html`
                    <nlui-table-cell class="text-[11px] font-mono">
                      ${this.renderCellValue(row[col])}
                    </nlui-table-cell>
                  `)}
                </nlui-table-row>
              `)}
            </nlui-table-body>
          </nlui-table>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nlui-data-table': NluiDataTable;
  }
}
