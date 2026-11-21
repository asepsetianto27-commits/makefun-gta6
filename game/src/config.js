// Solmara Nights — central tuning and world constants.
// One clear job: every number the rest of the game shares lives here.
export const WORLD_W = 3200;
export const WORLD_H = 2400;
export const ROAD_W = 96;
export const BLOCK = 400;

// Vertical roads (x centres) and horizontal roads (y centres) of Solmara.
export const VERTICAL_ROADS = [340, 740, 1140, 1540, 1940, 2340, 2740];
export const HORIZONTAL_ROADS = [320, 720, 1120, 1520, 1920, 2220];

// Coast on the west edge, river on the east edge with one bridge road.
export const WATER_WEST = 150;
export const SAND_WEST = 300;
export const RIVER_EAST = 2980;

export const COLORS = {
  grass: '#7fae5a',
  grassDark: '#74a24f',
  sand: '#e8d39a',
  water: '#2e7fa8',
  waterDeep: '#256b8f',
  road: '#3a3d42',
  roadEdge: '#2c2f33',
  lane: '#e8d44d',
  sidewalk: '#b9b3a4',
  park: '#5d9b4a',
  buildingRoof: ['#c96f4a', '#7d8aa0', '#b5a06a', '#8a6f9e', '#5f8a6d', '#a85d5d'],
  buildingWall: '#6b5a49',
};

export const PLAYER_START = { x: 740, y: 1120 };
export const PISTOL_PICKUP = { x: 800, y: 1060 };

export const MISSION_DEFS = [
  {
    id: 1,
    title: 'First Fare',
    giver: 'Mama Rosa',
    briefing: 'Jax, you owe me. Drive my client across town before the clock runs out. Do not scratch the paint.',
    objective: 'Drive the client to the drop-off',
    timeLimit: 100,
  },
  {
    id: 2,
    title: 'Hot Wheels',
    giver: 'Mama Rosa',
    briefing: 'A red Comet sportscar is parked by the marina. Take it. Bring it to my garage, no police.',
    objective: 'Steal the red Comet and deliver it to the garage',
    timeLimit: 150,
  },
  {
    id: 3,
    title: 'Heat',
    giver: 'Mama Rosa',
    briefing: 'The cops are onto you, three stars. Survive and shake them off. Hide until the heat dies.',
    objective: 'Lose the 3-star wanted level',
    timeLimit: 90,
  },
  {
    id: 4,
    title: 'The Drop',
    giver: 'Mama Rosa',
    briefing: 'Last job. Carry this package across the city while the police chase you. Then your debt is gone.',
    objective: 'Deliver the package across the city',
    timeLimit: 150,
  },
];

export const ENDING_TEXT = [
  'SOLMARA NIGHTS — THE END',
  'Jax delivered the package as the sun went down over the bay.',
  'Mama Rosa tore up the debt. Solmara is yours now, Jax.',
  'Thanks for playing. Keep driving, keep the radio loud.',
];

export const SAVE_KEY = 'solmara-nights-save-v1';
export const GAME_NAME = 'Solmara Nights';
export const GAME_TAGLINE = 'A sun-soaked open-world crime story in the fictional coastal city of Solmara.';
