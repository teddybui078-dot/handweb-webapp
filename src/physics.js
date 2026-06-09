// Particle physics state machine.
//
// IDLE    — points sit on the sphere shell, scaled to the current radius.
// BURST   — a flick injects outward velocities; points fly out and damp.
// REFORM  — after BURST_DURATION the points ease back to the shell and the
//           web fades in, then it returns to IDLE so you can play again.

import { CONFIG } from './config.js'

export const State = { IDLE: 'idle', BURST: 'burst', REFORM: 'reform' }

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

  /** True while erupting or springing back (i.e. not the calm idle orb). */
  get isActive() {
    return this.state !== State.IDLE
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

    const p = sphere.positions
    const b = this.base

    if (this.state === State.BURST) {
      // Integrate positions, decay velocity (frame-rate independent).
      const v = this.vel
      const damp = Math.pow(CONFIG.BURST_DAMPING, dt * 60)
      for (let i = 0; i < p.length; i++) {
        p[i] += v[i] * dt
        v[i] *= damp
      }

      // Fade the web out over the first ~400ms of the eruption.
      const k = Math.min(1, (now - this.burstStart) / 400)
      sphere.setWebOpacity(CONFIG.WEB_OPACITY * (1 - k))

      // After the eruption has had time to breathe, begin springing back.
      if (now - this.burstStart >= CONFIG.BURST_DURATION_MS) {
        this.state = State.REFORM
      }
      return
    }

    // REFORM: ease every particle back to its shell position; fade the web in.
    let maxDist = 0
    const ease = 1 - Math.pow(1 - CONFIG.REFORM_SPEED, dt * 60)
    for (let i = 0; i < this.count; i++) {
      const ix = i * 3
      const tx = b[ix] * radius
      const ty = b[ix + 1] * radius
      const tz = b[ix + 2] * radius
      p[ix] += (tx - p[ix]) * ease
      p[ix + 1] += (ty - p[ix + 1]) * ease
      p[ix + 2] += (tz - p[ix + 2]) * ease
      const d = Math.abs(tx - p[ix]) + Math.abs(ty - p[ix + 1]) + Math.abs(tz - p[ix + 2])
      if (d > maxDist) maxDist = d
    }

    // Web opacity tracks how far reform has progressed.
    const closeness = 1 - Math.min(1, maxDist / (radius * 0.5))
    sphere.setWebOpacity(CONFIG.WEB_OPACITY * closeness)

    // Snap to a clean idle orb once everyone is home.
    if (maxDist < CONFIG.REFORM_DONE_DIST) {
      this.state = State.IDLE
    }
  }
}
