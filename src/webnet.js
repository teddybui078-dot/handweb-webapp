// Web mode — a living net strung between the two hands.
//
// The net is a grid of glowing nodes. Its left column is anchored along hand A
// (middle-fingertip → wrist), its right column along hand B, and the interior
// is bilinearly interpolated across the gap — so the whole web grips both hands
// and stretches, shrinks, and tilts as you move them. A center-weighted sag and
// a little per-node shimmer make it read as a slack, living web rather than a
// rigid mesh.
//
// It reuses the sphere's renderer/scene/camera and screen→world mapping, and
// only differs in geometry, so both modes share one WebGL context.

import * as THREE from 'three'
import { CONFIG } from './config.js'
import { makeGlowTexture } from './sphere.js'

const TOP_LM = 12 // middle fingertip — the "top" anchor of a raised hand
const BOTTOM_LM = 0 // wrist — the "bottom" anchor

export class WebNet {
  /** @param {import('./sphere.js').WebSphere} sphere shared renderer host */
  constructor(sphere) {
    this.sphere = sphere
    this.cols = CONFIG.NET_COLS
    this.rows = CONFIG.NET_ROWS
    this.count = this.cols * this.rows
    this.initialized = false

    this.group = new THREE.Group()
    this.group.visible = false
    sphere.scene.add(this.group)

    this.positions = new Float32Array(this.count * 3) // smoothed, rendered
    this.target = new Float32Array(this.count * 3) // latest hand-driven grid
    this.phase = new Float32Array(this.count) // per-node shimmer offset
    for (let i = 0; i < this.count; i++) this.phase[i] = Math.random() * Math.PI * 2

    // ---- nodes ----
    const pGeo = new THREE.BufferGeometry()
    pGeo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.pointsGeo = pGeo
    this.points = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({
        size: CONFIG.NET_POINT_SIZE / 100,
        map: makeGlowTexture(),
        color: new THREE.Color(CONFIG.COLOR_OUTER),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      })
    )
    this.group.add(this.points)

    // ---- strands: connect each node to its right and down neighbour ----
    const idx = (r, c) => r * this.cols + c
    this.edges = []
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (c + 1 < this.cols) this.edges.push(idx(r, c), idx(r, c + 1))
        if (r + 1 < this.rows) this.edges.push(idx(r, c), idx(r + 1, c))
      }
    }
    this.linePositions = new Float32Array(this.edges.length * 3)
    const lGeo = new THREE.BufferGeometry()
    lGeo.setAttribute('position', new THREE.BufferAttribute(this.linePositions, 3))
    this.linesGeo = lGeo
    this.lines = new THREE.LineSegments(
      lGeo,
      new THREE.LineBasicMaterial({
        color: new THREE.Color(CONFIG.WEB_COLOR),
        transparent: true,
        opacity: CONFIG.NET_LINE_OPACITY,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    )
    this.group.add(this.lines)
  }

  setVisible(v) {
    this.group.visible = v
  }

  /** Re-snap to the hands next frame (call when (re)entering web mode). */
  reset() {
    this.initialized = false
  }

  /** Mirrored normalized landmark → world position on the z=0 plane. */
  _toWorld(lm) {
    const ndcX = (1 - lm.x) * 2 - 1
    const ndcY = -(lm.y * 2 - 1)
    return this.sphere.ndcToWorld(ndcX, ndcY)
  }

  /**
   * Rebuild the net from two hands. No-op (and re-arms a snap) with < 2 hands.
   */
  update(hands, now, dt) {
    if (hands.length < 2) {
      this.initialized = false
      return
    }

    // Order hands left→right in world space so the net never flips.
    let a = hands[0]
    let b = hands[1]
    if (this._toWorld(a.centroid).x > this._toWorld(b.centroid).x) {
      const tmp = a
      a = b
      b = tmp
    }

    const aTop = this._toWorld(a.landmarks[TOP_LM])
    const aBot = this._toWorld(a.landmarks[BOTTOM_LM])
    const bTop = this._toWorld(b.landmarks[TOP_LM])
    const bBot = this._toWorld(b.landmarks[BOTTOM_LM])

    const tgt = this.target
    for (let r = 0; r < this.rows; r++) {
      const v = this.rows > 1 ? r / (this.rows - 1) : 0
      const lx = aTop.x + (aBot.x - aTop.x) * v // left edge follows hand A
      const ly = aTop.y + (aBot.y - aTop.y) * v
      const rx = bTop.x + (bBot.x - bTop.x) * v // right edge follows hand B
      const ry = bTop.y + (bBot.y - bTop.y) * v
      for (let c = 0; c < this.cols; c++) {
        const u = this.cols > 1 ? c / (this.cols - 1) : 0
        const i = r * this.cols + c
        let x = lx + (rx - lx) * u
        let y = ly + (ry - ly) * u
        // bow downward, strongest mid-span, pinned at the hand-anchored edges
        y -= Math.sin(Math.PI * u) * CONFIG.NET_SAG
        // gentle living shimmer
        const sh = Math.sin(now / 600 + this.phase[i]) * CONFIG.NET_SHIMMER
        x += sh * 0.3
        y += sh
        tgt[i * 3] = x
        tgt[i * 3 + 1] = y
        tgt[i * 3 + 2] = 0
      }
    }

    const p = this.positions
    if (!this.initialized) {
      p.set(tgt) // snap on the first frame to avoid a sweep from the origin
      this.initialized = true
    } else {
      const k = 1 - Math.pow(1 - CONFIG.NET_SMOOTHING, dt * 60)
      for (let j = 0; j < p.length; j++) p[j] += (tgt[j] - p[j]) * k
    }

    this._syncLines()
    this.pointsGeo.attributes.position.needsUpdate = true
  }

  _syncLines() {
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

  /** Master fade for the no-hands transition. */
  applyMasterOpacity(m) {
    this.points.material.opacity = m
    this.lines.material.opacity = CONFIG.NET_LINE_OPACITY * m
  }
}
