// Hand tracking + gesture math.
//
// Wraps MediaPipe Tasks-Vision HandLandmarker (up to two hands) and exposes
// pure helper functions that turn raw 21-point landmark sets into the higher
// level signals the experience needs: palm centroid, hand span, pinch ratio,
// finger-extension count, and open-palm / pinched booleans.
//
// MediaPipe landmark indices:
//   0 wrist
//   thumb  1 CMC  2 MCP  3 IP   4 TIP
//   index  5 MCP  6 PIP  7 DIP  8 TIP
//   middle 9 MCP 10 PIP 11 DIP 12 TIP
//   ring  13 MCP 14 PIP 15 DIP 16 TIP
//   pinky 17 MCP 18 PIP 19 DIP 20 TIP
//
// Coordinates are normalized [0,1] in the *unmirrored* camera frame
// (x → right, y → down). The display video is CSS-mirrored, so consumers that
// draw on screen must flip x: screenX = (1 - x) * width.

import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import { CONFIG } from './config.js'

const WASM_BASE =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

// ---- pure geometry helpers -------------------------------------------------

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

/** Average position of an array of landmark points. */
function mean(points) {
  let x = 0
  let y = 0
  for (const p of points) {
    x += p.x
    y += p.y
  }
  return { x: x / points.length, y: y / points.length }
}

const FINGERS = [
  { tip: 8, pip: 6 }, // index
  { tip: 12, pip: 10 }, // middle
  { tip: 16, pip: 14 }, // ring
  { tip: 20, pip: 18 }, // pinky
]

/**
 * Reduce one hand's 21 landmarks into the signals the app reacts to.
 * @param {Array<{x:number,y:number,z:number}>} lm 21 landmarks
 */
export function analyzeHand(lm, handedness = 'Unknown') {
  const wrist = lm[0]
  const middleMcp = lm[9]

  // Palm center: midpoint of wrist and middle-finger base — stable under
  // finger motion. Hand span normalises every other distance so the signals
  // are independent of how close the hand is to the camera.
  const centroid = mean([wrist, middleMcp])
  const handSpan = Math.max(dist(wrist, middleMcp), 1e-4)

  // A finger is extended when its tip is farther from the wrist than its PIP.
  let extendedCount = 0
  for (const f of FINGERS) {
    if (dist(lm[f.tip], wrist) > dist(lm[f.pip], wrist)) extendedCount++
  }

  const pinchRatio = dist(lm[4], lm[8]) / handSpan

  return {
    handedness,
    centroid,
    handSpan,
    extendedCount,
    pinchRatio,
    isPinched: pinchRatio < CONFIG.PINCH_THRESHOLD,
    isOpen: extendedCount >= CONFIG.OPEN_FINGERS_REQUIRED,
    landmarks: lm,
  }
}

/** Normalized distance between two hand centroids (0..~1 across the frame). */
export function handDistance(a, b) {
  return dist(a.centroid, b.centroid)
}

/** Midpoint between two hand centroids. */
export function handsMidpoint(a, b) {
  return { x: (a.centroid.x + b.centroid.x) / 2, y: (a.centroid.y + b.centroid.y) / 2 }
}

// ---- tracker ---------------------------------------------------------------

export class HandTracker {
  constructor() {
    this.landmarker = null
    this.lastVideoTime = -1
    this.hands = [] // array of analyzeHand() results, 0..2 entries
  }

  async init() {
    const fileset = await FilesetResolver.forVisionTasks(WASM_BASE)
    this.landmarker = await HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    })
    return this
  }

  /**
   * Detect hands in the current video frame. Cheap to call every rAF; it
   * skips when the video time hasn't advanced.
   * @param {HTMLVideoElement} video
   * @param {number} timestampMs monotonically increasing timestamp
   * @returns {Array} this.hands (analyzed)
   */
  detect(video, timestampMs) {
    if (!this.landmarker || video.readyState < 2) return this.hands
    if (video.currentTime === this.lastVideoTime) return this.hands
    this.lastVideoTime = video.currentTime

    const result = this.landmarker.detectForVideo(video, timestampMs)
    const lmSets = result?.landmarks || []
    this.hands = lmSets.map((lm, i) =>
      analyzeHand(lm, result?.handedness?.[i]?.[0]?.categoryName || `hand${i}`)
    )
    return this.hands
  }
}

// ---- flick detection -------------------------------------------------------

/**
 * Detects the "flick": a hand that was recently pinched/closed snapping open
 * into a spread palm within FLICK_WINDOW_MS. State is kept per handedness so
 * each hand can flick independently, and a global cooldown debounces repeats.
 */
export class FlickDetector {
  constructor() {
    this.pinchedAt = new Map() // handedness -> timestamp it was last closed
    this.lastFlick = -Infinity
  }

  /**
   * @returns {object|null} the hand that flicked this frame, or null
   */
  update(hands, now) {
    let flicked = null
    const present = new Set()

    for (const hand of hands) {
      present.add(hand.handedness)
      const closed = hand.isPinched && hand.extendedCount <= 1

      if (closed) {
        this.pinchedAt.set(hand.handedness, now)
      } else if (hand.isOpen) {
        const since = this.pinchedAt.get(hand.handedness)
        if (
          since != null &&
          now - since <= CONFIG.FLICK_WINDOW_MS &&
          now - this.lastFlick >= CONFIG.BURST_COOLDOWN_MS
        ) {
          flicked = hand
          this.lastFlick = now
          this.pinchedAt.delete(hand.handedness)
        }
      }

      // expire stale pinch memory
      const t = this.pinchedAt.get(hand.handedness)
      if (t != null && now - t > CONFIG.FLICK_WINDOW_MS) {
        this.pinchedAt.delete(hand.handedness)
      }
    }

    // forget hands that left the frame
    for (const key of this.pinchedAt.keys()) {
      if (!present.has(key)) this.pinchedAt.delete(key)
    }

    return flicked
  }
}

// ---- debug overlay ---------------------------------------------------------

/**
 * Draw landmark dots/lines onto a 2D canvas for debugging. Flips x to match
 * the mirrored video. Toggle by pressing "d" (wired in main.js).
 */
export function drawDebug(ctx, hands, width, height) {
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'
  ctx.lineWidth = 1.5
  for (const hand of hands) {
    for (const p of hand.landmarks) {
      const x = (1 - p.x) * width
      const y = p.y * height
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fill()
    }
    // centroid marker
    const cx = (1 - hand.centroid.x) * width
    const cy = hand.centroid.y * height
    ctx.strokeStyle = hand.isOpen ? 'rgba(255,255,255,0.6)' : '#ffffff'
    ctx.beginPath()
    ctx.arc(cx, cy, 10, 0, Math.PI * 2)
    ctx.stroke()
  }
}
