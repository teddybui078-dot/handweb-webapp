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
import { HandTracker, FlickDetector, drawDebug, handDistance, handsMidpoint } from './hands.js'
import { WebSphere } from './sphere.js'
import { WebNet } from './webnet.js'
import { FingerDraw } from './draw.js'
import { BurstSystem } from './physics.js'
import { CONFIG } from './config.js'

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const lerp = (a, b, t) => a + (b - a) * t
const mapRange = (v, inLo, inHi, outLo, outHi) =>
  outLo + ((clamp(v, inLo, inHi) - inLo) / (inHi - inLo)) * (outHi - outLo)

// ---- DOM ----
const dashboard = document.getElementById('dashboard')
const cardOrb = document.getElementById('card-orb')
const cardWeb = document.getElementById('card-web')
const cardDraw = document.getElementById('card-draw')
const errorEl = document.getElementById('error')
const backBtn = document.getElementById('back')
const clearBtn = document.getElementById('clear')
const noHands = document.getElementById('nohands')
const noHandsText = noHands.querySelector('span')
const hints = document.getElementById('hints')
const video = document.getElementById('camera')
const sceneCanvas = document.getElementById('scene')
const scrim = document.getElementById('scrim')
const drawCanvas = document.getElementById('draw')

const HINTS = {
  orb: '<span><b>Spread hands</b> — grow</span><span><b>Hands together</b> — shrink</span><span><b>Flick open</b> — erupt</span>',
  web: '<span><b>Move hands apart</b> — stretch the web</span><span><b>Together</b> — gather it in</span>',
  draw: '<span><b>Pinch</b> to draw</span><span><b>Release</b> to lift the pen</span><span><b>Clear</b> to reset</span>',
}

// ---- core systems ----
const tracker = new HandTracker()
const sphere = new WebSphere(sceneCanvas)
const webnet = new WebNet(sphere)
const draw = new FingerDraw(drawCanvas)
const flick = new FlickDetector()
const burst = new BurstSystem(sphere.count, sphere.base)

let mode = 'dashboard' // 'dashboard' | 'orb' | 'web'
let started = false // camera + tracker initialized
let debug = false
let lastFrame = performance.now()

// smoothed orb state
let curRadius = CONFIG.RADIUS_DEFAULT
let curX = 0
let curY = 0
let vizOpacity = 1 // master fade for the active visualization
let rotVelX = 0 // smoothed finger-driven spin (pitch)
let rotVelY = 0 // smoothed finger-driven spin (yaw)

// ---- debug landmark overlay ----
const debugCanvas = document.createElement('canvas')
debugCanvas.style.cssText =
  'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:4;display:none'
document.body.appendChild(debugCanvas)
const debugCtx = debugCanvas.getContext('2d')
function resize() {
  debugCanvas.width = window.innerWidth
  debugCanvas.height = window.innerHeight
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
  const isDraw = m === 'draw'
  vizOpacity = 0 // fade the chosen visualization in
  dashboard.classList.add('hidden')
  backBtn.classList.add('show')
  hints.innerHTML = HINTS[m]
  hints.classList.add('show')
  sphere.setVisible(m === 'orb')
  webnet.setVisible(m === 'web')
  scrim.classList.toggle('show', isDraw)
  drawCanvas.classList.toggle('show', isDraw)
  clearBtn.classList.toggle('show', isDraw)
  noHandsText.textContent = isDraw
    ? 'Show your hand to the camera'
    : 'Show both hands to the camera'
  if (m === 'web') webnet.reset()
  if (isDraw) draw.clear()
}

function exitToDashboard() {
  mode = 'dashboard'
  dashboard.classList.remove('hidden')
  backBtn.classList.remove('show')
  clearBtn.classList.remove('show')
  hints.classList.remove('show')
  noHands.classList.remove('show')
  scrim.classList.remove('show')
  drawCanvas.classList.remove('show')
  // idle orb returns as the dashboard backdrop
  sphere.setVisible(true)
  webnet.setVisible(false)
}

cardOrb.addEventListener('click', () => enterMode('orb', cardOrb))
cardWeb.addEventListener('click', () => enterMode('web', cardWeb))
cardDraw.addEventListener('click', () => enterMode('draw', cardDraw))
clearBtn.addEventListener('click', () => draw.clear())
backBtn.addEventListener('click', exitToDashboard)
// keyboard activation for the cards
for (const [card, m] of [[cardOrb, 'orb'], [cardWeb, 'web'], [cardDraw, 'draw']]) {
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      enterMode(m, card)
    }
  })
}

// ---- orb helpers ----
/** Two-hand distance → radius, midpoint → screen position. */
function orbTargets(hands) {
  const d = handDistance(hands[0], hands[1])
  const radius = mapRange(d, CONFIG.DIST_MIN, CONFIG.DIST_MAX, CONFIG.RADIUS_MIN, CONFIG.RADIUS_MAX)
  const mid = handsMidpoint(hands[0], hands[1])
  return { radius, nx: mid.x, ny: mid.y }
}

