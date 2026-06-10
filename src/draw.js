// Draw mode — pinch to draw with your fingertip.
//
// Tracks the index fingertip of one hand and, while the hand is pinched
// (thumb + index together = "pen down"), records a stroke that is rendered as
// smooth black ink onto a full-screen 2D canvas. Releasing the pinch lifts the
// pen; the Clear button wipes the canvas. A small ring cursor shows where the
// pen is, filling in while you're drawing.

import { CONFIG } from './config.js'

const INDEX_TIP = 8

/** Perpendicular distance from point p to the line through a–b. */
function perpDist(p, a, b) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  return Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / len
}

/**
 * Ramer–Douglas–Peucker simplification: drops points that sit within `eps` of
 * the line between their neighbours. A near-straight scribble collapses to a
 * clean 2-point line; corners are kept — i.e. it auto-straightens the stroke.
 */
function straighten(pts, eps) {
  if (pts.length < 3) return pts.slice()
  let dmax = 0
  let idx = 0
  const a = pts[0]
  const b = pts[pts.length - 1]
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpDist(pts[i], a, b)
    if (d > dmax) {
      dmax = d
      idx = i
    }
  }
  if (dmax > eps) {
    const left = straighten(pts.slice(0, idx + 1), eps)
    const right = straighten(pts.slice(idx), eps)
    return left.slice(0, -1).concat(right)
  }
  return [a, b]
}

export class FingerDraw {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)

    this.strokes = [] // committed strokes: array of [{x,y}, ...]
    this.current = null // in-progress stroke while pinched
    this.cursor = null // {x,y} fingertip, or null when no hand
    this.pinching = false
    this.smooth = null // smoothed fingertip position

    this.resize()
    window.addEventListener('resize', () => this.resize())
  }

  resize() {
    this.w = window.innerWidth
    this.h = window.innerHeight
    this.canvas.width = this.w * this.dpr
    this.canvas.height = this.h * this.dpr
  }

  clear() {
    this.strokes = []
    this.current = null
  }

  /**
   * Feed one hand (or null). Mirrors x to match the flipped video, smooths the
   * fingertip, and extends/commits strokes based on the pinch state.
   */
  update(hand) {
    if (!hand) {
      this._endStroke()
      this.cursor = null
      this.pinching = false
      this.smooth = null
      return
    }

    const tip = hand.landmarks[INDEX_TIP]
    const x = (1 - tip.x) * this.w // mirror flip to match the displayed video
    const y = tip.y * this.h

    if (!this.smooth) this.smooth = { x, y }
    else {
      this.smooth.x += (x - this.smooth.x) * CONFIG.DRAW_SMOOTHING
      this.smooth.y += (y - this.smooth.y) * CONFIG.DRAW_SMOOTHING
    }
    this.cursor = { x: this.smooth.x, y: this.smooth.y }
    // pen is down only on a FULL pinch, not a loose one
    this.pinching = hand.pinchRatio < CONFIG.DRAW_PINCH

    if (this.pinching) {
      if (!this.current) {
        this.current = []
        this.strokes.push(this.current)
      }
      const last = this.current[this.current.length - 1]
      if (!last || Math.hypot(this.cursor.x - last.x, this.cursor.y - last.y) > CONFIG.DRAW_MIN_DIST) {
        this.current.push({ x: this.cursor.x, y: this.cursor.y })
      }
    } else {
      this._endStroke()
    }
  }

  _endStroke() {
    if (this.current) {
      if (this.current.length < 2) {
        // discard taps (single-point strokes) so they don't leave stray dots
        this.strokes.pop()
      } else {
        // auto-straighten the finished stroke
        this.strokes[this.strokes.length - 1] = straighten(this.current, CONFIG.DRAW_STRAIGHTEN)
      }
    }
    this.current = null
  }

  /** Build a Path2D for a stroke (smoothed while live, straight when finished). */
  _strokePath(s) {
    const path = new Path2D()
    path.moveTo(s[0].x, s[0].y)
    if (s === this.current) {
      for (let i = 1; i < s.length - 1; i++) {
        const mx = (s[i].x + s[i + 1].x) / 2
        const my = (s[i].y + s[i + 1].y) / 2
        path.quadraticCurveTo(s[i].x, s[i].y, mx, my)
      }
      path.lineTo(s[s.length - 1].x, s[s.length - 1].y)
    } else {
      for (let i = 1; i < s.length; i++) path.lineTo(s[i].x, s[i].y)
    }
    return path
  }

  render() {
    const ctx = this.ctx
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.clearRect(0, 0, this.w, this.h)
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'

    // Each stroke: a black outline with a white glow, then a white core on top.
    for (const s of this.strokes) {
      if (s.length < 2) continue
      const path = this._strokePath(s)

      ctx.shadowColor = 'rgba(255,255,255,0.9)'
      ctx.shadowBlur = CONFIG.DRAW_GLOW
      ctx.strokeStyle = CONFIG.DRAW_OUTLINE_COLOR
      ctx.lineWidth = CONFIG.DRAW_WIDTH + CONFIG.DRAW_OUTLINE * 2
      ctx.stroke(path)

      ctx.shadowBlur = 0
      ctx.strokeStyle = CONFIG.DRAW_CORE_COLOR
      ctx.lineWidth = CONFIG.DRAW_WIDTH
      ctx.stroke(path)
    }

    // fingertip cursor: glowing white dot with a black ring (filled while drawing)
    if (this.cursor) {
      const r = this.pinching ? CONFIG.DRAW_WIDTH / 2 + 1 : 9
      ctx.shadowColor = 'rgba(255,255,255,0.9)'
      ctx.shadowBlur = this.pinching ? CONFIG.DRAW_GLOW : 6
      ctx.beginPath()
      ctx.arc(this.cursor.x, this.cursor.y, r, 0, Math.PI * 2)
      ctx.fillStyle = this.pinching ? CONFIG.DRAW_CORE_COLOR : 'rgba(255,255,255,0.25)'
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.lineWidth = 2.5
      ctx.strokeStyle = CONFIG.DRAW_OUTLINE_COLOR
      ctx.stroke()
    }
  }
}
