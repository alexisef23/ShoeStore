import { LitElement, css, html } from 'lit';
import { property, state, customElement } from 'lit/decorators.js';
import { resolveRouterPath } from '../router';
import { getCurrentUser, onAuthStateChange, signOut } from '../lib/auth';
import { getCartCount, subscribeCart } from '../lib/cart';

import '@shoelace-style/shoelace/dist/components/button/button.js';
@customElement('app-header')
export class AppHeader extends LitElement {
  @property({ type: String }) title = 'PWA Starter';

  @property({ type: Boolean}) enableBack: boolean = false;

  @state() private loggedIn = false;
  @state() private userEmail = '';
  @state() private cartCount = 0;
  private authSubscription: any = null;
  private cartSubscription: (() => void) | null = null;

  static styles = css`
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--header-bg, var(--color-surface));
      color: var(--header-text-color, var(--color-text));
      padding: 12px 16px;
      border-bottom: 1px solid var(--color-border);
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 56px;
      z-index: 40;
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
    }

    header h1 {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      text-align: left;
    }

    nav a {
      margin-left: 8px;
    }

    #back-button-block {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    sl-button.cart-link {
      margin-left: 6px;
    }

    @media(prefers-color-scheme: light) {
      header {
        background: var(--color-surface);
        color: var(--color-text);
      }

      nav a {
        color: initial;
      }
    }

    @media (min-width: 480px) {
      header { height: 64px; }
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.loadCurrentUser();
    this.authSubscription = onAuthStateChange(() => this.loadCurrentUser());
    this.cartCount = getCartCount();
    this.cartSubscription = subscribeCart(items => {
      this.cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.authSubscription?.unsubscribe?.();
    this.cartSubscription?.();
  }

  private async loadCurrentUser() {
    const user = await getCurrentUser();
    this.loggedIn = !!user;
    this.userEmail = user?.email ?? user?.phone ?? '';
  }

  private async handleLogout() {
    await signOut();
    window.location.href = resolveRouterPath('login');
  }

  render() {
    return html`
      <header>

        <div id="back-button-block">
          ${this.enableBack ? html`<sl-button size="small" href="${resolveRouterPath()}">
            Back
          </sl-button>` : null}

          <h1>${this.title}</h1>
        </div>
        <nav>
          ${this.loggedIn
            ? html`
                <sl-button size="small" variant="default" href="${resolveRouterPath('profile')}">
                  ${this.userEmail}
                </sl-button>
                <sl-button class="cart-link" size="small" variant="default" href="${resolveRouterPath('cart')}">
                  Carrito (${this.cartCount})
                </sl-button>
                <sl-button size="small" variant="primary" @click=${this.handleLogout}>
                  Salir
                </sl-button>
              `
            : html`
                <sl-button size="small" variant="default" href="${resolveRouterPath('login')}">
                  Login
                </sl-button>
                <sl-button class="cart-link" size="small" variant="default" href="${resolveRouterPath('cart')}">
                  Carrito (${this.cartCount})
                </sl-button>
              `}
        </nav>
      </header>
    `;
  }
}
