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

type Player = Phaser.Physics.Matter.Sprite

type Gun = {
  isFiring: Boolean,
  lastFired: number
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
  const rect = this.add.rectangle(0, 0, 100, 50, 0xff0000)
  const player = scene.matter.add.gameObject(rect) as Player
  player.setPosition(100, 0)

  const gun: Gun = {
    isFiring: false,
    lastFired: 0
  }

  const state: State = {
    keys,
    player,
    gun
  }

  scene.data.set('state', state)
}

function spawnBullet(scene: Phaser.Scene, position: Phaser.Math.Vector2) {
  const rect = scene.add.rectangle(0, 0, 10, 10, 0xffff00)
  const bullet = scene.matter.add.gameObject(rect) as Player
  bullet.setVelocity(20, 0)
  bullet.setPosition(position.x, position.y)
  bullet.alpha = 1
  scene.tweens.add({
    targets: bullet,
    alpha: 0,
    duration: 200,
    delay: 400,
    onComplete: () => bullet.destroy()
  })
}

function update(this: Phaser.Scene) {
  const scene = this
  const state: State = scene.data.get('state')

  const playerVelocity = cursorKeysToVec2(state.keys).scale(10.0)
  state.player.setVelocity(playerVelocity.x, playerVelocity.y)

  if (state.keys.fire.isDown) {
    const position = vec2(state.player.x, state.player.y)
    position.x += 70
    spawnBullet(scene, position)
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