import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import { resolveRouterPath } from '../router';
import { createProfileIfMissing } from '../lib/auth';
import { syncLocalCartToDB } from '../lib/cart-db';
import { supabase } from '../lib/supabase';
import '../components/header';

@customElement('app-login')
export class AppLogin extends LitElement {
  @state() private mode: 'login' | 'register' = 'login';
  @state() private email = '';
  @state() private phone = '';
  @state() private password = '';
  @state() private confirmPassword = '';
  @state() private displayName = '';
  @state() private formError = '';
  @state() private authMessage = '';
  @state() private submitted = false;
  @state() private loading = false;

  static styles = css`
    :host {
      display: block;
      color: var(--sl-color-gray-900);
      min-height: 100vh;
      background: var(--color-surface);
    }

    .layout-wrapper {
      display: flex;
      min-height: 100vh;
      width: 100%;
    }

    .image-pane {
      display: none;
      flex: 1.2;
      background: linear-gradient(135deg, rgba(0, 82, 255, 0.7) 0%, rgba(0, 180, 219, 0.9) 100%), url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80') center/cover;
      flex-direction: column;
      justify-content: center;
      padding: 60px;
      color: white;
      position: relative;
    }

    .image-pane h2 {
      font-size: 3.5rem;
      font-weight: 800;
      line-height: 1.1;
      margin-bottom: 24px;
      text-shadow: 0 4px 12px rgba(0,0,0,0.1);
      letter-spacing: -1px;
    }

    .image-pane p {
      font-size: 1.25rem;
      opacity: 0.9;
      max-width: 450px;
      line-height: 1.6;
    }

    main {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 40px 24px;
      background: var(--color-surface);
      position: relative;
    }

    .auth-card {
      width: 100%;
      max-width: 400px;
      margin: 0 auto;
    }

    h1 {
      margin: 0 0 8px;
      font-size: 2.2rem;
      line-height: 1.2;
      font-weight: 800;
      color: var(--color-text);
      letter-spacing: -0.5px;
    }

    .subtitle {
      margin: 0 0 32px;
      color: var(--color-text-light);
      font-size: 1rem;
      line-height: 1.5;
    }

    .form-field {
      margin-bottom: 20px;
    }

    /* Override Shoelace Input styles for elegance */
    sl-input::part(base) {
      border-radius: 12px;
      border: 1px solid var(--color-border);
      background: var(--color-background);
      transition: all 0.2s ease;
    }
    
    sl-input::part(base):focus-within {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(0, 82, 255, 0.1);
      background: var(--color-surface);
    }

    sl-button::part(base) {
      border-radius: 12px;
      font-weight: 600;
      letter-spacing: 0.2px;
    }

    .error-message {
      margin: 0 0 20px;
      color: var(--color-flash);
      font-size: 0.95rem;
      line-height: 1.4;
      padding: 12px;
      background: rgba(255, 23, 68, 0.1);
      border-radius: 8px;
    }

    .action-row {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-top: 32px;
    }

    .submit-btn {
      width: 100%;
    }

    .toggle-button {
      background: none;
      border: none;
      color: var(--color-text-light);
      font-weight: 500;
      cursor: pointer;
      padding: 8px;
      font-size: 0.95rem;
      transition: color 0.2s;
    }

    .toggle-button:hover {
      color: var(--color-primary);
    }

    .info-text {
      margin-top: 24px;
      font-size: 0.85rem;
      color: var(--color-text-light);
      text-align: center;
    }

    @media (min-width: 900px) {
      .image-pane {
        display: flex;
      }
      main {
        max-width: 500px;
        flex: none;
      }
    }
  `;

