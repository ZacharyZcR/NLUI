import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Message as MessageType } from '../../lib/types';
import './user-message';
import './assistant-message';
import './tool-call-message';
import './tool-result-message';

@customElement('nlui-message')
export class NluiMessage extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  @property({ type: Object }) message!: MessageType;
  @property({ type: Boolean }) isLast = false;
  @property({ type: Boolean }) editable = false;
  @property({ type: Boolean }) deletable = false;
  @property({ type: Boolean }) retryable = false;

  render() {
    switch (this.message.role) {
      case 'user':
        return html`
          <nlui-user-message
            content="${this.message.content}"
            ?editable="${this.editable}"
            ?deletable="${this.deletable}"
            @edit="${(e: CustomEvent) => this.dispatchEvent(new CustomEvent('edit', { detail: e.detail, bubbles: true, composed: true }))}"
            @delete="${() => this.dispatchEvent(new CustomEvent('delete', { bubbles: true, composed: true }))}"
          ></nlui-user-message>
        `;
      case 'assistant':
        return html`
          <nlui-assistant-message
            content="${this.message.content}"
            ?isLast="${this.isLast}"
            ?retryable="${this.retryable}"
            ?deletable="${this.deletable}"
            @retry="${() => this.dispatchEvent(new CustomEvent('retry', { bubbles: true, composed: true }))}"
            @delete="${() => this.dispatchEvent(new CustomEvent('delete', { bubbles: true, composed: true }))}"
          ></nlui-assistant-message>
        `;
      case 'tool_call':
        return html`
          <nlui-tool-call-message
            name="${this.message.toolName || ''}"
            args="${this.message.toolArgs || ''}"
          ></nlui-tool-call-message>
        `;
      case 'tool_result':
        return html`
          <nlui-tool-result-message
            name="${this.message.toolName || ''}"
            content="${this.message.content}"
          ></nlui-tool-result-message>
        `;
      default:
        return html``;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nlui-message': NluiMessage;
  }
}
