import * as Phaser from 'phaser'

function l(...args: any[]) {
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
  public readonly state: State
  constructor(public readonly sprite: Sprite) {
    this.sprite.setData('entity', this)
    this.state = this.sprite.scene.data.get('state')
    this.state.entities.add(this.sprite)
  }
  update(t: number, dt: number) {
  }
  takeDamage(amount: number) {
  }
  dealDamage(): number {
    return 0
  }
  destroy() {
    this.sprite.destroy()
  }
}

class Gun {
  private isFiring: Boolean = false
  private bulletsPerSecond: number = 20
  private lastBulletTime: number = 20
  constructor(public readonly scene: Phaser.Scene) {
  }
  fireBullets(t: number, dt: number, triggerDown: boolean): number {
    if (triggerDown) {
      if (!this.isFiring) {
        this.lastBulletTime = t
        this.isFiring = true
        return 1
      } else {
        const timeElapsedSinceLastBullet = t - this.lastBulletTime
        const bulletTakesTime = 1000 / this.bulletsPerSecond
        const newBullets = Math.floor(timeElapsedSinceLastBullet / bulletTakesTime)
        this.lastBulletTime += newBullets * bulletTakesTime
        return newBullets
      }
    } else {
      this.isFiring = false
      return 0
    }
  }
  update(t: number, dt: number, triggerDown: boolean, position: Phaser.Math.Vector2) {
    const newBullets = this.fireBullets(t, dt, triggerDown)
    for (let i = 0; i < newBullets; i++) {
      new Bullet(this.scene, position)
    }
  }
}

class Player extends Entity {
  private gun: Gun
  constructor(scene: Phaser.Scene, position: Phaser.Math.Vector2) {
    const sprite = spawnRectangle(scene, 0, 0, 100, 50, 0x00aa00)
    super(sprite)
    this.gun = new Gun(scene)
    sprite.setPosition(position.x, position.y)
  }
  override update(t: number, dt: number) {
    const keys: PlayerKeys = this.state.keys

    const playerVelocity = cursorKeysToVec2(keys).scale(10.0)
    this.sprite.setVelocity(playerVelocity.x, playerVelocity.y)

    const gunPosition = vec2(this.sprite.x, this.sprite.y)
    gunPosition.x += 70
    this.gun.update(t, dt, keys.fire.isDown, gunPosition)
  }
  override dealDamage() {
    return 1
  }
  override takeDamage(amount: number) {
    if (amount > 0) {
      this.destroy()
    }
  }
  override destroy() {
    this.sprite.scene.scene.restart()
  }
}

class Enemy extends Entity {
  constructor(scene: Phaser.Scene, position: Phaser.Math.Vector2) {
    const sprite = spawnRectangle(scene, 0, 0, 50, 50, 0xff0000)
    super(sprite)
    sprite.setPosition(position.x, position.y)
    sprite.setVelocityX(-2)
    sprite.alpha = 0
    sprite.scale = 0
    scene.tweens.add({
      targets: sprite,
      alpha: 1,
      scale: 1,
      duration: 200
    })
    scene.tweens.add({
      targets: sprite,
      duration: 200,
      delay: 10000,
      alpha: 0,
      onComplete: () => {
        this.destroy()
      }
    })
  }
  override dealDamage() {
    return 1
  }
  override takeDamage(amount: number) {
    if (amount > 0) {
      this.destroy()
    }
  }
}

class SnakeEnemy extends Entity {
  constructor(scene: Phaser.Scene, position: Phaser.Math.Vector2) {
    const sprite = spawnCircle(scene, 0, 0, 20, 0xff5500)
    super(sprite)
    sprite.setPosition(position.x, position.y)
    sprite.setVelocityX(-4)
  }
  override update(t: number, dt: number) {
    this.sprite.setPosition(this.sprite.x, Math.sin(this.sprite.x / 80) * 50)
  }
  override takeDamage(amount: number) {
    if (amount > 0) {
      this.destroy()
    }
  }
  override dealDamage(): number {
    return 1
  }
}

class Bullet extends Entity {
  constructor(scene: Phaser.Scene, position: Phaser.Math.Vector2) {
    const sprite = spawnCircle(scene, 0, 0, 5, 0xffff00)
    super(sprite)
    sprite.setPosition(position.x, position.y)
    sprite.setVelocity(20, 0)
    scene.tweens.add({
      targets: sprite,
      alpha: 0,
      duration: 200,
      delay: 600,
      onComplete: () => {
        this.destroy()
      }
    })
  }
  override takeDamage(amount: number) {
    if (amount > 0) {
      this.destroy()
    }
  }
  override dealDamage(): number {
    return 1
  }
}

function collideEntities(a: Entity, b: Entity) {
  const aDamage = a.dealDamage()
  const bDamage = b.dealDamage()
  a.takeDamage(bDamage)
  b.takeDamage(aDamage)
}

type State = {
  keys: PlayerKeys,
  entities: Phaser.GameObjects.Group
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

  const state: State = {
    keys,
    entities: new Phaser.GameObjects.Group(scene)
  }

  scene.data.set('state', state)
  scene.matter.world.on('collisionstart', function (event: any, bodyA: MatterJS.BodyType, bodyB: MatterJS.BodyType) {
    const entityA = bodyA.gameObject.getData('entity')
    const entityB = bodyB.gameObject.getData('entity')
    if (entityA instanceof Entity && entityB instanceof Entity) {
      collideEntities(entityA, entityB)
    } else {
      console.error('non entity collision', bodyA, bodyB)
    }
  })

  new Player(scene, vec2(100, 0))
  new SnakeEnemy(scene, vec2(600, 0))
  new SnakeEnemy(scene, vec2(650, 0))
  new SnakeEnemy(scene, vec2(700, 0))
  new SnakeEnemy(scene, vec2(750, 0))
  new SnakeEnemy(scene, vec2(800, 0))
  new SnakeEnemy(scene, vec2(850, 0))
  new SnakeEnemy(scene, vec2(900, 0))

  let spawnCount = 0
  const spawnY = [-200, -100, 100, 200]
  scene.time.addEvent({
    delay: 1000,
    loop: true,
    callback: function () {
      const y = spawnY[(spawnCount++) % spawnY.length]
      new Enemy(scene, vec2(900, y))
    }
  })
}

function spawnRectangle(scene: Phaser.Scene, x: number, y: number, width: number, height: number, color: number): Phaser.Physics.Matter.Sprite {
  const gameObject = scene.add.rectangle(x, y, width, height, color)
  const rectangle = scene.matter.add.gameObject(gameObject) as Phaser.Physics.Matter.Sprite
  rectangle.setFriction(0)
  rectangle.setFrictionAir(0)
  rectangle.setSensor(true)
  return rectangle
}

function spawnCircle(scene: Phaser.Scene, x: number, y: number, radius: number, color: number): Phaser.Physics.Matter.Sprite {
  const gameObject = scene.add.circle(x, y, radius, color)
  const circle = scene.matter.add.gameObject(gameObject) as Phaser.Physics.Matter.Sprite
  circle.setBody('circle')
  circle.setFriction(0)
  circle.setFrictionAir(0)
  circle.setSensor(true)
  return circle
}

function update(this: Phaser.Scene) {
  const scene = this
  const t = scene.game.loop.time
  const dt = scene.game.loop.delta
  const state: State = scene.data.get('state')
  for (const child of state.entities.getChildren()) {
    child.getData('entity').update(t, dt)
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
      debug: true
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