export interface LoadingScreen {
  show: () => void;
  hide: () => void;
  dispose: () => void;
}

export function createLoadingScreen(): LoadingScreen {
  const ui = document.getElementById('ui');
  if (!ui) return { show: () => {}, hide: () => {}, dispose: () => {} };

  const el = document.createElement('div');
  el.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-family: 'Courier New', monospace;
    font-size: 14px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: rgba(0, 255, 200, 0.6);
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.4s ease;
    animation: loadingPulse 1.4s ease-in-out infinite;
  `;
  el.textContent = 'APPROACHING...';

  const style = document.createElement('style');
  style.textContent = `
    @keyframes loadingPulse {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 0.8; }
    }
  `;
  document.head.appendChild(style);
  ui.appendChild(el);

  let hideTimeout: ReturnType<typeof setTimeout> | null = null;

  const show = (): void => {
    if (hideTimeout) clearTimeout(hideTimeout);
    el.style.display = 'block';
    requestAnimationFrame(() => { el.style.opacity = '1'; });
  };

  const hide = (): void => {
    el.style.opacity = '0';
    hideTimeout = setTimeout(() => { el.style.display = 'none'; }, 400);
  };

  const dispose = (): void => {
    if (hideTimeout) clearTimeout(hideTimeout);
    el.remove();
    style.remove();
  };

  return { show, hide, dispose };
}
