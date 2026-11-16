// Every tuning number and colour for Lumen Drift, in one place. The playfield is a fixed
// 1280x720 logical area; the renderer scales it to fit the window, so no rule below depends
// on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Hull hearts the ship starts with; repairs can raise it up to MAX_HULL. */
export const MAX_HULL = 5;

export const PLAYER = {
  radius: 16,
  thrust: 1500,
  maxSpeed: 340,
  drag: 2.2,
  fireInterval: 0.16,
  bulletSpeed: 620,
  bulletDamage: 1,
  dashSpeed: 720,
  dashTime: 0.16,
  dashCooldown: 2.6,
  dashInvulnerable: 0.3,
  hitInvulnerable: 1.2,
  magnetRadius: 90,
};

export const BULLET = { radius: 4, life: 1.1 };

export const ORB = { radius: 6, speed: 220, life: 5 };

/** Enemy kinds: chaser, weaver, splitter, mite, elite. */
export const ENEMY = {
  chaser: { radius: 18, hp: 2, speed: 118, score: 50, radiusJitter: 4 },
  weaver: { radius: 16, hp: 2, speed: 100, score: 80, shootInterval: 2.8 },
  splitter: { radius: 24, hp: 3, speed: 82, score: 100 },
  mite: { radius: 10, hp: 1, speed: 198, score: 30 },
  elite: { radius: 34, hp: 14, speed: 95, score: 400 },
};

/** Kills needed to clear a wave, and how the spawn pace tightens as waves climb. */
export const WAVE = {
  baseQuota: 10,
  quotaPerWave: 6,
  spawnInterval: 0.85,
  spawnScale: 0.9,
  minSpawnInterval: 0.28,
  eliteFromWave: 3,
  weaverFromWave: 2,
  splitterFromWave: 2,
  restockSeconds: 1.6,
};

/** Combo: each kill refreshes the window; every 8 chained kills raises the multiplier. */
export const COMBO = { window: 3.0, perStep: 8, maxMultiplier: 5 };

export const PICKUP = {
  shardScore: 25,
  shardHeal: 0,
  dropChance: 0.22,
  eliteDrops: 3,
  magnetSpeed: 260,
  life: 12,
};

/** Pool sizes: every entity pool is allocated once, at boot, and reused. */
export const POOL = { bullets: 96, enemies: 48, orbs: 64, pickups: 48, particles: 256, floaters: 32 };

export const PALETTE = {
  backdrop: '#070a18',
  space: '#0b1026',
  nebulaA: '#1b2a5e',
  nebulaB: '#3a1c5e',
  grid: '#141b38',
  player: '#4ef0d0',
  playerCore: '#eafffa',
  bullet: '#ffe066',
  orb: '#ff5d8f',
  chaser: '#ff6b5e',
  weaver: '#c77dff',
  splitter: '#ff9f43',
  mite: '#ff8fa3',
  elite: '#ff2e63',
  shard: '#7df9ff',
  repair: '#7dff8a',
  shield: '#6ea8ff',
  overdrive: '#ffb347',
  text: '#eef1f5',
  muted: '#8b93b8',
  panel: '#12172e',
  panelEdge: '#2b3a6e',
  danger: '#ff5d5d',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'lumen-drift.best';

/** Upgrade cards offered when a wave is cleared. */
export const UPGRADES = [
  { id: 'rapid', name: 'Rapid Cycler', desc: 'Fire 18% faster.', apply: (u) => { u.fireInterval *= 0.82; } },
  { id: 'spread', name: 'Twin Lances', desc: '+1 bullet per shot.', apply: (u) => { u.spread += 1; } },
  { id: 'heavy', name: 'Heavy Rounds', desc: '+1 damage per bullet.', apply: (u) => { u.damage += 1; } },
  { id: 'hull', name: 'Reinforced Hull', desc: '+1 max hull and repair 1.', apply: (u) => { u.maxHull = Math.min(MAX_HULL, u.maxHull + 1); u.repair = 1; } },
  { id: 'dash', name: 'Ion Dash', desc: 'Dash recharges 30% faster.', apply: (u) => { u.dashCooldown *= 0.7; } },
  { id: 'magnet', name: 'Tractor Web', desc: 'Pickups fly to you from farther away.', apply: (u) => { u.magnetRadius += 80; } },
  { id: 'overdrive', name: 'Overdrive Core', desc: 'Kills charge a 6s rapid-fire surge.', apply: (u) => { u.overdrive = true; } },
];
