// handweb — app controller.
//
// Flow: a landing dashboard offers two experiences. Picking one starts the
// camera + MediaPipe hand tracking (once) and switches the render loop into
// that mode; a Back button returns to the dashboard. Both modes require BOTH
// hands — when fewer are visible they show a "No hands detected" badge and fade
// the visualization out.
//
//   • Orb — the constellation web-sphere (grow / shrink / flick-to-erupt)
//   • Web — a living net strung between the two hands
//
// Press "d" for a debug overlay of the tracked landmarks.

import { startCamera } from './camera.js'
import { HandTracker, PinchSnapDetector, drawDebug, drawHandSkeleton } from './hands.js'
import { WebSphere } from './sphere.js'
import { WebNet } from './webnet.js'
import { BurstSystem } from './physics.js'
import { makeVideoMapping, normToScreen, normToNDC } from './coords.js'
import { CONFIG } from './config.js'

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const lerp = (a, b, t) => a + (b - a) * t
const mapRange = (v, inLo, inHi, outLo, outHi) =>
  outLo + ((clamp(v, inLo, inHi) - inLo) / (inHi - inLo)) * (outHi - outLo)

// ---- DOM ----
const dashboard = document.getElementById('dashboard')
const cardOrb = document.getElementById('card-orb')
const cardWeb = document.getElementById('card-web')
const errorEl = document.getElementById('error')
const backBtn = document.getElementById('back')
const noHands = document.getElementById('nohands')
const noHandsText = noHands.querySelector('span')
const hints = document.getElementById('hints')
const video = document.getElementById('camera')
const sceneCanvas = document.getElementById('scene')

const HINTS = {
  orb: '<span><b>Move finger</b> — spin</span><span><b>Two hands apart / together</b> — size</span><span><b>Pinch &amp; snap</b> — erupt</span>',
  web: '<span><b>Move hands apart</b> — stretch the web</span><span><b>Together</b> — gather it in</span>',
}

// ---- core systems ----
const tracker = new HandTracker()
const sphere = new WebSphere(sceneCanvas)
const webnet = new WebNet(sphere)
const pinchSnap = new PinchSnapDetector()
const burst = new BurstSystem(sphere.count, sphere.base)

let mode = 'dashboard' // 'dashboard' | 'orb' | 'web'
let started = false // camera + tracker initialized
let debug = false
let lastFrame = performance.now()

// smoothed orb state — per-axis scale (ellipsoid)
let curSX = CONFIG.RADIUS_DEFAULT
let curSY = CONFIG.RADIUS_DEFAULT
let curSZ = CONFIG.RADIUS_DEFAULT
let curX = 0
let curY = 0
let vizOpacity = 1 // master fade for the active visualization
let rotRateX = 0 // finger-driven spin rate, rad/s, with inertia (pitch)
let rotRateY = 0 // rad/s (yaw)
let prevTipX = null // last index-fingertip screen position (for velocity)
let prevTipY = null

// ---- always-on hand skeleton overlay (Orb / Web) ----
const handCanvas = document.createElement('canvas')
handCanvas.style.cssText =
  'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:4'
document.body.appendChild(handCanvas)
const handCtx = handCanvas.getContext('2d')

// ---- debug landmark overlay ----
const debugCanvas = document.createElement('canvas')
debugCanvas.style.cssText =
  'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:4;display:none'
document.body.appendChild(debugCanvas)
const debugCtx = debugCanvas.getContext('2d')
function resize() {
  handCanvas.width = debugCanvas.width = window.innerWidth
  handCanvas.height = debugCanvas.height = window.innerHeight
}
window.addEventListener('resize', resize)
resize()
window.addEventListener('keydown', (e) => {
  if (e.key === 'd') {
    debug = !debug
    debugCanvas.style.display = debug ? 'block' : 'none'
  }
})

// ---- mode navigation ----
async function ensureStarted() {
  if (started) return true
  try {
    await startCamera(video)
    await tracker.init()
    started = true
    return true
  } catch (err) {
    errorEl.textContent = err.message || String(err)
    return false
  }
}

