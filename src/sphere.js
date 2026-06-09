// The particle web-sphere.
//
// A hollow shell of points distributed with a Fibonacci spiral (even spacing),
// plus a constellation of thin lines connecting each point to its nearest
// neighbours. Neighbour connectivity is computed ONCE on the unit sphere and
// then the line buffer is refreshed every frame from the live point positions
// — so the web stretches naturally when particles scale or explode without any
// per-frame neighbour search.

import * as THREE from 'three'
import { CONFIG } from './config.js'

/** Generate N evenly spaced points on a unit sphere (Fibonacci spiral). */
function fibonacciSphere(n) {
  const pts = new Float32Array(n * 3)
  const golden = Math.PI * (3 - Math.sqrt(5)) // golden angle
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2 // 1 → -1
    const r = Math.sqrt(1 - y * y)
    const theta = golden * i
    pts[i * 3] = Math.cos(theta) * r
    pts[i * 3 + 1] = y
    pts[i * 3 + 2] = Math.sin(theta) * r
  }
  return pts
}

/**
 * Build deduped k-nearest-neighbour edges on the base unit sphere.
 * Returns a flat array of vertex-index pairs [i0,j0, i1,j1, ...].
 */
function buildEdges(base, n, k) {
  const edges = []
  const seen = new Set()
  const cand = new Array(n)
  for (let i = 0; i < n; i++) {
    const ax = base[i * 3]
    const ay = base[i * 3 + 1]
    const az = base[i * 3 + 2]
    for (let j = 0; j < n; j++) {
      if (j === i) {
        cand[j] = Infinity
        continue
      }
      const dx = ax - base[j * 3]
      const dy = ay - base[j * 3 + 1]
      const dz = az - base[j * 3 + 2]
      cand[j] = dx * dx + dy * dy + dz * dz
    }
    // pick k smallest
    for (let s = 0; s < k; s++) {
      let best = -1
      let bestD = Infinity
      for (let j = 0; j < n; j++) {
        if (cand[j] < bestD) {
          bestD = cand[j]
          best = j
        }
      }
      if (best === -1) break
      cand[best] = Infinity
      const a = Math.min(i, best)
      const b = Math.max(i, best)
      const key = a * n + b
      if (!seen.has(key)) {
        seen.add(key)
        edges.push(a, b)
      }
    }
  }
  return edges
}

/** Soft circular glow sprite for the points (emerald falloff). Exported so the
 *  web-net mode can reuse the exact same sparkle. */
export function makeGlowTexture() {
  const size = 64
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(210,255,235,0.85)')
  g.addColorStop(0.5, 'rgba(120,240,180,0.35)')
  g.addColorStop(1, 'rgba(46,230,166,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export class WebSphere {
  constructor(canvas) {
    const n = CONFIG.PARTICLE_COUNT
    this.count = n

    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    this.renderer.setClearColor(0x000000, 0) // transparent — camera feed shows through
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
    this.camera.position.z = CONFIG.CAMERA_Z

    this.group = new THREE.Group()
    this.scene.add(this.group)

    // base unit-sphere positions + live working positions
    this.base = fibonacciSphere(n)
    this.positions = new Float32Array(this.base) // mutated each frame
    this.radius = CONFIG.RADIUS_DEFAULT

    // ---- points ----
    const colors = new Float32Array(n * 3)
    const inner = new THREE.Color(CONFIG.COLOR_INNER)
    const outer = new THREE.Color(CONFIG.COLOR_OUTER)
    const tmp = new THREE.Color()
    for (let i = 0; i < n; i++) {
      // biased random mix gives sparkle variety, mostly emerald with white pops
      const t = Math.pow(Math.random(), 2) * CONFIG.COLOR_MIX
      tmp.copy(outer).lerp(inner, t)
      colors[i * 3] = tmp.r
      colors[i * 3 + 1] = tmp.g
      colors[i * 3 + 2] = tmp.b
    }
    const pGeo = new THREE.BufferGeometry()
    pGeo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    pGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    this.pointsGeo = pGeo

    const pMat = new THREE.PointsMaterial({
      size: CONFIG.PARTICLE_SIZE / 100,
      map: makeGlowTexture(),
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })
    this.points = new THREE.Points(pGeo, pMat)
    this.group.add(this.points)

    // ---- web lines ----
    this.edges = buildEdges(this.base, n, CONFIG.WEB_NEIGHBORS)
    this.linePositions = new Float32Array(this.edges.length * 3) // 2 verts per edge already in pairs
    const lGeo = new THREE.BufferGeometry()
    lGeo.setAttribute('position', new THREE.BufferAttribute(this.linePositions, 3))
    this.linesGeo = lGeo
    const lMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(CONFIG.WEB_COLOR),
      transparent: true,
      opacity: CONFIG.WEB_OPACITY,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    this.lines = new THREE.LineSegments(lGeo, lMat)
    this.group.add(this.lines)

    this.resize()
    window.addEventListener('resize', () => this.resize())
  }

  resize() {
    const w = window.innerWidth
    const h = window.innerHeight
    this.renderer.setSize(w, h)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  /** Scale the base sphere into `positions` at the current radius (idle look). */
  applyRadius(r) {
    this.radius = r
    const p = this.positions
    const b = this.base
    for (let i = 0; i < p.length; i++) p[i] = b[i] * r
  }

  /** Rebuild the line buffer from the current point positions. */
  syncLines() {
    const lp = this.linePositions
    const p = this.positions
    const e = this.edges
    for (let k = 0; k < e.length; k++) {
      const v = e[k] * 3
      lp[k * 3] = p[v]
      lp[k * 3 + 1] = p[v + 1]
      lp[k * 3 + 2] = p[v + 2]
    }
    this.linesGeo.attributes.position.needsUpdate = true
  }

  /** Position the whole orb in world space (set by hand tracking). */
  setWorldPosition(x, y, z = 0) {
    this.group.position.set(x, y, z)
  }

  /**
   * Convert normalized-device coordinates (-1..1) to world coordinates on the
   * z=0 plane, accounting for the camera FOV and aspect. Lets hand positions
   * (in screen space) map onto where the orb should sit in the 3D scene.
   */
  ndcToWorld(ndcX, ndcY) {
    const vFov = (this.camera.fov * Math.PI) / 180
    const h = 2 * Math.tan(vFov / 2) * this.camera.position.z
    const w = h * this.camera.aspect
    return { x: ndcX * (w / 2), y: ndcY * (h / 2) }
  }

  /** Set the web opacity (used during burst/reform fades). */
  setWebOpacity(o) {
    this.lines.material.opacity = o
  }

  /** Show or hide the whole orb (mode switching). */
  setVisible(v) {
    this.group.visible = v
  }

  /** Master fade applied on top of per-frame opacities (no-hands fade-out). */
  applyMasterOpacity(m) {
    this.points.material.opacity = m
    this.lines.material.opacity *= m
  }

  /** Push the live positions buffer to the GPU. */
  flushPoints() {
    this.pointsGeo.attributes.position.needsUpdate = true
  }

  render(rotateY = 0) {
    if (rotateY) this.group.rotation.y += rotateY
    this.renderer.render(this.scene, this.camera)
  }
}
