import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { getCurrentUser } from '../lib/auth';
import { fetchUserOrders, Order } from '../lib/orders';
import { styles } from '../styles/shared-styles';
import { resolveRouterPath } from '../router';

import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '../components/header';

@customElement('app-history')
export class AppHistory extends LitElement {
  @state() private orders: Order[] = [];
  @state() private loading = true;

  static styles = [
    styles,
    css`
      main {
        max-width: 800px;
        margin: 0 auto;
        padding-top: 60px;
        padding-bottom: 40px;
      }
      .header-title {
        font-size: 1.8rem;
        margin-bottom: 24px;
        color: var(--color-text);
      }
      .loading-state {
        display: flex;
        justify-content: center;
        padding: 40px;
      }
      .empty-state {
        text-align: center;
        padding: 40px 20px;
        background: var(--color-surface);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-sm);
      }
      .order-card {
        background: var(--color-surface);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-sm);
        margin-bottom: 20px;
        overflow: hidden;
      }
      .order-header {
        padding: 16px;
        border-bottom: 1px solid var(--color-border);
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--color-background);
      }
      .order-id {
        font-size: 0.9rem;
        color: var(--color-text-light);
      }
      .order-date {
        font-weight: 600;
        color: var(--color-text);
      }
      .order-status {
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 700;
        text-transform: uppercase;
      }
      .status-pending { background: #FFF3CD; color: #856404; }
      .status-completed { background: #D4EDDA; color: #155724; }
      .status-cancelled { background: #F8D7DA; color: #721C24; }
      
      .order-body {
        padding: 16px;
      }
      .order-item {
        display: flex;
        justify-content: space-between;
        padding: 12px 0;
        border-bottom: 1px dashed var(--color-border);
      }
      .order-item:last-child {
        border-bottom: none;
      }
      .item-name {
        font-weight: 600;
        font-size: 1rem;
        margin-bottom: 4px;
      }
      .item-qty {
        color: var(--color-text-light);
        font-size: 0.9rem;
      }
      .order-footer {
        padding: 16px;
        background: var(--color-background);
        text-align: right;
        font-size: 1.2rem;
        font-weight: 700;
        color: var(--color-primary);
      }
    `
  ];

  async connectedCallback() {
    super.connectedCallback();
    const user = await getCurrentUser();
    if (!user) {
      window.location.href = resolveRouterPath('login');
      return;
    }
    await this.loadOrders();
  }

  async loadOrders() {
    this.loading = true;
    this.orders = await fetchUserOrders();
    this.loading = false;
  }

  formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatPrice(value: number) {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
  }

  getStatusClass(status: string) {
    if (status === 'completed' || status === 'delivered') return 'status-completed';
    if (status === 'cancelled') return 'status-cancelled';
    return 'status-pending';
  }

  render() {
    return html`
      <app-header ?enableBack=${true} title="Historial"></app-header>
      <main>
        <h2 class="header-title">Mis Pedidos</h2>

        ${this.loading ? html`
          <div class="loading-state">
            <sl-spinner style="font-size: 3rem; --indicator-color: var(--color-primary);"></sl-spinner>
          </div>
        ` : this.orders.length === 0 ? html`
          <div class="empty-state">
            <h3 style="margin-bottom: 16px;">Aún no tienes pedidos</h3>
            <p style="color: var(--color-text-light); margin-bottom: 24px;">¡Explora nuestra tienda y encuentra productos increíbles!</p>
            <sl-button variant="primary" href="${resolveRouterPath()}">Ir a la Tienda</sl-button>
          </div>
        ` : html`
          <div class="orders-list">
            ${this.orders.map(order => html`
              <div class="order-card">
                <div class="order-header">
                  <div>
                    <div class="order-date">${this.formatDate(order.created_at)}</div>
                    <div class="order-id">Pedido #${order.id.split('-')[0]}</div>
                  </div>
                  <div class="order-status ${this.getStatusClass(order.status)}">${order.status}</div>
                </div>
                <div class="order-body">
                  ${(order.items || []).map(item => html`
                    <div class="order-item">
                      <div>
                        <div class="item-name">${item.product_name}</div>
                        <div class="item-qty">Cant: ${item.quantity} × ${this.formatPrice(item.unit_price)}</div>
                      </div>
                      <div style="font-weight: 700; color: var(--color-text);">
                        ${this.formatPrice(item.total_price)}
                      </div>
                    </div>
                  `)}
                </div>
                <div class="order-footer">
                  Total: ${this.formatPrice(order.total_amount)}
                </div>
              </div>
            `)}
          </div>
        `}
      </main>
    `;
  }
}
