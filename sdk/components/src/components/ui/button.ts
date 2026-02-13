import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-white hover:bg-destructive/90',
        outline: 'border bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3',
        lg: 'h-10 rounded-md px-6',
        icon: 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

@customElement('nlui-button')
export class NluiButton extends LitElement {
  // Disable Shadow DOM to allow global styles
  protected createRenderRoot() {
    return this;
  }

  @property({ type: String }) variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' = 'default';
  @property({ type: String }) size: 'default' | 'sm' | 'lg' | 'icon' = 'default';
  @property({ type: Boolean }) disabled = false;

  render() {
    const classes = cn(buttonVariants({ variant: this.variant, size: this.size }));
    return html`
      <button class="${classes}" ?disabled="${this.disabled}">
        <slot></slot>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nlui-button': NluiButton;
  }
}
