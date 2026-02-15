import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        destructive: 'bg-destructive text-white',
        outline: 'border-border text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

@customElement('nlui-badge')
export class NluiBadge extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  @property({ type: String }) variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default';

  render() {
    const classes = cn(badgeVariants({ variant: this.variant }));
    return html`<span class="${classes}"><slot></slot></span>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nlui-badge': NluiBadge;
  }
}
