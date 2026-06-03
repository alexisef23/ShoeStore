import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { getCurrentUser, getProfile, signOut } from '../lib/auth';
import { resolveRouterPath } from '../router';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '../components/header';

@customElement('app-profile')
export class AppProfile extends LitElement {
  @state() private loading = true;
  @state() private user: any = null;
  @state() private profile: any = null;
  @state() private error = '';

  static styles = css`
    main {
      padding: 24px 16px 40px;
      max-width: 900px;
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
      font-size: 2rem;
    }

    .profile-row {
      display: grid;
      gap: 10px;
      margin-bottom: 16px;
    }

    .label {
      font-weight: 700;
      color: var(--sl-color-gray-700);
    }

    .value {
      color: var(--sl-color-gray-900);
    }

    .cta-row {
      margin-top: 22px;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .error {
      color: var(--sl-color-danger-600);
      margin-bottom: 16px;
    }
  `;

  async firstUpdated() {
    await this.loadProfile();
  }

  private async loadProfile() {
    const user = await getCurrentUser();
    if (!user) {
      window.location.href = resolveRouterPath('login');
      return;
    }

    this.user = user;

    const profile = await getProfile(user.id);
    this.profile = profile;
    this.loading = false;
  }

  private async handleLogout() {
    await signOut();
    window.location.href = resolveRouterPath('login');
  }

  render() {
    if (this.loading) {
      return html`
        <app-header ?enableBack=${true} title="Perfil"></app-header>
        <main>
          <sl-card>
            <h2>Cargando perfil...</h2>
          </sl-card>
        </main>
      `;
    }

    return html`
      <app-header ?enableBack=${true} title="Mi Perfil"></app-header>
      <main>
        <sl-card>
          <h2>Mi perfil</h2>

          ${this.error ? html`<div class="error">${this.error}</div>` : null}

          <div class="profile-row">
            <div>
              <p class="label">Usuario</p>
              <p class="value">${this.profile?.display_name ?? this.user?.email ?? this.user?.phone ?? 'Desconocido'}</p>
            </div>
            <div>
              <p class="label">Correo</p>
              <p class="value">${this.user?.email ?? 'No registrado'}</p>
            </div>
            <div>
              <p class="label">Teléfono</p>
              <p class="value">${this.user?.phone ?? 'No registrado'}</p>
            </div>
            <div>
              <p class="label">Registrado</p>
              <p class="value">${new Date(this.user?.created_at ?? Date.now()).toLocaleDateString()}</p>
            </div>
          </div>

          <div class="cta-row" style="flex-direction: column; gap: 16px; margin-top: 32px;">
            <sl-button variant="primary" style="width: 100%;" href="${resolveRouterPath('history')}">
              <sl-icon name="bag-check" slot="prefix" style="margin-right: 8px;"></sl-icon>
              Ver Historial de Compras
            </sl-button>
            <div style="display: flex; gap: 12px; width: 100%;">
              <sl-button variant="default" style="flex: 1;" href="${resolveRouterPath()}">Ir a la tienda</sl-button>
              <sl-button variant="default" style="flex: 1;" @click=${this.handleLogout}>Cerrar sesión</sl-button>
            </div>
          </div>
        </sl-card>
      </main>
    `;
  }
}
