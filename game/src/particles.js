// Particles and floating score text: short-lived visual feedback with no rules of its own.
// The world asks for bursts (explosions, sparks, thruster puffs) and the renderer draws them.
// Pools are allocated once and reused, so a busy fight allocates nothing.

import { POOL } from './config.js';

export function createParticles() {
  const sparks = [];
  for (let i = 0; i < POOL.particles; i += 1) {
    sparks.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#ffffff' });
  }
  const floaters = [];
  for (let i = 0; i < POOL.floaters; i += 1) {
    floaters.push({ active: false, x: 0, y: 0, life: 0, maxLife: 1, text: '' });
  }

  function free(list) {
    for (let i = 0; i < list.length; i += 1) if (!list[i].active) return list[i];
    return list[0];
  }

  function burst(x, y, color, count, speed, size, life) {
    for (let i = 0; i < count; i += 1) {
      const p = free(sparks);
      const angle = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random() * 0.7);
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * v;
      p.vy = Math.sin(angle) * v;
      p.maxLife = life * (0.6 + Math.random() * 0.7);
      p.life = p.maxLife;
      p.size = size * (0.6 + Math.random() * 0.8);
      p.color = color;
    }
  }

  return {
    sparks,
    floaters,
    burst,
    /** A short coloured burst where a bullet lands or an enemy pops. */
    hit(x, y, color) { burst(x, y, color, 10, 170, 3, 0.45); },
    /** A big explosion: many sparks plus a slow bright core. */
    explode(x, y, color) {
      burst(x, y, color, 26, 260, 4, 0.8);
      burst(x, y, '#ffffff', 8, 120, 3, 0.5);
    },
    /** A small thruster puff behind the ship. */
    thrust(x, y, angle) {
      const p = free(sparks);
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = -Math.cos(angle) * 90 + (Math.random() - 0.5) * 40;
      p.vy = -Math.sin(angle) * 90 + (Math.random() - 0.5) * 40;
      p.maxLife = 0.3;
      p.life = 0.3;
      p.size = 2.5;
      p.color = '#4ef0d0';
    },
    /** Rising text that fades, for score popups. */
    float(x, y, text) {
      const f = free(floaters);
      f.active = true;
      f.x = x;
      f.y = y;
      f.maxLife = 1.0;
      f.life = 1.0;
      f.text = text;
    },
    step(dt) {
      for (const p of sparks) {
        if (!p.active) continue;
        p.life -= dt;
        if (p.life <= 0) { p.active = false; continue; }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.96;
        p.vy *= 0.96;
      }
      for (const f of floaters) {
        if (!f.active) continue;
        f.life -= dt;
        if (f.life <= 0) { f.active = false; continue; }
        f.y -= 42 * dt;
      }
    },
    reset() {
      for (const p of sparks) p.active = false;
      for (const f of floaters) f.active = false;
    },
  };
}
