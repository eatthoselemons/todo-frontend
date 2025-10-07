// Minimal three.js overlay renderer for effects (lazy loaded)
// This avoids heavy logic in tests; functions are small and resilient.

import type { ParticleEffect } from '../types/theme';

export async function initThreeRenderer(container: HTMLElement) {
  // Lazy import three
  const THREE = await import('three');

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.style.pointerEvents = 'none';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, window.innerWidth, window.innerHeight, 0, -1000, 1000);

  let running = false;
  let needsFrame = false;
  const active = new Set<THREE.Object3D>();

  const onResize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    (camera as any).right = window.innerWidth;
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
    const mat = new THREE.SpriteMaterial({ color, transparent: true, opacity: 0.9 });
    const sp = new THREE.Sprite(mat);
    sp.position.set(x, y, 0);
    sp.scale.setScalar(size);
    return sp;
  }

  function handleParticle(p: ParticleEffect) {
    const origin = p.origin || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const colors = (p.colorSet && p.colorSet.length ? p.colorSet : ['#ffffff']).map(c => new THREE.Color(c));
    const pick = () => colors[Math.floor(Math.random() * colors.length)];
    const count = Math.max(1, p.count || 1);

    // Simple, cheap sprite bursts; can be replaced with instancing later
    for (let i = 0; i < count; i++) {
      const color = pick();
      const size = 4 + Math.random() * 8;
      const sp = spriteAt(origin.x, origin.y, color.getHex(), size);
      scene.add(sp);
      active.add(sp);
      // Lifespan
      setTimeout(() => {
        scene.remove(sp);
        active.delete(sp);
      }, 600 + Math.random() * 400);
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

