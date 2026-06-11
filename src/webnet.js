// Web mode — a 3D spider web strung between the two hands.
//
// Ten fingertips (five per hand) are the outer anchor points, like a web spun
// between twigs. A hub sits at their center; radial "spokes" run from the hub
// out to each fingertip, and concentric "rings" weave between neighbouring
// spokes — the classic orb-weaver structure. A wave travels outward along the
// spokes (z-depth), so the whole web undulates in 3D instead of sitting flat.
//
// Anchors are ordered in a fixed cycle (hand A's fingers, then hand B's in
// reverse) so the spoke assignment is stable frame to frame and the smoothing
// stays fluid. It reuses the sphere's renderer/scene/camera and glow sprite.

import * as THREE from 'three'
import { CONFIG } from './config.js'
import { makeGlowTexture } from './sphere.js'
import { normToNDC } from './coords.js'

const FINGERTIPS = [4, 8, 12, 16, 20] // thumb, index, middle, ring, pinky
const BASE_ANCHORS = FINGERTIPS.length * 2 // ten fingertip anchors (two hands)

export class WebNet {
  /** @param {import('./sphere.js').WebSphere} sphere shared renderer host */
  constructor(sphere) {
    this.sphere = sphere
    this.rings = CONFIG.NET_RINGS
    // extra interpolated spokes between each fingertip pair → denser web
    this.spokes = BASE_ANCHORS * (1 + CONFIG.NET_SUBSPOKES)
    this.count = 1 + this.spokes * this.rings // hub + spoke/ring nodes
    this.initialized = false

    this.group = new THREE.Group()
    this.group.visible = false
    sphere.scene.add(this.group)

    this.positions = new Float32Array(this.count * 3) // smoothed, rendered
    this.target = new Float32Array(this.count * 3) // latest hand-driven web
    this.phase = new Float32Array(this.count)
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
        color: new THREE.Color('#ffffff'),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      })
    )
    this.group.add(this.points)

    // ---- strands: spokes (hub -> fingertip) + rings (between spokes) ----
    const node = (spoke, ring) => 1 + spoke * this.rings + ring
    this.edges = []
    for (let s = 0; s < this.spokes; s++) {
      this.edges.push(0, node(s, 0)) // hub -> innermost
      for (let r = 0; r < this.rings - 1; r++) this.edges.push(node(s, r), node(s, r + 1))
    }
    for (let r = 0; r < this.rings; r++) {
      for (let s = 0; s < this.spokes; s++) {
        this.edges.push(node(s, r), node((s + 1) % this.spokes, r)) // ring loop
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

  /** Normalized landmark → world position on the z=0 plane (cover-aware). */
  _toWorld(lm, m) {
    const ndc = normToNDC(lm.x, lm.y, m)
    return this.sphere.ndcToWorld(ndc.x, ndc.y)
  }

  /** Rebuild the web from two hands. No-op (re-arms a snap) with < 2 hands. */
  update(hands, now, dt, m) {
    if (hands.length < 2) {
      this.initialized = false
      return
    }

    // Order hands left→right so the anchor cycle is stable.
    let a = hands[0]
    let b = hands[1]
    if (this._toWorld(a.centroid, m).x > this._toWorld(b.centroid, m).x) {
      const tmp = a
      a = b
      b = tmp
    }

    // Fixed anchor cycle: hand A's fingertips, then hand B's in reverse — so
    // the ring loops wrap cleanly around both hands.
    const base = []
    for (const i of FINGERTIPS) base.push(this._toWorld(a.landmarks[i], m))
    for (let k = FINGERTIPS.length - 1; k >= 0; k--) base.push(this._toWorld(b.landmarks[FINGERTIPS[k]], m))

    // Insert interpolated anchors between each consecutive pair (extra spokes).
    const sub = CONFIG.NET_SUBSPOKES
    const anchors = []
    for (let i = 0; i < base.length; i++) {
      anchors.push(base[i])
      const next = base[(i + 1) % base.length]
      for (let s = 1; s <= sub; s++) {
        const f = s / (sub + 1)
        anchors.push({ x: base[i].x + (next.x - base[i].x) * f, y: base[i].y + (next.y - base[i].y) * f })
      }
    }

    // Hub = centroid of the anchors.
    let hx = 0
    let hy = 0
    for (const p of anchors) {
      hx += p.x
      hy += p.y
    }
    hx /= anchors.length
    hy /= anchors.length

    const tgt = this.target
    const t = now / 1000
    // hub node bobs gently in depth
    tgt[0] = hx
    tgt[1] = hy
    tgt[2] = Math.sin(t * CONFIG.NET_WAVE_SPEED) * CONFIG.NET_WAVE_AMP * 0.25

    for (let s = 0; s < this.spokes; s++) {
      const anchor = anchors[s]
      const spokePhase = (s / this.spokes) * Math.PI * 2
      const offX0 = anchor.x - hx
      const offY0 = anchor.y - hy
      for (let r = 0; r < this.rings; r++) {
        const f = (r + 1) / this.rings // 0→1 along the spoke (hub→fingertip)
        const i = 1 + s * this.rings + r
        // envelope: 0 at the hub and the fingertip, 1 mid-spoke — keeps the web
        // anchored to both ends while the middle is free to animate
        const env = Math.sin(f * Math.PI)

        // swirl: rotate the offset around the hub, winding the spokes into
        // spirals that oscillate back and forth over time
        const swirl = Math.sin(t * CONFIG.NET_SWIRL_SPEED + spokePhase) * CONFIG.NET_SWIRL_AMP * env
        const cs = Math.cos(swirl)
        const sn = Math.sin(swirl)
        const offX = offX0 * cs - offY0 * sn
        const offY = offX0 * sn + offY0 * cs

        // radial breathing of the rings (zero at the anchored ends)
        const ff = f + Math.sin(t * CONFIG.NET_PULSE_SPEED - f * 3 + spokePhase) * CONFIG.NET_PULSE_AMP * env

        // wave travels outward along the spoke (z-depth), fading in toward hub
        const z = Math.sin(f * Math.PI * CONFIG.NET_WAVES - t * CONFIG.NET_WAVE_SPEED + spokePhase) * CONFIG.NET_WAVE_AMP * f
        const sh = Math.sin(t * 1.7 + this.phase[i]) * CONFIG.NET_SHIMMER

        tgt[i * 3] = hx + offX * ff + sh
        tgt[i * 3 + 1] = hy + offY * ff + sh
        tgt[i * 3 + 2] = z
      }
    }

    const p = this.positions
    if (!this.initialized) {
      p.set(tgt)
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
