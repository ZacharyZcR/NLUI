import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { cn } from '../../lib/utils';

@customElement('nlui-card')
export class NluiCard extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <div class="${cn('bg-card text-card-foreground rounded-lg border shadow-sm p-6')}">
        <slot></slot>
      </div>
    `;
  }
}

@customElement('nlui-card-header')
export class NluiCardHeader extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <div class="${cn('flex flex-col space-y-1.5 pb-4')}">
        <slot></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nlui-card': NluiCard;
    'nlui-card-header': NluiCardHeader;
  }
}
