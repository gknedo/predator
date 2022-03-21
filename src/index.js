import { clamp, times, shuffle, result } from 'lodash';
import { Engine, Render, Body, Bodies, Composite, Vector, Query } from 'matter-js';
import { randomColor} from 'randomcolor';
import hexRgb from 'hex-rgb';
import rgbHex from 'rgb-hex';

const HERBIVORE_COLOR = '#999999';
const WORLD_SIZE = {x: 600, y: 600};
const STEP_SIZE = 1/100;
const HERBIVORE_SIZE = 10;
const HERBIVORE_VARIANCE = 25;
const HUNGRY_THRESHOLD = 0.4;
const DEATH_THRESHOLD = 12;
const INITIAL_POPULATION = 60;
const INITIAL_FOOD = 2;
const FOOD_AMOUNT = 20;
const CATEGORIES = {
  default: 0x0001,
  herbivores: 0x0002,
};
let availableColors = _.shuffle(['#dd1111', '#11dd11', '#1111dd']);

Math.randomArbitrary = function(min, max) {
  return Math.random() * (max - min) + min;
}

Body.applyRelativeForce = (body, relativePosition, relativeForce) => {
  const sin = Math.sin(body.angle);
  const cos = Math.cos(body.angle);

  const position = {
    x: body.position.x + cos * relativePosition.x - sin * relativePosition.y,
    y: body.position.y + sin * relativePosition.x + cos * relativePosition.y,
  };

  const force = {
    x: cos * relativeForce.x - sin * relativeForce.y,
    y: sin * relativeForce.x + cos * relativeForce.y,
  };

  Body.applyForce(body, position, force);
}

const createEngine = () => Engine.create({
  gravity: {
    x: 0,
    y: 0,
  },
  timing: {
    timeScale: 1,
  },
});

const createRender = (engine) => Render.create({
  element: document.body,
  engine: engine,
  options: {
    height: WORLD_SIZE.x,
    width: WORLD_SIZE.y,
    enabled: true,
    wireframes: false,
  }
});

const randomPosition = (worldSize, offset) => {
  return {
    x: Math.randomArbitrary(offset, worldSize.x - offset),
    y: Math.randomArbitrary(offset, worldSize.y - offset),
  }
};

const createHerbivore = ({color, position} = {}) => {

  const initialPosition = position ?? randomPosition(WORLD_SIZE, HERBIVORE_SIZE);
  const initialColor = color ?? HERBIVORE_COLOR;

  const body = Bodies.circle(
    initialPosition.x,
    initialPosition.y,
    HERBIVORE_SIZE / 2,
    {
      collisionFilter: {
        category: CATEGORIES.herbivores,
        mask: CATEGORIES.default,
    },
      render: {
        fillStyle: initialColor,
      },
    },
  );
  
  return {
    id: body.id,
    color: initialColor,
    body: body,
    target: null,
    hungry: 0,
    feeded: 1,
  };
}

const mutateHerbivore = (herbivore) => {
  const positionDelta = {
    x:  Math.randomArbitrary(-HERBIVORE_SIZE*2,HERBIVORE_SIZE*2),
    y:  Math.randomArbitrary(-HERBIVORE_SIZE*2,HERBIVORE_SIZE*2),
  }
  const position = Vector.add(herbivore.body.position, positionDelta);
  position.x = clamp(position.x, HERBIVORE_SIZE, WORLD_SIZE.x - HERBIVORE_SIZE);
  position.y = clamp(position.y, HERBIVORE_SIZE, WORLD_SIZE.y - HERBIVORE_SIZE);

  const color = hexRgb(herbivore.color, {format: 'array'});
  const c = [
    Math.round(clamp(color[0] + Math.randomArbitrary(-HERBIVORE_VARIANCE, HERBIVORE_VARIANCE), 0, 255)),
    Math.round(clamp(color[1] + Math.randomArbitrary(-HERBIVORE_VARIANCE, HERBIVORE_VARIANCE), 0, 255)),
    Math.round(clamp(color[2] + Math.randomArbitrary(-HERBIVORE_VARIANCE, HERBIVORE_VARIANCE), 0, 255)),
  ];
  const initialColor = `#${rgbHex(c[0], c[1], c[2])}`;

  const body = Bodies.circle(
    position.x,
    position.y,
    HERBIVORE_SIZE / 2,
    {
      collisionFilter: {
        category: CATEGORIES.herbivores,
        mask: CATEGORIES.default,
      },  
      render: {
        fillStyle: initialColor,
      },
    },
  );
  
  return {
    id: body.id,
    color: initialColor,
    body: body,
    target: null,
    hungry: 0,
    feeded: 1,
  };
}

const getDistance = (p0, p1) => {
  let delta = 0;
  for(let i=0; i < p0.length; i++) {
    delta += Math.pow(p0[i] - p1[i], 2);
  }
  return Math.sqrt(delta);
}

const findNearestFood = (herbivore, foods) => {
  const herbivorePosition = Object.values(herbivore.body.position);
  const herbivoreColor = hexRgb(herbivore.body.render.fillStyle, {format: 'array'});
  let nearestFood = undefined;
  let nearestFoodDistance = Number.POSITIVE_INFINITY;
  let nearestColorDistance = Number.POSITIVE_INFINITY;

  foods.forEach((food) => {
    const worldDistance = getDistance(herbivorePosition, Object.values(food.body.position));
    const colorDistance = getDistance(herbivoreColor, hexRgb(food.body.render.fillStyle, {format: 'array'}));
    const foodDistance = worldDistance * colorDistance;
    if(foodDistance < nearestFoodDistance) {
      nearestFood = food;
      nearestFoodDistance = foodDistance;
      nearestColorDistance = colorDistance;
    }
  });
  
  return {target: nearestFood, distance: nearestFoodDistance, colorDistance: nearestColorDistance};
}

