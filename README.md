# Lumen Drift

A neon arena survival shooter for the make.fun **best-game-01** bounty. Pilot the last
lantern-ship through an endless swarm: thrust with WASD, aim with the mouse, hold click to
fire, dash through danger, clear each wave, and pick one of three upgrades before the next
wave hits harder.

## How to play

| Control | Action |
| --- | --- |
| WASD / arrow keys | Thrust |
| Mouse | Aim |
| Hold left click / Space | Fire |
| Shift / right click | Dash (brief invulnerability, cooldown shown in the HUD) |
| P / Esc | Pause |
| M | Mute |
| 1 / 2 / 3 or click a card | Pick an upgrade after clearing a wave |

Enemies: **chasers** hunt you down, **weavers** orbit and shoot, **splitters** break into
fast mites, and **elites** (from wave 3) soak up fire and drop bonus salvage. Kills build a
combo multiplier; pickups drop as salvage shards, hull repairs, shields, and overdrive
surges. Your best score is kept in the browser between visits.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network: `game/` is plain static files (HTML + ES modules + canvas),
all art drawn in code and all sound synthesized with the Web Audio API.

## Layout

- `game/index.html` — page shell, canvas, screen-reader status line
- `game/src/main.js` — boot, fixed-step loop, screen flow (title / play / upgrade / paused / over)
- `game/src/world.js` — rules: ship, enemies, waves, combo, pickups, upgrades, score
- `game/src/render.js` — drawing: starfield, neon ships, HUD, panels, upgrade cards
- `game/src/input.js` — keyboard and pointer input
- `game/src/audio.js` — synthesized sound effects and ambient pad (Web Audio, no files)
- `game/src/particles.js` — explosions, sparks, floating score text
- `game/src/shots.js` — staged screenshot scenes (`?shot=start|play|upgrade|end&seed=N`)
- `game/src/config.js` — every tuning number and colour
- `game/src/random.js` — seeded RNG so scenes repeat exactly
- `main.ts` — the entry program: copies `game/` + `screenshots/` to `/output` and writes `dossier.json`
- `serve.ts` — tiny static server for local play
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
- `screenshots/` — 4 real renders of the game (start, play, upgrade, game over)

## Screenshots

The shots are staged by the game itself: `?shot=<name>&seed=1` plays the real rules
forward with an autopilot and sets `window.__shotReady` when painted, so a headless
browser can capture each scene deterministically.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see `LICENSE`.
