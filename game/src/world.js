// The game's rules and state, with no drawing and no browser in it: the ship, its bullets,
// the enemy kinds and their behaviour, waves, combo, pickups, upgrades, score and hull.
// step() advances one fixed step and returns what happened as bit flags, so the caller can
// react (sounds, announcements) without the world knowing about screens or sound. Nothing
// here allocates after createWorld returns, except the small arrays built at reset.

import {
  BULLET, COMBO, ENEMY, FIELD, MAX_HULL, ORB, PICKUP, PLAYER, POOL, UPGRADES, WAVE,
} from './config.js';
import { createParticles } from './particles.js';

export const EVENT_SHOOT = 1;
export const EVENT_KILL = 2;
export const EVENT_HIT = 4;
export const EVENT_OVER = 8;
export const EVENT_PICKUP = 16;
export const EVENT_DASH = 32;
export const EVENT_WAVE_CLEAR = 64;
export const EVENT_OVERDRIVE = 128;

export const KIND_SHARD = 'shard';
export const KIND_REPAIR = 'repair';
export const KIND_SHIELD = 'shield';
export const KIND_OVERDRIVE = 'overdrive';

function distanceSquared(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function createWorld(random) {
  const particles = createParticles();
  const stars = [];
  for (let i = 0; i < 110; i += 1) {
    stars.push({ x: random() * FIELD.width, y: random() * FIELD.height, size: 0.6 + random() * 1.8, phase: random() * Math.PI * 2 });
  }

  const player = {
    x: FIELD.width / 2, y: FIELD.height / 2, vx: 0, vy: 0, angle: -Math.PI / 2,
    hull: 3, maxHull: 3, shield: false, fireTimer: 0, dashTimer: 0, dashCooldown: 0,
    invulnerable: 0, overdriveTimer: 0, overdriveKills: 0,
  };
  const upgrades = { damage: 1, fireInterval: PLAYER.fireInterval, spread: 1, dashCooldown: PLAYER.dashCooldown, magnetRadius: PLAYER.magnetRadius, maxHull: 3, overdrive: false, repair: 0 };

  const bullets = [];
  for (let i = 0; i < POOL.bullets; i += 1) bullets.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0 });
  const orbs = [];
  for (let i = 0; i < POOL.orbs; i += 1) orbs.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0 });
  const enemies = [];
  for (let i = 0; i < POOL.enemies; i += 1) {
    enemies.push({ active: false, kind: 'chaser', x: 0, y: 0, vx: 0, vy: 0, hp: 1, maxHp: 1, radius: 18, speed: 100, score: 50, shootTimer: 0, wobble: 0 });
  }
  const pickups = [];
  for (let i = 0; i < POOL.pickups; i += 1) pickups.push({ active: false, kind: KIND_SHARD, x: 0, y: 0, vx: 0, vy: 0, life: 0 });

  const state = {
    player, upgrades, bullets, orbs, enemies, pickups, stars, particles,
    score: 0, kills: 0, wave: 1, killsInWave: 0, quota: WAVE.baseQuota,
    combo: 0, comboTimer: 0, elapsed: 0, spawnTimer: 1.0, shake: 0,
    waveClear: false, overdriveSurge: false,
  };

  function reset() {
    player.x = FIELD.width / 2;
    player.y = FIELD.height / 2;
    player.vx = 0;
    player.vy = 0;
    player.angle = -Math.PI / 2;
    player.hull = 3;
    player.maxHull = 3;
    player.shield = false;
    player.fireTimer = 0;
    player.dashTimer = 0;
    player.dashCooldown = 0;
    player.invulnerable = 0;
    player.overdriveTimer = 0;
    player.overdriveKills = 0;
    upgrades.damage = 1;
    upgrades.fireInterval = PLAYER.fireInterval;
    upgrades.spread = 1;
    upgrades.dashCooldown = PLAYER.dashCooldown;
    upgrades.magnetRadius = PLAYER.magnetRadius;
    upgrades.maxHull = 3;
    upgrades.overdrive = false;
    upgrades.repair = 0;
    for (const b of bullets) b.active = false;
    for (const o of orbs) o.active = false;
    for (const e of enemies) e.active = false;
    for (const p of pickups) p.active = false;
    particles.reset();
    state.score = 0;
    state.kills = 0;
    state.wave = 1;
    state.killsInWave = 0;
    state.quota = WAVE.baseQuota;
    state.combo = 0;
    state.comboTimer = 0;
    state.elapsed = 0;
    state.spawnTimer = 1.0;
    state.shake = 0;
    state.waveClear = false;
    state.overdriveSurge = false;
  }

  function free(list) {
    for (let i = 0; i < list.length; i += 1) if (!list[i].active) return list[i];
    return null;
  }

  function waveQuota(wave) {
    return WAVE.baseQuota + WAVE.quotaPerWave * (wave - 1);
  }

  function spawnInterval() {
    return Math.max(WAVE.minSpawnInterval, WAVE.spawnInterval * WAVE.spawnScale ** (state.wave - 1));
  }

  function pickKind() {
    const roll = random();
    const wave = state.wave;
    if (wave >= WAVE.eliteFromWave && roll < 0.05) return 'elite';
    if (wave >= WAVE.splitterFromWave && roll < 0.22) return 'splitter';
    if (wave >= WAVE.weaverFromWave && roll < 0.45) return 'weaver';
    return 'chaser';
  }

  function spawnEnemy(kind, x, y) {
    const enemy = free(enemies);
    if (enemy === null) return;
    const spec = ENEMY[kind];
    enemy.active = true;
    enemy.kind = kind;
    enemy.x = x;
    enemy.y = y;
    enemy.vx = 0;
    enemy.vy = 0;
    enemy.hp = spec.hp + Math.floor((state.wave - 1) / 3);
    enemy.maxHp = enemy.hp;
    enemy.radius = spec.radius + random() * (spec.radiusJitter || 0);
    enemy.speed = spec.speed * (1 + 0.04 * (state.wave - 1)) * (0.9 + random() * 0.2);
    enemy.score = spec.score;
    enemy.shootTimer = ENEMY.weaver.shootInterval * (0.6 + random() * 0.8);
    enemy.wobble = random() * Math.PI * 2;
  }

  function spawnAtEdge() {
    const edge = Math.floor(random() * 4);
    let x;
    let y;
    if (edge === 0) { x = random() * FIELD.width; y = -30; }
    else if (edge === 1) { x = random() * FIELD.width; y = FIELD.height + 30; }
    else if (edge === 2) { x = -30; y = random() * FIELD.height; }
    else { x = FIELD.width + 30; y = random() * FIELD.height; }
    if (distanceSquared(x, y, player.x, player.y) < 220 * 220) {
      x = FIELD.width - x;
      y = FIELD.height - y;
    }
    spawnEnemy(pickKind(), x, y);
  }

  function dropPickup(x, y, forcedKind) {
    const pickup = free(pickups);
    if (pickup === null) return;
    let kind = forcedKind;
    if (!kind) {
      const roll = random();
      kind = roll < 0.62 ? KIND_SHARD : roll < 0.8 ? KIND_REPAIR : roll < 0.92 ? KIND_SHIELD : KIND_OVERDRIVE;
    }
    pickup.active = true;
    pickup.kind = kind;
    pickup.x = x;
    pickup.y = y;
    const angle = random() * Math.PI * 2;
    pickup.vx = Math.cos(angle) * 60;
    pickup.vy = Math.sin(angle) * 60;
    pickup.life = PICKUP.life;
  }

  function killEnemy(enemy, award) {
    enemy.active = false;
    particles.explode(enemy.x, enemy.y, enemy.kind === 'elite' ? '#ff2e63' : '#ff9f43');
    if (enemy.kind === 'splitter') {
      for (let i = 0; i < 2; i += 1) {
        spawnEnemy('mite', enemy.x + (i === 0 ? -14 : 14), enemy.y);
      }
    }
    if (!award) return 0;
    state.kills += 1;
    state.killsInWave += 1;
    state.combo += 1;
    state.comboTimer = COMBO.window;
    const multiplier = 1 + Math.min(COMBO.maxMultiplier - 1, Math.floor(state.combo / COMBO.perStep));
    const gained = enemy.score * multiplier;
    state.score += gained;
    particles.float(enemy.x, enemy.y, `+${gained}`);
    if (enemy.kind === 'elite') {
      for (let i = 0; i < PICKUP.eliteDrops; i += 1) dropPickup(enemy.x, enemy.y);
    } else if (random() < PICKUP.dropChance) {
      dropPickup(enemy.x, enemy.y);
    }
    if (upgrades.overdrive) {
      player.overdriveKills += 1;
      if (player.overdriveKills >= 6) {
        player.overdriveKills = 0;
        player.overdriveTimer = 6;
        state.overdriveSurge = true;
      }
    }
    return gained;
  }

  function hurtPlayer() {
    if (player.shield) {
      player.shield = false;
      player.invulnerable = PLAYER.hitInvulnerable;
      state.shake = Math.min(1, state.shake + 0.5);
      particles.hit(player.x, player.y, '#6ea8ff');
      return EVENT_HIT;
    }
    player.hull -= 1;
    player.invulnerable = PLAYER.hitInvulnerable;
    state.combo = 0;
    state.comboTimer = 0;
    state.shake = 1;
    particles.explode(player.x, player.y, '#4ef0d0');
    if (player.hull <= 0) return EVENT_HIT | EVENT_OVER;
    return EVENT_HIT;
  }

  function fireBullets() {
    const count = upgrades.spread;
    const baseAngle = player.angle;
    const interval = player.overdriveTimer > 0 ? upgrades.fireInterval * 0.5 : upgrades.fireInterval;
    player.fireTimer = interval;
    for (let i = 0; i < count; i += 1) {
      const bullet = free(bullets);
      if (bullet === null) return;
      const offset = (i - (count - 1) / 2) * 0.12;
      const angle = baseAngle + offset;
      bullet.active = true;
      bullet.x = player.x + Math.cos(angle) * (PLAYER.radius + 6);
      bullet.y = player.y + Math.sin(angle) * (PLAYER.radius + 6);
      bullet.vx = Math.cos(angle) * PLAYER.bulletSpeed + player.vx * 0.25;
      bullet.vy = Math.sin(angle) * PLAYER.bulletSpeed + player.vy * 0.25;
      bullet.life = BULLET.life;
    }
  }

  function stepEnemies(dt, harmless) {
    for (const enemy of enemies) {
      if (!enemy.active) continue;
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = dx / dist;
      const ny = dy / dist;
      if (harmless) {
        enemy.x += Math.cos(enemy.wobble) * 30 * dt;
        enemy.y += Math.sin(enemy.wobble * 0.7) * 30 * dt + 12 * dt;
        if (enemy.y > FIELD.height + 40) { enemy.active = false; }
        continue;
      }
      if (enemy.kind === 'weaver') {
        enemy.wobble += dt * 2.4;
        const px = -ny;
        const py = nx;
        enemy.vx = nx * enemy.speed + px * Math.sin(enemy.wobble) * 70;
        enemy.vy = ny * enemy.speed + py * Math.sin(enemy.wobble) * 70;
        enemy.shootTimer -= dt;
        if (enemy.shootTimer <= 0 && dist < 520) {
          enemy.shootTimer = ENEMY.weaver.shootInterval;
          const orb = free(orbs);
          if (orb) {
            orb.active = true;
            orb.x = enemy.x;
            orb.y = enemy.y;
            orb.vx = nx * ORB.speed;
            orb.vy = ny * ORB.speed;
            orb.life = ORB.life;
          }
        }
      } else if (enemy.kind === 'mite') {
        enemy.vx = nx * enemy.speed;
        enemy.vy = ny * enemy.speed;
      } else {
        enemy.vx += (nx * enemy.speed - enemy.vx) * Math.min(1, 2.2 * dt);
        enemy.vy += (ny * enemy.speed - enemy.vy) * Math.min(1, 2.2 * dt);
      }
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;
      enemy.x = Math.max(-60, Math.min(FIELD.width + 60, enemy.x));
      enemy.y = Math.max(-60, Math.min(FIELD.height + 60, enemy.y));
    }
  }

  function stepBullets(dt) {
    let events = 0;
    for (const bullet of bullets) {
      if (!bullet.active) continue;
      bullet.life -= dt;
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      if (bullet.life <= 0 || bullet.x < -20 || bullet.x > FIELD.width + 20 || bullet.y < -20 || bullet.y > FIELD.height + 20) {
        bullet.active = false;
        continue;
      }
      for (const enemy of enemies) {
        if (!enemy.active) continue;
        const reach = enemy.radius + BULLET.radius;
        if (distanceSquared(bullet.x, bullet.y, enemy.x, enemy.y) > reach * reach) continue;
        bullet.active = false;
        enemy.hp -= upgrades.damage;
        particles.hit(bullet.x, bullet.y, '#ffe066');
        if (enemy.hp <= 0) {
          killEnemy(enemy, true);
          events |= EVENT_KILL;
        }
        break;
      }
    }
    return events;
  }

  function stepOrbs(dt) {
    let events = 0;
    for (const orb of orbs) {
      if (!orb.active) continue;
      orb.life -= dt;
      orb.x += orb.vx * dt;
      orb.y += orb.vy * dt;
      if (orb.life <= 0 || orb.x < -20 || orb.x > FIELD.width + 20 || orb.y < -20 || orb.y > FIELD.height + 20) {
        orb.active = false;
        continue;
      }
      const reach = PLAYER.radius + ORB.radius;
      if (player.invulnerable <= 0 && distanceSquared(orb.x, orb.y, player.x, player.y) <= reach * reach) {
        orb.active = false;
        events |= hurtPlayer();
      }
    }
    return events;
  }

  function stepPickups(dt) {
    let events = 0;
    for (const pickup of pickups) {
      if (!pickup.active) continue;
      pickup.life -= dt;
      if (pickup.life <= 0) { pickup.active = false; continue; }
      const dx = player.x - pickup.x;
      const dy = player.y - pickup.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < upgrades.magnetRadius) {
        pickup.vx += (dx / dist) * PICKUP.magnetSpeed * dt * 6;
        pickup.vy += (dy / dist) * PICKUP.magnetSpeed * dt * 6;
      } else {
        pickup.vx *= 0.98;
        pickup.vy *= 0.98;
      }
      pickup.x += pickup.vx * dt;
      pickup.y += pickup.vy * dt;
      const reach = PLAYER.radius + 12;
      if (dist <= reach) {
        pickup.active = false;
        if (pickup.kind === KIND_SHARD) {
          state.score += PICKUP.shardScore;
          particles.float(pickup.x, pickup.y, `+${PICKUP.shardScore}`);
        } else if (pickup.kind === KIND_REPAIR) {
          player.hull = Math.min(player.maxHull, player.hull + 1);
          particles.float(pickup.x, pickup.y, '+1 HULL');
        } else if (pickup.kind === KIND_SHIELD) {
          player.shield = true;
          particles.float(pickup.x, pickup.y, 'SHIELD');
        } else if (pickup.kind === KIND_OVERDRIVE) {
          player.overdriveTimer = 6;
          particles.float(pickup.x, pickup.y, 'OVERDRIVE');
        }
        events |= EVENT_PICKUP;
      }
    }
    return events;
  }

  function stepCollisions() {
    let events = 0;
    if (player.invulnerable > 0) return events;
    for (const enemy of enemies) {
      if (!enemy.active) continue;
      const reach = enemy.radius + PLAYER.radius - 4;
      if (distanceSquared(enemy.x, enemy.y, player.x, player.y) > reach * reach) continue;
      killEnemy(enemy, true);
      events |= EVENT_KILL;
      events |= hurtPlayer();
      if (events & EVENT_OVER) break;
    }
    return events;
  }

  /**
   * One fixed step. `input` is the frame's control snapshot (move, aim, firing, dash).
   * With `harmless` set (the title screen's backdrop) enemies drift, nothing shoots, and
   * nothing scores or hurts the player.
   */
  function step(dt, input, harmless) {
    let events = 0;
    state.elapsed += dt;
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }
    if (player.invulnerable > 0) player.invulnerable = Math.max(0, player.invulnerable - dt);
    if (player.dashCooldown > 0) player.dashCooldown = Math.max(0, player.dashCooldown - dt);
    if (player.overdriveTimer > 0) player.overdriveTimer = Math.max(0, player.overdriveTimer - dt);
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 1.8);
    state.overdriveSurge = false;

    if (harmless) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        state.spawnTimer = 1.4;
        spawnEnemy(random() < 0.5 ? 'chaser' : 'weaver', random() * FIELD.width, -30);
      }
      stepEnemies(dt, true);
      particles.step(dt);
      return events;
    }

    // Steering: thrust toward the held direction, drag caps the speed.
    const moveLength = Math.hypot(input.moveX, input.moveY) || 1;
    const thrustX = (input.moveX / moveLength) * PLAYER.thrust;
    const thrustY = (input.moveY / moveLength) * PLAYER.thrust;
    if (input.moveX !== 0 || input.moveY !== 0) {
      player.vx += thrustX * dt;
      player.vy += thrustY * dt;
      const speed = Math.hypot(player.vx, player.vy);
      if (speed > PLAYER.maxSpeed) {
        player.vx = (player.vx / speed) * PLAYER.maxSpeed;
        player.vy = (player.vy / speed) * PLAYER.maxSpeed;
      }
    } else {
      const drag = Math.max(0, 1 - PLAYER.drag * dt);
      player.vx *= drag;
      player.vy *= drag;
    }

    // Dash: a burst along the thrust direction (or the aim when standing still).
    if (input.dash && player.dashCooldown <= 0 && player.dashTimer <= 0) {
      let dx = input.moveX;
      let dy = input.moveY;
      if (dx === 0 && dy === 0) {
        dx = Math.cos(player.angle);
        dy = Math.sin(player.angle);
      }
      const length = Math.hypot(dx, dy) || 1;
      player.vx = (dx / length) * PLAYER.dashSpeed;
      player.vy = (dy / length) * PLAYER.dashSpeed;
      player.dashTimer = PLAYER.dashTime;
      player.dashCooldown = upgrades.dashCooldown;
      player.invulnerable = Math.max(player.invulnerable, PLAYER.dashInvulnerable);
      events |= EVENT_DASH;
    }
    if (player.dashTimer > 0) player.dashTimer = Math.max(0, player.dashTimer - dt);

    player.x = Math.max(PLAYER.radius, Math.min(FIELD.width - PLAYER.radius, player.x + player.vx * dt));
    player.y = Math.max(PLAYER.radius, Math.min(FIELD.height - PLAYER.radius, player.y + player.vy * dt));
    player.angle = Math.atan2(input.aimY - player.y, input.aimX - player.x);
    if ((input.moveX !== 0 || input.moveY !== 0) && Math.hypot(player.vx, player.vy) > 60) {
      const back = Math.atan2(player.vy, player.vx) + Math.PI;
      particles.thrust(player.x + Math.cos(back) * PLAYER.radius, player.y + Math.sin(back) * PLAYER.radius, back);
    }

    if (input.firing) {
      player.fireTimer -= dt;
      if (player.fireTimer <= 0) {
        fireBullets();
        events |= EVENT_SHOOT;
      }
    } else if (player.fireTimer > 0) {
      player.fireTimer -= dt;
    }

    if (state.killsInWave < state.quota) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        state.spawnTimer = spawnInterval();
        spawnAtEdge();
      }
    } else if (!state.waveClear) {
      let anyAlive = false;
      for (const enemy of enemies) if (enemy.active) { anyAlive = true; break; }
      if (!anyAlive) {
        state.waveClear = true;
        events |= EVENT_WAVE_CLEAR;
      }
    }

    stepEnemies(dt, false);
    events |= stepBullets(dt);
    events |= stepOrbs(dt);
    events |= stepPickups(dt);
    events |= stepCollisions();
    if (player.overdriveTimer > 0 && state.overdriveSurge) events |= EVENT_OVERDRIVE;
    particles.step(dt);
    return events;
  }

  /** Three distinct upgrade cards for the wave-clear screen. */
  function chooseUpgrades() {
    const pool = UPGRADES.slice();
    const picked = [];
    while (picked.length < 3 && pool.length > 0) {
      const index = Math.floor(random() * pool.length);
      picked.push(pool.splice(index, 1)[0]);
    }
    return picked;
  }

  /** Apply a picked upgrade card, then open the next wave. */
  function applyUpgrade(upgrade) {
    upgrades.repair = 0;
    upgrade.apply(upgrades);
    if (upgrades.repair === 1) {
      player.hull = Math.min(player.maxHull, player.hull + 1);
      player.maxHull = upgrades.maxHull;
    } else {
      player.maxHull = upgrades.maxHull;
    }
    state.wave += 1;
    state.killsInWave = 0;
    state.quota = waveQuota(state.wave);
    state.spawnTimer = WAVE.restockSeconds;
    state.waveClear = false;
  }

  reset();
  return { state, reset, step, chooseUpgrades, applyUpgrade };
}
