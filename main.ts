import * as THREE from 'three'
import { createAsciiRenderer } from './src/ascii-renderer'

// ═══════════════════════════════════════════════════════════════════
// DEMO: Procedural Bee — using the ASCII renderer library
// ═══════════════════════════════════════════════════════════════════
//
// Usage with a .glb model would be just:
//
//   const ascii = createAsciiRenderer({ color: 0xe6b828 })
//   const model = await ascii.loadModel('/path/to/bee.glb')
//   model.playAll()
//   ascii.start()
//
// Below we build the bee from primitives as a demo.
// ═══════════════════════════════════════════════════════════════════

const ascii = createAsciiRenderer({
  container: document.getElementById('canvas-container')!,
  color: 0xe6b828,
  brightness: 1.6,
  cellSize: [6, 10],
  autoRotateSpeed: 0.0005,
  mouseStrength: 0.5,
  bobAmplitude: 0.15,
  exposure: 2.0,
})

// ── Build bee from Three.js primitives ──────────────────────────────
const { modelGroup, scene } = ascii

const yellowMat = new THREE.MeshStandardMaterial({
  color: 0xffcc00, roughness: 0.4, metalness: 0.1,
  emissive: 0x332200, emissiveIntensity: 0.3
})
const darkMat = new THREE.MeshStandardMaterial({
  color: 0x332200, roughness: 0.5, metalness: 0.05,
  emissive: 0x110800, emissiveIntensity: 0.2
})
const eyeMat = new THREE.MeshStandardMaterial({
  color: 0x222244, roughness: 0.15, metalness: 0.6,
  emissive: 0x050510, emissiveIntensity: 0.3
})
const wingMat = new THREE.MeshStandardMaterial({
  color: 0xeeeeff, roughness: 0.05, metalness: 0.4,
  transparent: true, opacity: 0.4, side: THREE.DoubleSide,
  emissive: 0x222233, emissiveIntensity: 0.4
})
const legMat = new THREE.MeshStandardMaterial({
  color: 0x332200, roughness: 0.6, metalness: 0.0,
  emissive: 0x110800, emissiveIntensity: 0.15
})

// Abdomen
const abdomenGroup = new THREE.Group()
abdomenGroup.position.set(-1.2, 0, 0)
modelGroup.add(abdomenGroup)
for (let i = 0; i < 7; i++) {
  const t = i / 6
  const r = 0.55 * Math.sin(Math.PI * (0.15 + t * 0.7))
  const seg = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), i % 2 === 0 ? yellowMat : darkMat)
  seg.position.x = -t * 2.0
  seg.scale.set(1.0, 0.85, 0.85)
  abdomenGroup.add(seg)
}
const stinger = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.4, 8), darkMat)
stinger.rotation.z = Math.PI / 2; stinger.position.set(-2.3, 0, 0)
abdomenGroup.add(stinger)

// Thorax
const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.65, 20, 16), yellowMat)
thorax.scale.set(1.1, 0.9, 0.9)
modelGroup.add(thorax)

// Petiole
const petiole = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), darkMat)
petiole.position.set(-0.6, 0, 0); petiole.scale.set(1.2, 0.8, 0.8)
modelGroup.add(petiole)

// Head
const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 20, 16), yellowMat)
head.position.set(1.1, 0.05, 0); head.scale.set(0.9, 0.85, 0.8)
modelGroup.add(head)

// Eyes
const eyeGeo = new THREE.SphereGeometry(0.22, 16, 12)
const le = new THREE.Mesh(eyeGeo, eyeMat); le.position.set(1.35, 0.1, 0.25); le.scale.set(0.8, 1, 0.9)
const re = new THREE.Mesh(eyeGeo, eyeMat); re.position.set(1.35, 0.1, -0.25); re.scale.set(0.8, 1, 0.9)
modelGroup.add(le, re)

