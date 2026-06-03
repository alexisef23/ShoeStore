import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import { clearCart, getCartItems } from '../lib/cart';
import { resolveRouterPath } from '../router';
import { getCurrentUser } from '../lib/auth';
import { createOrderFromCart } from '../lib/cart-db';
import '../components/header';

@customElement('app-checkout')
export class AppCheckout extends LitElement {
  @state() private items = getCartItems();
  @state() private loading = false;
  @state() private error = '';
  private mp: any;

  async connectedCallback() {
    super.connectedCallback();
    const user = await getCurrentUser();
    if (!user) {
      window.location.href = resolveRouterPath('login');
      return;
    }
    await this.initMercadoPago();
  }

  private async initMercadoPago() {
    const pk = (import.meta as any).env.VITE_MP_PUBLIC_KEY;
    if (!pk) {
      console.warn('VITE_MP_PUBLIC_KEY no está configurada.');
      return;
    }
    
    if (!(window as any).MercadoPago) {
      const script = document.createElement('script');
      script.src = 'https://sdk.mercadopago.com/js/v2';
      script.async = true;
      script.onload = () => {
        this.mp = new (window as any).MercadoPago(pk);
      };
      document.head.appendChild(script);
    } else {
      this.mp = new (window as any).MercadoPago(pk);
    }
  }

  static styles = css`
    main {
      padding: 24px 16px 40px;
      max-width: 800px;
      margin: 0 auto;
    }

    sl-card {
      padding: 28px 24px;
      border-radius: 20px;
      background: var(--sl-color-neutral-0);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08);
      margin-bottom: 24px;
    }

    h2 {
      margin: 0 0 16px;
      font-size: 1.8rem;
    }

    h3 {
      font-size: 1.2rem;
      margin: 24px 0 16px;
      color: var(--sl-color-gray-800);
      border-bottom: 1px solid var(--sl-color-gray-200);
      padding-bottom: 8px;
    }

    .item-row {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 12px;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid var(--sl-color-neutral-100);
    }

    .item-title { margin: 0; font-weight: 600; }
    .item-meta { color: var(--sl-color-gray-600); font-size: 0.9rem; margin-top: 4px; }

    .summary {
      margin-top: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 700;
      font-size: 1.2rem;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .row {
      display: flex;
      gap: 16px;
    }

    .row sl-input {
      flex: 1;
    }

    .actions {
      margin-top: 32px;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    
    .actions sl-button {
      flex: 1;
      min-width: 200px;
    }

    .error-box {
      color: var(--sl-color-danger-600);
      background: var(--sl-color-danger-50);
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-weight: 500;
    }
  `;

  private get total() {
    return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  private formatPrice(value: number) {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
  }

  private async handlePay(e: Event) {
    e.preventDefault();
    if (!this.mp) {
      this.error = 'La pasarela de pago no está lista. Verifica que VITE_MP_PUBLIC_KEY exista.';
      return;
    }

    this.loading = true;
    this.error = '';

    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('Debes iniciar sesión para completar el pago.');

      const cardNumber = (this.renderRoot.querySelector('#cardNumber') as any).value;
      const cardholderName = (this.renderRoot.querySelector('#cardholderName') as any).value;
      const cardExpiration = (this.renderRoot.querySelector('#cardExpiration') as any).value;
      const cardCvv = (this.renderRoot.querySelector('#cardCvv') as any).value;
      
      if (!cardNumber || !cardExpiration || !cardCvv) {
        throw new Error('Por favor, llena todos los datos de la tarjeta.');
      }

      const [expMonth, expYearShort] = cardExpiration.split('/');
      const expYear = expYearShort && expYearShort.length === 2 ? `20${expYearShort}` : expYearShort;

      // 1. Tokenización segura (Frontend -> Mercado Pago)
      const tokenResult = await this.mp.card.createToken({
        cardNumber: cardNumber.replace(/\s+/g, ''),
        cardholderName,
        cardExpirationMonth: expMonth,
        cardExpirationYear: expYear,
        securityCode: cardCvv,
      });

      if (!tokenResult || !tokenResult.id) {
        throw new Error('No se pudo verificar la tarjeta de prueba con Mercado Pago.');
      }

      // 2. Creación de Orden (Frontend -> Supabase)
      const order = await createOrderFromCart(user.id, this.items, this.total);
      if (!order) throw new Error('Falló la creación de la orden en el carrito local.');

      // 3. Procesamiento Real (Frontend -> Backend -> Mercado Pago -> Supabase)
      const response = await fetch('/api/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          paymentTokenId: tokenResult.id,
          customerEmail: user.email || 'test_user_buyer@test.com'
        })
      });

      const paymentResult = await response.json();

      if (!response.ok || !paymentResult.success) {
        throw new Error(paymentResult.message || paymentResult.error || 'Pago rechazado por Mercado Pago');
      }

      clearCart();
      window.location.href = resolveRouterPath();
    } catch (err) {
      this.error = (err as any)?.message || 'Ocurrió un error inesperado al procesar tu pago.';
    } finally {
      this.loading = false;
    }
  }

  render() {
    return html`
      <app-header ?enableBack=${true} title="Checkout Seguro"></app-header>
      <main>
        ${this.items.length === 0
          ? html`
              <sl-card>
                <p>Tu carrito está vacío. Agrega productos para continuar.</p>
                <sl-button variant="primary" href="${resolveRouterPath()}">Ir a la Tienda</sl-button>
              </sl-card>
            `
          : html`
              ${this.error ? html`<div class="error-box">${this.error}</div>` : null}
              
              <sl-card>
                <h2>Resumen de Orden</h2>
                ${this.items.map(item => html`
                  <div class="item-row">
                    <div>
                      <p class="item-title">${item.title}</p>
                      <p class="item-meta">Cant: ${item.quantity}</p>
                    </div>
                    <span>${this.formatPrice(item.price * item.quantity)}</span>
                  </div>
                `)}
                <div class="summary">
                  <span>Total a Pagar</span>
                  <span>${this.formatPrice(this.total)}</span>
                </div>
              </sl-card>

              <sl-card>
                <h3>Método de Pago (Mercado Pago Test)</h3>
                <form id="paymentForm" @submit=${this.handlePay}>
                  <sl-input id="cardholderName" label="Nombre en la Tarjeta" placeholder="Ej. Juan Pérez" required></sl-input>
                  <sl-input id="cardNumber" label="Número de Tarjeta" placeholder="0000 0000 0000 0000" type="text" maxlength="19" required></sl-input>
                  
                  <div class="row">
                    <sl-input id="cardExpiration" label="Vencimiento" placeholder="MM/YY" maxlength="5" required></sl-input>
                    <sl-input id="cardCvv" label="CVV" placeholder="123" maxlength="4" type="password" password-toggle required></sl-input>
                  </div>

                  <div class="actions">
                    <sl-button variant="default" href="${resolveRouterPath('cart')}">Atrás</sl-button>
                    <sl-button variant="primary" type="submit" ?disabled=${this.loading}>
                      ${this.loading ? 'Procesando Pago Seguro...' : 'Pagar ' + this.formatPrice(this.total)}
                    </sl-button>
                  </div>
                </form>
              </sl-card>
            `}
      </main>
    `;
  }
}