  private get emailValid() {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email);
  }

  private get phoneValid() {
    return this.phone === '' || /^\+?\d{8,15}$/.test(this.phone);
  }

  private get passwordValid() {
    return this.password.length >= 6;
  }

  private get confirmPasswordValid() {
    return this.mode === 'login' || this.password === this.confirmPassword;
  }

  private get loginWithEmail() {
    return this.mode === 'login' && this.email.trim().length > 0;
  }

  private get loginWithPhone() {
    return this.mode === 'login' && this.phone.trim().length > 0;
  }

  private get canSubmit() {
    if (this.mode === 'login') {
      if (this.loginWithEmail) {
        return this.emailValid && this.passwordValid;
      }
      if (this.loginWithPhone) {
        return this.phoneValid;
      }
      return false;
    }

    if (this.mode === 'register' && this.displayName.trim().length === 0) {
      return false;
    }

    return (this.emailValid || this.phoneValid) && this.passwordValid && this.confirmPasswordValid;
  }

  private setField(field: 'email' | 'phone' | 'password' | 'confirmPassword' | 'displayName', value: string) {
    this[field] = value;
    if (this.formError) {
      this.formError = '';
    }
  }

  private async handleSubmit(event: Event) {
    event.preventDefault();
    this.submitted = true;
    this.formError = '';
    this.authMessage = '';

    if (!this.canSubmit) {
      this.formError = this.getValidationMessage();
      return;
    }

    this.loading = true;

    try {
      if (this.mode === 'login') {
        if (this.loginWithEmail) {
          const { error } = await supabase.auth.signInWithPassword({
            email: this.email.trim(),
            password: this.password,
          });

          if (error) {
            throw error;
          }

          this.authMessage = 'Inicio de sesión exitoso. Bienvenido de nuevo.';
          window.location.href = resolveRouterPath();
          return;
        }

        if (this.loginWithPhone) {
          const { error } = await supabase.auth.signInWithOtp({
            phone: this.phone.trim(),
          });

          if (error) {
            throw error;
          }

          this.authMessage = 'Mensaje SMS enviado. Revisa tu teléfono para continuar.';
          return;
        }

        throw new Error('Selecciona correo o teléfono para iniciar sesión.');
      }

      const signUpPayload: any = {
        password: this.password,
      };

      if (this.emailValid) {
        signUpPayload.email = this.email.trim();
      } else {
        signUpPayload.phone = this.phone.trim();
      }

      const { data, error } = await supabase.auth.signUp(signUpPayload);
      if (error) {
        throw error;
      }

      if (data.user) {
        await createProfileIfMissing(data.user, this.displayName.trim());
        await syncLocalCartToDB(data.user.id);
      }

      this.authMessage = this.emailValid
        ? 'Registro completado. Revisa tu correo para verificar tu cuenta.'
        : 'Registro enviado. Revisa tu teléfono para completar la verificación.';
    } catch (error) {
      const rawError = error as any;
      if (rawError?.message?.includes('Failed to fetch') || rawError?.message?.includes('NetworkError')) {
        this.formError = 'Error de red: revisa la URL de Supabase en .env y tu conexión a Internet.';
      } else {
        this.formError = rawError?.message || 'No se pudo autenticar. Intenta de nuevo.';
      }
    } finally {
      this.loading = false;
    }
  }

  private getValidationMessage() {
    if (!this.canSubmit) {
      if (this.mode === 'login') {
        return 'Ingresa un correo o teléfono válidos para iniciar sesión.';
      }
    }

    if (!this.phoneValid) {
      return 'El teléfono debe tener solo dígitos y puede incluir + al inicio.';
    }

    if (this.mode === 'register' && this.displayName.trim().length === 0) {
      return 'Por favor, ingresa tu nombre completo.';
    }

    if (!this.passwordValid) {
      return 'La contraseña debe tener al menos 6 caracteres.';
    }

    if (!this.confirmPasswordValid) {
      return 'Las contraseñas deben coincidir.';
    }

    return 'Revisa los campos antes de enviar.';
  }

  private toggleMode() {
    this.mode = this.mode === 'login' ? 'register' : 'login';
    this.submitted = false;
    this.formError = '';
    this.password = '';
    this.confirmPassword = '';
    this.displayName = '';
  }

  render() {
    return html`
      <div class="layout-wrapper">
        <div class="image-pane">
          <h2>Descubre el estilo<br/>que te define.</h2>
          <p>Únete a miles de personas que ya están comprando productos exclusivos a los mejores precios del mercado.</p>
        </div>
        
        <main>
          <div class="auth-card">
            <h1>${this.mode === 'login' ? 'Bienvenido de nuevo' : 'Crear cuenta'}</h1>
            <p class="subtitle">
              ${this.mode === 'login'
                ? 'Ingresa tus credenciales para acceder a tu cuenta.'
                : 'Regístrate hoy para obtener beneficios y ofertas exclusivas.'}
            </p>

            ${this.formError
              ? html`<div class="error-message">${this.formError}</div>`
              : null}

            ${this.authMessage
              ? html`<div class="info-text" style="color: var(--color-primary);">${this.authMessage}</div>`
              : null}

            <form @submit=${this.handleSubmit} novalidate>
              ${this.mode === 'register'
                ? html`
                    <div class="form-field">
                      <sl-input
                        label="Nombre completo"
                        type="text"
                        .value=${this.displayName}
                        @sl-input=${(event: Event) => this.setField('displayName', (event.target as HTMLInputElement).value)}
                        clearable
                        ?invalid=${this.submitted && this.displayName.trim().length === 0}
                        help-text=${this.submitted && this.displayName.trim().length === 0 ? 'Requerido para registrarse' : ''}
                      ></sl-input>
                    </div>
                  `
                : null}

              <div class="form-field">
                <sl-input
                  label="Correo electrónico"
                  type="email"
                  .value=${this.email}
                  @sl-input=${(event: Event) => this.setField('email', (event.target as HTMLInputElement).value)}
                  clearable
                  ?invalid=${this.submitted && !this.emailValid && this.email.length > 0}
                  help-text=${this.submitted && !this.emailValid && this.email.length > 0 ? 'Correo inválido' : ''}
                ></sl-input>
              </div>

              <div class="form-field">
                <sl-input
                  label="Teléfono (Opcional)"
                  type="tel"
                  .value=${this.phone}
                  @sl-input=${(event: Event) => this.setField('phone', (event.target as HTMLInputElement).value)}
                  clearable
                  ?invalid=${this.submitted && this.phone.length > 0 && !this.phoneValid}
                  help-text=${this.submitted && this.phone.length > 0 && !this.phoneValid ? 'Teléfono inválido' : ''}
                ></sl-input>
              </div>

              <div class="form-field">
                <sl-input
                  label="Contraseña"
                  type="password"
                  password-toggle
                  .value=${this.password}
                  @sl-input=${(event: Event) => this.setField('password', (event.target as HTMLInputElement).value)}
                  clearable
                  ?invalid=${this.submitted && !this.passwordValid}
                  help-text=${this.submitted && !this.passwordValid ? 'Mínimo 6 caracteres' : ''}
                ></sl-input>
              </div>

              ${this.mode === 'register'
                ? html`
                    <div class="form-field">
                      <sl-input
                        label="Confirmar contraseña"
                        type="password"
                        password-toggle
                        .value=${this.confirmPassword}
                        @sl-input=${(event: Event) => this.setField('confirmPassword', (event.target as HTMLInputElement).value)}
                        clearable
                        ?invalid=${this.submitted && !this.confirmPasswordValid}
                        help-text=${this.submitted && !this.confirmPasswordValid ? 'Las contraseñas no coinciden' : ''}
                      ></sl-input>
                    </div>
                  `
                : null}

              <div class="action-row">
                <sl-button class="submit-btn" type="submit" variant="primary" size="large" ?disabled=${this.loading}>
                  ${this.loading
                    ? this.mode === 'login'
                      ? 'Validando...'
                      : 'Registrando...'
                    : this.mode === 'login'
                      ? 'Iniciar sesión'
                      : 'Crear cuenta'}
                </sl-button>

                <button type="button" class="toggle-button" @click=${this.toggleMode} ?disabled=${this.loading}>
                  ${this.mode === 'login'
                    ? '¿No tienes cuenta? Regístrate aquí'
                    : '¿Ya tienes cuenta? Inicia sesión'}
                </button>
              </div>
            </form>

            <p class="info-text">
              Al continuar, aceptas nuestros Términos de Servicio y Política de Privacidad.
            </p>
          </div>
        </main>
      </div>
    `;
  }
}