/** Index-finger pointing direction in screen space (x mirrored), normalized. */
function fingerPointing(hand) {
  const mcp = hand.landmarks[5]
  const tip = hand.landmarks[8]
  let px = -(tip.x - mcp.x) // mirror x to match the flipped video
  let py = tip.y - mcp.y
  const len = Math.hypot(px, py) || 1
  return { x: px / len, y: py / len }
}

function updateOrb(hands, handsPresent, now, dt) {
  let targetRadius = curRadius
  let pointing = null

  if (mode === 'dashboard') {
    // gentle breathing backdrop, centered
    targetRadius = CONFIG.RADIUS_DEFAULT + Math.sin(now / 900) * 0.08
    curX = lerp(curX, 0, CONFIG.POSITION_SMOOTHING)
    curY = lerp(curY, 0, CONFIG.POSITION_SMOOTHING)
    vizOpacity = lerp(vizOpacity, 1, 0.1)
  } else if (handsPresent) {
    const flicked = flick.update(hands, now)
    if (flicked && !burst.isBursting) burst.trigger(sphere.positions, curRadius, now)
    const t = orbTargets(hands)
    targetRadius = t.radius
    const ndcX = (1 - t.nx) * 2 - 1
    const ndcY = -(t.ny * 2 - 1)
    const world = sphere.ndcToWorld(ndcX, ndcY)
    curX = lerp(curX, world.x, CONFIG.POSITION_SMOOTHING)
    curY = lerp(curY, world.y, CONFIG.POSITION_SMOOTHING)
    vizOpacity = lerp(vizOpacity, 1, 0.15)
    // point your finger to spin the orb that way (paused mid-burst)
    if (!burst.isActive) pointing = fingerPointing(hands[0])
  } else {
    // orb mode, no hands → hold place and fade out
    vizOpacity = lerp(vizOpacity, 0, 0.15)
  }

  // Finger pointing → spin: yaw follows left/right, pitch follows up/down.
  const targetVelX = pointing ? pointing.y * CONFIG.ROT_SPEED : 0
  const targetVelY = pointing ? pointing.x * CONFIG.ROT_SPEED : 0
  rotVelX = lerp(rotVelX, targetVelX, CONFIG.ROT_SMOOTHING)
  rotVelY = lerp(rotVelY, targetVelY, CONFIG.ROT_SMOOTHING)

  curRadius = lerp(curRadius, targetRadius, CONFIG.RADIUS_SMOOTHING)
  burst.update(sphere, curRadius, now, dt)
  sphere.setWorldPosition(curX, curY, 0)
  // frame-rate-independent spin (rotVel is calibrated per 1/60s)
  if (mode !== 'dashboard') sphere.addRotation(rotVelX * dt * 60, rotVelY * dt * 60)
  sphere.flushPoints()
  sphere.syncLines()
  sphere.applyMasterOpacity(vizOpacity)
  // dashboard keeps a gentle auto-spin; in-experience spin is finger-driven
  sphere.render(mode === 'dashboard' ? CONFIG.ROT_IDLE : 0)
}

function updateWeb(hands, handsPresent, now, dt) {
  vizOpacity = lerp(vizOpacity, handsPresent ? 1 : 0, 0.15)
  if (handsPresent) webnet.update(hands, now, dt)
  webnet.applyMasterOpacity(vizOpacity)
  sphere.render(0) // draws the scene (the visible web group)
}

function updateDraw(hands, handsPresent) {
  draw.update(handsPresent ? hands[0] : null)
  draw.render()
  sphere.render(0) // keep the particle canvas cleared behind the scrim
}

function loop() {
  requestAnimationFrame(loop)
  const now = performance.now()
  const dt = Math.min((now - lastFrame) / 1000, 0.05)
  lastFrame = now

  const hands = tracker.detect(video, now)
  // Draw needs one hand; Orb/Web need both.
  const need = mode === 'draw' ? 1 : 2
  const handsPresent = hands.length >= need

  // "No hands detected" only matters inside an experience.
  const inExperience = mode !== 'dashboard'
  noHands.classList.toggle('show', inExperience && !handsPresent)

  if (mode === 'draw') updateDraw(hands, handsPresent)
  else if (mode === 'web') updateWeb(hands, handsPresent, now, dt)
  else updateOrb(hands, handsPresent, now, dt)

  if (debug) drawDebug(debugCtx, hands, debugCanvas.width, debugCanvas.height)
}

// Debug hook (window.__handweb) for triggering bursts / inspecting state.
window.__handweb = { sphere, webnet, draw, burst, flick, tracker, enterMode, exitToDashboard }

// Idle orb renders immediately as the dashboard backdrop; detection no-ops
// until a mode is chosen and the camera + landmarker start.
loop()
