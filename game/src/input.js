// Solmara Nights — keyboard and mouse input, with per-frame edge detection.

const Keys = {
  down: {},
  just: {},
  mouseX: 640,
  mouseY: 360,
  mouseDown: false,
  mouseClicked: false,

  init(canvas) {
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (!Keys.down[e.code]) Keys.just[e.code] = true;
      Keys.down[e.code] = true;
      AudioSys.init(); AudioSys.resume();
    });
    window.addEventListener('keyup', (e) => { Keys.down[e.code] = false; });
    window.addEventListener('blur', () => { Keys.down = {}; });
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      Keys.mouseX = (e.clientX - r.left) * (canvas.width / r.width);
      Keys.mouseY = (e.clientY - r.top) * (canvas.height / r.height);
    });
    canvas.addEventListener('mousedown', (e) => {
      Keys.mouseDown = true; Keys.mouseClicked = true;
      AudioSys.init(); AudioSys.resume();
    });
    window.addEventListener('mouseup', () => { Keys.mouseDown = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  },

  pressed(code) {
    return !!Keys.just[code];
  },

  held(code) {
    return !!Keys.down[code];
  },

  axis() {
    let x = 0, y = 0;
    if (Keys.down['KeyA'] || Keys.down['ArrowLeft']) x -= 1;
    if (Keys.down['KeyD'] || Keys.down['ArrowRight']) x += 1;
    if (Keys.down['KeyW'] || Keys.down['ArrowUp']) y -= 1;
    if (Keys.down['KeyS'] || Keys.down['ArrowDown']) y += 1;
    return { x, y };
  },

  endFrame() {
    Keys.just = {};
    Keys.mouseClicked = false;
  },
};