// Antennae
function createAntenna(zSign: number): THREE.Group {
  const g = new THREE.Group()
  const pts: THREE.Vector3[] = []
  for (let t = 0; t <= 1; t += 0.05)
    pts.push(new THREE.Vector3(t * 1.2, -0.1 - t * 0.6 + t * t * 0.3, zSign * (0.05 + t * 0.35)))
  const curve = new THREE.CatmullRomCurve3(pts)
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.025, 8, false), darkMat))
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), darkMat)
  tip.position.copy(pts[pts.length - 1]!); g.add(tip)
  return g
}
const la = createAntenna(1); la.position.set(1.3, -0.15, 0); modelGroup.add(la)
const ra = createAntenna(-1); ra.position.set(1.3, -0.15, 0); modelGroup.add(ra)

// Wings
function createWing(len: number, w: number): THREE.Mesh {
  const s = new THREE.Shape()
  s.moveTo(0, 0)
  s.bezierCurveTo(len * 0.3, w * 0.6, len * 0.7, w * 0.5, len, 0)
  s.bezierCurveTo(len * 0.7, -w * 0.3, len * 0.3, -w * 0.3, 0, 0)
  return new THREE.Mesh(new THREE.ShapeGeometry(s, 16), wingMat)
}

const wp = {
  fl: new THREE.Group(), fr: new THREE.Group(),
  bl: new THREE.Group(), br: new THREE.Group(),
}
const flW = createWing(2.2, 0.8); flW.rotation.y = -0.3
wp.fl.add(flW); wp.fl.position.set(0.1, 0.55, 0.2); wp.fl.rotation.y = 0.3; modelGroup.add(wp.fl)
const frW = createWing(2.2, 0.8); frW.rotation.y = 0.3; frW.scale.z = -1
wp.fr.add(frW); wp.fr.position.set(0.1, 0.55, -0.2); wp.fr.rotation.y = -0.3; modelGroup.add(wp.fr)
const blW = createWing(1.5, 0.55); blW.rotation.y = -0.4
wp.bl.add(blW); wp.bl.position.set(-0.4, 0.5, 0.15); wp.bl.rotation.y = 0.5; modelGroup.add(wp.bl)
const brW = createWing(1.5, 0.55); brW.rotation.y = 0.4; brW.scale.z = -1
wp.br.add(brW); wp.br.position.set(-0.4, 0.5, -0.15); wp.br.rotation.y = -0.5; modelGroup.add(wp.br)

// Legs
function createLeg(segs: { l: number; r: number }[]): THREE.Group {
  const g = new THREE.Group(); let y = 0
  for (const s of segs) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(s.r, s.r * 0.7, s.l, 6), legMat)
    m.position.y = y - s.l / 2; g.add(m); y -= s.l
  }
  return g
}
for (const cfg of [
  { x: 0.4, z: 0.45, rx: 0.2, rz: -0.5 },
  { x: 0.0, z: 0.5, rx: 0.0, rz: -0.3 },
  { x: -0.4, z: 0.45, rx: -0.2, rz: -0.1 },
]) {
  for (const zs of [1, -1]) {
    const leg = createLeg([{ l: 0.5, r: 0.03 }, { l: 0.6, r: 0.025 }, { l: 0.4, r: 0.02 }])
    leg.position.set(cfg.x, -0.3, cfg.z * zs)
    leg.rotation.x = cfg.rx * zs; leg.rotation.z = cfg.rz * zs
    modelGroup.add(leg)
  }
}

modelGroup.rotation.x = 0.1

// ── Wing animation via onAnimate callback ───────────────────────────
ascii.onAnimate((time) => {
  const a = Math.sin(time * 0.02) * 0.8
  wp.fl.rotation.z = a
  wp.fr.rotation.z = -a
  wp.bl.rotation.z = a * 0.7
  wp.br.rotation.z = -a * 0.7
})

// ── Start! ──────────────────────────────────────────────────────────
ascii.start()
