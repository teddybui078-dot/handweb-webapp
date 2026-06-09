// Particle physics state machine.
//
// IDLE  — points sit on the sphere shell, scaled to the current radius.
// BURST — a flick injects outward velocities; points fly out and damp.
//
// (The REFORM state that springs the particles back is added next feature.)

import { CONFIG } from './config.js'

export const State = { IDLE: 'idle', BURST: 'burst' }

export class BurstSystem {
  /**
   * @param {number} count particle count
   * @param {Float32Array} base unit-sphere direction per particle (n*3)
   */
  constructor(count, base) {
    this.count = count
    this.base = base
    this.vel = new Float32Array(count * 3)
    this.state = State.IDLE
    this.burstStart = 0
  }

  get isBursting() {
    return this.state === State.BURST
  }

  /** Seed outward velocities and switch to BURST. */
  trigger(positions, radius, now) {
    const b = this.base
    const v = this.vel
    for (let i = 0; i < this.count; i++) {
      const ix = i * 3
      const dx = b[ix]
      const dy = b[ix + 1]
      const dz = b[ix + 2]
      // start exactly on the current shell so the eruption reads cleanly
      positions[ix] = dx * radius
      positions[ix + 1] = dy * radius
      positions[ix + 2] = dz * radius
      const speed = CONFIG.BURST_SPEED * (0.6 + Math.random() * 0.8)
      v[ix] = dx * speed + (Math.random() - 0.5) * CONFIG.BURST_JITTER
      v[ix + 1] = dy * speed + (Math.random() - 0.5) * CONFIG.BURST_JITTER
      v[ix + 2] = dz * speed + (Math.random() - 0.5) * CONFIG.BURST_JITTER
    }
    this.state = State.BURST
    this.burstStart = now
  }

  /**
   * Advance one frame. In IDLE the sphere is scaled to `radius`; in BURST the
   * positions integrate outward and the web fades as the orb disperses.
   * @param {import('./sphere.js').WebSphere} sphere
   * @param {number} radius current target radius
   * @param {number} now timestamp (ms)
   * @param {number} dt delta time (seconds)
   */
  update(sphere, radius, now, dt) {
    if (this.state === State.IDLE) {
      sphere.applyRadius(radius)
      sphere.setWebOpacity(CONFIG.WEB_OPACITY)
      return
    }

    // BURST: integrate positions, decay velocity (frame-rate independent).
    const p = sphere.positions
    const v = this.vel
    const damp = Math.pow(CONFIG.BURST_DAMPING, dt * 60)
    for (let i = 0; i < p.length; i++) {
      p[i] += v[i] * dt
      v[i] *= damp
    }

    // Fade the web out over the first ~400ms of the eruption.
    const k = Math.min(1, (now - this.burstStart) / 400)
    sphere.setWebOpacity(CONFIG.WEB_OPACITY * (1 - k))
  }
}
