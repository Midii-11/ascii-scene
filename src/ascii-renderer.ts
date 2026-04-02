import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { prepareWithSegments } from '@chenglou/pretext'

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API TYPES
// ═══════════════════════════════════════════════════════════════════

export type AsciiRendererOptions = {
  /** DOM element to mount the canvas into (default: document.body) */
  container?: HTMLElement

  /** Character set sorted dark→bright, or 'default' for built-in set */
  characters?: string

  /** Font used to render the character atlas */
  atlasFont?: string

  /** Font used for Pretext width measurement */
  measureFont?: string

  /** Grid cell size in pixels [width, height] (default: [6, 10]) */
  cellSize?: [number, number]

  /** ASCII character color as hex (default: 0xe6b828 — golden) */
  color?: number

  /** Brightness multiplier (default: 1.6) */
  brightness?: number

  /** Background color as hex (default: 0x000000) */
  background?: number

  /** Tone mapping exposure (default: 2.0) */
  exposure?: number

  /** Enable mouse interaction (default: true) */
  mouseInteraction?: boolean

  /** Mouse influence strength (default: 0.5) */
  mouseStrength?: number

  /** Auto-rotate speed (radians per ms, default: 0.0005) */
  autoRotateSpeed?: number

  /** Vertical bobbing amplitude (default: 0.15, 0 to disable) */
  bobAmplitude?: number

  /** Camera field of view (default: 40) */
  fov?: number

  /** Camera distance from origin (default: auto-fit) */
  cameraDistance?: number
}

export type AsciiScene = {
  /** The Three.js scene — add lights, objects, etc. */
  scene: THREE.Scene

  /** The Three.js camera */
  camera: THREE.PerspectiveCamera

  /** The root group for the loaded model */
  modelGroup: THREE.Group

  /** The Three.js renderer */
  renderer: THREE.WebGLRenderer

  /** Start the render loop */
  start: () => void

  /** Stop the render loop */
  stop: () => void

  /** Load a .glb/.gltf model */
  loadModel: (url: string) => Promise<LoadedModel>

  /** Update options at runtime */
  setOptions: (opts: Partial<AsciiRendererOptions>) => void

  /** Set a custom animation callback (called each frame with time in ms) */
  onAnimate: (callback: AnimateCallback | null) => void

  /** Dispose all resources */
  dispose: () => void
}

export type LoadedModel = {
  /** The loaded GLTF scene */
  scene: THREE.Group

  /** Available animation clips */
  animations: THREE.AnimationClip[]

  /** Animation mixer (created automatically if animations exist) */
  mixer: THREE.AnimationMixer | null

  /** Play a specific animation by index or name */
  playAnimation: (nameOrIndex: string | number) => void

  /** Play all animations */
  playAll: () => void

  /** Stop all animations */
  stopAll: () => void
}

export type AnimateCallback = (time: number, delta: number, model: THREE.Group) => void

// ═══════════════════════════════════════════════════════════════════
// DEFAULT CHARACTER SET
// ═══════════════════════════════════════════════════════════════════

const DEFAULT_CHARS = ' ._-,:;!~=+*?/\\|(){}[]#&@$%QBMWgdpqb98653ZSkEAGXHO0'

// ═══════════════════════════════════════════════════════════════════
// CHARACTER ATLAS BUILDER
// ═══════════════════════════════════════════════════════════════════

type CharInfo = { char: string; brightness: number }

