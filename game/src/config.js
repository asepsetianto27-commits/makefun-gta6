// Solmara Nights — configuration and shared constants.
// A complete open-world crime game in the fictional coastal city of Solmara.
// All names, places, characters and story are original.

const WORLD_W = 3600;
const WORLD_H = 2600;
const ROAD_W = 96;
const ROAD_XS = [400, 900, 1400, 1900, 2400, 2900];
const ROAD_YS = [350, 800, 1250, 1700, 2150];
const BEACH_X = 320; // sand starts west of this line
const WATER_X = 130; // sea west of this line
const SAVE_KEY = 'solmara-nights-save-v1';
const GAME_NAME = 'Solmara Nights';
const GAME_TAGLINE = 'A complete open-world crime game — explore Solmara on foot and by car, steal cars, outrun the police, run story missions. Built for the make.fun "Make GTA 6" bounty (gta6-01).';

const PALETTE = {
  grass: '#5d9b4a',
  grassDark: '#4c8340',
  sand: '#e8d39a',
  water: '#2f7fb8',
  waterDeep: '#1f5f92',
  asphalt: '#3a3a40',
  asphaltLight: '#46464d',
  sidewalk: '#9a9a92',
  lane: '#e8d44d',
  park: '#3f7d33',
  buildingRoof: ['#b0563a', '#7a6a8a', '#4a7a9b', '#9b7a4a', '#6a8a5a', '#8a4a5a', '#5a5a6e', '#a8875a'],
  buildingWall: '#c9b8a3',
};

const CAR_COLORS = ['#c0392b', '#2471a3', '#f1c40f', '#7d3c98', '#16a085', '#e67e22', '#ecf0f1', '#2c3e50', '#d35400'];
const PED_COLORS = ['#e74c3c', '#3498db', '#f39c12', '#9b59b6', '#1abc9c', '#fd79a8', '#fdcb6e', '#6c5ce7', '#00b894'];

const MISSIONS = [
  {
    id: 0, name: 'First Fare', reward: 250,
    brief: 'Mama Rosa needs a driver. Pick up her client and get him across town before the clock runs out.',
    dialogue: [
      ['Mama Rosa', 'Jax, sayang. You owe me, remember? Drive my client to Palm Plaza. Fast, but not dead.'],
      ['Jax Marlow', 'One fare. Then we talk about my debt, Rosa.'],
      ['Mama Rosa', 'Drive first. Talk later. The meter is running.'],
    ],
  },
  {
    id: 1, name: 'Hot Wheels', reward: 400,
    brief: 'A yellow Comet GT is parked at the marina. Steal it and deliver it to Rosa\u2019s garage. No scratches. Well — few scratches.',
    dialogue: [
      ['Mama Rosa', 'There is a yellow Comet GT at the marina. It has an owner. Soon it will have a new owner. Us.'],
      ['Jax Marlow', 'Stealing cars now? My debt must be bigger than I thought.'],
      ['Mama Rosa', 'Bring it to my garage. The gate is open. Do not bring the police.'],
    ],
  },
  {
    id: 2, name: 'Heat', reward: 600,
    brief: 'The Solmara police are all over you — 3 stars. Survive the chase, then lose them and let the heat die down.',
    dialogue: [
      ['Mama Rosa', 'Jax! The whole city is looking for you. Three stars! Lay low until they forget your face.'],
      ['Jax Marlow', 'Forgetting my face is my favourite hobby. Give me a minute.'],
    ],
  },
  {
    id: 3, name: 'The Drop', reward: 900,
    brief: 'Pick up the package at the pier and deliver it to the harbor warehouse while the police chase you. This one clears your debt.',
    dialogue: [
      ['Mama Rosa', 'Last job, Jax. A package at the pier, a warehouse at the harbor. The police will be close. So be closer to the finish.'],
      ['Jax Marlow', 'After this, Rosa, we are even. I am driving into the sunset — or the sea.'],
      ['Mama Rosa', 'Sunset, sayang. The sea is for the fish.'],
    ],
  },
];

const ENDING_LINES = [
  'Jax delivered the package as the sun went down over Solmara Bay.',
  'Mama Rosa tore up his debt in front of the whole garage.',
  'The city was still his — every street, every car, every fare.',
  'SOLMARA NIGHTS — thanks for playing. Free roam continues: fares, chases and the open city are yours.',
];

// The live game state. Created by resetGame() in main.js, read by every system.
let G = null;
