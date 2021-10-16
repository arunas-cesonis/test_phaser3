import * as Phaser from 'phaser'

function l(...args) {
  console.log.apply(console, args)
}

function vec2(x: number, y: number): Phaser.Math.Vector2 {
  return new Phaser.Math.Vector2(x, y)
}

function cursorKeysToVec2(cursorKeys: CursorKeys): Phaser.Math.Vector2 {
  const v = vec2(0, 0)
  if (cursorKeys.right.isDown) v.x = 1;
  if (cursorKeys.left.isDown) v.x = -1;
  if (cursorKeys.down.isDown) v.y = 1;
  if (cursorKeys.up.isDown) v.y = -1;
  return v
}

type CursorKeys = {
  up: Phaser.Input.Keyboard.Key,
  down: Phaser.Input.Keyboard.Key,
  left: Phaser.Input.Keyboard.Key,
  right: Phaser.Input.Keyboard.Key,
}

type PlayerKeys = CursorKeys & {
  fire: Phaser.Input.Keyboard.Key,
}

type Sprite = Phaser.Physics.Matter.Sprite

abstract class Entity {
  constructor(public readonly sprite: Sprite) {
    this.sprite.setData('entity', this)
  }
}

class Player extends Entity {
  constructor(scene: Phaser.Scene, position: Phaser.Math.Vector2) {
    const sprite = spawnRectangle(scene, 0, 0, 100, 50, 0x00aa00)
    super(sprite)
    sprite.setPosition(position.x, position.y)
  }
}

class Enemy extends Entity {
  constructor(scene: Phaser.Scene, position: Phaser.Math.Vector2) {
    const sprite = spawnRectangle(scene, 0, 0, 50, 50, 0xff0000)
    super(sprite)
    sprite.setPosition(position.x, position.y)
    sprite.alpha = 1
    sprite.setFriction(0)
    sprite.setFrictionAir(0)
  }
}

class Bullet extends Entity {
  constructor(scene: Phaser.Scene, position: Phaser.Math.Vector2) {
    const sprite = spawnCircle(scene, 0, 0, 5, 0xffff00)
    super(sprite)
    sprite.setVelocity(20, 0)
    sprite.setPosition(position.x, position.y)
    scene.tweens.add({
      targets: sprite,
      alpha: 0,
      duration: 200,
      delay: 600,
      onComplete: () => {
        sprite.destroy()
      }
    })
  }
}

function collideEnemyBullet(enemy: Enemy, bullet: Bullet) {
  enemy.sprite.destroy()
  bullet.sprite.destroy()
}

function collideEntities(a: Entity, b: Entity) {
  if (a instanceof Enemy) {
    if (b instanceof Bullet) {
      return collideEnemyBullet(a, b)
    }
  }
  if (a instanceof Bullet) {
    if (b instanceof Enemy) {
      return collideEnemyBullet(b, a)
    }
  }
  console.error('unresolved entity collision', a, b)
}

type Gun = {
  isFiring: Boolean,
  bulletsPerSecond: number,
  lastBulletTime: number
}

type State = {
  keys: PlayerKeys,
  player: Player,
  gun: Gun
}

function create(this: Phaser.Scene) {
  const scene = this
  const keys = {
    up: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
    down: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
    left: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
    right: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    fire: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
  }

  const camera = scene.cameras.main
  camera.scrollY = -scene.sys.canvas.height * 0.5

  // scene.matter.world.setBounds(-1000, -1000, 1000, 1000)
  const player = new Player(scene, vec2(100, 0))

  const gun: Gun = {
    isFiring: false,
    bulletsPerSecond: 20,
    lastBulletTime: 0
  }

  const state: State = {
    keys,
    player,
    gun
  }

  new Enemy(scene, vec2(500, -200))
  new Enemy(scene, vec2(500, -100))
  new Enemy(scene, vec2(500, 0))
  new Enemy(scene, vec2(500, 100))
  new Enemy(scene, vec2(500, 200))

  scene.data.set('state', state)
  scene.matter.world.on('collisionstart', function (event, bodyA: MatterJS.BodyType, bodyB: MatterJS.BodyType) {
    const entityA = bodyA.gameObject.getData('entity')
    const entityB = bodyB.gameObject.getData('entity')
    if (entityA instanceof Entity && entityB instanceof Entity) {
      collideEntities(entityA, entityB)
    } else {
      console.error('non entity collision', bodyA, bodyB)
    }
  })
}

function spawnRectangle(scene: Phaser.Scene, x: number, y: number, width: number, height: number, color: number): Phaser.Physics.Matter.Sprite {
  const gameObject = scene.add.rectangle(x, y, width, height, color)
  const rectangle = scene.matter.add.gameObject(gameObject) as Phaser.Physics.Matter.Sprite
  // rectangle.setFriction(0)
  // rectangle.setFrictionAir(0)
  rectangle.setSensor(true)
  return rectangle
}

function spawnCircle(scene: Phaser.Scene, x: number, y: number, radius: number, color: number): Phaser.Physics.Matter.Sprite {
  const gameObject = scene.add.circle(x, y, radius, color)
  const circle = scene.matter.add.gameObject(gameObject) as Phaser.Physics.Matter.Sprite
  // rectangle.setFriction(0)
  // rectangle.setFrictionAir(0)
  circle.setSensor(true)
  return circle
}

function spawnPlayer(scene: Phaser.Scene, position: Phaser.Math.Vector2): Player {
  const player = spawnRectangle(scene, 0, 0, 100, 50, 0x00aa00)
  player.setPosition(position.x, position.y)
  return player
}

function spawnEnemy(scene: Phaser.Scene, position: Phaser.Math.Vector2) {
  new Enemy(scene, position)
}

function updateGun(scene: Phaser.Scene, t: number, dt: number, triggerDown: Boolean, gun: Gun): number {
  if (triggerDown) {
    if (!gun.isFiring) {
      gun.lastBulletTime = t
      gun.isFiring = true
      return 1
    } else {
      const timeElapsedSinceLastBullet = t - gun.lastBulletTime
      const bulletTakesTime = 1000 / gun.bulletsPerSecond
      const newBullets = Math.floor(timeElapsedSinceLastBullet / bulletTakesTime)
      gun.lastBulletTime += newBullets * bulletTakesTime
      return newBullets
    }
  } else {
    gun.isFiring = false
    return 0
  }
}

function update(this: Phaser.Scene) {
  const scene = this
  const t = scene.game.loop.time
  const dt = scene.game.loop.delta
  const state: State = scene.data.get('state')

  const playerVelocity = cursorKeysToVec2(state.keys).scale(10.0)
  state.player.sprite.setVelocity(playerVelocity.x, playerVelocity.y)

  const newBullets = updateGun(scene, t, dt, state.keys.fire.isDown, state.gun)

  for (let i = 0; i < newBullets; i++) {
    const position = vec2(state.player.sprite.x, state.player.sprite.y)
    position.x += 70
    new Bullet(scene, position)
  }
}

const config = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  physics: {
    default: 'matter',
    matter: {
      gravity: {
        y: 0
      },
      debug: false
    }
  },
  scene: {
    create,
    update
  }
}

new Phaser.Game(config)

var module: any
if (module.hot) {
  module.hot.accept(function () {
    location.reload();
  });
}