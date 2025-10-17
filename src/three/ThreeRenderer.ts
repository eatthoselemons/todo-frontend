// Minimal three.js overlay renderer for effects (lazy loaded)
// This avoids heavy logic in tests; functions are small and resilient.

import type { ParticleEffect } from '../types/theme';
import type * as THREE from 'three';

export async function initThreeRenderer(container: HTMLElement) {
  // Lazy import three
  const ThreeModule = await import('three');

  const renderer = new ThreeModule.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.style.pointerEvents = 'none';
  container.appendChild(renderer.domElement);

  const scene = new ThreeModule.Scene();
  // OrthographicCamera(left, right, top, bottom, near, far)
  // For screen coordinates: left=0, right=width, top=height, bottom=0
  // (THREE uses Y-up, but we flip it so top=height to match screen Y-down)
  const camera = new ThreeModule.OrthographicCamera(0, window.innerWidth, window.innerHeight, 0, -1000, 1000);

  let running = false;
  let needsFrame = false;
  const active = new Set<THREE.Object3D>();
  const activeRAFs = new Set<number>();

  const onResize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    (camera as any).right = window.innerWidth;
    (camera as any).top = 0;
    (camera as any).bottom = window.innerHeight;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', onResize);

  const tick = (t: number) => {
    if (!running) return;
    renderer.render(scene, camera);
    if (needsFrame || active.size > 0) {
      needsFrame = false;
      requestAnimationFrame(tick);
    } else {
      running = false;
    }
  };

  function ensureLoop() {
    if (!running) {
      running = true;
      requestAnimationFrame(tick);
    } else {
      needsFrame = true;
    }
  }

  function spriteAt(x: number, y: number, color = 0xffffff, size = 6) {
    const mat = new ThreeModule.SpriteMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      // Make it circular by using a radial gradient effect
      depthTest: false,
      depthWrite: false
    });
    const sp = new ThreeModule.Sprite(mat);
    sp.position.set(x, y, 0);
    sp.scale.setScalar(size);
    return sp;
  }

  function handleParticle(p: ParticleEffect) {
    const origin = p.origin || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const colors = (p.colorSet && p.colorSet.length ? p.colorSet : ['#ffffff']).map(c => new ThreeModule.Color(c));
    const pick = () => colors[Math.floor(Math.random() * colors.length)];
    const count = Math.max(1, p.count || 1);

    console.log('[ThreeRenderer] Creating particles', { origin, count, colors: p.colorSet });

    // Convert screen coordinates to camera coordinates
    // Screen: Y=0 at top, increases downward
    // Camera: Y=0 at bottom, increases upward (with our flipped setup: top=height, bottom=0)
    // So we need to flip Y: cameraY = windowHeight - screenY
    const cameraX = origin.x;
    const cameraY = window.innerHeight - origin.y;

    // Simple, cheap sprite bursts; can be replaced with instancing later
    for (let i = 0; i < count; i++) {
      const color = pick();
      const size = 8 + Math.random() * 16;

      // Random spread around origin
      const angle = Math.random() * Math.PI * 2;
      const spread = 20 + Math.random() * 80;
      const offsetX = Math.cos(angle) * spread;
      const offsetY = Math.sin(angle) * spread;

      const sp = spriteAt(cameraX + offsetX, cameraY + offsetY, color.getHex(), size);
      scene.add(sp);
      active.add(sp);

      // Animate: fade out and move upward
      const startY = cameraY + offsetY;
      const startOpacity = 0.9;
      const startTime = Date.now();
      const duration = 800 + Math.random() * 400;

      let rafId: number | null = null;

      const animate = () => {
        // Clear the RAF ID since this callback is now running
        if (rafId !== null) {
          activeRAFs.delete(rafId);
          rafId = null;
        }

        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Fade out
        (sp.material as any).opacity = startOpacity * (1 - progress);

        // Rise up (in camera space, +Y is up)
        sp.position.y = startY + progress * 50;

        if (progress < 1) {
          rafId = requestAnimationFrame(animate);
          activeRAFs.add(rafId);
        } else {
          scene.remove(sp);
          active.delete(sp);
        }
      };

      rafId = requestAnimationFrame(animate);
      activeRAFs.add(rafId);
    }

    ensureLoop();
  }

  function handleAnimation(a: any) {
    // Placeholder: mark a frame and let particles show; can be extended per kind
    ensureLoop();
  }

  function pause() {
    running = false;
  }

  function resume() {
    if (!running) ensureLoop();
  }

  function dispose() {
    window.removeEventListener('resize', onResize);

    // Cancel all pending animation frames
    activeRAFs.forEach(id => cancelAnimationFrame(id));
    activeRAFs.clear();

    running = false;

    try {
      renderer.dispose();
    } catch {}
    if (renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
    active.clear();
  }

  return { dispose, pause, resume, handleParticle, handleAnimation };
}

