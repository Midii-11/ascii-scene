import * as THREE from 'three'
import { createAsciiRenderer } from '../src/ascii-renderer'

const container = document.getElementById('ascii-bg')
if (!container) throw new Error('#ascii-bg not found')

const ascii = createAsciiRenderer({
  container,
  color: 0xe6b828,
  brightness: 1.4,
  cellSize: [5, 9],
  autoRotateSpeed: 0.0003,
  mouseStrength: 0.4,
  bobAmplitude: 0.12,
  exposure: 1.8,
})

const { modelGroup } = ascii

// ── Materials ───────────────────────────────────────────
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
  color: 0x332200, roughness: 0.6, emissive: 0x110800, emissiveIntensity: 0.15
})

// ── Abdomen ─────────────────────────────────────────────
const abdomenGroup = new THREE.Group()
abdomenGroup.position.set(-1.2, 0, 0)
modelGroup.add(abdomenGroup)
for (let i = 0; i < 7; i++) {
  const t = i / 6
  const r = 0.55 * Math.sin(Math.PI * (0.15 + t * 0.7))
  const seg = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), i % 2 === 0 ? yellowMat : darkMat)
  seg.position.x = -t * 2
  seg.scale.set(1, 0.85, 0.85)
  abdomenGroup.add(seg)
}
const stinger = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.4, 8), darkMat)
stinger.rotation.z = Math.PI / 2
stinger.position.set(-2.3, 0, 0)
abdomenGroup.add(stinger)

// ── Thorax ──────────────────────────────────────────────
const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.65, 20, 16), yellowMat)
thorax.scale.set(1.1, 0.9, 0.9)
modelGroup.add(thorax)

// ── Petiole ─────────────────────────────────────────────
const petiole = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), darkMat)
petiole.position.set(-0.6, 0, 0)
petiole.scale.set(1.2, 0.8, 0.8)
modelGroup.add(petiole)

// ── Head ────────────────────────────────────────────────
const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 20, 16), yellowMat)
head.position.set(1.1, 0.05, 0)
head.scale.set(0.9, 0.85, 0.8)
modelGroup.add(head)

// ── Eyes ────────────────────────────────────────────────
const eyeGeo = new THREE.SphereGeometry(0.22, 16, 12)
const leftEye = new THREE.Mesh(eyeGeo, eyeMat)
leftEye.position.set(1.35, 0.1, 0.25); leftEye.scale.set(0.8, 1, 0.9)
modelGroup.add(leftEye)
const rightEye = new THREE.Mesh(eyeGeo, eyeMat)
rightEye.position.set(1.35, 0.1, -0.25); rightEye.scale.set(0.8, 1, 0.9)
modelGroup.add(rightEye)

// ── Antennae ────────────────────────────────────────────
function createAntenna(zSign: number): THREE.Group {
  const group = new THREE.Group()
  const pts: THREE.Vector3[] = []
  for (let t = 0; t <= 1; t += 0.05) {
    pts.push(new THREE.Vector3(t * 1.2, -0.1 - t * 0.6 + t * t * 0.3, zSign * (0.05 + t * 0.35)))
  }
  const curve = new THREE.CatmullRomCurve3(pts)
  group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.025, 8, false), darkMat))
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), darkMat)
  tip.position.copy(pts[pts.length - 1]!)
  group.add(tip)
  return group
}
const lAnt = createAntenna(1); lAnt.position.set(1.3, -0.15, 0); modelGroup.add(lAnt)
const rAnt = createAntenna(-1); rAnt.position.set(1.3, -0.15, 0); modelGroup.add(rAnt)

// ── Wings ───────────────────────────────────────────────
function createWing(length: number, width: number): THREE.Mesh {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.bezierCurveTo(length * 0.3, width * 0.6, length * 0.7, width * 0.5, length, 0)
  shape.bezierCurveTo(length * 0.7, -width * 0.3, length * 0.3, -width * 0.3, 0, 0)
  return new THREE.Mesh(new THREE.ShapeGeometry(shape, 16), wingMat)
}

const wingPivots = {
  fl: new THREE.Group(), fr: new THREE.Group(),
  bl: new THREE.Group(), br: new THREE.Group(),
}

const flW = createWing(2.2, 0.8); flW.rotation.y = -0.3
wingPivots.fl.add(flW); wingPivots.fl.position.set(0.1, 0.55, 0.2); wingPivots.fl.rotation.y = 0.3
modelGroup.add(wingPivots.fl)

const frW = createWing(2.2, 0.8); frW.rotation.y = 0.3; frW.scale.z = -1
wingPivots.fr.add(frW); wingPivots.fr.position.set(0.1, 0.55, -0.2); wingPivots.fr.rotation.y = -0.3
modelGroup.add(wingPivots.fr)

const blW = createWing(1.5, 0.55); blW.rotation.y = -0.4
wingPivots.bl.add(blW); wingPivots.bl.position.set(-0.4, 0.5, 0.15); wingPivots.bl.rotation.y = 0.5
modelGroup.add(wingPivots.bl)

const brW = createWing(1.5, 0.55); brW.rotation.y = 0.4; brW.scale.z = -1
wingPivots.br.add(brW); wingPivots.br.position.set(-0.4, 0.5, -0.15); wingPivots.br.rotation.y = -0.5
modelGroup.add(wingPivots.br)

// ── Legs ────────────────────────────────────────────────
function createLeg(segs: { l: number; r: number }[]): THREE.Group {
  const g = new THREE.Group()
  let y = 0
  for (const s of segs) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(s.r, s.r * 0.7, s.l, 6), legMat)
    m.position.y = y - s.l / 2
    g.add(m)
    y -= s.l
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
    leg.rotation.x = cfg.rx * zs
    leg.rotation.z = cfg.rz * zs
    modelGroup.add(leg)
  }
}

modelGroup.rotation.x = 0.1

// ── Wing animation ──────────────────────────────────────
ascii.onAnimate((time) => {
  const a = Math.sin(time * 0.02) * 0.8
  wingPivots.fl.rotation.z = a
  wingPivots.fr.rotation.z = -a
  wingPivots.bl.rotation.z = a * 0.7
  wingPivots.br.rotation.z = -a * 0.7
})

ascii.start()
