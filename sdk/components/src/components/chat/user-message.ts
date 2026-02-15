import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '../ui/button';
import '../ui/textarea';

@customElement('nlui-user-message')
export class NluiUserMessage extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  @property({ type: String }) content = '';
  @property({ type: Boolean }) editable = false;
  @property({ type: Boolean }) deletable = false;
  @state() private editing = false;
  @state() private editValue = '';

  private handleEdit() {
    this.editValue = this.content;
    this.editing = true;
  }

  private handleSave() {
    if (this.editValue.trim()) {
      this.dispatchEvent(new CustomEvent('edit', {
        detail: { content: this.editValue.trim() },
        bubbles: true,
        composed: true
      }));
      this.editing = false;
    }
  }

  private handleCancel() {
    this.editValue = this.content;
    this.editing = false;
  }

  private handleDelete() {
    this.dispatchEvent(new CustomEvent('delete', { bubbles: true, composed: true }));
  }

  private handleCopy() {
    navigator.clipboard.writeText(this.content);
  }

  render() {
    if (this.editing) {
      return html`
        <div class="flex justify-end">
          <div class="max-w-[85%] md:max-w-[75%] rounded-2xl rounded-br-md bg-primary/10 px-4 py-2.5 shadow-sm space-y-2">
            <nlui-textarea
              .value="${this.editValue}"
              @input="${(e: CustomEvent) => this.editValue = e.detail.value}"
              class="min-h-[60px] text-sm"
            ></nlui-textarea>
            <div class="flex gap-2 justify-end">
              <nlui-button size="sm" variant="outline" @click="${this.handleCancel}">
                ✕ Cancel
              </nlui-button>
              <nlui-button size="sm" @click="${this.handleSave}">
                ✓ Save & Regenerate
              </nlui-button>
            </div>
          </div>
        </div>
      `;
    }

    return html`
      <div class="flex justify-end group/user">
        <div class="max-w-[85%] md:max-w-[75%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground shadow-sm relative">
          <p class="whitespace-pre-wrap text-sm leading-relaxed">${this.content}</p>
          <div class="absolute top-1.5 right-1.5 opacity-0 group-hover/user:opacity-100 transition-opacity flex gap-1">
            ${this.editable ? html`
              <button
                @click="${this.handleEdit}"
                class="w-7 h-7 flex items-center justify-center rounded bg-background/20 hover:bg-background/30 backdrop-blur-sm"
                title="Edit"
              >
                ✎
              </button>
            ` : ''}
            ${this.deletable ? html`
              <button
                @click="${this.handleDelete}"
                class="w-7 h-7 flex items-center justify-center rounded bg-background/20 hover:bg-destructive/80 backdrop-blur-sm"
                title="Delete"
              >
                🗑
              </button>
            ` : ''}
            <button
              @click="${this.handleCopy}"
              class="w-7 h-7 flex items-center justify-center rounded bg-background/20 hover:bg-background/30 backdrop-blur-sm"
              title="Copy"
            >
              📋
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nlui-user-message': NluiUserMessage;
  }
}
