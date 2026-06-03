import { LitElement, css, html } from 'lit';
import { property, state, customElement } from 'lit/decorators.js';
import { resolveRouterPath } from '../router';
import { addCartItem } from '../lib/cart';
import { getCurrentUser } from '../lib/auth';
import { fetchProducts } from '../lib/products';

import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '../components/product-card.js';

import { styles } from '../styles/shared-styles';

interface ProductItem {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  inStock: boolean;
  isFlashSale?: boolean;
}

@customElement('app-home')
export class AppHome extends LitElement {
  @property() message = 'Tienda Temu Lite';
  @state() private products: ProductItem[] = [];
  @state() private loadingProducts = true;

  static styles = [
    styles,
    css`
      main {
        padding: 0 0 80px;
        max-width: 100%;
        margin-top: 50px;
      }

      .hero-banner {
        width: 100%;
        min-height: 420px;
        background: linear-gradient(135deg, var(--color-primary) 0%, #00B4DB 100%);
        color: white;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        padding: 56px 20px 36px; /* extra top padding to account for transparent header */
        border-radius: 0 0 28px 28px;
        margin-bottom: 24px;
        position: relative;
        overflow: hidden;
      }

      .hero-banner::after {
        content: '';
        position: absolute;
        top: -50%; left: -50%;
        width: 200%; height: 200%;
        background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%);
        pointer-events: none;
      }

      .hero-title {
        font-size: clamp(2.5rem, 6vw, 4rem);
        font-weight: 800;
        margin: 0 0 16px;
        line-height: 1.1;
        letter-spacing: -1px;
      }
      
      .hero-subtitle {
        font-size: 1.1rem;
        max-width: 500px;
        margin: 0 0 24px;
        opacity: 0.9;
      }

      .hero-actions {
        display: flex;
        gap: 12px;
        z-index: 1;
      }

      .btn-glass {
        background: rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.4);
        padding: 12px 24px;
        border-radius: 30px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        text-decoration: none;
      }

      .btn-glass:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: translateY(-2px);
      }
      
      .btn-solid {
        background: white;
        color: var(--color-primary);
        border: none;
        padding: 12px 24px;
        border-radius: 30px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
        text-decoration: none;
      }
      
      .btn-solid:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 16px rgba(0,0,0,0.1);
      }

      .section-container {
        padding: 0 16px;
        max-width: 1200px;
        margin: 0 auto 40px;
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }

      .section-title {
        font-size: 1.4rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
      }

      .view-all {
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--color-primary);
        cursor: pointer;
      }

      .flash-sales-scroll {
        display: flex;
        gap: 16px;
        overflow-x: auto;
        padding-bottom: 16px;
        margin: 0 -16px;
        padding-left: 16px;
        padding-right: 16px;
        scrollbar-width: none;
      }
      .flash-sales-scroll::-webkit-scrollbar {
        display: none;
      }
      .flash-sales-scroll product-card {
        flex: 0 0 220px;
      }

      .product-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
      }

      @media (min-width: 768px) {
        .product-grid {
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        .flash-sales-scroll product-card {
          flex: 0 0 280px;
        }
      }

      @media (min-width: 1024px) {
        .product-grid {
          grid-template-columns: repeat(4, 1fr);
        }
      }
    `,
  ];

  async connectedCallback() {
    super.connectedCallback();
    await this.loadProductsFromDB();
  }

  private async loadProductsFromDB() {
    this.loadingProducts = true;
    console.debug('[app-home] start loading products');
    try {
      const dbProducts = await fetchProducts();
      console.debug('[app-home] fetched products', dbProducts && dbProducts.length);

      if (!Array.isArray(dbProducts)) {
        console.warn('[app-home] fetchProducts did not return an array', dbProducts);
        this.products = [];
        return;
      }

      this.products = dbProducts.map((p, index) => {
        const isFlash = index < 3; // First 3 products get a simulated flash sale to keep UI rich

        return {
          id: p.id,
          title: p.name,
          description: p.description,
          price: p.price,
          originalPrice: isFlash ? p.price * 1.3 : undefined, // 30% discount simulation
          image: p.image_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80',
          inStock: p.in_stock !== false, // Default to true if not explicitly false
          isFlashSale: isFlash,
        };
      });
    } catch (e) {
      console.warn('Failed to load products', e);
    } finally {
      this.loadingProducts = false;
      console.debug('[app-home] finished loading products, count=', this.products.length);
    }
  }

  private handleCartAdd(event: Event) {
    const detail = (event as CustomEvent).detail;
    addCartItem({
      productId: detail.productId,
      title: detail.title,
      price: detail.price,
      quantity: 1,
    });
    this.requestUpdate();
  }

  render() {
    const flashSales = this.products.filter(p => p.isFlashSale);
    const recommended = this.products.filter(p => !p.isFlashSale);

    return html`
      <app-header style="--header-bg: transparent; --header-text-color: white;"></app-header>

      <main @add-to-cart=${this.handleCartAdd}>
        <div class="hero-banner">
          <h2 class="hero-title">Grandes Ofertas<br/>Todos los Días</h2>
          <p class="hero-subtitle">Descubre productos increíbles a precios de fábrica. Envío gratis en tu primer pedido.</p>
          <div class="hero-actions">
            <a href="${resolveRouterPath('login')}" class="btn-solid">Comprar Ahora</a>
            <a href="#flash" class="btn-glass">Ver Ofertas</a>
          </div>
        </div>

        <div class="main-content">
          ${this.loadingProducts 
            ? html`
                <div style="display: flex; justify-content: center; padding: 60px;">
                  <sl-spinner style="font-size: 3rem; --indicator-color: var(--color-primary);"></sl-spinner>
                </div>
              ` 
            : html`
              ${flashSales.length > 0 ? html`
                <div id="flash" class="section-container">
                  <div class="section-header">
                    <h3 class="section-title"><span class="text-flash">🔥</span> Ofertas Flash</h3>
                    <span class="view-all">Ver todas ></span>
                  </div>
                  <div class="flash-sales-scroll">
                    ${flashSales.map(
                      p => html`
                        <product-card
                          .productId=${p.id}
                          .productTitle=${p.title}
                          .productDescription=${p.description}
                          .productPrice=${p.price}
                          .originalPrice=${p.originalPrice || 0}
                          .productImage=${p.image}
                          .inStock=${p.inStock}
                          .isFlashSale=${true}
                        ></product-card>
                      `
                    )}
                  </div>
                </div>
              ` : null}

              <div class="section-container">
                <div class="section-header">
                  <h3 class="section-title">Recomendados para ti</h3>
                </div>
                <div class="product-grid">
                  ${recommended.map(
                    p => html`
                      <product-card
                        .productId=${p.id}
                        .productTitle=${p.title}
                        .productDescription=${p.description}
                        .productPrice=${p.price}
                        .originalPrice=${p.originalPrice || 0}
                        .productImage=${p.image}
                        .inStock=${p.inStock}
                        .isFlashSale=${false}
                      ></product-card>
                    `
                  )}
                </div>
              </div>
            `
          }
        </div>
      </main>
    `;
  }
}
