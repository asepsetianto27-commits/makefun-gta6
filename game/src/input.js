// Solmara Nights — keyboard and mouse input.
// One clear job: turn browser events into a plain state the game reads each tick.
export function createInput(canvas) {
  const input = {
    up: false, down: false, left: false, right: false,
    run: false, handbrake: false,
    mouseX: 0, mouseY: 0, mouseDown: false, mouseClicked: false,
    pressed: {}, // keys pressed since last tick (edge-triggered)
  };

  function keyName(e) {
    const k = e.key.toLowerCase();
    if (k === 'arrowup' || k === 'w') return 'up';
    if (k === 'arrowdown' || k === 's') return 'down';
    if (k === 'arrowleft' || k === 'a') return 'left';
    if (k === 'arrowright' || k === 'd') return 'right';
    return k;
  }

  window.addEventListener('keydown', (e) => {
    const k = keyName(e);
    if (['up', 'down', 'left', 'right', ' '].includes(k) || e.key === ' ') e.preventDefault();
    if (k === 'up') input.up = true;
    else if (k === 'down') input.down = true;
    else if (k === 'left') input.left = true;
    else if (k === 'right') input.right = true;
    else if (k === 'shift') input.run = true;
    else if (k === ' ') input.handbrake = true;
    else input.pressed[k] = true;
  });

  window.addEventListener('keyup', (e) => {
    const k = keyName(e);
    if (k === 'up') input.up = false;
    else if (k === 'down') input.down = false;
    else if (k === 'left') input.left = false;
    else if (k === 'right') input.right = false;
    else if (k === 'shift') input.run = false;
    else if (k === ' ') input.handbrake = false;
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    input.mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
  });

  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) { input.mouseDown = true; input.mouseClicked = true; }
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) input.mouseDown = false;
  });

  // Edge-triggered keys are consumed once per tick by the game loop.
  input.consume = function (k) {
    if (input.pressed[k]) { input.pressed[k] = false; return true; }
    return false;
  };
  input.clearPressed = function () {
    input.pressed = {};
    input.mouseClicked = false;
  };

  return input;
}
