// Story missions (4) and the taxi side activity for Solmara Nights.
import { clamp, dist, MISSION_NAMES } from './config.js';
import { makeCar } from './entities.js';

const DIALOGUE = {
  intro: [
    'MAMA ROSA: Jax. You owe me $4,000. Drive for me, and maybe I forget the interest.',
    'JAX: One job at a time, Rosa. Where is the first fare?',
  ],
  m1: ['MAMA ROSA: A client waits by the marina. Get him to the north plaza before the clock runs out.'],
  m2: ['MAMA ROSA: A red Comet coupe is parked near the park. Bring it to my garage. No scratches. Well — few scratches.'],
  m3: ['MAMA ROSA: The cops are on to you, Jax. Survive the heat. Lose them, and come back clean.'],
  m4: ['MAMA ROSA: One last package. The east docks. Cops will be all over you — do not stop.'],
  end: [
    'MAMA ROSA: The package is delivered. The debt is paid, Jax.',
    'JAX: Then Solmara is mine again. See you at the beach, Rosa.',
    '— SOLMARA NIGHTS: story complete. Keep driving, keep earning. —',
  ],
};

export class Missions {
  constructor(game) {
    this.game = game;
    this.index = 0; // 0..3 active, 4 = story complete
    this.stage = 'idle'; // idle | active | done
    this.target = null; // {x,y,label}
    this.timer = 0; this.timerMax = 0;
    this.targetCar = null; this.client = null;
    this.dialogue = []; this.dialogueT = 0;
    this.taxi = null; // {ped, dest, fare, state}
    this.taxiCd = 0;
    this.completed = 0;
  }
  get name() { return this.index < 4 ? MISSION_NAMES[this.index] : 'Free Roam'; }
  get active() { return this.stage === 'active'; }
  say(lines) { this.dialogue = lines.slice(); this.dialogueT = 0; }
  startMission(i) {
    const g = this.game;
    this.index = i; this.stage = 'active';
    const W = g.world;
    if (i === 0) {
      this.say(DIALOGUE.m1);
      this.target = { x: 2300, y: 250, label: 'Drop the client at the North Plaza' };
      this.timerMax = 75; this.timer = 75;
      this.client = { x: 700, y: 2000, label: 'Client' };
      g.addMessage('MISSION 1 — First Fare: pick up the client by the marina (south).');
    } else if (i === 1) {
      this.say(DIALOGUE.m2);
      this.targetCar = makeCar(1150, 1000, Math.PI / 2, { color: '#d33a2c', kind: 'coupe' });
      g.traffic.cars.push(this.targetCar);
      this.target = { x: 1150, y: 1000, label: 'Steal the red Comet coupe' };
      this.timerMax = 0; this.timer = 0;
      g.addMessage('MISSION 2 — Hot Wheels: steal the red coupe near the park.');
    } else if (i === 2) {
      this.say(DIALOGUE.m3);
      this.target = null;
      this.timerMax = 60; this.timer = 60;
      g.police.addHeat(3, 'Mama Rosa tipped off the police');
      g.addMessage('MISSION 3 — Heat: survive 60 seconds and lose the wanted level.');
    } else if (i === 3) {
      this.say(DIALOGUE.m4);
      this.target = { x: 3100, y: 2000, label: 'Deliver the package to the East Docks' };
      this.timerMax = 90; this.timer = 90;
      g.police.addHeat(2, 'the package is hot');
      g.addMessage('MISSION 4 — The Drop: deliver the package east. Do not stop.');
    }
  }
  startTaxi(ped) {
    const g = this.game;
    const dest = g.traffic.nearestRoadPoint ? null : null;
    const rx = [300, 700, 1100, 1500, 1900, 2300, 2700, 3100][Math.floor(Math.random() * 8)];
    const ry = [250, 600, 950, 1300, 1650, 2000][Math.floor(Math.random() * 6)];
    const fare = 40 + Math.floor(dist(ped.x, ped.y, rx, ry) / 25);
    this.taxi = { ped, dest: { x: rx, y: ry }, fare, state: 'pickup' };
    ped.target = { x: ped.x, y: ped.y };
    g.addMessage('TAXI FARE: pick up the passenger, then drive to the marker ($' + fare + ').');
  }
  completeMission() {
    const g = this.game;
    const rewards = [250, 400, 500, 1000];
    const reward = rewards[this.index] || 250;
    g.player.cash += reward;
    this.completed++;
    g.audio.missionOk();
    g.addMessage('MISSION COMPLETE — ' + MISSION_NAMES[this.index] + ' (+$' + reward + ')');
    this.stage = 'done';
    this.target = null; this.targetCar = null; this.client = null;
    this.index++;
    if (this.index >= 4) {
      this.say(DIALOGUE.end);
      g.addMessage('STORY COMPLETE — the debt is paid. Solmara is yours.');
      g.saveGame();
    } else {
      setTimeout(() => { if (this.game.state === 'play') this.startMission(this.index); }, 2500);
    }
    g.saveGame();
  }
  failMission(reason) {
    const g = this.game;
    g.addMessage('MISSION FAILED — ' + reason + '. Try again from the pause menu.');
    this.stage = 'idle'; this.target = null; this.targetCar = null; this.client = null;
  }
  update(dt) {
    const g = this.game;
    if (this.dialogue.length && this.dialogueT < 6) this.dialogueT += dt;
    if (this.dialogueT >= 6 && this.dialogue.length) { this.dialogue.shift(); this.dialogueT = 0; }
    if (this.stage !== 'active') { this.updateTaxi(dt); return; }
    const p = g.player;
    if (this.timerMax > 0) {
      this.timer -= dt;
      if (this.timer <= 0) { this.failMission('time ran out'); return; }
    }
    if (this.index === 0) {
      if (this.client) {
        if (dist(p.x, p.y, this.client.x, this.client.y) < 46) {
          this.client = null;
          g.addMessage('Client aboard. Drive to the North Plaza — fast!');
          this.target = { x: 2300, y: 250, label: 'Drop the client at the North Plaza' };
        }
      } else if (this.target && dist(p.x, p.y, this.target.x, this.target.y) < 60) {
        this.completeMission();
      }
    } else if (this.index === 1) {
      if (this.targetCar && p.car === this.targetCar) {
        this.target = { x: 1900, y: 600, label: "Deliver the coupe to Rosa's garage" };
        g.addMessage("Coupe stolen. Get it to Rosa's garage (marked).");
        this.targetCar = 'delivering';
      } else if (this.targetCar === 'delivering' && this.target && p.car && dist(p.x, p.y, this.target.x, this.target.y) < 70) {
        this.completeMission();
      }
    } else if (this.index === 2) {
      if (g.wanted === 0) this.completeMission();
    } else if (this.index === 3) {
      if (this.target && dist(p.x, p.y, this.target.x, this.target.y) < 70) this.completeMission();
    }
    this.updateTaxi(dt);
  }
  updateTaxi(dt) {
    const g = this.game;
    this.taxiCd -= dt;
    if (!this.taxi && this.taxiCd <= 0 && this.stage !== 'active') {
      // Offer a fare: a waiting ped near the player
      const near = g.traffic.peds.find((p) => !p.dead && !p.armed && dist(p.x, p.y, g.player.x, g.player.y) < 260);
      if (near && g.player.car) { this.startTaxi(near); }
      else this.taxiCd = 8;
    }
    if (!this.taxi) return;
    const t = this.taxi;
    if (t.state === 'pickup') {
      if (dist(g.player.x, g.player.y, t.ped.x, t.ped.y) < 50) {
        t.state = 'dropoff';
        t.ped.inCar = true;
        g.addMessage('Passenger aboard — drive to the marker.');
      }
      if (t.ped.dead || dist(t.ped.x, t.ped.y, g.player.x, g.player.y) > 900) { this.taxi = null; this.taxiCd = 10; }
    } else if (t.state === 'dropoff') {
      t.ped.x = g.player.x; t.ped.y = g.player.y;
      if (dist(g.player.x, g.player.y, t.dest.x, t.dest.y) < 60) {
        g.player.cash += t.fare;
        g.audio.cash();
        g.addMessage('Fare complete: +$' + t.fare);
        t.ped.inCar = false;
        t.ped.x = g.player.x + 30; t.ped.y = g.player.y + 10;
        this.taxi = null; this.taxiCd = 12;
        g.saveGame();
      }
      if (!g.player.car) { this.taxi = null; this.taxiCd = 10; g.addMessage('The passenger left — you need a car for fares.'); }
    }
  }
  objectiveText() {
    if (this.stage === 'active') {
      if (this.index === 0) return this.client ? 'Pick up the client at the marina' : 'Drive the client to the North Plaza';
      if (this.index === 1) return this.targetCar === 'delivering' ? "Deliver the coupe to Rosa's garage" : 'Steal the red Comet coupe';
      if (this.index === 2) return 'Lose the police — survive the heat';
      if (this.index === 3) return 'Deliver the package to the East Docks';
    }
    if (this.taxi) return this.taxi.state === 'pickup' ? 'Taxi: pick up the passenger' : 'Taxi: drive the passenger to the marker';
    if (this.index >= 4) return 'Story complete — free roam. Earn fares, explore Solmara.';
    return 'Press M for missions — talk to Mama Rosa (start Mission ' + (this.index + 1) + ')';
  }
  objectiveTarget() {
    if (this.stage === 'active') {
      if (this.index === 0 && this.client) return { x: this.client.x, y: this.client.y };
      if (this.target) return this.target;
    }
    if (this.taxi) return this.taxi.state === 'pickup' ? { x: this.taxi.ped.x, y: this.taxi.ped.y } : this.taxi.dest;
    return null;
  }
}