function buildCharAtlas(characters: string, font: string, measureFontStr: string) {
  const ATLAS_COLS = 8
  const CELL_SIZE = 64
  const charInfos: CharInfo[] = []

  // Measure brightness of each character
  const mc = document.createElement('canvas')
  mc.width = 48; mc.height = 48
  const mCtx = mc.getContext('2d', { willReadFrequently: true })!

  for (const ch of characters) {
    if (ch === ' ') { charInfos.push({ char: ch, brightness: 0 }); continue }
    mCtx.clearRect(0, 0, 48, 48)
    mCtx.font = font
    mCtx.fillStyle = '#fff'
    mCtx.textBaseline = 'middle'
    mCtx.textAlign = 'center'
    mCtx.fillText(ch, 24, 24)
    const data = mCtx.getImageData(0, 0, 48, 48).data
    let sum = 0
    for (let i = 3; i < data.length; i += 4) sum += data[i]!
    charInfos.push({ char: ch, brightness: sum / (255 * 48 * 48) })
  }

  // Use Pretext to verify character widths are measurable
  for (const ci of charInfos) {
    if (ci.char !== ' ') {
      prepareWithSegments(ci.char, measureFontStr)
    }
  }

  // Sort by brightness
  charInfos.sort((a, b) => a.brightness - b.brightness)
  const charCount = charInfos.length
  const atlasRows = Math.ceil(charCount / ATLAS_COLS)

  // Draw atlas
  const atlasW = ATLAS_COLS * CELL_SIZE
  const atlasH = atlasRows * CELL_SIZE
  const ac = document.createElement('canvas')
  ac.width = atlasW; ac.height = atlasH
  const aCtx = ac.getContext('2d')!
  aCtx.fillStyle = '#000'
  aCtx.fillRect(0, 0, atlasW, atlasH)
  aCtx.font = font
  aCtx.fillStyle = '#fff'
  aCtx.textBaseline = 'middle'
  aCtx.textAlign = 'center'

  for (let i = 0; i < charCount; i++) {
    const col = i % ATLAS_COLS
    const row = Math.floor(i / ATLAS_COLS)
    aCtx.fillText(charInfos[i]!.char, col * CELL_SIZE + CELL_SIZE / 2, row * CELL_SIZE + CELL_SIZE / 2)
  }

  return { canvas: ac, charCount, atlasCols: ATLAS_COLS, atlasRows }
}

// ═══════════════════════════════════════════════════════════════════
// ASCII SHADER
// ═══════════════════════════════════════════════════════════════════

const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAGMENT_SHADER = `
  uniform sampler2D uSceneTexture;
  uniform sampler2D uCharAtlas;
  uniform vec2 uResolution;
  uniform vec2 uGridSize;
  uniform float uCharCount;
  uniform float uAtlasCols;
  uniform float uAtlasRows;
  uniform vec3 uColor;
  uniform float uBrightness;

  varying vec2 vUv;

  void main() {
    vec2 pixelPos = vUv * uResolution;
    vec2 cellIndex = floor(pixelPos / uGridSize);
    vec2 cellUV = fract(pixelPos / uGridSize);

    vec2 cellCenter = (cellIndex + 0.5) * uGridSize / uResolution;
    vec4 sceneColor = texture2D(uSceneTexture, cellCenter);

    float gray = dot(sceneColor.rgb, vec3(0.299, 0.587, 0.114));
    gray = clamp(gray * uBrightness, 0.0, 1.0);

    float charIndex = floor(gray * (uCharCount - 1.0));
    float charCol = mod(charIndex, uAtlasCols);
    float charRow = floor(charIndex / uAtlasCols);

    vec2 atlasUV = vec2(
      (charCol + cellUV.x) / uAtlasCols,
      (charRow + (1.0 - cellUV.y)) / uAtlasRows
    );

    vec4 charPixel = texture2D(uCharAtlas, atlasUV);
    float charAlpha = charPixel.r;
    vec3 finalColor = uColor * charAlpha * (0.3 + 0.7 * gray);

    if (gray < 0.03) finalColor = vec3(0.0);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`

// ═══════════════════════════════════════════════════════════════════
// MAIN FACTORY
// ═══════════════════════════════════════════════════════════════════