async function enterMode(m, card) {
  errorEl.textContent = ''
  if (card) card.style.opacity = '0.6'
  const ok = await ensureStarted()
  if (card) card.style.opacity = ''
  if (!ok) return

  mode = m
  vizOpacity = 0 // fade the chosen visualization in
  dashboard.classList.add('hidden')
  backBtn.classList.add('show')
  hints.innerHTML = HINTS[m]
  hints.classList.add('show')
  sphere.setVisible(m === 'orb')
  webnet.setVisible(m === 'web')
  noHandsText.textContent = m === 'web'
    ? 'Show both hands to the camera'
    : 'Show your hand to the camera'
  if (m === 'web') webnet.reset()
}

function exitToDashboard() {
  mode = 'dashboard'
  dashboard.classList.remove('hidden')
  backBtn.classList.remove('show')
  hints.classList.remove('show')
  noHands.classList.remove('show')
  // idle orb returns as the dashboard backdrop
  sphere.setVisible(true)
  webnet.setVisible(false)
}

cardOrb.addEventListener('click', () => enterMode('orb', cardOrb))
cardWeb.addEventListener('click', () => enterMode('web', cardWeb))
backBtn.addEventListener('click', exitToDashboard)
// keyboard activation for the cards
for (const [card, m] of [[cardOrb, 'orb'], [cardWeb, 'web']]) {
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      enterMode(m, card)
    }
  })
}

// ---- orb helpers ----
/**
 * Per-axis ellipsoid size from the two hands: horizontal separation → width,
 * vertical separation → height. Spans + midpoint are in cover-mapped screen
 * space, so it matches exactly what you see and lets you shape the orb any way.
 */
function orbTargets(hands, vmap) {
  const a = normToScreen(hands[0].centroid.x, hands[0].centroid.y, vmap)
  const b = normToScreen(hands[1].centroid.x, hands[1].centroid.y, vmap)
  const dx = Math.abs(a.x - b.x) / vmap.W // horizontal span (fraction of width)
  const dy = Math.abs(a.y - b.y) / vmap.H // vertical span (fraction of height)
  return {
    sx: mapRange(dx, CONFIG.SIZE_SPAN_MIN, CONFIG.SIZE_SPAN_MAX, CONFIG.RADIUS_MIN, CONFIG.RADIUS_MAX),
    sy: mapRange(dy, CONFIG.SIZE_SPAN_MIN, CONFIG.SIZE_SPAN_MAX, CONFIG.RADIUS_MIN, CONFIG.RADIUS_MAX),
    mx: (a.x + b.x) / 2 / vmap.W, // screen-normalized midpoint
    my: (a.y + b.y) / 2 / vmap.H,
  }
}

