import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import { clearCart, getCartCount, getCartItems } from '../lib/cart';
import { resolveRouterPath } from '../router';
import { getCurrentUser } from '../lib/auth';
import { createOrderFromCart } from '../lib/cart-db';
import '../components/header';

@customElement('app-checkout')
export class AppCheckout extends LitElement {
  @state() private items = getCartItems();
  @state() private loading = false;
  @state() private error = '';

  async connectedCallback() {
    super.connectedCallback();
    const user = await getCurrentUser();
    if (!user) {
      window.location.href = resolveRouterPath('login');
    }
  }

  static styles = css`
    main {
      padding: 24px 16px 40px;
      max-width: 1000px;
      margin: 0 auto;
    }

    sl-card {
      padding: 28px 24px;
      border-radius: 28px;
      background: var(--sl-color-neutral-0);
      box-shadow: 0 24px 80px rgba(15, 23, 42, 0.12);
    }

    h2 {
      margin: 0 0 16px;
      font-size: 1.9rem;
    }

    .item-row {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 12px;
      align-items: center;
      padding: 16px 0;
      border-bottom: 1px solid var(--sl-color-neutral-200);
    }

    .item-title {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
    }

    .item-meta {
      color: var(--sl-color-gray-600);
      font-size: 0.95rem;
      margin-top: 4px;
    }

    .summary {
      margin-top: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 700;
      font-size: 1.1rem;
    }

    .checkout-info {
      margin-top: 18px;
      color: var(--sl-color-gray-600);
      line-height: 1.6;
    }

    .actions {
      margin-top: 24px;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
  `;

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

  private async handlePay() {
    this.loading = true;
    this.error = '';

    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Debes estar logueado para pagar');
      }

      const total = this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

      const order = await createOrderFromCart(user.id, this.items, total);
      if (!order) {
        throw new Error('No se pudo crear la orden en la base de datos');
      }

      // Invocar al endpoint serverless
      const response = await fetch('/api/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          paymentMethodId: 'visa', // Default to visa for the demo
          customerEmail: user.email || 'customer@test.com'
        })
      });

      const paymentResult = await response.json();

      if (!response.ok || !paymentResult.success) {
        throw new Error(paymentResult.message || paymentResult.error || 'Pago rechazado por Mercado Pago');
      }

      clearCart();
      window.location.href = resolveRouterPath();
    } catch (err) {
      this.error = (err as any)?.message || 'Error al procesar el pago';
    } finally {
      this.loading = false;
    }
  }

  render() {
    return html`
      <app-header ?enableBack=${true} title="Checkout"></app-header>
      <main>
        <sl-card>
          <h2>Checkout</h2>

          ${this.items.length === 0
            ? html`
                <p class="checkout-info">No tienes productos en el carrito. Agrega algo desde la tienda para continuar.</p>
                <div class="actions">
                  <sl-button variant="primary" href="${resolveRouterPath()}">Volver a la tienda</sl-button>
                </div>
              `
            : html`
                ${this.error ? html`<div style="color: var(--sl-color-danger-600); margin-bottom: 16px;">${this.error}</div>` : null}

                <div>
                  ${this.items.map(item => html`
                    <div class="item-row">
                      <div>
                        <p class="item-title">${item.title}</p>
                        <p class="item-meta">Cantidad: ${item.quantity}</p>
                      </div>
                      <span>${this.formatPrice(item.price * item.quantity)}</span>
                    </div>
                  `)}
                </div>

                <div class="summary">
                  <span>Total (${getCartCount()} artículos)</span>
                  <span>${this.formatPrice(this.total)}</span>
                </div>

                <p class="checkout-info">
                  Aquí puedes simular un flujo de pago con tokenización segura.
                  En producción, conecta esto con la API de Stripe o Mercado Pago.
                </p>

                <div class="actions">
                  <sl-button variant="primary" ?disabled=${this.loading} @click=${this.handlePay}>
                    ${this.loading ? 'Procesando...' : 'Pagar ahora'}
                  </sl-button>
                  <sl-button variant="default" href="${resolveRouterPath('cart')}">Volver al carrito</sl-button>
                </div>
              `}
        </sl-card>
      </main>
    `;
  }
}
