import { LitElement, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import { registerSW } from 'virtual:pwa-register';

import './pages/app-home';
import './components/header';
import './styles/global.css';
import { router } from './router';

@customElement('app-index')
export class AppIndex extends LitElement {
  static styles = css`
    main {
      padding-left: 16px;
      padding-right: 16px;
      padding-bottom: 16px;
    }
  `;

  firstUpdated() {
    router.addEventListener('route-changed', () => {
      if ("startViewTransition" in document) {
        (document as any).startViewTransition(() => this.requestUpdate());
      }
      else {
        this.requestUpdate();
      }
    });
  }

  render() {
    return router.render();
  }
}

// Registro de PWA (Vite Plugin PWA)
const updateSW = registerSW({
  onNeedRefresh() {
    const wantsUpdate = window.confirm('✨ Hay una nueva versión de la tienda disponible. ¿Deseas actualizar ahora?');
    if (wantsUpdate) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('🛍️ E-Commerce listo para funcionar offline');
  },
});
