// Keyboard + mouse input, with edge-triggered "pressed" state.
export class Input {
  constructor(canvas) {
    this.keys = {}; this.pressed = {};
    this.mouseX = 0; this.mouseY = 0; this.mouseDown = false; this.clicked = false;
    this.canvas = canvas;
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      if (!this.keys[e.key.toLowerCase()]) this.pressed[e.key.toLowerCase()] = true;
      this.keys[e.key.toLowerCase()] = true;
    });
    window.addEventListener('keyup', (e) => { this.keys[e.key.toLowerCase()] = false; });
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouseX = e.clientX - r.left; this.mouseY = e.clientY - r.top;
    });
    canvas.addEventListener('mousedown', (e) => { if (e.button === 0) { this.mouseDown = true; this.clicked = true; } });
    window.addEventListener('mouseup', () => { this.mouseDown = false; });
    window.addEventListener('blur', () => { this.keys = {}; });
  }
  down(k) { return !!this.keys[k.toLowerCase()]; }
  wasPressed(k) { return !!this.pressed[k.toLowerCase()]; }
  axis() {
    let x = 0, y = 0;
    if (this.down('a') || this.down('arrowleft')) x -= 1;
    if (this.down('d') || this.down('arrowright')) x += 1;
    if (this.down('w') || this.down('arrowup')) y -= 1;
    if (this.down('s') || this.down('arrowdown')) y += 1;
    return { x, y };
  }
  endFrame() { this.pressed = {}; this.clicked = false; }
}
