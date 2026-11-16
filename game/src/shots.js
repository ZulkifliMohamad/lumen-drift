// The screenshot scenes behind ?shot=start|play|upgrade|end. Each one plays the real rules
// forward from a fresh world for a fixed number of steps, steered by a simple autopilot, so
// the frame is what a short game really looks like and the same seed always gives the same
// frame. The play pilot aims at the nearest enemy, fires, kites away from danger and dashes
// when cornered; the end pilot never fires and drifts, so the swarm catches it.

import { FIELD, STEP } from './config.js';
import { EVENT_OVER, EVENT_WAVE_CLEAR } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 20;
const END_LIMIT_SECONDS = 600;
const UPGRADE_LIMIT_SECONDS = 900;

function nearestEnemy(state) {
  const player = state.player;
  let best = null;
  let bestDist = Infinity;
  for (const enemy of state.enemies) {
    if (!enemy.active) continue;
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      best = enemy;
    }
  }
  return best;
}

function nearestPickup(state) {
  const player = state.player;
  let best = null;
  let bestDist = Infinity;
  for (const pickup of state.pickups) {
    if (!pickup.active) continue;
    const dx = pickup.x - player.x;
    const dy = pickup.y - player.y;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      best = pickup;
    }
  }
  return best;
}

/** Thrust away from the nearest threat, toward a close pickup, otherwise hold the centre. */
function autopilot(state, fire) {
  const player = state.player;
  const enemy = nearestEnemy(state);
  const pickup = nearestPickup(state);
  let moveX = 0;
  let moveY = 0;
  let aimX = player.x;
  let aimY = player.y - 100;
  let dash = false;
  if (enemy) {
    aimX = enemy.x;
    aimY = enemy.y;
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist < 150) {
      moveX = dx / dist;
      moveY = dy / dist;
      if (dist < 90 && player.dashCooldown <= 0) dash = true;
    } else if (pickup) {
      const pdx = pickup.x - player.x;
      const pdy = pickup.y - player.y;
      const pdist = Math.hypot(pdx, pdy) || 1;
      if (pdist < 260) {
        moveX = pdx / pdist;
        moveY = pdy / pdist;
      }
    }
    if (player.x < 80) moveX = 1;
    else if (player.x > FIELD.width - 80) moveX = -1;
    if (player.y < 80) moveY = 1;
    else if (player.y > FIELD.height - 80) moveY = -1;
  }
  return { moveX, moveY, aimX, aimY, firing: fire, dash };
}

/**
 * Set `world` to the named scene (start, play, upgrade or end; any other name is start) and
 * return the screen to draw over it, the best score to show, and the upgrade choices when
 * the scene is the upgrade screen.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end' && name !== 'upgrade') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, { moveX: 0, moveY: 0, aimX: 640, aimY: 360, firing: false, dash: false }, true);
    }
    return { screen: SCREEN_TITLE, best: 0, choices: [] };
  }
  const fire = name !== 'end';
  const limit = name === 'end' ? END_LIMIT_SECONDS : name === 'upgrade' ? UPGRADE_LIMIT_SECONDS : PLAY_SECONDS;
  let cleared = false;
  for (let index = 0; index < limit / STEP; index += 1) {
    const events = world.step(STEP, autopilot(world.state, fire), false);
    if (events & EVENT_OVER) break;
    if (events & EVENT_WAVE_CLEAR) {
      cleared = true;
      // The play scene keeps going: it takes the first upgrade and fights the next wave,
      // so its frame is mid-combat, not the empty moment a wave ends.
      if (name === 'play') world.applyUpgrade(world.chooseUpgrades()[0]);
      else break;
    }
  }
  const over = world.state.player.hull <= 0;
  if (name === 'upgrade' && cleared) {
    return { screen: SCREEN_UPGRADE, best: world.state.score, choices: world.chooseUpgrades() };
  }
  if (over) return { screen: SCREEN_OVER, best: world.state.score, choices: [] };
  return { screen: SCREEN_PLAY, best: world.state.score, choices: [] };
}
