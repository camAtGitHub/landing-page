import * as THREE from 'three';
import { StructureInstance } from '../types';

export interface LabelSystem {
  update: () => void;
  show: () => void;
  hide: () => void;
  dispose: () => void;
}

export function createLabels(
  instances: StructureInstance[],
  camera: THREE.PerspectiveCamera,
): LabelSystem {
  const overlay = document.getElementById('overlay');
  if (!overlay) return { update: () => {}, show: () => {}, hide: () => {}, dispose: () => {} };

  const style = document.createElement('style');
  style.textContent = `
    .entry-label {
      position: absolute;
      transform: translate(-50%, -100%);
      pointer-events: auto;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.3s ease;
      white-space: nowrap;
      user-select: none;
      margin-top: -30px;
      padding: 12px;
      margin-left: -12px;
      margin-right: -12px;
      margin-bottom: -12px;
    }
    .entry-label .entry-label-inner {
      font-family: 'Courier New', monospace;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      font-size: 12px;
      padding: 6px 10px;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(4px);
      border: 1px solid rgba(0, 255, 200, 0.3);
      color: rgba(0, 255, 200, 0.8);
      transition: border-color 0.2s ease, box-shadow 0.2s ease, color 0.2s ease;
    }
    .entry-label.priority-high .entry-label-inner {
      font-size: 15px;
    }
    .entry-label:hover .entry-label-inner {
      border-color: rgba(0, 255, 200, 0.8);
      box-shadow: 0 0 12px rgba(0, 255, 200, 0.3);
      color: rgba(0, 255, 200, 1);
    }
    .entry-label .label-desc {
      display: block;
      font-size: 9px;
      opacity: 0.6;
      margin-top: 2px;
      text-transform: none;
      letter-spacing: 0.5px;
    }
    .entry-label.visible {
      opacity: 1;
    }
  `;
  document.head.appendChild(style);

  const labelElements: HTMLElement[] = [];
  const projVec = new THREE.Vector3();
  let isVisible = false;

  instances.forEach((instance) => {
    const el = document.createElement('div');
    el.className = 'entry-label';
    if (instance.entry.priority >= 8) el.classList.add('priority-high');

    let inner = instance.entry.name;
    if (instance.entry.description) {
      inner += `<span class="label-desc">${instance.entry.description}</span>`;
    }
    el.innerHTML = `<div class="entry-label-inner">${inner}</div>`;

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const url = instance.entry.url;
      if (url.startsWith('http://') || url.startsWith('https://')) {
        window.open(url, '_blank');
      } else {
        window.location.href = url;
      }
    });

    overlay.appendChild(el);
    labelElements.push(el);
  });

  const update = (): void => {
    if (!isVisible) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    instances.forEach((instance, i) => {
      const el = labelElements[i];
      if (!el) return;

      projVec.copy(instance.worldPosition);
      projVec.y += instance.boundingRadius + 2;
      projVec.project(camera);

      if (projVec.z > 1) {
        el.style.display = 'none';
        return;
      }

      const x = (projVec.x * 0.5 + 0.5) * w;
      const y = (-projVec.y * 0.5 + 0.5) * h;

      if (x < -100 || x > w + 100 || y < -100 || y > h + 100) {
        el.style.display = 'none';
        return;
      }

      el.style.display = 'block';
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.dataset.worldX = instance.worldPosition.x.toFixed(4);
      el.dataset.worldZ = instance.worldPosition.z.toFixed(4);
    });
  };

  const show = (): void => {
    isVisible = true;
    labelElements.forEach((el) => el.classList.add('visible'));
  };

  const hide = (): void => {
    isVisible = false;
    labelElements.forEach((el) => el.classList.remove('visible'));
  };

  const dispose = (): void => {
    labelElements.forEach((el) => el.remove());
    style.remove();
  };

  return { update, show, hide, dispose };
}
