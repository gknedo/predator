import { times } from 'lodash';
import { Engine, Render, Body, Bodies, Composite } from 'matter-js';
import { randomColor} from 'randomcolor';

const HERBIVORE_COLOR = randomColor();
const FOOD_COLOR = randomColor();
const WORLD_SIZE = {x: 600, y: 600};
const STEP_SIZE = 100;
const HERBIVORE_SIZE = 10;

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
      render: {
        fillStyle: initialColor,
      },
    },
  );
  
  return {
    id: body.id,
    color: initialColor,
    body: body
  };
}

const createFood = ({color, position} = {}) => {

  const initialPosition = position ?? randomPosition(WORLD_SIZE, HERBIVORE_SIZE);
  const initialColor = color ?? FOOD_COLOR;

  const body = Bodies.polygon(
    initialPosition.x,
    initialPosition.y,
    3,
    HERBIVORE_SIZE / 2,
    {
      render: {
        fillStyle: initialColor,
      },
    },
  );
  
  return {
    id: body.id,
    color: initialColor,
    body: body
  };
}

const World = {};
let engine = createEngine();
let render = createRender(engine);
Render.run(render);

let herbivores = times(10, createHerbivore);
let food = times(3, createFood);
Composite.add(engine.world, herbivores.map((h) => h.body));
Composite.add(engine.world, food.map((f) => f.body));

let tick = 0
while(true) {
  Engine.update(engine, 1000 * STEP_SIZE);
  await new Promise(resolve => setTimeout(resolve, 1000 * STEP_SIZE));
  tick++;
}

Render.stop(render);
