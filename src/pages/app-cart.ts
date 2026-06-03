import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { resolveRouterPath } from '../router';
import { CartItem, getCartItems, removeCartItem, subscribeCart, updateCartItemQuantity } from '../lib/cart';
import { supabase } from '../lib/supabase';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '../components/header';

@customElement('app-cart')
export class AppCart extends LitElement {
  @state() private items: CartItem[] = [];
  @state() private alertMessage: string = '';

  private subscription: (() => void) | null = null;

  static styles = css`
    main {
      padding: 24px 16px 40px;
      max-width: 1000px;
      margin: 0 auto;
    }

    .cart-card {
      padding: 28px 24px;
      border-radius: 28px;
      background: var(--sl-color-neutral-0);
      box-shadow: 0 24px 80px rgba(15, 23, 42, 0.12);
    }

    h2 {
      margin: 0 0 12px;
      font-size: 1.9rem;
    }

    .empty-state {
      padding: 40px 20px;
      text-align: center;
      color: var(--sl-color-gray-600);
    }

    .item-list {
      display: grid;
      gap: 14px;
      margin-bottom: 24px;
    }

    .item-row {
      display: grid;
      grid-template-columns: 1fr auto auto;
      gap: 16px;
      align-items: center;
      padding: 16px 18px;
      border-radius: 18px;
      background: var(--sl-color-neutral-100);
    }

    .item-title {
      margin: 0;
      font-weight: 600;
    }

    .item-meta {
      color: var(--sl-color-gray-600);
      font-size: 0.95rem;
    }

    .quantity-controls {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 8px;
    }

    .quantity-display {
      min-width: 28px;
      text-align: center;
      font-weight: 700;
    }

    .remove-button {
      color: var(--sl-color-danger-600);
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 18px 0;
      border-top: 1px solid var(--sl-color-neutral-200);
      margin-bottom: 18px;
      font-size: 1.1rem;
      font-weight: 700;
    }

    .empty-button {
      margin-top: 20px;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.loadCart();
  }

  private loadCart() {
    this.items = getCartItems();
    this.subscription = subscribeCart(items => (this.items = items));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.subscription?.();
  }

  private get total() {
    return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  private formatPrice(value: number) {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 2,
    }).format(value);
  }

  private decreaseQuantity(item: CartItem) {
    updateCartItemQuantity(item.productId, Math.max(1, item.quantity - 1));
  }

  private async increaseQuantity(item: CartItem) {
    try {
      const { data: product } = await supabase
        .from('products')
        .select('in_stock')
        .eq('id', item.productId)
        .single();

      if (product) {
        if (product.in_stock === false) {
          this.alertMessage = 'Este producto ya no se encuentra disponible.';
          setTimeout(() => this.alertMessage = '', 3000);
          return;
        }
      }
    } catch (e) {
      console.warn('Could not verify stock');
    }

    updateCartItemQuantity(item.productId, item.quantity + 1);
  }

  private removeItem(item: CartItem) {
    removeCartItem(item.productId);
  }

  render() {
    return html`
      <app-header ?enableBack=${true} title="Mi Carrito"></app-header>
      <main>
        ${this.alertMessage ? html`
          <sl-alert variant="warning" open style="margin-bottom: 16px;">
            <sl-icon slot="icon" name="exclamation-triangle"></sl-icon>
            ${this.alertMessage}
          </sl-alert>
        ` : null}

        <sl-card class="cart-card">
          <h2>Tu carrito</h2>

          ${this.items.length === 0
            ? html`<div class="empty-state">
                <sl-icon name="cart" label="Carrito vacío"></sl-icon>
                <p>Tu carrito está vacío. Agrega productos para continuar.</p>
                <sl-button class="empty-button" variant="primary" href="/">Volver a comprar</sl-button>
              </div>`
            : html`
                <div class="item-list">
                  ${this.items.map(item => html`
                    <div class="item-row">
                      <div>
                        <p class="item-title">${item.title}</p>
                        <p class="item-meta">Precio unitario: ${this.formatPrice(item.price)}</p>
                        <div class="quantity-controls">
                          <sl-button size="small" variant="default" @click=${() => this.decreaseQuantity(item)}>-</sl-button>
                          <span class="quantity-display">${item.quantity}</span>
                          <sl-button size="small" variant="default" @click=${() => this.increaseQuantity(item)}>+</sl-button>
                          <sl-button class="remove-button" size="small" variant="text" @click=${() => this.removeItem(item)}>
                            Eliminar
                          </sl-button>
                        </div>
                      </div>
                      <span>${this.formatPrice(item.price * item.quantity)}</span>
                    </div>
                  `)}
                </div>

                <div class="total-row">
                  <span>Total</span>
                  <span>${this.formatPrice(this.total)}</span>
                </div>

                <sl-button variant="primary" href="${resolveRouterPath('checkout')}">Continuar al pago</sl-button>
              `}
        </sl-card>
      </main>
    `;
  }
}
