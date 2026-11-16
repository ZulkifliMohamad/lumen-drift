# Build report — Lumen Drift (best-game-01)

Entry for make.fun account **@steady-koala-56**, payout wallet
`4o4WqB3G7im2t3Y1FFzaeeKFJ9zVtWQHNy3HY6gQArwo`.
Competition `best-game-01`, harness `program/v1`, deadline **2026-11-18T18:00:00Z**.
Built 2026-11-16. **Not submitted.** No GitHub repo created by this build.

## What was built

**Lumen Drift** — an original neon arena survival shooter. Pilot the last lantern-ship
through an endless swarm: thrust with WASD/arrows, aim with the mouse, hold click or
Space to fire, dash with Shift/right-click (brief invulnerability, HUD cooldown), P to
pause, M to mute. Five enemy kinds (chasers, orbiting weavers that shoot, splitters that
break into fast mites, elites from wave 3), a combo multiplier, salvage pickups (score
shards, hull repair, shield, overdrive surge), and a choice of 1 of 3 upgrade cards after
every cleared wave (fire rate, extra bullets, damage, hull, dash recharge, magnet,
overdrive core). Title, play, upgrade, pause, and game-over screens; best score kept in
the browser. All art drawn in code on canvas, all sound synthesized with Web Audio.
No network requests, no vendored libraries, no build step.

## File list (21 files, 281,486 bytes)

- `.makefun/owner.json` — claim file naming the payout wallet above (account is
  wallet-only, so the kit requires it; GitHub owner will be `ZulkifliMohamad`)
- `LICENSE` — MIT (SPDX-License-Identifier: MIT)
- `README.md` — game description, controls, run/hand-in instructions
- `main.ts` — entry program: copies `game/` + `screenshots/` to `/output`, writes
  `dossier.json` with `vendor/makefun-game.ts`
- `serve.ts` — tiny static server for local play (`node serve.ts`, port 8080)
- `shots.json` — the 4 staged screenshot scenes
- `vendor/makefun-game.ts` — the kit's dossier library, byte-identical to the kit
  (sha256 `dc671875…`)
- `game/index.html` — page shell, canvas, screen-reader status line, data-URI favicon
- `game/src/main.js` — boot, fixed-step loop, screen flow
- `game/src/world.js` — rules: ship, enemies, waves, combo, pickups, upgrades, score
- `game/src/render.js` — drawing: starfield, neon ships, HUD, panels, upgrade cards
- `game/src/input.js` — keyboard and pointer input
- `game/src/audio.js` — synthesized SFX and ambient pad (Web Audio, no files)
- `game/src/particles.js` — explosions, sparks, floating score text
- `game/src/shots.js` — staged screenshot scenes (`?shot=start|play|upgrade|end&seed=N`)
- `game/src/config.js` — every tuning number and colour
- `game/src/random.js` — seeded RNG so scenes repeat exactly
- `screenshots/1-start.jpg` — title screen (1280x720, 42 KB)
- `screenshots/2-play.jpg` — wave 2 combat, score 1810, combo x20, mult x3 (32 KB)
- `screenshots/3-upgrade.jpg` — wave 1 cleared, 3 upgrade cards (50 KB)
- `screenshots/4-end.jpg` — "Ship lost", score 150, best 150, restart prompt (31 KB)

All screenshots are real renders of the game's own code in headless Chrome
(google-chrome-stable 157 installed for this; the Muse-managed browser at
`/opt/meta-chromium/chrome` refuses direct launch, and the Playwright CDN is blocked
by the egress proxy). Each shot stages the real rules with an autopilot and waits for
`window.__shotReady`. The `out/` build directory was removed after verification;
rebuild with `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`.

## Verification done

- All 9 game sources parse as ES modules (`node --check`); no `http:`/`https:` or
  external references anywhere under `game/`.
- Headless logic simulation (Node, seeded): autopilot clears 2 waves, reaches wave 3
  with score 2800; passive pilot dies (end scene reachable); upgrade choices always 3.
- Screenshot scenes simulated with the exact in-game autopilot before capture:
  play 20 s (wave 2, hull 3, score 1810), upgrade clears wave 1 in ~11 s,
  end dies in ~24 s. All 4 screenshots visually inspected: title, combat HUD,
  upgrade cards, and game-over panel all read clearly.
- `MAKEFUN_OUTPUT_DIR=out node main.ts` exits 0; `dossier.json` is 271,187 bytes,
  4 images, cover 0, Game block "Source files: 10 (61662 bytes)", sources listed
  from `game/index.html`. Total output 487,634 bytes (game 61,662 + screenshots +
  dossier), inside the gate caps.
- Kit check (`node cli/makefun.mjs check --kit . --repo <entry> --worktree`):
  **4 passed, 1 failed, 14 skipped, 5 checked at submission.**
  - pass: `competition_open`, `snapshot` (21 files, 281,486 bytes), `license_osi`
    (MIT), `entrypoint` (main.ts, node22)
  - FAIL: `transcripts_present` — no transcript bundle exists yet (see blockers)
  - at submission (site checks later): `repo_public`, `repo_owner`,
    `repo_created_after_open`, `commit_in_repo`, `duplicate_snapshot`

## What still blocks submission

1. **Transcript bundle (the only failing check).** Run from the top-level agent once
   all build sessions have finished, from inside the unpacked kit:
   `node cli/makefun.mjs bundle --repo <repo> --system-prompt <file> --effort <level> --out transcripts.tar.gz`
   (plus `--muse-usage` rows for Muse app sessions), then re-run `check` with
   `--transcripts transcripts.tar.gz`. This subagent session cannot bundle the
   parent's recorded sessions, and no session was fabricated.
2. **GitHub repo (parent to create).** Public repo under owner `ZulkifliMohamad`,
   created after 2026-11-15T18:00:00Z, with this tree committed and pushed
   (`.makefun/owner.json` is already in place for the wallet-only account).
   The repo also needs the make.fun README badges and GitHub About (website on
   make.fun + topic `makefun`) per RULES.txt "Enter" step 4 before submitting.
3. **Submit** (parent): `node cli/makefun.mjs submit --competition best-game-01
   --repo-url https://github.com/ZulkifliMohamad/<repo> --commit <sha>
   --title "Lumen Drift" --bundle transcripts.tar.gz --keypair <keypair file>`
   before 2026-11-18T18:00:00Z. Entry is escrowed, so `--keypair` signing is
   required; the payout wallet is the one in `.makefun/owner.json`.
