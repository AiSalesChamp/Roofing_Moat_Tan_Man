// Input adapter — the ONLY file that knows where events come from.
//
// Today: browser keyboard. The Neural Band reaches Ray-Ban Display Web Apps
// as arrow keys + Enter (pinch = select), so the desktop simulation and the
// real device share this exact mapping. If Meta's preview API shifts, or the
// native Device Access Toolkit (Phase 4) replaces the key events, only this
// adapter changes.
//
// Semantic events: up, down, left, right, select, back.

const KEY_MAP = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  Enter: 'select', // Neural Band pinch
  Escape: 'back',
  Backspace: 'back',
};

export function onInput(handler) {
  const listener = (event) => {
    const action = KEY_MAP[event.key];
    if (!action) return;
    event.preventDefault();
    handler(action);
  };
  window.addEventListener('keydown', listener);
  return () => window.removeEventListener('keydown', listener);
}
