import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { cn } from '../../lib/utils';

@customElement('nlui-table')
export class NluiTable extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`<table class="${cn('w-full caption-bottom text-sm')}"><slot></slot></table>`;
  }
}

@customElement('nlui-table-header')
export class NluiTableHeader extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`<thead class="${cn('[&_tr]:border-b')}"><slot></slot></thead>`;
  }
}

@customElement('nlui-table-body')
export class NluiTableBody extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`<tbody class="${cn('[&_tr:last-child]:border-0')}"><slot></slot></tbody>`;
  }
}

@customElement('nlui-table-row')
export class NluiTableRow extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`<tr class="${cn('border-b transition-colors hover:bg-muted/50')}"><slot></slot></tr>`;
  }
}

@customElement('nlui-table-head')
export class NluiTableHead extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`<th class="${cn('h-8 px-2 text-left align-middle font-medium text-muted-foreground')}"><slot></slot></th>`;
  }
}

@customElement('nlui-table-cell')
export class NluiTableCell extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`<td class="${cn('px-2 py-1.5 align-middle')}"><slot></slot></td>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nlui-table': NluiTable;
    'nlui-table-header': NluiTableHeader;
    'nlui-table-body': NluiTableBody;
    'nlui-table-row': NluiTableRow;
    'nlui-table-head': NluiTableHead;
    'nlui-table-cell': NluiTableCell;
  }
}