const createFood = ({color, position} = {}) => {
  const initialPosition = position ?? randomPosition(WORLD_SIZE, HERBIVORE_SIZE);
  const initialColor = color ?? availableColors.pop();

  const body = Bodies.polygon(
    initialPosition.x,
    initialPosition.y,
    3,
    FOOD_AMOUNT,
    {
      isStatic: true,
      render: {
        fillStyle: initialColor,
      },
    },
  );
  
  return {
    id: body.id,
    color: initialColor,
    body: body,
    amount: FOOD_AMOUNT,
  };
}

const mutateFood = (food) => {
  const positionDelta = {
    x:  Math.randomArbitrary(-90,90),
    y:  Math.randomArbitrary(-90,90),
  }
  const position = Vector.add(food.body.position, positionDelta);
  position.x = clamp(position.x, HERBIVORE_SIZE, WORLD_SIZE.x - HERBIVORE_SIZE);
  position.y = clamp(position.y, HERBIVORE_SIZE, WORLD_SIZE.y - HERBIVORE_SIZE);

  const color = hexRgb(food.color, {format: 'array'});
  const c = [
    Math.round(clamp(color[0] + Math.randomArbitrary(-0, 0), 0, 255)),
    Math.round(clamp(color[1] + Math.randomArbitrary(-0, 0), 0, 255)),
    Math.round(clamp(color[2] + Math.randomArbitrary(-0, 0), 0, 255)),
  ];

  const initialColor = `#${rgbHex(c[0], c[1], c[2])}`;

  const body = Bodies.polygon(
    position.x,
    position.y,
    3,
    FOOD_AMOUNT,
    {
      isStatic: true,
      render: {
        fillStyle: initialColor,
      },
    },
  );
  
  return {
    id: body.id,
    color: initialColor,
    body: body,
    amount: FOOD_AMOUNT,
  };
}

const createWalls = (tickness=10) => Body.create({
  isStatic: true,
  parts: [
    Bodies.rectangle(WORLD_SIZE.x/2,WORLD_SIZE.y,WORLD_SIZE.x,tickness, {render: {fillStyle: 'gray'}}),
    Bodies.rectangle(WORLD_SIZE.x/2,0,WORLD_SIZE.x,tickness, {render: {fillStyle: 'gray'}}),
    Bodies.rectangle(0,WORLD_SIZE.y/2,tickness,WORLD_SIZE.y, {render: {fillStyle: 'gray'}}),
    Bodies.rectangle(WORLD_SIZE.x,WORLD_SIZE.y/2,tickness,WORLD_SIZE.y, {render: {fillStyle: 'gray'}}),
  ],
});

let engine = createEngine();
let render = createRender(engine);
Render.run(render);

let herbivores = times(INITIAL_POPULATION, createHerbivore);
let foods = times(INITIAL_FOOD, createFood);
Composite.add(engine.world, herbivores.map((h) => h.body));
Composite.add(engine.world, foods.map((f) => f.body));
Composite.add(engine.world, createWalls());

let tick = 0;
while(tick * STEP_SIZE < 600 ) {
  Engine.update(engine, 1000 * STEP_SIZE);
  await new Promise(resolve => setTimeout(resolve, 1000 * STEP_SIZE));
  tick++;

  herbivores = herbivores.flatMap((herbivore) => {
    herbivore.hungry++;

    if(herbivore.hungry * STEP_SIZE < HUNGRY_THRESHOLD) return herbivore;
    if(herbivore.hungry * STEP_SIZE > DEATH_THRESHOLD) {
      Composite.remove(engine.world, herbivore.body);
      return null;
    }

    const {target, colorDistance} = findNearestFood(herbivore, foods);
    herbivore.target = target;

    if(!herbivore.target) return herbivore;

    const herbivorePosition = herbivore.body.position;
    const targetPosition = herbivore.target.body.position
    const resultVector = Vector.mult(Vector.normalise(Vector.sub(targetPosition, herbivorePosition)),1/(1+(colorDistance/100)));
    Body.setVelocity(herbivore.body, resultVector);

    if (Query.collides(herbivore.body, [herbivore.target.body]).length > 0){
      herbivore.hungry = 0;
      herbivore.feeded++;
      herbivore.target.amount--;
      const scale = herbivore.target.amount/(herbivore.target.amount + 1);
      Body.scale(herbivore.target.body,scale,scale);
      if(herbivore.target.amount <= 0) {
        const newFood = mutateFood(herbivore.target);
        Composite.remove(engine.world, herbivore.target.body);
        Composite.add(engine.world, newFood.body);
        foods = foods.filter((food) => food.id != herbivore.target.id).concat(newFood);
        
        herbivore.target = null;
      }

      if(herbivore.feeded % 5 == 0) {
        const child = mutateHerbivore(herbivore);
        Composite.add(engine.world, child.body);
        return [herbivore, child];
      }
    };

    return herbivore;
  }).filter(h => h);
}

Render.stop(render);
