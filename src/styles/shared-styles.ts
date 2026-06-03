import { css } from 'lit';

export const styles = css`
  main {
    margin-top: 54px; /* Space for fixed header */
    padding: 16px;
    max-width: 1200px;
    margin-left: auto;
    margin-right: auto;
    animation: fadeIn 0.4s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  sl-card {
    --border-radius: var(--radius-md);
    --border-width: 0;
    box-shadow: var(--shadow-sm);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    background: var(--color-surface);
  }

  sl-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-md);
  }

  h1, h2, h3, h4 {
    margin-top: 0;
    font-weight: 700;
  }

  .text-primary { color: var(--color-primary); }
  .text-flash { color: var(--color-flash); }
  .text-muted { color: var(--color-text-light); }
  
  .glass-panel {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.3);
  }
  
  @media (prefers-color-scheme: dark) {
    .glass-panel {
      background: rgba(20, 20, 20, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
  }
`;