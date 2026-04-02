import { createAsciiScene } from '../src/ascii-scene'

const container = document.getElementById('ascii-bg')
if (!container) throw new Error('#ascii-bg not found')

await createAsciiScene(container, {
  model: '/002_Squaresquid_Art.glb',
  color: '#7b5cff',
  cellSize: 3,
  brightness: 1.8,
  followMouse: true,
  mouseStrength: 3,
  autoRotate: true,
  rotateSpeed: 10,
  bob: false,
  bobAmount: 0.1,
  exposure: 2.2,
  background: '#020108',
  // Size & position
  scale: 0.2,      // bigger
  x: 0.3,          // shift right
  y: -0.0,         // shift down

  // Dynamic position via onAnimate
  onAnimate: (time, delta, model) => {
    model.position.x = Math.sin(time * 0.001) * 0.5  // drift left/right
  },
})