export function createAsciiRenderer(options: AsciiRendererOptions = {}): AsciiScene {
  const opts = {
    characters: options.characters ?? DEFAULT_CHARS,
    atlasFont: options.atlasFont ?? '48px Georgia, Palatino, "Times New Roman", serif',
    measureFont: options.measureFont ?? '14px Georgia',
    cellSize: options.cellSize ?? [6, 10] as [number, number],
    color: options.color ?? 0xe6b828,
    brightness: options.brightness ?? 1.6,
    background: options.background ?? 0x000000,
    exposure: options.exposure ?? 2.0,
    mouseInteraction: options.mouseInteraction ?? true,
    mouseStrength: options.mouseStrength ?? 0.5,
    autoRotateSpeed: options.autoRotateSpeed ?? 0.0005,
    bobAmplitude: options.bobAmplitude ?? 0.15,
    fov: options.fov ?? 40,
    cameraDistance: options.cameraDistance,
    container: options.container ?? document.body,
  }

  // Build character atlas
  const atlas = buildCharAtlas(opts.characters, opts.atlasFont, opts.measureFont)
  const charAtlasTexture = new THREE.CanvasTexture(atlas.canvas)
  charAtlasTexture.minFilter = THREE.LinearFilter
  charAtlasTexture.magFilter = THREE.LinearFilter

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false })
  renderer.setPixelRatio(1)
  renderer.setClearColor(opts.background, 1)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = opts.exposure
  opts.container.appendChild(renderer.domElement)

  // Offscreen render target
  const sceneRT = new THREE.WebGLRenderTarget(512, 512)

  // 3D Scene
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(opts.background)

  const camera = new THREE.PerspectiveCamera(opts.fov, 2, 0.1, 1000)
  camera.position.set(0, 0, opts.cameraDistance ?? 5.5)
  camera.lookAt(0, 0, 0)

  // Default lighting (user can modify scene.children)
  scene.add(new THREE.AmbientLight(0xffffff, 0.8))
  const kl = new THREE.DirectionalLight(0xffffff, 2.5); kl.position.set(3, 4, 5); scene.add(kl)
  const fl = new THREE.DirectionalLight(0xffffff, 1.5); fl.position.set(-4, 2, 3); scene.add(fl)
  const bl = new THREE.DirectionalLight(0xffffff, 1.0); bl.position.set(0, 3, -5); scene.add(bl)
  const btl = new THREE.DirectionalLight(0xffffff, 0.6); btl.position.set(0, -3, 2); scene.add(btl)

  // Model group
  const modelGroup = new THREE.Group()
  scene.add(modelGroup)

  // ASCII shader
  const color = new THREE.Color(opts.color)
  const asciiMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uSceneTexture: { value: sceneRT.texture },
      uCharAtlas: { value: charAtlasTexture },
      uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      uGridSize: { value: new THREE.Vector2(opts.cellSize[0], opts.cellSize[1]) },
      uCharCount: { value: atlas.charCount },
      uAtlasCols: { value: atlas.atlasCols },
      uAtlasRows: { value: atlas.atlasRows },
      uColor: { value: color },
      uBrightness: { value: opts.brightness },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
  })

  const asciiScene = new THREE.Scene()
  const asciiCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  asciiScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), asciiMaterial))

  // Mouse state
  let mouseX = 0, mouseY = 0, smoothMX = 0, smoothMY = 0
  const onMouseMove = (e: MouseEvent) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2
  }
  if (opts.mouseInteraction) document.addEventListener('mousemove', onMouseMove)

  // Resize
  const onResize = () => {
    const w = opts.container.clientWidth || window.innerWidth
    const h = opts.container.clientHeight || window.innerHeight
    renderer.setSize(w, h)
    sceneRT.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    asciiMaterial.uniforms.uResolution!.value.set(w, h)
  }
  window.addEventListener('resize', onResize)
  onResize()

  // Animation
  let animCallback: AnimateCallback | null = null
  let rafId: number | null = null
  let lastTime = 0
  let currentMixer: THREE.AnimationMixer | null = null

  const clock = new THREE.Clock()

  function renderLoop(now: number): void {
    const delta = now - lastTime
    lastTime = now

    // Smooth mouse
    smoothMX += (mouseX - smoothMX) * 0.05
    smoothMY += (mouseY - smoothMY) * 0.05

    // Auto-rotation + mouse
    if (opts.autoRotateSpeed) {
      modelGroup.rotation.y = now * opts.autoRotateSpeed + smoothMX * opts.mouseStrength
    } else if (opts.mouseInteraction) {
      modelGroup.rotation.y = smoothMX * opts.mouseStrength
    }
    if (opts.mouseInteraction) {
      modelGroup.rotation.x = smoothMY * opts.mouseStrength * 0.5
    }

    // Bobbing
    if (opts.bobAmplitude) {
      modelGroup.position.y = Math.sin(now * 0.001) * opts.bobAmplitude
    }

    // Update animation mixer
    if (currentMixer) {
      currentMixer.update(clock.getDelta())
    }

    // Custom animation callback
    if (animCallback) animCallback(now, delta, modelGroup)

    // Pass 1: 3D → texture
    renderer.setRenderTarget(sceneRT)
    renderer.render(scene, camera)

    // Pass 2: ASCII shader → screen
    renderer.setRenderTarget(null)
    renderer.render(asciiScene, asciiCamera)

    rafId = requestAnimationFrame(renderLoop)
  }

  // GLTF Loader
  const gltfLoader = new GLTFLoader()
  const dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')
  gltfLoader.setDRACOLoader(dracoLoader)

  async function loadModel(url: string): Promise<LoadedModel> {
    const gltf = await gltfLoader.loadAsync(url)
    const modelScene = gltf.scene

    // Clear previous model
    while (modelGroup.children.length > 0) {
      modelGroup.remove(modelGroup.children[0]!)
    }
    modelGroup.add(modelScene)

    // Auto-fit camera to model bounds
    const box = new THREE.Box3().setFromObject(modelScene)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())

    // Center the model
    modelScene.position.sub(center)

    // Auto camera distance if not specified
    if (!opts.cameraDistance) {
      const maxDim = Math.max(size.x, size.y, size.z)
      const fovRad = (opts.fov * Math.PI) / 180
      camera.position.z = maxDim / (2 * Math.tan(fovRad / 2)) * 1.5
      camera.lookAt(0, 0, 0)
    }

    // Setup animations
    let mixer: THREE.AnimationMixer | null = null
    const actions: THREE.AnimationAction[] = []

    if (gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(modelScene)
      currentMixer = mixer
      for (const clip of gltf.animations) {
        actions.push(mixer.clipAction(clip))
      }
    }

    return {
      scene: modelScene,
      animations: gltf.animations,
      mixer,
      playAnimation(nameOrIndex: string | number) {
        const idx = typeof nameOrIndex === 'string'
          ? gltf.animations.findIndex(a => a.name === nameOrIndex)
          : nameOrIndex
        if (idx >= 0 && idx < actions.length) {
          actions[idx]!.reset().play()
        }
      },
      playAll() {
        for (const action of actions) action.reset().play()
      },
      stopAll() {
        for (const action of actions) action.stop()
      },
    }
  }

  // Public API
  const api: AsciiScene = {
    scene,
    camera,
    modelGroup,
    renderer,

    start() {
      if (rafId !== null) return
      lastTime = performance.now()
      clock.start()
      rafId = requestAnimationFrame(renderLoop)
    },

    stop() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
    },

    loadModel,

    setOptions(newOpts) {
      if (newOpts.color !== undefined) {
        opts.color = newOpts.color
        asciiMaterial.uniforms.uColor!.value.set(newOpts.color)
      }
      if (newOpts.brightness !== undefined) {
        opts.brightness = newOpts.brightness
        asciiMaterial.uniforms.uBrightness!.value = newOpts.brightness
      }
      if (newOpts.cellSize !== undefined) {
        opts.cellSize = newOpts.cellSize
        asciiMaterial.uniforms.uGridSize!.value.set(newOpts.cellSize[0], newOpts.cellSize[1])
      }
      if (newOpts.autoRotateSpeed !== undefined) opts.autoRotateSpeed = newOpts.autoRotateSpeed
      if (newOpts.mouseStrength !== undefined) opts.mouseStrength = newOpts.mouseStrength
      if (newOpts.bobAmplitude !== undefined) opts.bobAmplitude = newOpts.bobAmplitude
      if (newOpts.exposure !== undefined) {
        opts.exposure = newOpts.exposure
        renderer.toneMappingExposure = newOpts.exposure
      }
    },

    onAnimate(callback) {
      animCallback = callback
    },

    dispose() {
      api.stop()
      document.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      sceneRT.dispose()
      charAtlasTexture.dispose()
      opts.container.removeChild(renderer.domElement)
    },
  }

  return api
}