function updateOrb(hands, handsPresent, now, dt, vmap) {
  let tSX = curSX // target per-axis scale
  let tSY = curSY
  let fingerVX = 0 // index-fingertip screen velocity (units/s)
  let fingerVY = 0

  if (mode === 'dashboard') {
    // gentle breathing backdrop, centered
    const breath = CONFIG.RADIUS_DEFAULT + Math.sin(now / 900) * 0.05
    tSX = tSY = breath
    curX = lerp(curX, 0, CONFIG.POSITION_SMOOTHING)
    curY = lerp(curY, 0, CONFIG.POSITION_SMOOTHING)
    vizOpacity = lerp(vizOpacity, 1, 0.1)
    prevTipX = prevTipY = null
  } else if (handsPresent) {
    // a deliberate pinch + snap erupts the orb
    const snapped = pinchSnap.update(hands, now)
    if (snapped && !burst.isBursting) burst.trigger(sphere.positions, 1, now)

    // two hands set the per-axis size; one hand just follows / holds size
    let mx, my
    if (hands.length >= 2) {
      const t = orbTargets(hands, vmap)
      tSX = t.sx
      tSY = t.sy
      mx = t.mx
      my = t.my
    } else {
      const sc = normToScreen(hands[0].centroid.x, hands[0].centroid.y, vmap)
      mx = sc.x / vmap.W
      my = sc.y / vmap.H
    }
    const world = sphere.ndcToWorld(mx * 2 - 1, -(my * 2 - 1))
    curX = lerp(curX, world.x, CONFIG.POSITION_SMOOTHING)
    curY = lerp(curY, world.y, CONFIG.POSITION_SMOOTHING)
    vizOpacity = lerp(vizOpacity, 1, 0.15)

    // move your index finger to spin the orb (swipe-to-rotate, with inertia)
    const tip = hands[0].landmarks[8]
    const sc = normToScreen(tip.x, tip.y, vmap)
    const sx = sc.x / vmap.W // cover-aware, mirrored screen position (0..1)
    const sy = sc.y / vmap.H
    if (prevTipX !== null && dt > 0) {
      fingerVX = (sx - prevTipX) / dt
      fingerVY = (sy - prevTipY) / dt
    }
    prevTipX = sx
    prevTipY = sy
  } else {
    // orb mode, no hands → hold place and fade out
    vizOpacity = lerp(vizOpacity, 0, 0.15)
    prevTipX = prevTipY = null
  }

  // while erupting, force the shape round (and generously sized) so the
  // splatter is clean and fills the screen regardless of the orb's size
  if (burst.isActive) {
    const u = Math.max((tSX + tSY) / 2, 0.9)
    tSX = u
    tSY = u
  }

  // Spin: low-pass the finger velocity into a spin rate, then coast (inertia).
  const damp = Math.pow(CONFIG.ROT_DAMP, dt * 60)
  rotRateY = clamp(rotRateY * damp + fingerVX * CONFIG.ROT_GAIN * (1 - damp), -CONFIG.ROT_MAX, CONFIG.ROT_MAX)
  rotRateX = clamp(rotRateX * damp + fingerVY * CONFIG.ROT_GAIN * (1 - damp), -CONFIG.ROT_MAX, CONFIG.ROT_MAX)

  // smooth the per-axis scale toward the target (accurate but never jumpy)
  curSX = lerp(curSX, tSX, CONFIG.RADIUS_SMOOTHING)
  curSY = lerp(curSY, tSY, CONFIG.RADIUS_SMOOTHING)
  curSZ = lerp(curSZ, (tSX + tSY) / 2, CONFIG.RADIUS_SMOOTHING)

  burst.update(sphere, 1, now, dt) // particle positions live in unit space
  sphere.setWorldPosition(curX, curY, 0)
  sphere.setScale(curSX, curSY, curSZ)
  if (mode !== 'dashboard') sphere.addRotation(rotRateX * dt, rotRateY * dt)
  sphere.flushPoints()
  sphere.syncLines()
  sphere.applyMasterOpacity(vizOpacity)
  // dashboard keeps a gentle auto-spin; in-experience spin is finger-driven
  sphere.render(mode === 'dashboard' ? CONFIG.ROT_IDLE : 0)
}

function updateWeb(hands, handsPresent, now, dt, vmap) {
  vizOpacity = lerp(vizOpacity, handsPresent ? 1 : 0, 0.15)
  if (handsPresent) webnet.update(hands, now, dt, vmap)
  webnet.applyMasterOpacity(vizOpacity)
  sphere.render(0) // draws the scene (the visible web group)
}

function loop() {
  requestAnimationFrame(loop)
  const now = performance.now()
  const dt = Math.min((now - lastFrame) / 1000, 0.05)
  lastFrame = now

  const hands = tracker.detect(video, now)
  const vmap = makeVideoMapping(video) // cover-aware landmark → screen mapping
  // Web needs both hands; Orb works with one.
  const need = mode === 'web' ? 2 : 1
  const handsPresent = hands.length >= need

  // "No hands detected" only matters inside an experience.
  const inExperience = mode !== 'dashboard'
  noHands.classList.toggle('show', inExperience && !handsPresent)

  if (mode === 'web') updateWeb(hands, handsPresent, now, dt, vmap)
  else updateOrb(hands, handsPresent, now, dt, vmap)

  // Wire the detected fingers with a skeleton in Orb / Web; clear otherwise.
  if (mode === 'orb' || mode === 'web') {
    drawHandSkeleton(handCtx, hands, vmap)
  } else {
    handCtx.clearRect(0, 0, handCanvas.width, handCanvas.height)
  }

  if (debug) drawDebug(debugCtx, hands, debugCanvas.width, debugCanvas.height)
}

// Debug hook (window.__handweb) for triggering bursts / inspecting state.
window.__handweb = { sphere, webnet, burst, pinchSnap, tracker, enterMode, exitToDashboard }

// Idle orb renders immediately as the dashboard backdrop; detection no-ops
// until a mode is chosen and the camera + landmarker start.
loop()
