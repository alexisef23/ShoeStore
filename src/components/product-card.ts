import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('product-card')
export class ProductCard extends LitElement {
  @property({ type: String }) productId = '';
  @property({ type: String }) productTitle = '';
  @property({ type: String }) productImage = '';
  @property({ type: String }) productDescription = '';
  @property({ type: Number }) productPrice = 0;
  @property({ type: Number }) originalPrice = 0;
  @property({ type: Boolean }) inStock = true;
  @property({ type: Boolean }) isFlashSale = false;

  static styles = css`
    :host {
      display: block;
      --card-radius: 12px;
    }

    .card {
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: var(--color-surface, #fff);
      border-radius: var(--card-radius);
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      overflow: hidden;
      position: relative;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      cursor: pointer;
      border: 1px solid var(--color-border, #eee);
    }

    .card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px rgba(0,0,0,0.1);
    }

    .image-container {
      position: relative;
      width: 100%;
      padding-top: 100%; /* 1:1 Aspect Ratio */
      background: #f8f8f8;
    }

    .product-image {
      position: absolute;
      top: 0; left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* Mobile-friendly larger image placeholder */
    @media (max-width: 480px) {
      .image-container { padding-top: 90%; }
      .title { font-size: 1rem; }
      .price { font-size: 1.15rem; }
      .add-btn { width: 44px; height: 44px; }
    }

    .badges {
      position: absolute;
      top: 8px;
      left: 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .badge {
      background: var(--color-primary, #FF4E00);
      color: white;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 4px 8px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .badge.flash {
      background: var(--color-flash, #FF0055);
    }

    .details {
      padding: 12px;
      display: flex;
      flex-direction: column;
      flex-grow: 1;
    }

    .title {
      margin: 0 0 4px;
      font-size: 0.95rem;
      font-weight: 500;
      color: var(--color-text, #111);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      line-height: 1.3;
    }

    .price-row {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin-top: auto;
      padding-top: 8px;
    }

    .price {
      font-size: 1.2rem;
      font-weight: 800;
      color: var(--color-primary, #FF4E00);
    }

    .original-price {
      font-size: 0.85rem;
      color: var(--color-text-light, #999);
      text-decoration: line-through;
    }

    .add-btn {
      position: absolute;
      bottom: 12px;
      right: 12px;
      background: var(--color-text, #111);
      color: white;
      border: none;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.2s, transform 0.1s;
      z-index: 2;
    }

    .add-btn:hover {
      background: var(--color-primary, #FF4E00);
    }

    .add-btn:active {
      transform: scale(0.95);
    }

    .add-btn[disabled] {
      background: #ccc;
      cursor: not-allowed;
    }
  `;

  private addToCart(e: Event) {
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent('add-to-cart', {
      detail: {
        productId: this.productId,
        title: this.productTitle,
        price: this.productPrice
      },
      bubbles: true,
      composed: true,
    }));
  }

  private handleImgError(e: Event) {
    const img = e.currentTarget as HTMLImageElement;
    img.onerror = null;
    img.src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80';
  }

  render() {
    const discount = this.originalPrice > this.productPrice 
      ? Math.round(((this.originalPrice - this.productPrice) / this.originalPrice) * 100) 
      : 0;

    return html`
      <div class="card">
        <div class="image-container">
          ${html`<img class="product-image" src="${this.productImage || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80'}" alt="${this.productTitle}" loading="lazy" @error=${this.handleImgError} />`}
          <div class="badges">
            ${this.isFlashSale ? html`<span class="badge flash">🔥 Flash</span>` : null}
            ${discount > 0 ? html`<span class="badge">-${discount}%</span>` : null}
          </div>
        </div>

        <div class="details">
          <h3 class="title">${this.productTitle}</h3>
          
          <div class="price-row">
            <span class="price">${this.formatPrice(this.productPrice)}</span>
            ${this.originalPrice > this.productPrice 
              ? html`<span class="original-price">${this.formatPrice(this.originalPrice)}</span>` 
              : null}
          </div>
        </div>

        <button class="add-btn" @click=${this.addToCart} ?disabled=${!this.inStock} aria-label="Agregar al carrito">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
        </button>
      </div>
    `;
  }

  private formatPrice(value: number) {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
