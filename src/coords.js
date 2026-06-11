// Coordinate mapping between MediaPipe landmarks and the screen.
//
// MediaPipe returns normalized coords in the *unmirrored* camera frame. The
// <video> is displayed mirrored (scaleX(-1)) and with `object-fit: cover`,
// which scales the frame to fill the viewport and crops the overflow — so the
// camera's aspect ratio usually differs from the viewport's. Mapping a landmark
// as if the video filled the screen exactly drifts the overlay off the hand.
//
// makeVideoMapping computes the cover transform once per frame; normToScreen /
// normToNDC then place a landmark exactly where it appears on the displayed,
// mirrored video — so the skeleton, orb, and web all stay locked to the hands.

export function makeVideoMapping(video) {
  const W = window.innerWidth
  const H = window.innerHeight
  const vw = video.videoWidth || W
  const vh = video.videoHeight || H
  const scale = Math.max(W / vw, H / vh) // object-fit: cover
  const dispW = vw * scale
  const dispH = vh * scale
  return { W, H, dispW, dispH, offX: (W - dispW) / 2, offY: (H - dispH) / 2 }
}

/** Normalized landmark (unmirrored) → screen pixel on the mirrored cover video. */
export function normToScreen(nx, ny, m) {
  return { x: m.W - (m.offX + nx * m.dispW), y: m.offY + ny * m.dispH }
}

/** Normalized landmark → NDC (-1..1), matching its on-screen position. */
export function normToNDC(nx, ny, m) {
  const s = normToScreen(nx, ny, m)
  return { x: (s.x / m.W) * 2 - 1, y: -((s.y / m.H) * 2 - 1) }
}
