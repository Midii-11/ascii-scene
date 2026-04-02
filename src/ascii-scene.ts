import { createAsciiRenderer, type AsciiScene, type AnimateCallback } from './ascii-renderer'

// ═══════════════════════════════════════════════════════════════════
// SIMPLIFIED API — point at a container + .glb and go
// ═══════════════════════════════════════════════════════════════════

export type AsciiSceneOptions = {
  /** URL to a .glb or .gltf model */
  model?: string

  /** ASCII character color as CSS hex string or number (default: '#e6b828') */
  color?: string | number

  /** Grid cell size in pixels (default: 6) */
  cellSize?: number

  /** Brightness multiplier (default: 1.6) */
  brightness?: number

  /** Enable mouse interaction (default: true) */
  followMouse?: boolean

  /** Mouse influence strength (default: 0.5) */
  mouseStrength?: number

  /** Enable auto-rotation (default: true) */
  autoRotate?: boolean

  /** Auto-rotate speed — revolutions per minute (default: 3) */
  rotateSpeed?: number

  /** Enable vertical bobbing (default: true) */
  bob?: boolean

  /** Bob amplitude (default: 0.15) */
  bobAmount?: number

  /** Tone mapping exposure (default: 2.0) */
  exposure?: number

  /** Background color as CSS hex or number (default: '#000000') */
  background?: string | number

  /** Camera field of view (default: 40) */
  fov?: number

  /** Custom character set (dark→bright, default: built-in) */
  characters?: string

  /** Model scale multiplier (default: 1.0) */
  scale?: number

  /** Model X position offset — positive = right (default: 0) */
  x?: number

  /** Model Y position offset — positive = up (default: 0) */
  y?: number

  /** Custom animation callback */
  onAnimate?: AnimateCallback
}

function parseColor(c: string | number): number {
  if (typeof c === 'number') return c
  return parseInt(c.replace('#', ''), 16)
}

/**
 * Create an ASCII-rendered 3D scene with one function call.
 *
 * @example
 * ```ts
 * // Minimal — just a model
 * const scene = await createAsciiScene('#bg', { model: '/dragon.glb' })
 *
 * // With options
 * const scene = await createAsciiScene('#bg', {
 *   model: '/bee.glb',
 *   color: '#e6b828',
 *   cellSize: 6,
 *   followMouse: true,
 *   autoRotate: true,
 * })
 *
 * // Later: update options
 * scene.setColor('#ff0000')
 * scene.setBrightness(2.0)
 *
 * // Cleanup
 * scene.destroy()
 * ```
 */
export async function createAsciiScene(
  container: string | HTMLElement,
  options: AsciiSceneOptions = {},
) {
  // Resolve container
  const el = typeof container === 'string'
    ? document.querySelector<HTMLElement>(container)
    : container
  if (!el) throw new Error(`Container "${container}" not found`)

  const color = parseColor(options.color ?? '#e6b828')
  const bg = parseColor(options.background ?? '#000000')
  const cellPx = options.cellSize ?? 6

  // Create the renderer
  const ascii = createAsciiRenderer({
    container: el,
    color,
    brightness: options.brightness ?? 1.6,
    cellSize: [cellPx, Math.round(cellPx * 1.67)],
    background: bg,
    exposure: options.exposure ?? 2.0,
    mouseInteraction: options.followMouse ?? true,
    mouseStrength: options.mouseStrength ?? 0.5,
    autoRotateSpeed: (options.autoRotate ?? true)
      ? (options.rotateSpeed ?? 3) * (2 * Math.PI) / 60000  // RPM → rad/ms
      : 0,
    bobAmplitude: (options.bob ?? true) ? (options.bobAmount ?? 0.15) : 0,
    fov: options.fov ?? 40,
    characters: options.characters,
    scale: options.scale,
    positionX: options.x,
    positionY: options.y,
  })

  // Custom animation
  if (options.onAnimate) {
    ascii.onAnimate(options.onAnimate)
  }

  // Load model if provided
  let loadedModel: Awaited<ReturnType<AsciiScene['loadModel']>> | null = null
  if (options.model) {
    loadedModel = await ascii.loadModel(options.model)
    loadedModel.playAll()
  }

  // Start rendering
  ascii.start()

  // Return simplified control API
  return {
    /** The underlying AsciiScene (full Three.js access) */
    renderer: ascii,

    /** The loaded model (if any) */
    model: loadedModel,

    /** Change the ASCII color */
    setColor(c: string | number) {
      ascii.setOptions({ color: parseColor(c) })
    },

    /** Change brightness */
    setBrightness(b: number) {
      ascii.setOptions({ brightness: b })
    },

    /** Change cell size */
    setCellSize(px: number) {
      ascii.setOptions({ cellSize: [px, Math.round(px * 1.67)] })
    },

    /** Change rotation speed (RPM) */
    setRotateSpeed(rpm: number) {
      ascii.setOptions({ autoRotateSpeed: rpm * (2 * Math.PI) / 60000 })
    },

    /** Change model scale */
    setScale(s: number) {
      ascii.setOptions({ scale: s })
    },

    /** Change model position */
    setPosition(x: number, y: number) {
      ascii.setOptions({ positionX: x, positionY: y })
    },

    /** Load a different model */
    async loadModel(url: string) {
      loadedModel = await ascii.loadModel(url)
      loadedModel.playAll()
      return loadedModel
    },

    /** Play a specific animation by name */
    playAnimation(name: string) {
      loadedModel?.playAnimation(name)
    },

    /** Stop rendering and clean up */
    destroy() {
      ascii.dispose()
    },
  }
}
