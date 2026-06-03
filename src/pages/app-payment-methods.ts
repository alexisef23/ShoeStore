import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { getCurrentUser } from '../lib/auth';
import { resolveRouterPath } from '../router';

@customElement('app-payment-methods')
export class AppPaymentMethods extends LitElement {
  @state() private message = '';

  static styles = css`
    main { padding: 24px 16px; max-width: 720px; margin: 0 auto; }
    .card { padding: 18px; border-radius: 12px; background: var(--sl-color-neutral-0); }
    .note { color: var(--sl-color-gray-600); margin-top: 12px; }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.loadMercadoPagoSdk();
  }

  async loadMercadoPagoSdk() {
    if ((window as any).MercadoPago) return;
    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    script.onload = () => this.initCardForm();
    document.head.appendChild(script);
  }

  initCardForm() {
    const publicKey = (import.meta as any).env.VITE_MP_PUBLIC_KEY;
    if (!publicKey) {
      this.message = 'Falta configurar la clave pública de Mercado Pago en .env';
      return;
    }

    const mp = new (window as any).MercadoPago(publicKey);

    // Create a simple form layout in DOM
    const container = this.renderRoot.querySelector('#card-form-container');
    if (!container) return;

    container.innerHTML = `
      <form id="mp-card-form">
        <label>Nombre en la tarjeta</label>
        <input id="cardholderName" />

        <label>Número de tarjeta</label>
        <input id="cardNumber" />

        <label>Expiración (MM/YY)</label>
        <input id="cardExpiration" placeholder="MM/YY" />

        <label>CVC</label>
        <input id="cardCvv" />

        <label>Correo</label>
        <input id="cardEmail" />

        <div style="margin-top:12px;"><button id="mp-submit">Registrar tarjeta</button></div>
      </form>
    `;

    const form = container.querySelector('#mp-card-form') as HTMLFormElement;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleTokenize(mp);
    });
  }

  async handleTokenize(mp: any) {
    this.message = '';

    try {
      const user = await getCurrentUser();
      if (!user) {
        window.location.href = resolveRouterPath('login');
        return;
      }

      // Collect fields
      const cardNumber = (this.renderRoot.querySelector('#cardNumber') as HTMLInputElement).value;
      const cardholderName = (this.renderRoot.querySelector('#cardholderName') as HTMLInputElement).value;
      const cardExpiration = (this.renderRoot.querySelector('#cardExpiration') as HTMLInputElement).value;
      const [expMonth, expYearShort] = cardExpiration.split('/');
      const expYear = expYearShort && expYearShort.length === 2 ? `20${expYearShort}` : expYearShort;
      const cardCvv = (this.renderRoot.querySelector('#cardCvv') as HTMLInputElement).value;
      const email = (this.renderRoot.querySelector('#cardEmail') as HTMLInputElement).value || user.email || '';

      // Use Mercado Pago JS SDK to create token
      const mpInstance = mp;
      const result = await mpInstance.card.createToken({
        cardNumber,
        cardholderName,
        cardExpirationMonth: expMonth,
        cardExpirationYear: expYear,
        securityCode: cardCvv,
      });

      if (!result || !result.id) {
        throw new Error('No se pudo generar el token de tarjeta');
      }

      const token = result.id;
      const last4 = cardNumber.slice(-4);
      const brand = result.payment_method ? result.payment_method[0]?.type || '' : '';

      // Send token to our server endpoint to vault the card and save to Supabase
      const res = await fetch('/api/mercadopago-add-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, userId: user.id, email, card_last4: last4, card_brand: brand, exp_month: Number(expMonth), exp_year: Number(expYear) }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || JSON.stringify(json));
      }

      this.message = 'Tarjeta registrada correctamente.';
    } catch (err) {
      this.message = (err as any)?.message || String(err);
    }
  }

  render() {
    return html`
      <main>
        <div class="card">
          <h2>Registrar método de pago</h2>
          <div id="card-form-container"></div>
          <p class="note">Las tarjetas se tokenizan en el cliente y se guardan de forma segura en Mercado Pago.</p>
          ${this.message ? html`<p>${this.message}</p>` : ''}
        </div>
      </main>
    `;
  }
}
