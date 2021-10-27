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
  attack: Phaser.Input.Keyboard.Key,
}

type Sprite = Phaser.Physics.Matter.Sprite
type Container = Phaser.GameObjects.Container

type MatterContainer = Omit<Phaser.GameObjects.Container, 'body'>
  & Phaser.Physics.Matter.Components.Bounce
  & Phaser.Physics.Matter.Components.Collision
  & Phaser.Physics.Matter.Components.Force
  & Phaser.Physics.Matter.Components.Friction
  & Phaser.Physics.Matter.Components.Gravity
  & Phaser.Physics.Matter.Components.Mass
  & Phaser.Physics.Matter.Components.Sensor
  & Phaser.Physics.Matter.Components.SetBody
  & Phaser.Physics.Matter.Components.Sleep
  & Phaser.Physics.Matter.Components.Static
  & Phaser.Physics.Matter.Components.Transform
  & Phaser.Physics.Matter.Components.Velocity
  & { body: MatterJS.BodyType }

abstract class Entity {
  public readonly state: State
  constructor(public readonly sprite: MatterContainer) {
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

function pathToGraphics(scene: Phaser.Scene, path: Phaser.Curves.Path): Phaser.GameObjects.Graphics {
  const graphics = new Phaser.GameObjects.Graphics(scene)
  graphics.lineStyle(1, 0xff0000, 1)
  path.draw(graphics)
  return graphics
}

class Sword extends Entity {
  public readonly path: Phaser.Curves.Path
  private follower: { t: number }
  private attacking: boolean
  constructor(scene: Phaser.Scene) {
    const sprite = spawnRectangle(scene, 0, 0, 50, 10, 0xff00ff)
    super(sprite)
    sprite.setCollisionCategory(this.state.collisionCategories.player)
    sprite.setCollidesWith(this.state.collisionCategories.enemies)

    this.path = new Phaser.Curves.Path(0, 0).splineTo([
      vec2(70, 70),
      vec2(70, -80),
      vec2(0, 0),
    ])
    this.follower = { t: 0 }
    this.attacking = false

  }
  updateSword(trigger: boolean, position: Phaser.Math.Vector2) {
    if (trigger && !this.attacking) {
      this.sprite.scene.tweens.add({
        targets: this.follower,
        duration: 200,
        t: 1,
        onComplete: () => {
          this.attacking = false
          this.follower.t = 0
        }
      })
    }
    const fullPosition = position.clone()

    const tangent = this.path.getTangent(this.follower.t)
    const rad = Math.atan2(tangent.y, tangent.x)
    const angle = Phaser.Math.RadToDeg(rad) + 90
    fullPosition.add(this.path.getPoint(this.follower.t))

    this.sprite.angle = angle
    this.sprite.x = fullPosition.x
    this.sprite.y = fullPosition.y
  }
  override dealDamage(): number {
    return 1
  }
}

class Player extends Entity {
  private readonly gun: Gun
  public readonly sword: Sword
  public swordPathGraphics: Phaser.GameObjects.Graphics
  constructor(scene: Phaser.Scene, position: Phaser.Math.Vector2) {
    const sprite = spawnRectangle(scene, 0, 0, 50, 50, 0x00aa00)
    super(sprite)
    sprite.setCollisionCategory(this.state.collisionCategories.player)
    sprite.setCollidesWith(this.state.collisionCategories.enemies)
    sprite.setPosition(position.x, position.y)

    this.gun = new Gun(scene)
    this.sword = new Sword(scene)
    this.swordPathGraphics = pathToGraphics(scene, this.sword.path)
    scene.add.existing(this.swordPathGraphics)
  }
  override update(t: number, dt: number) {
    const keys: PlayerKeys = this.state.keys

    // player
    const playerVelocity = cursorKeysToVec2(keys).scale(10.0)
    this.sprite.setVelocity(playerVelocity.x, playerVelocity.y)

    // gun
    const gunPosition = vec2(this.sprite.x, this.sprite.y)
    gunPosition.x += 70
    this.gun.update(t, dt, keys.fire.isDown, gunPosition)

    // sword
    const swordPosition = vec2(this.sprite.x, this.sprite.y + 20)
    this.sword.updateSword(keys.attack.isDown, swordPosition)
    this.swordPathGraphics.x = swordPosition.x
    this.swordPathGraphics.y = swordPosition.y
  }
  override dealDamage() {
    return 1
  }
  override takeDamage(amount: number) {
    if (!this.state.config.godMode) {
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
    sprite.setCollisionCategory(this.state.collisionCategories.enemies)
    sprite.setCollidesWith(this.state.collisionCategories.player)
    sprite.setPosition(position.x, position.y)
    sprite.setVelocityX(-3)
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
    this.destroy()
  }
}

class SnakeEnemy extends Entity {
  public readonly spawnPosition: Phaser.Math.Vector2
  constructor(scene: Phaser.Scene, position: Phaser.Math.Vector2) {
    const sprite = spawnCircle(scene, 0, 0, 20, 0xff5500)
    super(sprite)
    this.spawnPosition = position
    sprite.setCollisionCategory(this.state.collisionCategories.enemies)
    sprite.setCollidesWith(this.state.collisionCategories.player)
    sprite.setPosition(position.x, position.y)
    sprite.setVelocityX(-4)
    sprite.alpha = 0
    scene.tweens.add({
      targets: sprite,
      duration: 200,
      delay: 0,
      alpha: 1,
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
    this.updatePosition()
  }
  updatePosition() {
    const x = this.sprite.x
    this.sprite.setPosition(x, Math.sin(this.sprite.x / 80) * 50 + this.spawnPosition.y)
    if (x < 100) {
      this.destroy()
    }
  }
  override update(t: number, dt: number) {
    this.updatePosition()
  }
  override takeDamage(amount: number) {
    this.destroy()
  }
  override dealDamage(): number {
    return 2
  }
}

class Bullet extends Entity {
  constructor(scene: Phaser.Scene, position: Phaser.Math.Vector2) {
    const sprite = spawnCircle(scene, 0, 0, 5, 0xffff00)
    super(sprite)
    sprite.setCollisionCategory(this.state.collisionCategories.player)
    sprite.setCollidesWith(this.state.collisionCategories.enemies)
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
    this.destroy()
  }
  override dealDamage(): number {
    return 1
  }
}

function collideEntities(a: Entity, b: Entity) {
  const aDamage = a.dealDamage()
  const bDamage = b.dealDamage()
  if (bDamage !== 0) a.takeDamage(bDamage)
  if (aDamage !== 0) b.takeDamage(aDamage)
}

type Config = {
  godMode: boolean
}

const defaultConfig: Config = {
  godMode: true
}

type CollisionCategories = {
  enemies: number,
  player: number,
}

type State = {
  config: Config,
  keys: PlayerKeys,
  entities: Phaser.GameObjects.Group,
  collisionCategories: CollisionCategories
}

function spawnSnakeEnemy(scene: Phaser.Scene, position: Phaser.Math.Vector2) {
  scene.time.addEvent({
    repeat: 6,
    delay: 200,
    callback: () => {
      new SnakeEnemy(scene, position)
    }
  })
}

function create(this: Phaser.Scene) {
  const scene = this
  const keys = {
    up: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
    down: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
    left: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
    right: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    fire: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
    attack: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J),
  }

  const camera = scene.cameras.main
  camera.scrollY = -scene.sys.canvas.height * 0.5

  // scene.matter.world.setBounds(-1000, -1000, 1000, 1000)

  const collisionCategories = {
    enemies: scene.matter.world.nextCategory(),
    player: scene.matter.world.nextCategory(),
  }

  const state: State = {
    config: defaultConfig,
    keys,
    entities: new Phaser.GameObjects.Group(scene),
    collisionCategories
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

  spawnSnakeEnemy(scene, vec2(900, 200))
  scene.time.addEvent({
    loop: true,
    delay: 8000,
    callback: () => {
      spawnSnakeEnemy(scene, vec2(900, 200))
    }
  })
  scene.time.addEvent({
    loop: true,
    delay: 4000,
    callback: () => {
      spawnSnakeEnemy(scene, vec2(900, -200))
    }
  })

  let spawnCount = 0
  const spawnY = [-200, -100, 100, 200]
  scene.time.addEvent({
    delay: 2000,
    loop: true,
    callback: function () {
      const y = spawnY[(spawnCount++) % spawnY.length]
      new Enemy(scene, vec2(900, y))
    }
  })
}

function spawnRectangle(scene: Phaser.Scene, x: number, y: number, width: number, height: number, color: number): MatterContainer {
  const rectangle = new Phaser.GameObjects.Rectangle(scene, 0, 0, width, height, color)
  const container = new Phaser.GameObjects.Container(scene)
  container.add(rectangle)

  const body = scene.matter.bodies.rectangle(x, y, width, height)
  const obj = scene.matter.add.gameObject(container, body) as MatterContainer
  scene.add.existing(obj)

  obj.setFriction(0)
  obj.setFrictionAir(0)
  obj.setSensor(true)

  return obj
}

function spawnCircle(scene: Phaser.Scene, x: number, y: number, radius: number, color: number): MatterContainer {
  const circle = scene.add.circle(0, 0, radius, color)
  const container = new Phaser.GameObjects.Container(scene)
  container.add(circle)

  const body = scene.matter.bodies.circle(x, y, radius)
  const obj = scene.matter.add.gameObject(container, body) as MatterContainer
  scene.add.existing(obj)

  obj.setFriction(0)
  obj.setFrictionAir(0)
  obj.setSensor(true)

  return obj
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