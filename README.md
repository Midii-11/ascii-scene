# ascii-scene

Render any 3D model as animated ASCII art. GPU-powered, mouse-reactive, one function call.

Built on [Three.js](https://threejs.org) + [Pretext](https://github.com/chenglou/pretext) for proportional font accuracy.

## Install

```bash
npm install ascii-scene three
```

## Quick Start

```ts
import { createAsciiScene } from 'ascii-scene'

const scene = await createAsciiScene('#background', {
  model: '/my-model.glb',
  color: '#e6b828',
})
```

That's it. Any `.glb` file — a character, a product, a logo — rendered as animated ASCII art.

## Usage as Website Background

```html
<div id="bg" style="position:fixed;inset:0;z-index:-1"></div>
<div style="position:relative">
  <!-- your website content here -->
</div>

<script type="module">
  import { createAsciiScene } from 'ascii-scene'
  await createAsciiScene('#bg', {
    model: '/model.glb',
    color: '#e6b828',
    followMouse: true,
  })
</script>
```

## Without a Bundler (Script Tag)

```html
<div id="bg" style="position:fixed;inset:0;z-index:-1"></div>
<script src="https://unpkg.com/ascii-scene/dist/ascii-scene.standalone.iife.js"></script>
<script>
  AsciiScene.create('#bg', { model: '/model.glb', color: '#e6b828' })
</script>
```

## Options

```ts
createAsciiScene('#container', {
  // Model
  model: '/path/to/model.glb',   // .glb or .gltf URL

  // Appearance
  color: '#e6b828',               // ASCII character tint color
  cellSize: 6,                    // character grid size in px (smaller = more detail)
  brightness: 1.6,                // brightness multiplier
  background: '#000000',          // background color
  characters: ' .:-=+*#%@',      // custom character set (dark -> bright)

  // Size & Position
  scale: 1.0,                     // model scale multiplier
  x: 0,                           // horizontal offset (-1 = left edge, 0 = center, 1 = right edge)
  y: 0,                           // vertical offset (-1 = bottom, 0 = center, 1 = top)

  // Animation
  autoRotate: true,               // slowly spin the model
  rotateSpeed: 3,                 // rotations per minute
  bob: true,                      // gentle vertical bobbing
  bobAmount: 0.15,                // bob amplitude

  // Interaction
  followMouse: true,              // model tilts toward cursor
  mouseStrength: 0.5,             // mouse influence amount

  // Camera
  fov: 40,                        // field of view
  exposure: 2.0,                  // tone mapping exposure

  // Custom per-frame animation
  onAnimate: (time, delta, model) => {
    model.position.x = Math.sin(time * 0.001) * 0.5
  },
})
```

## Runtime Controls

```ts
const scene = await createAsciiScene('#bg', { model: '/bee.glb' })

// Appearance
scene.setColor('#ff0000')
scene.setBrightness(2.0)
scene.setCellSize(4)

// Size & Position
scene.setScale(1.5)
scene.setPosition(0.5, -0.3)   // shift right and down

// Animation
scene.setRotateSpeed(5)

// Load a different model
await scene.loadModel('/dragon.glb')

// Play a specific animation
scene.playAnimation('walk')

// Clean up
scene.destroy()
```

## Advanced: Full Three.js Access

For custom scenes with programmatic geometry, lights, or materials:

```ts
import { createAsciiRenderer } from 'ascii-scene'
import * as THREE from 'three'

const ascii = createAsciiRenderer({
  container: document.getElementById('bg'),
  color: 0xe6b828,
})

// Direct Three.js scene access
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0xff0000 })
)
ascii.modelGroup.add(cube)

// Custom per-frame animation
ascii.onAnimate((time) => {
  cube.rotation.x = time * 0.001
})

ascii.start()
```

## How It Works

1. **Three.js** renders your 3D model to an offscreen WebGL texture
2. A **GLSL fragment shader** converts the rendered image to ASCII:
   - Divides the screen into a grid of cells
   - Samples brightness at each cell's center
   - Maps brightness to a character from a pre-built atlas texture
3. **Pretext** measures each character's width for proportional font accuracy
4. Everything runs on the **GPU** at 60fps — no CPU pixel readback

Same architecture as [dragonfly.xyz](https://dragonfly.xyz).

## License

MIT
