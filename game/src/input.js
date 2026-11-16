// Keyboard and pointer input. Held keys give a thrust direction; the mouse aims; holding the
// mouse button or Space fires; Shift or right-click dashes. One-shot presses (start, restart,
// pause, upgrade choice) are queued as bit flags and taken once by the loop, so a press between
// two frames is never lost and never counted twice.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;
export const ACTION_DASH = 8;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);
const DASH = new Set(['ShiftLeft', 'ShiftRight']);

export function createInput(canvas, toField) {
  let left = false;
  let right = false;
  let up = false;
  let down = false;
  let firing = false;
  let actions = 0;
  let choice = 0;
  let clicked = false;
  const mouse = { x: 640, y: 240 };

  function trackMouse(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  }

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (UP.has(event.code)) up = true;
    else if (DOWN.has(event.code)) down = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
      firing = true;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else if (DASH.has(event.code)) {
      if (!event.repeat) actions |= ACTION_DASH;
    } else if (event.code === 'Digit1' || event.code === 'Numpad1') choice = 1;
    else if (event.code === 'Digit2' || event.code === 'Numpad2') choice = 2;
    else if (event.code === 'Digit3' || event.code === 'Numpad3') choice = 3;
    else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (UP.has(event.code)) up = false;
    else if (DOWN.has(event.code)) down = false;
    else if (CONFIRM.has(event.code)) firing = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    left = false;
    right = false;
    up = false;
    down = false;
    firing = false;
  });
  canvas.addEventListener('pointermove', trackMouse);
  canvas.addEventListener('pointerdown', (event) => {
    trackMouse(event);
    if (event.button === 2) actions |= ACTION_DASH;
    else {
      firing = true;
      clicked = true;
      actions |= ACTION_CONFIRM;
    }
  });
  canvas.addEventListener('pointerup', (event) => {
    if (event.button !== 2) firing = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    /** The frame's control snapshot in field coordinates: thrust, aim, fire, dash. */
    snapshot() {
      const aim = toField(mouse.x, mouse.y);
      return {
        moveX: (right ? 1 : 0) - (left ? 1 : 0),
        moveY: (down ? 1 : 0) - (up ? 1 : 0),
        aimX: aim.x,
        aimY: aim.y,
        firing,
        dash: Boolean(actions & ACTION_DASH),
      };
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The upgrade card (1-3) picked since the last call, or 0. */
    takeChoice() {
      const taken = choice;
      choice = 0;
      return taken;
    },
    /** True once per left-button press since the last call (for picking cards). */
    takeClick() {
      const taken = clicked;
      clicked = false;
      return taken;
    },
    /** Clicking a card on the upgrade screen picks it: card rectangles are in field coords. */
    pickCard(x, y, cards) {
      for (let i = 0; i < cards.length; i += 1) {
        const c = cards[i];
        if (x >= c.x && x <= c.x + c.width && y >= c.y && y <= c.y + c.height) return i + 1;
      }
      return 0;
    },
    fieldMouse() {
      return toField(mouse.x, mouse.y);
    },
  };
}
