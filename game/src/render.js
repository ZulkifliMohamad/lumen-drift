// Drawing only: the world's state and the current screen in, pixels out. The 1280x720
// playfield is scaled to fit the window and centred, the margin filled with the backdrop
// colour. Neon glow ships, a starfield, particles, a full HUD and the title, upgrade, pause
// and game-over panels. Text that holds a number is rebuilt only when the number changes,
// so a frame allocates nothing.

import { FIELD, FONT, PALETTE, PLAYER } from './config.js';
import { KIND_OVERDRIVE, KIND_REPAIR, KIND_SHARD, KIND_SHIELD } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const PANEL = { width: 680, top: 150, line: 32, bottom: 76 };
const CARD = { width: 200, height: 148, gap: 24 };

function cachedLabel(prefix) {
  let value = null;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('SCORE ');
  const waveLabel = cachedLabel('WAVE ');
  const finalLabel = cachedLabel('SCORE ');
  const bestLabel = cachedLabel('BEST ');
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  /** Convert a client pixel on the canvas to playfield coordinates. */
  function toField(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const px = (clientX - rect.left) * ratio;
    const py = (clientY - rect.top) * ratio;
    return { x: (px - view.x) / view.scale, y: (py - view.y) / view.scale };
  }

  function text(value, x, y, size, color, align, baseline = 'alphabetic') {
    if (!fonts.has(size)) fonts.set(size, `600 ${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = baseline;
    context.fillText(value, x, y);
  }

  function glow(color, blur) {
    context.shadowColor = color;
    context.shadowBlur = blur;
  }

  function drawBackground(state, time) {
    context.fillStyle = PALETTE.space;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    const nebula = context.createRadialGradient(300, 160, 40, 300, 160, 420);
    nebula.addColorStop(0, 'rgba(59, 42, 110, 0.55)');
    nebula.addColorStop(1, 'rgba(59, 42, 110, 0)');
    context.fillStyle = nebula;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    const nebula2 = context.createRadialGradient(1020, 560, 40, 1020, 560, 460);
    nebula2.addColorStop(0, 'rgba(27, 42, 94, 0.55)');
    nebula2.addColorStop(1, 'rgba(27, 42, 94, 0)');
    context.fillStyle = nebula2;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.strokeStyle = PALETTE.grid;
    context.lineWidth = 1;
    for (let x = 0; x <= FIELD.width; x += 80) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, FIELD.height);
      context.stroke();
    }
    for (let y = 0; y <= FIELD.height; y += 80) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(FIELD.width, y);
      context.stroke();
    }
    for (const star of state.stars) {
      const twinkle = 0.5 + 0.5 * Math.sin(time * 2 + star.phase);
      context.globalAlpha = 0.35 + 0.55 * twinkle;
      context.fillStyle = '#cfe6ff';
      context.fillRect(star.x, star.y, star.size, star.size);
    }
    context.globalAlpha = 1;
  }

  function drawShip(x, y, angle, radius, body, core, blink) {
    if (blink) return;
    context.save();
    context.translate(x, y);
    context.rotate(angle);
    glow(body, 18);
    context.fillStyle = body;
    context.beginPath();
    context.moveTo(radius + 8, 0);
    context.lineTo(-radius * 0.7, radius * 0.75);
    context.lineTo(-radius * 0.35, 0);
    context.lineTo(-radius * 0.7, -radius * 0.75);
    context.closePath();
    context.fill();
    glow(core, 10);
    context.fillStyle = core;
    context.beginPath();
    context.arc(2, 0, radius * 0.32, 0, Math.PI * 2);
    context.fill();
    context.restore();
    context.shadowBlur = 0;
  }

  function drawEnemy(enemy, time) {
    const pulse = 1 + 0.08 * Math.sin(time * 5 + enemy.wobble);
    const r = enemy.radius * pulse;
    context.save();
    context.translate(enemy.x, enemy.y);
    let color = PALETTE.chaser;
    if (enemy.kind === 'weaver') color = PALETTE.weaver;
    else if (enemy.kind === 'splitter') color = PALETTE.splitter;
    else if (enemy.kind === 'mite') color = PALETTE.mite;
    else if (enemy.kind === 'elite') color = PALETTE.elite;
    glow(color, 16);
    context.fillStyle = color;
    if (enemy.kind === 'weaver') {
      context.rotate(time * 1.2);
      context.beginPath();
      for (let i = 0; i < 5; i += 1) {
        const a = (i / 5) * Math.PI * 2;
        const a2 = a + Math.PI / 5;
        context.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        context.lineTo(Math.cos(a2) * r * 0.55, Math.sin(a2) * r * 0.55);
      }
      context.closePath();
      context.fill();
    } else if (enemy.kind === 'splitter' || enemy.kind === 'mite') {
      context.beginPath();
      context.arc(0, 0, r, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;
      context.fillStyle = 'rgba(7, 10, 24, 0.85)';
      context.beginPath();
      context.arc(0, 0, r * 0.45, 0, Math.PI * 2);
      context.fill();
    } else if (enemy.kind === 'elite') {
      context.rotate(time * 0.6);
      context.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2;
        context.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      context.closePath();
      context.fill();
      context.shadowBlur = 0;
      context.fillStyle = '#ffffff';
      context.beginPath();
      context.arc(0, 0, r * 0.22, 0, Math.PI * 2);
      context.fill();
    } else {
      context.beginPath();
      context.moveTo(r, 0);
      context.lineTo(-r * 0.8, r * 0.7);
      context.lineTo(-r * 0.4, 0);
      context.lineTo(-r * 0.8, -r * 0.7);
      context.closePath();
      context.fill();
    }
    context.restore();
    context.shadowBlur = 0;
    if (enemy.maxHp > 2) {
      const width = enemy.radius * 2;
      context.fillStyle = 'rgba(255, 255, 255, 0.18)';
      context.fillRect(enemy.x - width / 2, enemy.y - enemy.radius - 12, width, 4);
      context.fillStyle = PALETTE.danger;
      context.fillRect(enemy.x - width / 2, enemy.y - enemy.radius - 12, width * (enemy.hp / enemy.maxHp), 4);
    }
  }

  function drawPickups(state) {
    for (const pickup of state.pickups) {
      if (!pickup.active) continue;
      let color = PALETTE.shard;
      if (pickup.kind === KIND_REPAIR) color = PALETTE.repair;
      else if (pickup.kind === KIND_SHIELD) color = PALETTE.shield;
      else if (pickup.kind === KIND_OVERDRIVE) color = PALETTE.overdrive;
      glow(color, 12);
      context.fillStyle = color;
      context.save();
      context.translate(pickup.x, pickup.y);
      context.rotate(Math.PI / 4);
      const s = pickup.kind === KIND_SHARD ? 7 : 9;
      context.fillRect(-s / 2, -s / 2, s, s);
      context.restore();
      context.shadowBlur = 0;
    }
  }

  function drawParticles(state) {
    for (const p of state.particles.sparks) {
      if (!p.active) continue;
      context.globalAlpha = Math.max(0, p.life / p.maxLife);
      context.fillStyle = p.color;
      context.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    context.globalAlpha = 1;
    for (const f of state.particles.floaters) {
      if (!f.active) continue;
      context.globalAlpha = Math.max(0, f.life / f.maxLife);
      text(f.text, f.x, f.y, 18, '#ffffff', 'center');
    }
    context.globalAlpha = 1;
  }

  function drawHud(state) {
    const player = state.player;
    text(scoreLabel(state.score), 24, 40, 26, PALETTE.text, 'left', 'top');
    const combo = state.combo > 1 ? `COMBO x${state.combo}  ·  MULT x${1 + Math.min(4, Math.floor(state.combo / 8))}` : '';
    if (combo) text(combo, 24, 72, 17, PALETTE.bullet, 'left', 'top');
    text(waveLabel(state.wave), FIELD.width / 2, 40, 26, PALETTE.text, 'center', 'top');
    text(`WAVE ${Math.min(state.killsInWave, state.quota)}/${state.quota}`, FIELD.width / 2, 72, 16, PALETTE.muted, 'center', 'top');
    for (let i = 0; i < player.maxHull; i += 1) {
      const x = FIELD.width - 24 - (player.maxHull - i) * 30;
      context.fillStyle = i < player.hull ? '#ff6b81' : 'rgba(255, 255, 255, 0.15)';
      context.save();
      context.translate(x + 10, 34);
      context.beginPath();
      context.moveTo(0, 7);
      context.bezierCurveTo(-11, -3, -6, -12, 0, -5);
      context.bezierCurveTo(6, -12, 11, -3, 0, 7);
      context.fill();
      context.restore();
    }
    if (player.shield) text('SHIELD', FIELD.width - 24, 62, 15, PALETTE.shield, 'right', 'top');
    const dashReady = player.dashCooldown <= 0;
    const dashWidth = 120;
    const dashX = FIELD.width - 24 - dashWidth;
    context.fillStyle = 'rgba(255, 255, 255, 0.15)';
    context.fillRect(dashX, 84, dashWidth, 6);
    context.fillStyle = dashReady ? PALETTE.player : PALETTE.muted;
    const fill = dashReady ? 1 : 1 - player.dashCooldown / state.upgrades.dashCooldown;
    context.fillRect(dashX, 84, dashWidth * fill, 6);
    text(dashReady ? 'DASH READY' : 'DASH', dashX + dashWidth, 104, 13, PALETTE.muted, 'right', 'top');
    if (player.overdriveTimer > 0) {
      const width = 200;
      const x = (FIELD.width - width) / 2;
      context.fillStyle = 'rgba(255, 179, 71, 0.25)';
      context.fillRect(x, FIELD.height - 34, width, 8);
      context.fillStyle = PALETTE.overdrive;
      context.fillRect(x, FIELD.height - 34, width * (player.overdriveTimer / 6), 8);
      text('OVERDRIVE', FIELD.width / 2, FIELD.height - 44, 14, PALETTE.overdrive, 'center', 'top');
    }
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(7, 10, 24, 0.55)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(x, y, PANEL.width, height);
    text(title, FIELD.width / 2, y + 78, 46, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 20, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 22, PALETTE.player, 'center');
  }

  /** The three upgrade cards; returns their rectangles so clicks can pick one. */
  function drawUpgradeCards(choices) {
    const total = 3 * CARD.width + 2 * CARD.gap;
    const startX = (FIELD.width - total) / 2;
    const y = 330;
    const rects = [];
    for (let i = 0; i < choices.length; i += 1) {
      const x = startX + i * (CARD.width + CARD.gap);
      rects.push({ x, y, width: CARD.width, height: CARD.height });
      context.fillStyle = PALETTE.panel;
      context.fillRect(x, y, CARD.width, CARD.height);
      context.strokeStyle = PALETTE.panelEdge;
      context.lineWidth = 2;
      context.strokeRect(x, y, CARD.width, CARD.height);
      text(`[${i + 1}]`, x + CARD.width / 2, y + 34, 16, PALETTE.muted, 'center');
      text(choices[i].name, x + CARD.width / 2, y + 66, 21, PALETTE.text, 'center');
      const words = choices[i].desc.split(' ');
      let line = '';
      let lineY = y + 100;
      for (const word of words) {
        if ((line + word).length > 22 && line) {
          text(line.trim(), x + CARD.width / 2, lineY, 16, PALETTE.muted, 'center');
          line = '';
          lineY += 22;
        }
        line += `${word} `;
      }
      if (line) text(line.trim(), x + CARD.width / 2, lineY, 16, PALETTE.muted, 'center');
    }
    return rects;
  }

  const TITLE_LINES = [
    'Pilot the last lantern-ship through the swarm.',
    'WASD or arrows to thrust · mouse to aim · hold click or Space to fire',
    'Shift or right-click to dash · P to pause · M to mute',
    'Clear each wave, then pick an upgrade. Survive as long as you can.',
    '',
  ];
  const PAUSED_LINES = ['The swarm waits for no one. Except now.'];
  const OVER_LINES = ['', ''];

  /** Paint one frame: background, entities, then the HUD or a panel for the screen. */
  function draw(state, screen, best, time, choices) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const shakeX = state.shake > 0 ? (Math.random() - 0.5) * state.shake * 14 : 0;
    const shakeY = state.shake > 0 ? (Math.random() - 0.5) * state.shake * 14 : 0;
    context.setTransform(view.scale, 0, 0, view.scale, view.x + shakeX * view.scale, view.y + shakeY * view.scale);
    drawBackground(state, time);
    drawPickups(state);
    for (const enemy of state.enemies) if (enemy.active) drawEnemy(enemy, time);
    for (const orb of state.orbs) {
      if (!orb.active) continue;
      glow(PALETTE.orb, 12);
      context.fillStyle = PALETTE.orb;
      context.beginPath();
      context.arc(orb.x, orb.y, 6, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;
    }
    for (const bullet of state.bullets) {
      if (!bullet.active) continue;
      glow(PALETTE.bullet, 10);
      context.fillStyle = PALETTE.bullet;
      context.beginPath();
      context.arc(bullet.x, bullet.y, 4, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;
    }
    const player = state.player;
    const blink = player.invulnerable > 0 && Math.floor(player.invulnerable * 10) % 2 === 0;
    if (screen !== SCREEN_TITLE) {
      drawShip(player.x, player.y, player.angle, PLAYER.radius, PALETTE.player, PALETTE.playerCore, blink);
      if (player.shield) {
        context.strokeStyle = PALETTE.shield;
        context.lineWidth = 2;
        context.globalAlpha = 0.6 + 0.3 * Math.sin(time * 6);
        context.beginPath();
        context.arc(player.x, player.y, PLAYER.radius + 10, 0, Math.PI * 2);
        context.stroke();
        context.globalAlpha = 1;
      }
    }
    drawParticles(state);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[4] = bestLabel(best);
      drawPanel('LUMEN DRIFT', TITLE_LINES, 'Press Space or click to launch');
      return { cards: [] };
    }
    drawHud(state);
    if (screen === SCREEN_UPGRADE) {
      const cards = drawUpgradeCards(choices || []);
      text(`WAVE ${state.wave} CLEARED`, FIELD.width / 2, 220, 40, PALETTE.text, 'center');
      text('Choose an upgrade to face the next wave', FIELD.width / 2, 268, 20, PALETTE.muted, 'center');
      text('Click a card, or press 1, 2 or 3', FIELD.width / 2, 540, 18, PALETTE.player, 'center');
      return { cards };
    }
    if (screen === SCREEN_PAUSED) drawPanel('Paused', PAUSED_LINES, 'Press P to resume');
    else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = finalLabel(state.score);
      OVER_LINES[1] = bestLabel(best);
      drawPanel('Ship lost', OVER_LINES, 'Press Space or click to fly again');
    }
    return { cards: [] };
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, toField };
}
