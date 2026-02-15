import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('nlui-tool-call-message')
export class NluiToolCallMessage extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  @property({ type: String }) name = '';
  @property({ type: String }) args = '';
  @state() private open = false;

  private get preview() {
    if (!this.args) return '';
    try {
      const obj = JSON.parse(this.args);
      const keys = Object.keys(obj);
      if (keys.length === 0) return '{}';
      const parts = keys.slice(0, 3).map((k) => {
        const v = obj[k];
        const vs = typeof v === 'string' ? (v.length > 20 ? v.slice(0, 20) + '\u2026' : v) : JSON.stringify(v);
        return `${k}: ${vs}`;
      });
      return `{ ${parts.join(', ')}${keys.length > 3 ? ', \u2026' : ''} }`;
    } catch {
      const s = this.args;
      return s.length > 60 ? s.slice(0, 60) + '\u2026' : s;
    }
  }

  private get formattedArgs() {
    if (!this.args) return '';
    try {
      return JSON.stringify(JSON.parse(this.args), null, 2);
    } catch {
      return this.args;
    }
  }

  render() {
    return html`
      <div class="pl-2">
        <div
          class="border-l-2 border-amber-400/60 dark:border-amber-500/40 pl-3 py-1 cursor-pointer group/tool"
          @click="${() => this.open = !this.open}"
        >
          <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
            ${this.open ? html`<span class="text-amber-500 dark:text-amber-400">▼</span>` : html`<span class="text-amber-500 dark:text-amber-400">▶</span>`}
            <span class="font-mono font-medium text-foreground/70">${this.name}</span>
            ${!this.open && this.args ? html`
              <span class="text-muted-foreground/40 truncate flex-1 font-mono text-[11px]">
                ${this.preview}
              </span>
            ` : ''}
          </div>
          ${this.open && this.args ? html`
            <pre class="mt-1.5 text-[11px] text-muted-foreground/80 font-mono bg-muted/50 rounded-md px-3 py-2 overflow-x-auto whitespace-pre-wrap leading-relaxed">
${this.formattedArgs}</pre>
          ` : ''}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nlui-tool-call-message': NluiToolCallMessage;
  }
}
